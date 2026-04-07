import { Handler } from '@netlify/functions';
import { SquareClient, SquareEnvironment } from 'square';
import PocketBase from 'pocketbase';
import { randomUUID } from 'crypto';

async function getSquareSettings(): Promise<{
  accessToken: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}> {
  const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!
  );

  const [tokenRecord, locationRecord, envRecord] = await Promise.all([
    pb.collection('settings').getFirstListItem('key = "square_access_token"'),
    pb.collection('settings').getFirstListItem('key = "square_location_id"'),
    pb.collection('settings').getFirstListItem('key = "square_environment"').catch(() => null),
  ]);

  return {
    accessToken: tokenRecord.value,
    locationId: locationRecord.value,
    environment: (envRecord?.value === 'production') ? 'production' : 'sandbox',
  };
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

    const { accessToken, locationId, environment } = await getSquareSettings();

    const client = new SquareClient({
      token: accessToken,
      environment: environment === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });

    // Map cart items to Square OrderLineItem objects.
    // The PocketBase product ID is stored in `note` so verify-checkout
    // can retrieve it later to mark products as sold.
    const lineItems = items.map((item: {
      productId: string;
      brandModel: string;
      price: number;
    }) => ({
      name: item.brandModel,
      quantity: '1',
      note: item.productId,
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)),
        currency: 'CAD',
      },
    }));

    const origin = event.headers.origin
      ?? event.headers.referer?.replace(/\/$/, '')
      ?? 'https://cameras.haliframesphotos.ca';

    // The Square SDK resolves HttpResponsePromise<CreatePaymentLinkResponse> directly —
    // no .result wrapper needed.
    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        lineItems,
      },
      checkoutOptions: {
        redirectUrl: `${origin}/checkout`,
      },
    });

    const url = response.paymentLink?.url;
    if (!url) {
      throw new Error('Square did not return a checkout URL.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    console.error('[create-checkout]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' }),
    };
  }
};
