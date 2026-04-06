import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Package, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useFeaturedProducts, useCategories } from '../hooks/useProducts';
import { STORE_CONFIG } from '../lib/config';
import { Product, CartItem } from '../lib/types';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

interface HomeProps {
  onAddToCart: (item: CartItem) => void;
}

const CONDITION_GUIDE = [
  { rating: '10/10 or NIB', label: 'Mint / New in Box', desc: 'Unused or as-new. May include original packaging and accessories.' },
  { rating: '9/10', label: 'Excellent', desc: 'Minimal signs of handling. Fully functional with no cosmetic issues.' },
  { rating: '8/10', label: 'Very Good', desc: 'Light wear only. All mechanisms work perfectly. A great daily shooter.' },
  { rating: '7/10', label: 'Good', desc: 'Moderate cosmetic wear. Fully functional. May have minor scuffs or brassing.' },
  { rating: '6/10 or below', label: 'User Grade', desc: 'Heavier wear but mechanically sound. Great for parts or a working beater.' },
];

export default function Home({ onAddToCart }: HomeProps) {
  const navigate = useNavigate();
  const { data: featured } = useFeaturedProducts();
  const { data: categories } = useCategories();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [conditionOpen, setConditionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4A2C17] via-[#6B4423] to-[#8B5E3C] text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-amber-200 text-sm font-semibold tracking-widest uppercase">{STORE_CONFIG.name}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Scott's Vintage<br />
              <span className="text-amber-300">Camera Collection</span>
            </h1>
            <p className="text-amber-100 text-lg sm:text-xl leading-relaxed mb-10 max-w-lg">
              Browse Scott's curated collection of vintage cameras, lenses & accessories — handpicked from decades of experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/catalogue')}
                className="inline-flex items-center gap-2 bg-[--color-accent] hover:bg-amber-400 text-[--color-text] font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Browse the Catalogue
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/about')}
                className="inline-flex items-center gap-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-semibold px-7 py-3.5 rounded-xl transition-all border border-white border-opacity-20"
              >
                About the Shop
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[--color-bg] to-transparent" />
      </section>

      <section className="bg-[--color-primary] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-3 gap-4 divide-x divide-white divide-opacity-20">
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Package className="w-4 h-4 text-amber-300" />
                <span className="text-2xl font-bold">220+</span>
              </div>
              <p className="text-amber-200 text-xs uppercase tracking-wider">Items in Stock</p>
            </div>
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-amber-300" />
                <span className="text-2xl font-bold">1970s–2000s</span>
              </div>
              <p className="text-amber-200 text-xs uppercase tracking-wider">Est. Era</p>
            </div>
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-amber-300" />
                <span className="text-xl font-bold">Haliburton</span>
              </div>
              <p className="text-amber-200 text-xs uppercase tracking-wider">Ontario, Canada</p>
            </div>
          </div>
        </div>
      </section>

      {featured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[--color-text]">Staff Picks</h2>
              <p className="text-[--color-muted] text-sm mt-1">Scott's personal favourites</p>
            </div>
            <button
              onClick={() => navigate('/catalogue?featured=true')}
              className="text-[--color-primary] font-semibold text-sm hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
            {featured.map(product => (
              <div key={product.id} className="shrink-0 w-64 snap-start">
                <ProductCard product={product} onClick={() => setSelectedProduct(product)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[--color-border]">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[--color-text]">Shop by Category</h2>
            <p className="text-[--color-muted] text-sm mt-1">Find exactly what you're looking for</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => navigate(`/catalogue?category=${encodeURIComponent(cat.name)}`)}
                className="group flex items-center justify-between p-5 bg-white border border-[--color-border] rounded-2xl hover:border-[--color-primary] hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[--color-bg] group-hover:bg-[--color-primary] group-hover:bg-opacity-10 flex items-center justify-center transition-colors">
                    <Camera className="w-5 h-5 text-[--color-primary]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[--color-text]">{cat.name}</p>
                    <p className="text-xs text-[--color-muted]">{cat.count} item{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[--color-muted] group-hover:text-[--color-primary] transition-colors" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[--color-border]">
        <button
          onClick={() => setConditionOpen(o => !o)}
          className="w-full flex items-center justify-between mb-6 group"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[--color-text] group-hover:text-[--color-primary] transition-colors">Condition Rating Guide</h2>
            <p className="text-[--color-muted] text-sm mt-1">Understanding Scott's X/10 rating scale</p>
          </div>
          {conditionOpen ? <ChevronUp className="w-6 h-6 text-[--color-muted]" /> : <ChevronDown className="w-6 h-6 text-[--color-muted]" />}
        </button>

        {conditionOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONDITION_GUIDE.map(item => {
              const num = parseFloat(item.rating);
              const colourClass = isNaN(num) || num >= 10 ? 'border-emerald-200 bg-emerald-50'
                : num >= 9 ? 'border-green-200 bg-green-50'
                : num >= 8 ? 'border-lime-200 bg-lime-50'
                : num >= 7 ? 'border-yellow-200 bg-yellow-50'
                : 'border-orange-200 bg-orange-50';
              const textClass = isNaN(num) || num >= 10 ? 'text-emerald-800'
                : num >= 9 ? 'text-green-800'
                : num >= 8 ? 'text-lime-800'
                : num >= 7 ? 'text-yellow-800'
                : 'text-orange-800';
              return (
                <div key={item.rating} className={`p-4 rounded-xl border ${colourClass}`}>
                  <p className={`font-bold text-lg mb-0.5 ${textClass}`}>{item.rating}</p>
                  <p className="font-semibold text-[--color-text] text-sm mb-1">{item.label}</p>
                  <p className="text-[--color-muted] text-xs leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="bg-[--color-text] text-amber-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[--color-primary] flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">{STORE_CONFIG.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{STORE_CONFIG.hours}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm mt-1">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{STORE_CONFIG.address}</span>
              </div>
            </div>
            <div className="text-right space-y-1 text-sm">
              <p><a href={`tel:${STORE_CONFIG.phone}`} className="hover:text-white transition-colors">{STORE_CONFIG.phone}</a></p>
              <p><a href={`mailto:${STORE_CONFIG.ownerEmail}`} className="hover:text-white transition-colors">{STORE_CONFIG.ownerEmail}</a></p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white border-opacity-10 text-center text-xs text-amber-300 opacity-60">
            &copy; {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={item => { onAddToCart(item); setSelectedProduct(null); }}
        />
      )}
    </div>
  );
}
