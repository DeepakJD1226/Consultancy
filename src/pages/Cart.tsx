import { useEffect, useState } from 'react';
import { Trash2, ShoppingBag } from 'lucide-react';
import { cartTotal, readCart, removeFromCart, updateCartItemLength } from '../lib/cart';
import type { CartItem } from '../lib/cart';

export function Cart({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const handleRemove = (id: string) => {
    setItems(removeFromCart(id));
  };

  const handleLengthUpdate = (id: string, next: string, max: number) => {
    const value = Number(next);
    if (!Number.isFinite(value) || value <= 0 || value > max) return;
    setItems(updateCartItemLength(id, value));
  };

  const total = cartTotal(items);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rk-fade-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="rk-card p-16 text-center">
            <ShoppingBag className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Your cart is empty</p>
            <button onClick={() => onNavigate('shop')} className="rk-btn-primary mt-6">Continue Shopping</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rk-card p-4 sm:p-5 flex gap-4">
                  <div className="w-28 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.fabricName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{item.fabricName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.fabricType}{item.color ? ` • ${item.color}` : ''}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Length:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max={item.availableLength}
                        defaultValue={item.selectedLength}
                        onBlur={(e) => handleLengthUpdate(item.id, e.target.value, item.availableLength)}
                        className="rk-input text-sm py-1 px-2 w-24"
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Price: ₹{item.pricePerMeter}/m</p>
                    <p className="font-semibold text-cyan-700 dark:text-cyan-400 mt-1">Total: ₹{item.totalPrice.toFixed(2)}</p>
                  </div>
                  <button onClick={() => handleRemove(item.id)} className="p-2 h-fit rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <aside className="rk-card p-6 h-fit">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Order Summary</h2>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200 dark:border-slate-700">
                <span>Total</span>
                <span className="text-cyan-700 dark:text-cyan-400">₹{total.toFixed(2)}</span>
              </div>
              <div className="space-y-3 mt-6">
                <button onClick={() => onNavigate('shop')} className="rk-btn-secondary w-full">Continue Shopping</button>
                <button onClick={() => onNavigate('checkout')} className="rk-btn-primary w-full">Checkout</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
