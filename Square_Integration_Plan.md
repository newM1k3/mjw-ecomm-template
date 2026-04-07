# Square Integration Plan: Replacing Stripe with Square Web Payments SDK

This document outlines the detailed, actionable steps required to replace the existing Stripe checkout implementation with Square in the Haliburton Framing & Photo e-commerce site. The integration leverages Square's Web Payments SDK (specifically the `CreatePaymentLink` endpoint of the Checkout API) for a hosted checkout experience, fulfilling the owner's requirement to unify their online and physical store payment processing [1].

## 1. PocketBase Schema & Settings Updates

The current PocketBase schema and settings are heavily tied to Stripe. We need to update these to accommodate Square credentials and order tracking.

### 1.1 Update `settings` Collection
The `settings` collection currently stores `stripe_secret_key` and `stripe_mode`. We will replace these with Square equivalents.

*   **Action:** In the Admin UI (and conceptually in the database), replace the Stripe keys with:
    *   `square_access_token`: The Square personal access token (Sandbox or Production).
    *   `square_location_id`: The Square Location ID where payments will be processed.
    *   `square_environment`: Either `sandbox` or `production`.
    *   `square_webhook_signature_key`: The signature key used to validate incoming Square webhooks.

### 1.2 Update `orders` Collection Schema
The `orders` collection requires `stripe_session_id`. We need to adapt this for Square.

*   **Action:** Update the PocketBase `orders` collection schema:
    *   Rename or replace `stripe_session_id` with `square_order_id` (Text, Required).
    *   Add `square_payment_link_id` (Text, Optional) to track the specific checkout link generated.

## 2. Admin UI Updates (`src/pages/Admin.tsx`)

The Admin panel must be updated to manage Square credentials instead of Stripe.

*   **Action:** Modify the "Settings" tab in `Admin.tsx`:
    *   Change all UI labels from "Stripe Configuration" to "Square Configuration".
    *   Replace the `stripeKey` state and input with `squareAccessToken` and `squareLocationId` inputs.
    *   Update the environment toggle to switch between Square `sandbox` and `production`.
    *   Update the `handleSaveSettings` function to save the new `square_*` keys using the `setSetting` hook.

## 3. Frontend Checkout Initiation (`src/components/CartDrawer.tsx`)

The current `CartDrawer` POSTs cart items to a Netlify function (`create-checkout`) and expects a Stripe Checkout URL to redirect to. We will maintain this exact architectural flow but point it to a Square-hosted checkout URL [2].

*   **Action:** Update `CartDrawer.tsx` (No major changes needed to the component logic itself):
    *   The `handleCheckout` function will still POST to `/.netlify/functions/create-checkout`.
    *   It will still expect a `{ url }` in the response and perform `window.location.href = url`.
    *   *Note: The actual heavy lifting shifts to the Netlify function.*

## 4. Netlify Functions Updates

We need to rewrite the serverless functions to use the Square Node.js SDK (`square` npm package) [3].

### 4.1 Install Dependencies
*   **Action:** Run `npm install square` in the `project` directory to install the official Square Node.js SDK [4]. Remove the `stripe` package.

### 4.2 Rewrite `create-checkout.ts`
This function will receive the cart items, create a Square Order, and generate a Square Payment Link.

*   **Action:** Rewrite `create-checkout.ts`:
    1.  **Initialize Square Client:** Fetch `square_access_token`, `square_location_id`, and `square_environment` from PocketBase settings. Initialize the `SquareClient`.
    2.  **Map Line Items:** Iterate over the `items` array from the request body. Map each cart item to a Square `OrderLineItem` object, ensuring the `base_price_money` is formatted correctly (amount in cents, currency "CAD") [5].
    3.  **Call CreatePaymentLink:** Use `client.checkoutApi.createPaymentLink`.
        *   Pass the constructed `order` object.
        *   Set the `checkout_options.redirect_url` to `${origin}/checkout?order_id={ORDER_ID}` (similar to the current Stripe success URL).
    4.  **Return URL:** Extract the `url` from the `payment_link` response and return it to the frontend: `return { statusCode: 200, body: JSON.stringify({ url: response.result.paymentLink.url }) }`.

### 4.3 Rewrite `verify-checkout.ts`
The frontend `Checkout.tsx` page calls this to verify the order after redirection.

*   **Action:** Rewrite `verify-checkout.ts`:
    1.  Change the expected query parameter from `session_id` to `order_id`.
    2.  Initialize the `SquareClient`.
    3.  **Retrieve Order:** Use `client.ordersApi.retrieveOrder(orderId)` to get the order details.
    4.  **Verify State:** Check if the order `state` is `OPEN` or `COMPLETED` (indicating successful payment) [6].
    5.  **Database Updates:** If paid, create the record in the PocketBase `orders` collection using the Square `order_id`.
    6.  Iterate through the `line_items` in the Square order, find the corresponding PocketBase products (you may need to pass PocketBase product IDs in the Square line item `note` field or a custom catalog object), and mark them as `is_sold: true` and `is_available: false`.

### 4.4 Rewrite `stripe-webhook.ts` to `square-webhook.ts`
Square uses webhooks to notify the system when a payment is completed asynchronously.

*   **Action:** Create `square-webhook.ts` (and update Netlify `netlify.toml` if necessary):
    1.  **Signature Validation:** Use `WebhooksHelper.verifySignature` from the Square SDK to validate the `x-square-hmacsha256-signature` header against the raw request body and the `square_webhook_signature_key` [7].
    2.  **Handle `payment.updated`:** Listen for the `payment.updated` event (or `order.updated`).
    3.  When a payment status changes to `COMPLETED`, extract the associated `order_id`.
    4.  Fetch the order from Square to get the line items.
    5.  Update the PocketBase `orders` collection status to 'paid'.
    6.  Mark the corresponding products in PocketBase as sold.
    7.  Send the confirmation email via Resend to the shop owner (`OWNER_EMAIL`), listing the sold items and total amount, just as the current implementation does.

## 5. Frontend Checkout Page (`src/pages/Checkout.tsx`)

*   **Action:** Update the success page logic:
    *   Change the URL parameter extraction from `session_id` to `order_id` (or whatever parameter Square appends to the redirect URL).
    *   Update the `fetch` call to point to the updated `verify-checkout` endpoint with the new parameter.

## References
[1] Square Developer Documentation: Checkout API Overview. https://developer.squareup.com/docs/checkout-api
[2] Square Developer Documentation: Square Order Checkout. https://developer.squareup.com/docs/checkout-api/square-order-checkout
[3] Square Developer Documentation: Node.js SDK. https://developer.squareup.com/docs/sdks/nodejs
[4] Square Developer Documentation: Square Node.js SDK Quickstart. https://developer.squareup.com/docs/sdks/nodejs/quick-start
[5] Square Developer Documentation: Quick Pay Checkout. https://developer.squareup.com/docs/checkout-api/quick-pay-checkout
[6] Square Developer Documentation: Payments API Webhooks. https://developer.squareup.com/docs/payments-api/webhooks
[7] Square Developer Documentation: Verify and Validate an Event Notification. https://developer.squareup.com/docs/webhooks/step3validate
