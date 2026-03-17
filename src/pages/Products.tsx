import { useState, useEffect } from 'react';
import { supabase, Product } from '../lib/supabase';
import { ShoppingCart, AlertCircle } from 'lucide-react';

type ProductsProps = {
  onNavigate: (page: string) => void;
};

type CartItem = {
  productId: string;
  quantity: number;
  product: Product;
};

export function Products({ onNavigate }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: string }>({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('color', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const quantity = parseFloat(quantities[product.id] || '0');
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setNotice('Please enter a valid quantity greater than 0.');
      return;
    }
    if (quantity > 10000) {
      setNotice('Please enter a realistic quantity.');
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: product.id, quantity, product }]);
    }
    setQuantities({ ...quantities, [product.id]: '' });
    setNotice(`${product.name} (${product.color}) added to cart.`);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setNotice('Your cart is empty. Add at least one product to continue.');
      return;
    }
    localStorage.setItem('cartItems', JSON.stringify(cart));
    onNavigate('checkout');
  };

  const groupedByType = products.reduce(
    (acc, product) => {
      if (!acc[product.name]) {
        acc[product.name] = [];
      }
      acc[product.name].push(product);
      return acc;
    },
    {} as { [key: string]: Product[] }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rk-fade-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold rk-title">Cotton Fabrics</h1>
            <p className="rk-text-muted mt-2">Premium quality materials for hotels and businesses</p>
          </div>
          {cart.length > 0 && (
            <div className="rk-card p-6">
              <p className="text-sm rk-text-muted mb-2">Items in cart: {cart.length}</p>
              <p className="text-2xl font-bold text-cyan-700 mb-4">
                ₹{cart.reduce((sum, item) => sum + item.quantity * item.product.price_per_meter, 0).toFixed(2)}
              </p>
              <button
                onClick={handleCheckout}
                className="w-full rk-btn-primary flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {notice && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start justify-between gap-3">
            <p className="text-sm text-emerald-700">{notice}</p>
            <button
              onClick={() => setNotice('')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-12">
          {Object.entries(groupedByType).map(([type, typeProducts]) => (
            <div key={type}>
              <h2 className="text-2xl font-bold rk-title mb-6">{type}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeProducts.map((product) => (
                  <div key={product.id} className="rk-card rk-hover-lift overflow-hidden group">
                    <div className="bg-gradient-to-r from-cyan-100 to-teal-50 h-32 flex items-center justify-center border-b border-cyan-100">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-cyan-700 transition-transform duration-300 group-hover:scale-110">{product.color.charAt(0)}</div>
                        <p className="rk-text-muted text-sm">{product.color}</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold rk-title mb-2">{product.name}</h3>
                      <p className="rk-text-muted text-sm mb-4">{product.description}</p>
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-cyan-700">₹{product.price_per_meter}</p>
                        <p className="text-xs rk-text-muted">per meter</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={quantities[product.id] || ''}
                          onChange={(e) =>
                            setQuantities({ ...quantities, [product.id]: e.target.value })
                          }
                          placeholder="Qty (m)"
                          className="rk-input flex-1 text-sm"
                        />
                        <button
                          onClick={() => addToCart(product)}
                          className="rk-btn-primary px-4 py-2"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-cyan-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-600">Cart ({cart.length} items)</p>
                <p className="text-xl font-bold text-cyan-700">
                  ₹{cart.reduce((sum, item) => sum + item.quantity * item.product.price_per_meter, 0).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCart([])}
                  className="rk-btn-secondary px-4 py-2"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleCheckout}
                  className="rk-btn-primary flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
