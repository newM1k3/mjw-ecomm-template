import { Handler } from '@netlify/functions';
import { SquareClient, SquareEnvironment } from 'square';
import PocketBase from 'pocketbase';

async function authAdmin(): Promise<PocketBase> {
  const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!
  );
  return pb;
}

async function getSquareSettings(pb: PocketBase): Promise<{
  accessToken: string;
  environment: 'sandbox' | 'production';
}> {
  const [tokenRecord, envRecord] = await Promise.all([
    pb.collection('settings').getFirstListItem('key = "square_access_token"'),
    pb.collection('settings').getFirstListItem('key = "square_environment"').catch(() => null),
  ]);
  return {
    accessToken: tokenRecord.value,
    environment: (envRecord?.value === 'production') ? 'production' : 'sandbox',
  };
}

export const handler: Handler = async (event) => {
  // Square appends ?orderId=... to the redirect URL after a successful payment.
  const orderId = event.queryStringParameters?.orderId ?? event.queryStringParameters?.order_id;
  if (!orderId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId' }) };
  }

  try {
    const pb = await authAdmin();
    const { accessToken, environment } = await getSquareSettings(pb);

    const client = new SquareClient({
      token: accessToken,
      environment: environment === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });

    // orders.get takes { orderId } and resolves to GetOrderResponse directly.
    const orderResponse = await client.orders.get({ orderId });
    const order = orderResponse.order;

    if (!order) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
    }

    // Square order state is OPEN once payment is complete via a payment link.
    const isPaid = order.state === 'OPEN' || order.state === 'COMPLETED';
    if (!isPaid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: order.state ?? 'pending' }),
      };
    }

    // Idempotency guard: skip if we already recorded this order.
    try {
      await pb.collection('orders').getFirstListItem(`square_order_id = "${orderId}"`);
    } catch {
      // Not yet recorded — create the order record now.
      const totalAmount = Number(order.totalMoney?.amount ?? 0) / 100;

      await pb.collection('orders').create({
        square_order_id: orderId,
        customer_email: '',
        customer_name: '',
        total_amount: totalAmount,
        currency: order.totalMoney?.currency ?? 'CAD',
        status: 'paid',
        cart_session_id: '',
      });

      // Mark each product as sold.
      // The PocketBase product ID was embedded in the Square line item `note` field
      // by create-checkout.ts.
      const lineItems = order.lineItems ?? [];
      for (const item of lineItems) {
        const productId = item.note;
        if (!productId) continue;
        try {
          await pb.collection('products').update(productId, {
            is_sold: true,
            is_available: false,
          });
        } catch (e) {
          console.warn(`[verify-checkout] Could not mark product ${productId} as sold:`, e);
        }
      }
    }

    // Attempt to retrieve buyer email from the associated payment tender.
    let customerEmail = '';
    try {
      const tenders = (order as Record<string, unknown>).tenders as Array<{ paymentId?: string }> | undefined;
      if (tenders && tenders.length > 0 && tenders[0].paymentId) {
        const paymentResponse = await client.payments.get({ paymentId: tenders[0].paymentId });
        customerEmail = (paymentResponse.payment as Record<string, unknown>)?.buyerEmailAddress as string ?? '';
      }
    } catch {
      // Buyer details are optional — proceed without them.
    }

    const totalAmount = Number(order.totalMoney?.amount ?? 0) / 100;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'paid',
        customerName: '',
        customerEmail,
        totalAmount,
      }),
    };
  } catch (err) {
    console.error('[verify-checkout]', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not verify order' }) };
  }
};
