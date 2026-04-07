import { useState } from 'react';
import { X, ShoppingCart, Send, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import pb from '../lib/pocketbase';
import { Product, CartItem } from '../lib/types';
import { STORE_CONFIG } from '../lib/config';
import ConditionBadge from './ConditionBadge';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

type Tab = 'details' | 'enquire';

/** Resolve all image URLs for a product. Returns an empty array if none. */
function getImageUrls(product: Product): string[] {
  const filenames = Array.isArray(product.image)
    ? product.image
    : product.image
    ? [product.image]
    : [];
  return filenames
    .filter(Boolean)
    .map(fn => {
      try {
        return pb.files.getURL(product, fn);
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

export default function ProductModal({ product, onClose, onAddToCart }: ProductModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [enquireForm, setEnquireForm] = useState({ name: '', email: '', message: '' });
  const [enquireStatus, setEnquireStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [enquireError, setEnquireError] = useState('');

  const imageUrls = getImageUrls(product);
  const hasMultiple = imageUrls.length > 1;
  const currentImageUrl = imageUrls[activeImageIdx] ?? '';
  const selectedPrice = product.collector_price;

  function prevImage() {
    setActiveImageIdx(i => (i - 1 + imageUrls.length) % imageUrls.length);
  }

  function nextImage() {
    setActiveImageIdx(i => (i + 1) % imageUrls.length);
  }

  function handleAddToCart() {
    onAddToCart({
      productId: product.id,
      brandModel: product.brand_model,
      priceType: 'collector',
      price: selectedPrice,
      // Always use the first image as the cart thumbnail.
      imageUrl: imageUrls[0] ?? '',
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  async function handleEnquireSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnquireStatus('loading');
    setEnquireError('');
    try {
      const res = await fetch('/.netlify/functions/send-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.brand_model,
          senderName: enquireForm.name,
          senderEmail: enquireForm.email,
          message: enquireForm.message,
        }),
      });
      if (!res.ok) throw new Error('Failed to send enquiry.');
      setEnquireStatus('success');
    } catch {
      setEnquireStatus('error');
      setEnquireError('Could not send your enquiry. Please try emailing us directly.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[--color-border]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[--color-text] leading-tight">{product.brand_model}</h2>
            <ConditionBadge rating={product.condition_rating} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[--color-bg] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[--color-muted]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[--color-border]">
          {(['details', 'enquire'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'text-[--color-primary] border-b-2 border-[--color-primary]' : 'text-[--color-muted] hover:text-[--color-text]'}`}
            >
              {tab === 'details' ? 'Details' : 'Enquire'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="grid sm:grid-cols-2 gap-0">

              {/* ── Image gallery column ── */}
              <div className="bg-[--color-bg] flex flex-col">
                {/* Main large image */}
                <div className="relative aspect-square sm:aspect-auto sm:flex-1 sm:min-h-[280px] overflow-hidden">
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt={`${product.brand_model} — photo ${activeImageIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[--color-muted] min-h-[240px]">
                      <svg className="w-16 h-16 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm opacity-40">No photo available</span>
                    </div>
                  )}

                  {/* Prev / Next arrows — only when multiple images */}
                  {hasMultiple && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Dot indicator */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {imageUrls.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIdx(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === activeImageIdx ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`}
                            aria-label={`Photo ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnail strip — only when multiple images */}
                {hasMultiple && (
                  <div className="flex gap-1.5 p-2 bg-[--color-bg] border-t border-[--color-border]/50 overflow-x-auto">
                    {imageUrls.map((url, idx) => (
                      <button
                        key={url}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === activeImageIdx ? 'border-[--color-primary]' : 'border-transparent hover:border-[--color-primary]/40'}`}
                        aria-label={`View photo ${idx + 1}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Product details column ── */}
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-xs text-[--color-muted] font-medium uppercase tracking-wider mb-1">Category</p>
                  <p className="text-[--color-text] font-medium">{product.category}</p>
                </div>

                {product.details && (
                  <div>
                    <p className="text-xs text-[--color-muted] font-medium uppercase tracking-wider mb-1">Details</p>
                    <p className="text-[--color-text] text-sm leading-relaxed">{product.details}</p>
                  </div>
                )}

                {product.special_notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-700 font-medium uppercase tracking-wider mb-1">Curator's Notes</p>
                    <p className="text-amber-900 text-sm leading-relaxed">{product.special_notes}</p>
                  </div>
                )}

                <div className="pt-2">
                  <span className="text-2xl font-bold text-[--color-primary]">
                    ${product.collector_price.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-[--color-muted]">{STORE_CONFIG.currency}</span>
                  </span>
                </div>

                <button
                  onClick={handleAddToCart}
                  className={`mt-auto w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all ${addedToCart ? 'bg-green-600 text-white' : 'bg-[--color-primary] hover:bg-[--color-primary-dark] text-white'}`}
                >
                  {addedToCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart — ${selectedPrice.toFixed(2)} {STORE_CONFIG.currency}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'enquire' && (
            <div className="p-6 max-w-md mx-auto">
              <p className="text-[--color-muted] text-sm mb-6 leading-relaxed">
                Have a question about the <strong className="text-[--color-text]">{product.brand_model}</strong>? Send Scott a message and he'll get back to you.
              </p>

              {enquireStatus === 'success' ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-[--color-text] text-lg mb-1">Message Sent!</p>
                  <p className="text-[--color-muted] text-sm">Scott will be in touch shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleEnquireSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[--color-muted] uppercase tracking-wider mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      value={enquireForm.name}
                      onChange={e => setEnquireForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm text-[--color-text] focus:outline-none focus:border-[--color-primary] transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[--color-muted] uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={enquireForm.email}
                      onChange={e => setEnquireForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm text-[--color-text] focus:outline-none focus:border-[--color-primary] transition-colors"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[--color-muted] uppercase tracking-wider mb-1.5">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={enquireForm.message}
                      onChange={e => setEnquireForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm text-[--color-text] focus:outline-none focus:border-[--color-primary] transition-colors resize-none"
                      placeholder={`Hi Scott, I'm interested in this ${product.brand_model}...`}
                    />
                  </div>
                  {enquireStatus === 'error' && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-700 text-sm">{enquireError}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={enquireStatus === 'loading'}
                    className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    {enquireStatus === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Enquiry</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
