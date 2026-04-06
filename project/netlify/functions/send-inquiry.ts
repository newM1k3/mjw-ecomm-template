import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'hfp@mail.com';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { productId, productName, senderName, senderEmail, message } = JSON.parse(event.body ?? '{}');

    if (!senderName || !senderEmail || !message || !productName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    await resend.emails.send({
      from: 'Camera Shop <noreply@haliframesphotos.ca>',
      to: OWNER_EMAIL,
      replyTo: senderEmail,
      subject: `Enquiry about: ${productName}`,
      text: [
        `A customer has sent an enquiry about an item in your shop.`,
        ``,
        `Item: ${productName}`,
        `Product ID: ${productId}`,
        ``,
        `From: ${senderName} <${senderEmail}>`,
        ``,
        `Message:`,
        message,
        ``,
        `Reply directly to ${senderEmail} to respond to this enquiry.`,
      ].join('\n'),
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('[send-inquiry]', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send enquiry' }) };
  }
};
