import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Settings, Star, CheckCircle, RotateCcw, Loader2, Eye, EyeOff, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import pb from '../lib/pocketbase';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import AdminImageUpload from '../components/AdminImageUpload';
import ConditionBadge from '../components/ConditionBadge';
import { Product } from '../lib/types';
import { STORE_CONFIG } from '../lib/config';

type AdminTab = 'products' | 'settings';
type ProductFilter = 'all' | 'available' | 'sold';

function AdminLogin() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/admin');
  }

  return (
    <div className="min-h-screen bg-[--color-bg] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[--color-border] shadow-sm p-8">
        <h1 className="text-2xl font-bold text-[--color-text] mb-1">Admin Login</h1>
        <p className="text-[--color-muted] text-sm mb-6">{STORE_CONFIG.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[--color-text] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
              placeholder="scott@haliframesphotos.ca"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[--color-text] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-muted] hover:text-[--color-text]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPanel() {
  const { logout } = useAuth();
  const { markSold, markAvailable, toggleFeatured, updateProductImage, getSetting, setSetting } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [productFilter, setProductFilter] = useState<ProductFilter>('available');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stripeKey, setStripeKey] = useState('');
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [hasStripeKey, setHasStripeKey] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: allProducts, isLoading: productsLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      return await pb.collection('products').getFullList<Product>({
        sort: 'category,brand_model',
      });
    },
  });

  useEffect(() => {
    if (activeTab === 'settings') {
      getSetting('stripe_mode').then(v => { if (v) setStripeMode(v as 'test' | 'live'); });
      getSetting('stripe_secret_key').then(v => { setHasStripeKey(!!v); });
    }
  }, [activeTab, getSetting]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleMarkSold(productId: string) {
    setActionLoading(productId + '_sold');
    try { await markSold(productId); await refetch(); } finally { setActionLoading(null); }
  }

  async function handleMarkAvailable(productId: string) {
    setActionLoading(productId + '_avail');
    try { await markAvailable(productId); await refetch(); } finally { setActionLoading(null); }
  }

  async function handleToggleFeatured(productId: string, current: boolean) {
    setActionLoading(productId + '_feat');
    try { await toggleFeatured(productId, !current); await refetch(); } finally { setActionLoading(null); }
  }

  async function handleImageUpload(productId: string, file: File) {
    await updateProductImage(productId, file);
    await refetch();
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      if (stripeKey) await setSetting('stripe_secret_key', stripeKey);
      await setSetting('stripe_mode', stripeMode);
      setSettingsSaved(true);
      setStripeKey('');
      setHasStripeKey(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  }

  const filteredProducts = (allProducts ?? []).filter(p => {
    if (productFilter === 'available') return p.is_available && !p.is_sold;
    if (productFilter === 'sold') return p.is_sold;
    return true;
  });

  const counts = {
    all: allProducts?.length ?? 0,
    available: allProducts?.filter(p => p.is_available && !p.is_sold).length ?? 0,
    sold: allProducts?.filter(p => p.is_sold).length ?? 0,
  };

  const TABS: { id: AdminTab; label: string; Icon: React.ElementType }[] = [
    { id: 'products', label: 'Products', Icon: Package },
    { id: 'settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <div className="bg-white border-b border-[--color-border] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-lg font-bold text-[--color-text]">Admin Panel</h1>
              <p className="text-xs text-[--color-muted]">{STORE_CONFIG.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[--color-muted] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
          <div className="flex gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-[--color-primary] text-[--color-primary]'
                    : 'border-transparent text-[--color-muted] hover:text-[--color-text]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === 'products' && (
          <div>
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['available', 'sold', 'all'] as ProductFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setProductFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    productFilter === f
                      ? 'bg-[--color-primary] text-white'
                      : 'bg-white border border-[--color-border] text-[--color-muted] hover:text-[--color-text]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
                </button>
              ))}
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[--color-primary] animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap ${
                      product.is_sold ? 'border-gray-200 opacity-60' : 'border-[--color-border]'
                    }`}
                  >
                    <AdminImageUpload
                      productId={product.id}
                      currentImageUrl={product.image ? pb.files.getURL(product, product.image, { thumb: '100x100' }) : ''}
                      onUpload={(file) => handleImageUpload(product.id, file)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[--color-text] text-sm leading-tight">{product.brand_model}</p>
                        <ConditionBadge rating={product.condition_rating} />
                        {product.is_featured && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded">
                            <Star className="w-3 h-3" /> Staff Pick
                          </span>
                        )}
                        {product.is_sold && (
                          <span className="inline-flex items-center bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded">
                            Sold
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[--color-muted] mt-0.5">{product.category}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-[--color-text] font-medium">Quick: ${product.quick_sale_price?.toFixed(2)}</span>
                        <span className="text-xs text-[--color-muted]">Collector: ${product.collector_price?.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                        disabled={actionLoading === product.id + '_feat'}
                        title={product.is_featured ? 'Remove Staff Pick' : 'Mark as Staff Pick'}
                        className={`p-2 rounded-lg transition-colors ${
                          product.is_featured
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-[--color-bg] text-[--color-muted] hover:text-amber-500 hover:bg-amber-50'
                        }`}
                      >
                        {actionLoading === product.id + '_feat'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Star className="w-4 h-4" />
                        }
                      </button>

                      {product.is_sold ? (
                        <button
                          onClick={() => handleMarkAvailable(product.id)}
                          disabled={actionLoading === product.id + '_avail'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          {actionLoading === product.id + '_avail'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RotateCcw className="w-3.5 h-3.5" />
                          }
                          Relist
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkSold(product.id)}
                          disabled={actionLoading === product.id + '_sold'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          {actionLoading === product.id + '_sold'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                          Mark Sold
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-16 text-[--color-muted]">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No products in this view.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-lg">
            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-[--color-border] p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[--color-text] mb-1">Stripe Configuration</h2>
                <p className="text-sm text-[--color-muted]">
                  {hasStripeKey
                    ? 'A Stripe secret key is currently saved. Enter a new key below to replace it.'
                    : 'No Stripe key is configured yet. Checkout will not work until a key is saved.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">
                  Stripe Secret Key {hasStripeKey && <span className="text-green-600 text-xs font-normal ml-1">Saved</span>}
                </label>
                <input
                  type="password"
                  value={stripeKey}
                  onChange={e => setStripeKey(e.target.value)}
                  placeholder={hasStripeKey ? 'Enter new key to replace existing…' : 'sk_live_… or sk_test_…'}
                  className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">Mode</label>
                <div className="flex gap-3">
                  {(['test', 'live'] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stripeMode"
                        value={mode}
                        checked={stripeMode === mode}
                        onChange={() => setStripeMode(mode)}
                        className="accent-[--color-primary]"
                      />
                      <span className={`text-sm font-medium capitalize ${mode === 'live' ? 'text-green-700' : 'text-amber-700'}`}>
                        {mode}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="flex items-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {settingsSaving ? 'Saving…' : settingsSaved ? 'Saved' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const isAuthenticated = !!localStorage.getItem('pb_auth');
  if (!isAuthenticated) return <AdminLogin />;
  return <AdminPanel />;
}
