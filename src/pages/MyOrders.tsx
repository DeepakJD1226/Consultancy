import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ShoppingBag, ClipboardList, AlertCircle, Loader, ArrowRight } from 'lucide-react';

type OrderRow = {
  id: string;
  user_id: string | null;
  fabric_id: string;
  fabric_name: string;
  customer_name: string;
  mobile: string;
  email: string;
  address: string;
  length_ordered: number;
  price_per_meter: number;
  total_price: number;
  order_status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  confirmed: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
  shipped:   'bg-purple-100 text-purple-700  dark:bg-purple-900/40 dark:text-purple-300',
  delivered: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
  cancelled: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
};

export function MyOrders({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();

  const [orders,  setOrders]  = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setOrders((data ?? []) as OrderRow[]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rk-fade-up">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">My Orders</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {orders.length} order{orders.length !== 1 ? 's' : ''} placed
            </p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="rk-btn-primary flex items-center gap-2 text-sm"
          >
            <ShoppingBag className="w-4 h-4" /> Shop More
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 && !error && (
          <div className="rk-card p-16 text-center">
            <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No orders yet</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Browse our fabric catalog to place your first order.</p>
            <button onClick={() => onNavigate('shop')} className="rk-btn-primary inline-flex items-center gap-2">
              Explore Fabrics <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Order cards */}
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="rk-card overflow-hidden">
              {/* Card header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 px-5 py-3 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    #{order.id.replace(/-/g, '').slice(0, 12).toUpperCase()}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.order_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {order.order_status}
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
                {/* Fabric info */}
                <div className="sm:col-span-2">
                  <p className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                    {order.fabric_name ?? '—'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Ordered by {order.customer_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Mobile: {order.mobile} | Email: {order.email ?? '—'}
                  </p>
                  {order.address && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
                      📍 {order.address}
                    </p>
                  )}
                </div>

                {/* Price info */}
                <div className="flex sm:flex-col sm:items-end justify-between items-center">
                  <div className="text-center sm:text-right">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      ₹{order.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {order.length_ordered}m × ₹{Number(order.price_per_meter ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
