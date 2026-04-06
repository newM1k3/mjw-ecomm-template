import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
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

async function getStripeKey(pb: PocketBase): Promise<string> {
  const record = await pb.collection('settings').getFirstListItem('key = "stripe_secret_key"');
  return record.value;
}

export const handler: Handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return { statusCode: 400, body: 'Missing signature or webhook secret' };
  }

  try {
    const pb = await getPbAdmin();
    const secretKey = await getStripeKey(pb);
    const stripe = new Stripe(secretKey);

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body ?? '',
      sig,
      webhookSecret
    );

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const productIds: string[] = JSON.parse(session.metadata?.cartItems ?? '[]');

      await pb.collection('orders').create({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email ?? '',
        customer_name: session.customer_details?.name ?? '',
        total_amount: (session.amount_total ?? 0) / 100,
        currency: 'cad',
        status: 'paid',
        cart_session_id: '',
      });

      const soldItems: string[] = [];
      for (const productId of productIds) {
        try {
          const product = await pb.collection('products').getOne(productId);
          await pb.collection('products').update(productId, {
            is_sold: true,
            is_available: false,
          });
          soldItems.push(`- ${product.brand_model} — $${product.quick_sale_price} CAD`);
        } catch (e) {
          console.warn(`[stripe-webhook] Could not process product ${productId}:`, e);
        }
      }

      const total = (session.amount_total ?? 0) / 100;
      await resend.emails.send({
        from: 'Camera Shop <noreply@haliframesphotos.ca>',
        to: OWNER_EMAIL,
        subject: `New Sale — $${total.toFixed(2)} CAD`,
        text: [
          `A customer just completed a purchase on The Camera Shop.`,
          ``,
          `Items sold:`,
          ...soldItems,
          ``,
          `Total: $${total.toFixed(2)} CAD`,
          ``,
          `Customer: ${session.customer_details?.name ?? 'Unknown'} <${session.customer_details?.email ?? 'no email'}>`,
          ``,
          `Please arrange pickup or shipping with the buyer. Check your Stripe dashboard for full payment details.`,
        ].join('\n'),
      });
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return { statusCode: 400, body: `Webhook error: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
};
