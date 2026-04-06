import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';

async function authAdmin(): Promise<PocketBase> {
  const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!
  );
  return pb;
}

async function getStripeKey(pb: PocketBase): Promise<string> {
  const record = await pb.collection('settings').getFirstListItem('key = "stripe_secret_key"');
  return record.value;
}

export const handler: Handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
  }

  try {
    const pb = await authAdmin();
    const secretKey = await getStripeKey(pb);
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { statusCode: 200, body: JSON.stringify({ status: session.payment_status }) };
    }

    try {
      await pb.collection('orders').getFirstListItem(`stripe_session_id = "${sessionId}"`);
    } catch {
      const productIds: string[] = JSON.parse(session.metadata?.cartItems ?? '[]');

      await pb.collection('orders').create({
        stripe_session_id: sessionId,
        customer_email: session.customer_details?.email ?? '',
        customer_name: session.customer_details?.name ?? '',
        total_amount: (session.amount_total ?? 0) / 100,
        currency: 'cad',
        status: 'paid',
        cart_session_id: '',
      });

      for (const productId of productIds) {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'paid',
        customerName: session.customer_details?.name ?? '',
        customerEmail: session.customer_details?.email ?? '',
        totalAmount: (session.amount_total ?? 0) / 100,
      }),
    };
  } catch (err) {
    console.error('[verify-checkout]', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not verify order' }) };
  }
};
