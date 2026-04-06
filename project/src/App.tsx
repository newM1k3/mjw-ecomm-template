import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import AdminGuard from './components/AdminGuard';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Admin from './pages/Admin';
import { useCart } from './hooks/useCart';

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const { items, addItem, removeItem, clearCart, total, itemCount } = useCart();

  return (
    <BrowserRouter>
      <Navbar cartCount={itemCount} onCartClick={() => setCartOpen(true)} />
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        total={total}
      />
      <Routes>
        <Route path="/" element={<Home onAddToCart={addItem} />} />
        <Route path="/catalogue" element={<Catalogue onAddToCart={addItem} />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
        <Route path="/admin/login" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
