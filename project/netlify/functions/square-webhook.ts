import { Handler } from '@netlify/functions';
import { SquareClient, SquareEnvironment, WebhooksHelper } from 'square';
import PocketBase from 'pocketbase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'hfp@mail.com';

async function getPbAdmin(): Promise<PocketBase> {
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
  webhookSignatureKey: string;
}> {
  const [tokenRecord, envRecord, sigRecord] = await Promise.all([
    pb.collection('settings').getFirstListItem('key = "square_access_token"'),
    pb.collection('settings').getFirstListItem('key = "square_environment"').catch(() => null),
    pb.collection('settings').getFirstListItem('key = "square_webhook_signature_key"'),
  ]);
  return {
    accessToken: tokenRecord.value,
    environment: (envRecord?.value === 'production') ? 'production' : 'sandbox',
    webhookSignatureKey: sigRecord.value,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const signature = event.headers['x-square-hmacsha256-signature'] ?? '';
  const rawBody = event.body ?? '';

  try {
    const pb = await getPbAdmin();
    const { accessToken, environment, webhookSignatureKey } = await getSquareSettings(pb);

    // Validate the webhook signature to confirm the request originated from Square.
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL ?? '';
    const isValid = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader: signature,
      signatureKey: webhookSignatureKey,
      notificationUrl,
    });

    if (!isValid) {
      console.warn('[square-webhook] Invalid signature — request rejected.');
      return { statusCode: 403, body: 'Invalid webhook signature' };
    }

    const squareEvent = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = squareEvent.type as string | undefined;

    // Listen for payment.updated; when status reaches COMPLETED the buyer has paid.
    if (eventType === 'payment.updated') {
      const data = squareEvent.data as Record<string, unknown> | undefined;
      const payment = (data?.object as Record<string, unknown> | undefined)?.payment as Record<string, unknown> | undefined;

      if (!payment || payment.status !== 'COMPLETED') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }

      const orderId = payment.order_id as string | undefined;
      if (!orderId) {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }

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
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
      }

      // Idempotency guard: skip if we already recorded this order.
      let alreadyRecorded = false;
      try {
        await pb.collection('orders').getFirstListItem(`square_order_id = "${orderId}"`);
        alreadyRecorded = true;
      } catch {
        // Not yet recorded — proceed.
      }

      const totalAmount = Number(order.totalMoney?.amount ?? 0) / 100;
      const customerEmail = (payment.buyer_email_address as string | undefined) ?? '';
      const customerName = ((payment.shipping_address as Record<string, unknown> | undefined)?.recipient_name as string | undefined) ?? '';

      if (!alreadyRecorded) {
        await pb.collection('orders').create({
          square_order_id: orderId,
          customer_email: customerEmail,
          customer_name: customerName,
          total_amount: totalAmount,
          currency: order.totalMoney?.currency ?? 'CAD',
          status: 'paid',
          cart_session_id: '',
        });
      }

      // Mark each product as sold using the PocketBase product ID stored in line item note.
      const soldItems: string[] = [];
      const lineItems = order.lineItems ?? [];
      for (const item of lineItems) {
        const productId = item.note;
        if (!productId) continue;
        try {
          const product = await pb.collection('products').getOne(productId);
          await pb.collection('products').update(productId, {
            is_sold: true,
            is_available: false,
          });
          const itemPrice = Number(item.totalMoney?.amount ?? 0) / 100;
          soldItems.push(`- ${product.brand_model} — $${itemPrice.toFixed(2)} CAD`);
        } catch (e) {
          console.warn(`[square-webhook] Could not process product ${productId}:`, e);
        }
      }

      // Send owner notification email via Resend.
      await resend.emails.send({
        from: 'Camera Shop <noreply@haliframesphotos.ca>',
        to: OWNER_EMAIL,
        subject: `New Sale — $${totalAmount.toFixed(2)} CAD`,
        text: [
          'A customer just completed a purchase on The Camera Shop.',
          '',
          'Items sold:',
          ...soldItems,
          '',
          `Total: $${totalAmount.toFixed(2)} CAD`,
          '',
          `Customer: ${customerName || 'Unknown'} <${customerEmail || 'no email'}>`,
          '',
          'Please arrange pickup or shipping with the buyer. Check your Square Dashboard for full payment details.',
        ].join('\n'),
      });
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[square-webhook]', err);
    return {
      statusCode: 400,
      body: `Webhook error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
};
