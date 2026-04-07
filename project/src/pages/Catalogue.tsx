import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useProducts, useCategories } from '../hooks/useProducts';
import { Product, CartItem, SortOption, ProductFilters } from '../lib/types';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

interface CatalogueProps {
  onAddToCart: (item: CartItem) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'alpha', label: 'A → Z' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'condition_best', label: 'Best Condition' },
];

const PRICE_PRESETS = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50–$150', min: 50, max: 150 },
  { label: '$150–$300', min: 150, max: 300 },
  { label: 'Over $300', min: 300, max: undefined },
];

export default function Catalogue({ onAddToCart }: CatalogueProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [filters, setFilters] = useState<ProductFilters>({
    category: searchParams.get('category') || '',
    search: '',
    sortBy: 'alpha',
    priceMin: undefined,
    priceMax: undefined,
    page: 1,
  });

  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setFilters(f => ({ ...f, category: cat, page: 1 }));
  }, [searchParams]);

  const { data, isLoading, isFetching } = useProducts(filters);
  const { data: categories } = useCategories();

  const totalPages = data ? Math.ceil(data.totalItems / 24) : 1;

  function setFilter<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  }

  function applyPreset(index: number) {
    const preset = PRICE_PRESETS[index];
    setActivePreset(index);
    setCustomMin('');
    setCustomMax('');
    setFilters(f => ({ ...f, priceMin: preset.min, priceMax: preset.max, page: 1 }));
  }

  function clearPreset() {
    setActivePreset(null);
    setCustomMin('');
    setCustomMax('');
    setFilters(f => ({ ...f, priceMin: undefined, priceMax: undefined, page: 1 }));
  }

  function applyCustomPrice() {
    const min = customMin ? parseFloat(customMin) : undefined;
    const max = customMax ? parseFloat(customMax) : undefined;
    setActivePreset(null);
    setFilters(f => ({ ...f, priceMin: min, priceMax: max, page: 1 }));
  }

  function clearFilters() {
    setFilters({ category: '', search: '', sortBy: 'alpha', priceMin: undefined, priceMax: undefined, page: 1 });
    setCustomMin('');
    setCustomMax('');
    setActivePreset(null);
    setSearchParams({});
  }

  const hasActiveFilters = !!(filters.category || filters.search || filters.priceMin !== undefined || filters.priceMax !== undefined);

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-[--color-muted] uppercase tracking-wider mb-2">Category</label>
        <select
          value={filters.category}
          onChange={e => {
            setFilter('category', e.target.value);
            if (e.target.value) {
              setSearchParams({ category: e.target.value });
            } else {
              setSearchParams({});
            }
          }}
          className="w-full border border-[--color-border] rounded-xl px-3 py-2.5 text-sm text-[--color-text] bg-white focus:outline-none focus:border-[--color-primary] transition-colors"
        >
          <option value="">All Categories</option>
          {categories?.map(cat => (
            <option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-[--color-muted] uppercase tracking-wider mb-2">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={e => setFilter('sortBy', e.target.value as SortOption)}
          className="w-full border border-[--color-border] rounded-xl px-3 py-2.5 text-sm text-[--color-text] bg-white focus:outline-none focus:border-[--color-primary] transition-colors"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-[--color-muted] uppercase tracking-wider mb-2">Price Range</label>
        <div className="space-y-2 mb-3">
          {PRICE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => activePreset === i ? clearPreset() : applyPreset(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activePreset === i ? 'bg-[--color-primary] text-white' : 'bg-[--color-bg] text-[--color-text] hover:bg-[--color-primary] hover:bg-opacity-10'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min $"
            value={customMin}
            onChange={e => setCustomMin(e.target.value)}
            className="w-full border border-[--color-border] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[--color-primary] transition-colors"
          />
          <span className="text-[--color-muted] text-sm">–</span>
          <input
            type="number"
            placeholder="Max $"
            value={customMax}
            onChange={e => setCustomMax(e.target.value)}
            className="w-full border border-[--color-border] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[--color-primary] transition-colors"
          />
        </div>
        <button
          onClick={applyCustomPrice}
          className="w-full mt-2 bg-[--color-bg] hover:bg-[--color-primary] hover:bg-opacity-10 border border-[--color-border] text-[--color-text] text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Apply Range
        </button>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium py-2 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <div className="bg-gradient-to-br from-[#4A2C17] to-[#6B4423] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">The Catalogue</h1>
          <p className="text-amber-200 mb-6">Browse all available vintage cameras, lenses & accessories</p>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-muted]" />
              <input
                type="text"
                placeholder="Search by brand, model…"
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-amber-200 focus:outline-none focus:border-[--color-accent] transition-colors text-sm"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="lg:hidden flex items-center gap-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white font-semibold px-4 py-2.5 rounded-xl transition-all border border-white border-opacity-20 text-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[--color-accent]" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-[--color-border] p-6 sticky top-24">
              <h2 className="font-bold text-[--color-text] mb-5">Filter & Sort</h2>
              <FiltersContent />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[--color-muted]">
                {isLoading ? 'Loading…' : `${data?.totalItems ?? 0} item${data?.totalItems !== 1 ? 's' : ''} found`}
              </p>
              {isFetching && !isLoading && <Loader2 className="w-4 h-4 animate-spin text-[--color-muted]" />}
            </div>

            {filtersOpen && (
              <div className="lg:hidden bg-white rounded-2xl border border-[--color-border] p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[--color-text]">Filter & Sort</h3>
                  <button onClick={() => setFiltersOpen(false)}>
                    <X className="w-5 h-5 text-[--color-muted]" />
                  </button>
                </div>
                <FiltersContent />
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[--color-border] overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-[--color-bg]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-[--color-bg] rounded w-3/4" />
                      <div className="h-3 bg-[--color-bg] rounded w-1/2" />
                      <div className="h-5 bg-[--color-bg] rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {data.items.map(product => (
                    <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <button
                      onClick={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                      disabled={filters.page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[--color-border] text-sm font-medium text-[--color-text] hover:border-[--color-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-sm text-[--color-muted]">Page {filters.page ?? 1} of {totalPages}</span>
                    <button
                      onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, (f.page ?? 1) + 1) }))}
                      disabled={filters.page === totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[--color-border] text-sm font-medium text-[--color-text] hover:border-[--color-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[--color-bg] flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-[--color-muted] opacity-40" />
                </div>
                <p className="font-semibold text-[--color-text] text-lg mb-2">No items found</p>
                <p className="text-[--color-muted] text-sm mb-5">Try adjusting your search or filters.</p>
                <button
                  onClick={clearFilters}
                  className="text-[--color-primary] font-semibold text-sm hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
