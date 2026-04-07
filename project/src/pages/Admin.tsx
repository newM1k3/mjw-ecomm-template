import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Settings, Star, CheckCircle, RotateCcw, Loader2, Eye, EyeOff, Save, ImageOff, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import pb from '../lib/pocketbase';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import AdminImageUpload from '../components/AdminImageUpload';
import ConditionBadge from '../components/ConditionBadge';
import { Product } from '../lib/types';
import { STORE_CONFIG } from '../lib/config';

type AdminTab = 'products' | 'settings';
type ProductFilter = 'all' | 'available' | 'sold' | 'no_photo';

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
  // PHOTO UPLOAD WORKFLOW FOR SCOTT
  // ================================
  // INITIAL BULK UPLOAD (one-time):
  // 1. Go to /admin and sign in
  // 2. Click the "No Photo" tab — this shows only products without images
  // 3. Open your Google Drive photos folder on the same device
  // 4. For each product in the list, find the matching photo in Google Drive,
  //    download it to your device, then click the product thumbnail to open
  //    the upload modal
  // 5. Choose the photo, preview it, confirm it's correct, then click "Upload"
  // 6. The product disappears from the "No Photo" list when done
  // 7. Repeat until "No Photo" count reaches 0
  //
  // ONGOING (new inventory):
  // 1. Add the new product via PocketBase dashboard or wait for the import script
  // 2. Go to /admin → "No Photo" tab → upload the photo for the new item
  //
  // ONGOING (sold item):
  // 1. Go to /admin → "Available" tab
  // 2. Find the item and click "Mark as Sold"
  // ================================

  const { logout } = useAuth();
  const { markSold, markAvailable, toggleFeatured, addProductImages, removeProductImage, getSetting, setSetting } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [productFilter, setProductFilter] = useState<ProductFilter>('no_photo');
  const [adminSearch, setAdminSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [squareAccessToken, setSquareAccessToken] = useState('');
  const [squareLocationId, setSquareLocationId] = useState('');
  const [squareWebhookKey, setSquareWebhookKey] = useState('');
  const [squareEnvironment, setSquareEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [hasSquareToken, setHasSquareToken] = useState(false);
  const [hasSquareLocation, setHasSquareLocation] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: allProducts, isLoading: productsLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      return await pb.collection('products').getFullList<Product>({
        sort: 'brand_model',
      });
    },
  });

  useEffect(() => {
    if (activeTab === 'settings') {
      getSetting('square_environment').then(v => { if (v) setSquareEnvironment(v as 'sandbox' | 'production'); });
      getSetting('square_access_token').then(v => { setHasSquareToken(!!v); });
      getSetting('square_location_id').then(v => { setHasSquareLocation(!!v); });
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

  async function handleAddImages(productId: string, files: File[]) {
    await addProductImages(productId, files);
    await refetch();
  }

  async function handleRemoveImage(productId: string, filename: string) {
    await removeProductImage(productId, filename);
    await refetch();
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      if (squareAccessToken) {
        await setSetting('square_access_token', squareAccessToken);
        setHasSquareToken(true);
        setSquareAccessToken('');
      }
      if (squareLocationId) {
        await setSetting('square_location_id', squareLocationId);
        setHasSquareLocation(true);
        setSquareLocationId('');
      }
      if (squareWebhookKey) {
        await setSetting('square_webhook_signature_key', squareWebhookKey);
        setSquareWebhookKey('');
      }
      await setSetting('square_environment', squareEnvironment);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  }

  const filteredProducts = (allProducts ?? []).filter(p => {
    if (productFilter === 'available') return p.is_available && !p.is_sold;
    if (productFilter === 'sold') return p.is_sold;
    if (productFilter === 'no_photo') return !p.image || p.image.length === 0;
    return true;
  });

  const displayedProducts = filteredProducts.filter(p =>
    adminSearch === '' || p.brand_model.toLowerCase().includes(adminSearch.toLowerCase())
  );

  const counts = {
    all: allProducts?.length ?? 0,
    available: allProducts?.filter(p => p.is_available && !p.is_sold).length ?? 0,
    sold: allProducts?.filter(p => p.is_sold).length ?? 0,
    no_photo: allProducts?.filter(p => !p.image || p.image.length === 0).length ?? 0,
  };

  const FILTER_TABS: { id: ProductFilter; label: string; Icon: React.ElementType }[] = [
    { id: 'no_photo', label: 'No Photo', Icon: ImageOff },
    { id: 'available', label: 'Available', Icon: Package },
    { id: 'sold', label: 'Sold', Icon: CheckCircle },
    { id: 'all', label: 'All', Icon: Package },
  ];

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
            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-muted]" />
              <input
                type="text"
                placeholder="Search products…"
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[--color-border] rounded-xl text-sm text-[--color-text] bg-white focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
              />
              {adminSearch && (
                <button
                  onClick={() => setAdminSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-muted] hover:text-[--color-text] text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {FILTER_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setProductFilter(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    productFilter === id
                      ? id === 'no_photo'
                        ? 'bg-orange-500 text-white'
                        : 'bg-[--color-primary] text-white'
                      : 'bg-white border border-[--color-border] text-[--color-muted] hover:text-[--color-text]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="text-xs opacity-70">({counts[id]})</span>
                </button>
              ))}
            </div>

            {/* Result count */}
            {!productsLoading && (
              <p className="text-xs text-[--color-muted] mb-4">
                Showing {displayedProducts.length} of {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                {productFilter === 'no_photo' && counts.no_photo > 0 && (
                  <span className="ml-2 text-orange-600 font-medium">{counts.no_photo} still need photos</span>
                )}
                {productFilter === 'no_photo' && counts.no_photo === 0 && (
                  <span className="ml-2 text-green-600 font-medium">All products have photos!</span>
                )}
              </p>
            )}

            {productsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[--color-primary] animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {displayedProducts.map(product => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap ${
                      product.is_sold ? 'border-gray-200 opacity-60' : 'border-[--color-border]'
                    }`}
                  >
                    <AdminImageUpload
                      product={product}
                      onAddImages={(files) => handleAddImages(product.id, files)}
                      onRemoveImage={(filename) => handleRemoveImage(product.id, filename)}
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

                {displayedProducts.length === 0 && (
                  <div className="text-center py-16 text-[--color-muted]">
                    {productFilter === 'no_photo' ? (
                      <>
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-70" />
                        <p className="text-sm font-medium text-green-700">All products have photos!</p>
                      </>
                    ) : (
                      <>
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No products in this view.</p>
                      </>
                    )}
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
                <h2 className="text-lg font-bold text-[--color-text] mb-1">Square Configuration</h2>
                <p className="text-sm text-[--color-muted]">
                  Connect your Square account to enable online checkout. You can find your credentials in the
                  Square Developer Console.
                </p>
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">
                  Access Token {hasSquareToken && <span className="text-green-600 text-xs font-normal ml-1">Saved</span>}
                </label>
                <input
                  type="password"
                  value={squareAccessToken}
                  onChange={e => setSquareAccessToken(e.target.value)}
                  placeholder={hasSquareToken ? 'Enter new token to replace existing…' : 'EAAAl… (Sandbox or Production)'}
                  className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                />
              </div>

              {/* Location ID */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">
                  Location ID {hasSquareLocation && <span className="text-green-600 text-xs font-normal ml-1">Saved</span>}
                </label>
                <input
                  type="text"
                  value={squareLocationId}
                  onChange={e => setSquareLocationId(e.target.value)}
                  placeholder={hasSquareLocation ? 'Enter new Location ID to replace existing…' : 'L… (from Square Dashboard → Locations)'}
                  className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                />
              </div>

              {/* Webhook Signature Key */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">
                  Webhook Signature Key
                </label>
                <input
                  type="password"
                  value={squareWebhookKey}
                  onChange={e => setSquareWebhookKey(e.target.value)}
                  placeholder="From Square Developer Console → Webhooks"
                  className="w-full border border-[--color-border] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent"
                />
              </div>

              {/* Environment toggle */}
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1.5">Environment</label>
                <div className="flex gap-3">
                  {(['sandbox', 'production'] as const).map(env => (
                    <label key={env} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="squareEnvironment"
                        value={env}
                        checked={squareEnvironment === env}
                        onChange={() => setSquareEnvironment(env)}
                        className="accent-[--color-primary]"
                      />
                      <span className={`text-sm font-medium capitalize ${env === 'production' ? 'text-green-700' : 'text-amber-700'}`}>
                        {env}
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
                {settingsSaving ? 'Saving…' : settingsSaved ? 'Saved ✓' : 'Save Settings'}
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
