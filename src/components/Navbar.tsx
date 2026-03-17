import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Package, LogOut, LogIn, User, Moon, Sun, LayoutDashboard, ShoppingBag, ClipboardList, ShoppingCart, type LucideIcon } from 'lucide-react';

type NavbarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

type NavItem = { key: string; label: string; icon: LucideIcon };

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const isAdmin = role === 'admin';

  const navItems: NavItem[] = user
    ? isAdmin
      ? [
          { key: 'admin', label: 'Dashboard',   icon: LayoutDashboard },
          { key: 'admin-orders', label: 'Orders', icon: ClipboardList },
          { key: 'shop',  label: 'Fabric Shop',  icon: ShoppingBag },
          { key: 'cart',  label: 'Cart',        icon: ShoppingCart },
        ]
      : [
          { key: 'shop',      label: 'Shop Fabrics', icon: ShoppingBag },
          { key: 'cart',      label: 'Cart',         icon: ShoppingCart },
          { key: 'my-orders', label: 'My Orders',    icon: ClipboardList },
        ]
    : [];

  return (
    <nav className="rk-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onNavigate('home')}>
            <Package className="w-8 h-8 text-cyan-700 dark:text-cyan-400" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl rk-title">R.K. Textiles</span>
              {isAdmin && (
                <span className="hidden sm:inline text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Desktop nav items */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === key
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300'
                    : 'rk-text-muted hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rk-btn-secondary px-3 py-2"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => onNavigate('profile')}
                  className={`p-2 rounded-lg transition-all ${
                    currentPage === 'profile'
                      ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400'
                      : 'rk-text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  onClick={handleSignOut}
                  className="sm:hidden p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-2 px-4 py-2 rk-text-muted hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button onClick={() => onNavigate('register')} className="rk-btn-primary text-sm">
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav row */}
        {user && navItems.length > 0 && (
          <div className="sm:hidden border-t border-slate-100 dark:border-slate-700 py-2">
            <div className="flex gap-1 overflow-x-auto">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    currentPage === key
                      ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300'
                      : 'rk-text-muted hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        </div>
    </nav>
  );
}
