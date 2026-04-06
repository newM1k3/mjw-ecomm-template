import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function getStripeKey(): Promise<string> {
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!
  );
  const record = await pb.collection('settings').getFirstListItem('key = "stripe_secret_key"');
  return record.value;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { items } = JSON.parse(event.body ?? '{}');
    if (!items || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    const secretKey = await getStripeKey();
    const stripe = new Stripe(secretKey);

    const lineItems = items.map((item: { brandModel: string; price: number; priceType: string; imageUrl?: string }) => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.brandModel,
          description: item.priceType === 'collector' ? 'Collector Price' : 'Quick-Sale Price',
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    }));

    const origin = event.headers.origin ?? event.headers.referer ?? 'https://cameras.haliframesphotos.ca';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?cancelled=true`,
      metadata: { cartItems: JSON.stringify(items.map((i: { productId: string }) => i.productId)) },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('[create-checkout]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' }),
    };
  }
};
