import { useState } from 'react';
import { X, ShoppingCart, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { CartItem } from '../lib/types';
import { STORE_CONFIG } from '../lib/config';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  total: number;
}

export default function CartDrawer({ isOpen, onClose, items, onRemoveItem, onClearCart, total }: CartDrawerProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setIsCheckingOut(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Checkout failed. Please try again.');
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setIsCheckingOut(false);
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-[--color-border]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[--color-primary]" />
            <h2 className="text-lg font-semibold text-[--color-text]">Your Cart</h2>
            {items.length > 0 && (
              <span className="bg-[--color-primary] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[--color-bg] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[--color-muted]" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[--color-bg] flex items-center justify-center">
              <ShoppingCart className="w-9 h-9 text-[--color-muted] opacity-40" />
            </div>
            <p className="text-[--color-muted] text-sm">Your cart is empty.</p>
            <button
              onClick={onClose}
              className="text-[--color-primary] font-semibold text-sm hover:underline"
            >
              Browse the Catalogue
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-[--color-border]">
              {items.map(item => (
                <div key={item.productId} className="flex gap-3 p-4">
                  <div className="w-16 h-16 rounded-lg bg-[--color-bg] overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.brandModel} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-[--color-muted] opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[--color-text] text-sm leading-tight truncate">{item.brandModel}</p>
                    <p className="text-xs text-[--color-muted] mt-0.5 capitalize">{item.priceType === 'quick' ? 'Quick-Sale Price' : 'Collector Price'}</p>
                    <p className="text-[--color-primary] font-bold text-sm mt-1">${item.price.toFixed(2)} {STORE_CONFIG.currency}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 text-[--color-muted] rounded-lg transition-colors self-start mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-[--color-border] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[--color-muted] text-sm">Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span className="font-bold text-[--color-text] text-lg">${total.toFixed(2)} <span className="text-xs text-[--color-muted] font-normal">CAD</span></span>
              </div>

              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>
              )}

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Checkout…
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={onClearCart}
                className="w-full text-xs text-[--color-muted] hover:text-red-500 transition-colors py-1"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
