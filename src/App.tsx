import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Checkout } from './pages/Checkout';
import { Bookings } from './pages/Bookings';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { FabricShop } from './pages/FabricShop';
import { MyOrders } from './pages/MyOrders';
import { OrderRequest } from './pages/OrderRequest';
import { Cart } from './pages/Cart';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { AdminOrders } from './pages/AdminOrders';

function pageFromPath(pathname: string): string {
  const path = pathname.toLowerCase();
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/admin') return 'admin';
  if (path === '/admin/orders') return 'admin-orders';
  if (path === '/my-orders') return 'my-orders';
  if (path === '/cart') return 'cart';
  if (path === '/profile') return 'profile';
  if (path === '/checkout') return 'checkout';
  if (path === '/bookings') return 'bookings';
  if (path === '/order-request') return 'order-request';
  if (path === '/order-confirmation') return 'order-confirmation';
  if (path === '/shop' || path === '/products' || path === '/browse-products' || path === '/shop-fabrics') return path.slice(1);
  return 'home';
}

function pathFromPage(page: string): string {
  if (page === 'home') return '/';
  if (page === 'products') return '/shop';
  if (page === 'admin-orders') return '/admin/orders';
  return `/${page}`;
}

function AppContent() {
  const { user, role, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => pageFromPath(window.location.pathname));

  const navigate = useCallback((page: string) => {
    if ((page === 'admin' || page === 'admin-orders') && role !== 'admin') return;
    setCurrentPage(page);
  }, [role]);

  useEffect(() => {
    const expectedPath = pathFromPage(currentPage);
    if (window.location.pathname !== expectedPath) {
      window.history.pushState({}, '', expectedPath);
    }
  }, [currentPage]);

  useEffect(() => {
    const onPopState = () => setCurrentPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Redirect after login based on role
  useEffect(() => {
    if (user && role && (currentPage === 'login' || currentPage === 'register')) {
      setCurrentPage(role === 'admin' ? 'admin' : 'shop');
    }
  }, [user, role, currentPage]);

  // Redirect away from protected pages when logged out
  useEffect(() => {
    if (!user && !loading) {
      const protected_ = ['admin', 'admin-orders', 'my-orders', 'checkout', 'bookings', 'profile'];
      if (protected_.includes(currentPage)) setCurrentPage('login');
    }
  }, [user, loading, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar currentPage={currentPage} onNavigate={navigate} />
      <main className="min-h-screen rk-page-surface">
        {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
        {currentPage === 'login'    && !user && <Auth mode="login"    onNavigate={navigate} />}
        {currentPage === 'register' && !user && <Auth mode="register" onNavigate={navigate} />}
        {/* Admin */}
        {currentPage === 'admin' && user && role === 'admin' && <AdminDashboard onNavigate={navigate} />}
        {currentPage === 'admin-orders' && user && role === 'admin' && <AdminOrders onNavigate={navigate} />}
        {/* Fabric shop aliases */}
        {(currentPage === 'shop' || currentPage === 'products' || currentPage === 'browse-products' || currentPage === 'shop-fabrics') && (
          <FabricShop onNavigate={navigate} />
        )}
        {currentPage === 'cart' && <Cart onNavigate={navigate} />}
        {currentPage === 'order-request' && <OrderRequest onNavigate={navigate} />}
        {currentPage === 'order-confirmation' && <OrderConfirmation onNavigate={navigate} />}
        {/* My orders */}
        {currentPage === 'my-orders' && user && <MyOrders onNavigate={navigate} />}
        {/* Legacy pages */}
        {currentPage === 'checkout' && user && <Checkout onNavigate={setCurrentPage} />}
        {currentPage === 'bookings' && user && <Bookings onNavigate={setCurrentPage} />}
        {currentPage === 'profile'  && user && <Profile  onNavigate={setCurrentPage} />}
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
