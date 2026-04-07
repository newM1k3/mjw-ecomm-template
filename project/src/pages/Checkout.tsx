import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { STORE_CONFIG } from '../lib/config';

interface OrderConfirmation {
  customerEmail: string;
  customerName: string;
  totalAmount: number;
}

export default function Checkout() {
  const [params] = useSearchParams();
  // Square appends ?orderId=... to the redirect URL after a successful payment.
  // We also support the legacy ?cancelled=true path for cancelled payments.
  const orderId = params.get('orderId') ?? params.get('order_id');
  const cancelled = params.get('cancelled') === 'true';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>('loading');
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (cancelled) {
      setStatus('cancelled');
      return;
    }
    if (!orderId) {
      setStatus('error');
      setErrorMessage('No order ID found in the URL.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/.netlify/functions/verify-checkout?orderId=${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Could not verify order.');
        }
        const data = await res.json();
        setOrder(data);
        setStatus('success');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        setStatus('error');
      }
    }

    verify();
  }, [orderId, cancelled]);

  return (
    <div className="min-h-screen bg-[--color-bg] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="bg-white rounded-2xl border border-[--color-border] p-10 text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-[--color-primary] mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-[--color-text] mb-2">Confirming your order…</h2>
            <p className="text-[--color-muted] text-sm">Please wait while we verify your payment.</p>
          </div>
        )}

        {status === 'success' && order && (
          <div className="bg-white rounded-2xl border border-[--color-border] p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-[--color-text] mb-2">Order Confirmed!</h2>
            <p className="text-[--color-muted] text-sm mb-6 leading-relaxed">
              Thanks{order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}! Your order has been received and Scott has been notified. A confirmation email will be sent to <strong>{order.customerEmail}</strong>.
            </p>
            <div className="bg-[--color-bg] rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[--color-muted] text-sm">Order Total</span>
                <span className="font-bold text-[--color-text]">
                  ${order.totalAmount.toFixed(2)} <span className="text-xs text-[--color-muted] font-normal">{STORE_CONFIG.currency}</span>
                </span>
              </div>
            </div>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="bg-white rounded-2xl border border-[--color-border] p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-9 h-9 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-[--color-text] mb-2">Order Cancelled</h2>
            <p className="text-[--color-muted] text-sm mb-6 leading-relaxed">
              Your payment was cancelled and you have not been charged. Your cart items are still saved.
            </p>
            <Link
              to="/catalogue"
              className="inline-flex items-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Catalogue
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl border border-[--color-border] p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-9 h-9 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-[--color-text] mb-2">Something went wrong</h2>
            <p className="text-[--color-muted] text-sm mb-4 leading-relaxed">{errorMessage}</p>
            <p className="text-[--color-muted] text-xs mb-6">
              If you believe you were charged, please contact us at <a href={`mailto:${STORE_CONFIG.ownerEmail}`} className="text-[--color-primary] hover:underline">{STORE_CONFIG.ownerEmail}</a>.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
