import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Camera, Menu, X, Settings } from 'lucide-react';
import { STORE_CONFIG } from '../lib/config';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
}

const CATEGORY_LINKS = [
  { label: 'Cameras', value: 'Cameras' },
  { label: 'Lenses', value: 'Lenses' },
  { label: 'Accessories', value: 'Accessories' },
];

export default function Navbar({ cartCount, onCartClick }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = !!localStorage.getItem('pb_auth');

  function goToCategory(category: string) {
    navigate(`/catalogue?category=${encodeURIComponent(category)}`);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[--color-border] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[--color-primary] flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-[--color-text] text-base leading-tight block">{STORE_CONFIG.name}</span>
              <span className="text-[10px] text-[--color-muted] leading-tight block tracking-wide">Vintage Camera Shop</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {CATEGORY_LINKS.map(link => (
              <button
                key={link.value}
                onClick={() => goToCategory(link.value)}
                className="px-4 py-2 text-sm font-medium text-[--color-muted] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/catalogue"
              className="px-4 py-2 text-sm font-medium text-[--color-muted] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-lg transition-colors"
            >
              All Items
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[--color-muted] hover:text-[--color-text] hover:bg-[--color-bg] rounded-lg transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[--color-accent] text-[--color-text] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 hover:bg-[--color-bg] rounded-lg transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5 text-[--color-text]" /> : <Menu className="w-5 h-5 text-[--color-text]" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[--color-border] bg-white px-4 py-3 space-y-1">
          {CATEGORY_LINKS.map(link => (
            <button
              key={link.value}
              onClick={() => goToCategory(link.value)}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium text-[--color-muted] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
          <Link
            to="/catalogue"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium text-[--color-muted] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-lg transition-colors"
          >
            All Items
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-[--color-muted] hover:text-[--color-primary] hover:bg-[--color-bg] rounded-lg transition-colors"
            >
              Admin Panel
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
