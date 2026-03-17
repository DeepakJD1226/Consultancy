import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, logFormSubmission, FABRIC_TYPES, ORDER_STATUSES } from '../lib/supabase';
import type { Fabric, Mill } from '../lib/supabase';
import { insertCatalogFabric, uploadFabricImage } from '../lib/fabrics';
import {
  LayoutDashboard, Package2, Building2, ShoppingBag, TrendingUp,
  Plus, Pencil, X, Check, AlertCircle, CheckCircle, Loader, RefreshCw,
} from 'lucide-react';

type Tab = 'overview' | 'fabrics' | 'mills' | 'orders';
type FabricRow  = Fabric  & { mill?: Mill };
type OrderRow = {
  order_id: string;
  customer_name: string;
  mobile: string;
  email: string;
  address: string;
  length_ordered: number;
  price_per_meter: number;
  total_price: number;
  order_status: string;
  created_at: string;
  fabric_name: string;
  fabric_type: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  confirmed: 'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  shipped:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  delivered: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  cancelled: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
};

const defaultFabricForm = {
  fabric_name: '', fabric_type: 'Cotton', mill_id: '',
  available_length: '', price_per_meter: '', color: '',
  fabric_description: '', availability_status: 'available' as 'available' | 'out_of_stock',
};
const defaultMillForm = { mill_name: '', location: '', contact: '', description: '' };
const defaultEditVals = { available_length: '', price_per_meter: '', availability_status: '' };

export function AdminDashboard({ onNavigate, initialTab = 'overview' }: { onNavigate: (page: string) => void; initialTab?: Tab }) {
  const { user } = useAuth();

  const [tab,     setTab]    = useState<Tab>(initialTab);
  const [fabrics, setFabrics] = useState<FabricRow[]>([]);
  const [mills,   setMills]  = useState<Mill[]>([]);
  const [orders,  setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice,  setNotice] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Fabric add form
  const [showFabricForm,    setShowFabricForm]    = useState(false);
  const [fabricForm,        setFabricForm]        = useState(defaultFabricForm);
  const [fabricImageFile,   setFabricImageFile]   = useState<File | null>(null);
  const [fabricFormLoading, setFabricFormLoading] = useState(false);

  // Mill add form
  const [showMillForm,    setShowMillForm]    = useState(false);
  const [millForm,        setMillForm]        = useState(defaultMillForm);
  const [millFormLoading, setMillFormLoading] = useState(false);

  // Inline fabric edit
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editVals, setEditVals] = useState(defaultEditVals);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const flash = (kind: 'ok' | 'err', msg: string) => {
    setNotice({ kind, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadFabrics(), loadMills(), loadOrders()]);
    setLoading(false);
  };

  const loadFabrics = async () => {
    const { data, error } = await supabase
      .from('fabrics').select('*, mill:mill_id(*)').order('created_at', { ascending: false });
    console.log('[loadFabrics] result:', { count: data?.length, error });
    setFabrics((data ?? []) as FabricRow[]);
  };
  const loadMills = async () => {
    const { data } = await supabase.from('mills').select('*').order('mill_name');
    setMills((data ?? []) as Mill[]);
  };
  const loadOrders = async () => {
    const modern = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!modern.error && modern.data) {
      const mapped: OrderRow[] = modern.data.map((row) => ({
        order_id: row.id,
        customer_name: row.customer_name ?? '—',
        mobile: row.mobile ?? '—',
        email: row.email ?? '—',
        address: row.address ?? '—',
        length_ordered: Number(row.length_ordered ?? 0),
        price_per_meter: Number(row.price_per_meter ?? 0),
        total_price: Number(row.total_price ?? 0),
        order_status: row.order_status ?? 'pending',
        created_at: row.created_at,
        fabric_name: row.fabric_name ?? '—',
        fabric_type: 'Fabric',
      }));
      setOrders(mapped);
      return;
    }

    const { data } = await supabase
      .from('fabric_orders')
      .select('*, fabric:fabric_id(fabric_name,fabric_type,color)')
      .order('created_at', { ascending: false });
    const mappedLegacy: OrderRow[] = (data ?? []).map((row) => ({
      order_id: row.order_id,
      customer_name: '—',
      mobile: '—',
      email: row.customer_email ?? '—',
      address: row.notes ?? '—',
      length_ordered: Number(row.quantity_meters ?? 0),
      price_per_meter: 0,
      total_price: Number(row.total_price ?? 0),
      order_status: row.order_status ?? 'pending',
      created_at: row.created_at,
      fabric_name: row.fabric?.fabric_name ?? '—',
      fabric_type: row.fabric?.fabric_type ?? 'Fabric',
    }));
    setOrders(mappedLegacy);
  };

  // ── Add fabric ──────────────────────────────────────────────────────────────
  const handleAddFabric = async (e: FormEvent) => {
    e.preventDefault();
    setFabricFormLoading(true);
    try {
      if (!fabricForm.fabric_name || !fabricForm.available_length || !fabricForm.price_per_meter)
        throw new Error('Please fill in all required fields');

      const imageUrl = fabricImageFile ? await uploadFabricImage(fabricImageFile) : null;

      const insertInput = {
        name: fabricForm.fabric_name.trim(),
        type: fabricForm.fabric_type,
        length: parseFloat(fabricForm.available_length),
        price: parseFloat(fabricForm.price_per_meter),
        imageUrl,
        availability: fabricForm.availability_status === 'available',
        millId: fabricForm.mill_id || null,
        description: fabricForm.fabric_description.trim() || null,
        color: fabricForm.color.trim() || null,
      };

      console.log('[handleAddFabric] inserting fabric:', insertInput);
      const inserted = await insertCatalogFabric(insertInput);
      console.log('Insert fabric:', inserted, null);

      await logFormSubmission({ userId: user?.id ?? null, formType: 'admin_add_fabric', payload: fabricForm as unknown as Record<string, unknown>, status: 'success' });
      setFabricForm(defaultFabricForm);
      setFabricImageFile(null);
      setShowFabricForm(false);
      await loadFabrics();
      flash('ok', 'Fabric added successfully!');
    } catch (err) {
      await logFormSubmission({ userId: user?.id ?? null, formType: 'admin_add_fabric', payload: fabricForm as unknown as Record<string, unknown>, status: 'error', errorMessage: err instanceof Error ? err.message : 'Unknown' });
      flash('err', err instanceof Error ? err.message : 'Failed to add fabric');
    } finally {
      setFabricFormLoading(false);
    }
  };

  // ── Add mill ────────────────────────────────────────────────────────────────
  const handleAddMill = async (e: FormEvent) => {
    e.preventDefault();
    setMillFormLoading(true);
    try {
      if (!millForm.mill_name || !millForm.location)
        throw new Error('Mill name and location are required');

      const { error } = await supabase.from('mills').insert([{
        mill_name:   millForm.mill_name.trim(),
        location:    millForm.location.trim(),
        contact:     millForm.contact.trim() || null,
        description: millForm.description.trim() || null,
      }]);
      if (error) throw error;

      await logFormSubmission({ userId: user?.id ?? null, formType: 'admin_add_mill', payload: millForm as unknown as Record<string, unknown>, status: 'success' });
      setMillForm(defaultMillForm);
      setShowMillForm(false);
      await loadMills();
      flash('ok', 'Mill added successfully!');
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Failed to add mill');
    } finally {
      setMillFormLoading(false);
    }
  };

  // ── Edit fabric ─────────────────────────────────────────────────────────────
  const startEdit = (f: FabricRow) => {
    setEditId(f.fabric_id);
    setEditVals({ available_length: String(f.available_length), price_per_meter: String(f.price_per_meter), availability_status: f.availability_status });
  };

  const saveEdit = async (fabricId: string) => {
    try {
      const len = parseFloat(editVals.available_length);
      const prc = parseFloat(editVals.price_per_meter);
      if (isNaN(len) || isNaN(prc)) throw new Error('Enter valid numbers');

      // Only update guaranteed legacy columns to avoid PGRST204 unknown-column errors.
      // availability_status + availability covers both old and new schema columns.
      const updatePayload = {
        available_length:    len,
        price_per_meter:     prc,
        availability_status: editVals.availability_status,
        availability:        editVals.availability_status === 'available',
      };

      console.log('[saveEdit] updating fabric_id =', fabricId, updatePayload);
      const { error } = await supabase.from('fabrics').update(updatePayload).eq('fabric_id', fabricId);
      console.log('[saveEdit] result:', { error });
      if (error) throw error;

      setEditId(null);
      await loadFabrics();
      flash('ok', 'Fabric updated!');
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Update failed');
    }
  };

  // ── Per-row availability update (strictly scoped by fabric id) ─────────────
  const updateAvailability = async (fabricId: string, status: 'available' | 'out_of_stock') => {
    const payload = { availability_status: status, availability: status === 'available' };
    console.log('[updateAvailability] updating fabric:', fabricId, payload);

    const byFabricId = await supabase.from('fabrics').update(payload).eq('fabric_id', fabricId);
    if (byFabricId.error) {
      const byId = await supabase.from('fabrics').update(payload).eq('id', fabricId);
      console.log('Update availability result', byId.data, byId.error);
      if (byId.error) {
        flash('err', byId.error.message);
        return;
      }
    } else {
      console.log('Update availability result', byFabricId.data, byFabricId.error);
    }

    await loadFabrics();
    flash('ok', `Marked as ${status === 'available' ? 'Available' : 'Out of Stock'}`);
  };

  // ── Update order status ─────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, status: string) => {
    const rpc = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: status,
    });

    if (!rpc.error && (rpc.data as { success?: boolean } | null)?.success) {
      await loadOrders();
      flash('ok', 'Order status updated!');
      return;
    }

    if (rpc.error) {
      console.warn('[updateOrderStatus] RPC failed:', rpc.error.message);
    }

    const modern = await supabase
      .from('orders').update({ order_status: status }).eq('id', orderId);

    if (!modern.error) {
      await loadOrders();
      flash('ok', 'Order status updated!');
      return;
    }

    const legacy = await supabase
      .from('fabric_orders').update({ order_status: status }).eq('order_id', orderId);

    if (!legacy.error) {
      await loadOrders();
      flash('ok', 'Order status updated!');
      return;
    }

    console.error('[updateOrderStatus] failed in all paths', {
      rpcError: rpc.error?.message,
      modernError: modern.error?.message,
      legacyError: legacy.error?.message,
      orderId,
      status,
    });
    flash('err', legacy.error.message);
  };

  const deleteFabric = async (fabricId: string) => {
    console.log('[deleteFabric] deleting fabric_id =', fabricId);
    const { error } = await supabase.from('fabrics').delete().eq('fabric_id', fabricId);
    console.log('[deleteFabric] result:', { error });
    if (error) {
      flash('err', error.message);
      return;
    }
    await loadFabrics();
    flash('ok', 'Fabric deleted');
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = {
    fabrics:  fabrics.length,
    mills:    mills.length,
    orders:   orders.length,
    revenue:  orders.reduce((s, o) => s + (o.total_price ?? 0), 0),
    pending:  orders.filter(o => o.order_status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const inputCls = 'rk-input text-sm';
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rk-fade-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" /> Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAll} className="rk-btn-secondary px-3 py-2 flex items-center gap-1.5 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => onNavigate('shop')} className="rk-btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> View Shop
            </button>
          </div>
        </div>

        {/* Toast */}
        {notice && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {notice.kind === 'ok'
              ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
            <p className={`text-sm font-medium ${
              notice.kind === 'ok' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
            }`}>{notice.msg}</p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Fabrics', val: stats.fabrics,  icon: Package2,  cls: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30'    },
            { label: 'Total Mills',   val: stats.mills,    icon: Building2, cls: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
            { label: 'Total Orders',  val: stats.orders,   icon: ShoppingBag, cls: 'text-green-600 bg-green-50 dark:bg-green-900/30'  },
            { label: 'Pending',       val: stats.pending,  icon: AlertCircle, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30'  },
            { label: 'Revenue (₹)',   val: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: TrendingUp, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          ].map(({ label, val, icon: Icon, cls }) => (
            <div key={label} className="rk-card rk-hover-lift p-5">
              <div className={`inline-flex p-2.5 rounded-xl mb-3 ${cls}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{val}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-8 w-fit">
          {(['overview', 'fabrics', 'mills', 'orders'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}>{t}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────── */}
        {tab === 'overview' && (
          <div className="rk-card p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {['Customer', 'Fabric', 'Qty (m)', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map(o => (
                      <tr key={o.order_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{o.customer_name} ({o.mobile})</td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{o.fabric_name}</td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{o.length_ordered}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">₹{o.total_price.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[o.order_status] ?? ''}`}>
                            {o.order_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FABRICS TAB ──────────────────────────── */}
        {tab === 'fabrics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fabric Catalog</h2>
              <button onClick={() => setShowFabricForm(f => !f)} className="rk-btn-primary text-sm flex items-center gap-1.5">
                {showFabricForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showFabricForm ? 'Cancel' : 'Add Fabric'}
              </button>
            </div>

            {/* Add fabric form */}
            {showFabricForm && (
              <div className="rk-card p-6 border-l-4 border-cyan-500">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Fabric</h3>
                <form onSubmit={handleAddFabric} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Fabric Name *</label>
                    <input className={inputCls} value={fabricForm.fabric_name}
                      onChange={e => setFabricForm(f => ({ ...f, fabric_name: e.target.value }))}
                      placeholder="e.g. Premium Cotton Poplin" required />
                  </div>
                  <div>
                    <label className={labelCls}>Fabric Type *</label>
                    <select className={inputCls} value={fabricForm.fabric_type}
                      onChange={e => setFabricForm(f => ({ ...f, fabric_type: e.target.value }))}>
                      {FABRIC_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Mill</label>
                    <select className={inputCls} value={fabricForm.mill_id}
                      onChange={e => setFabricForm(f => ({ ...f, mill_id: e.target.value }))}>
                      <option value="">— Select mill —</option>
                      {mills.map(m => <option key={m.mill_id} value={m.mill_id}>{m.mill_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Available Length (m) *</label>
                    <input className={inputCls} type="number" step="0.01" min="0" value={fabricForm.available_length}
                      onChange={e => setFabricForm(f => ({ ...f, available_length: e.target.value }))} required />
                  </div>
                  <div>
                    <label className={labelCls}>Price / Meter (₹) *</label>
                    <input className={inputCls} type="number" step="0.01" min="0.01" value={fabricForm.price_per_meter}
                      onChange={e => setFabricForm(f => ({ ...f, price_per_meter: e.target.value }))} required />
                  </div>
                  <div>
                    <label className={labelCls}>Color *</label>
                    <input className={inputCls} value={fabricForm.color}
                      onChange={e => setFabricForm(f => ({ ...f, color: e.target.value }))}
                      placeholder="e.g. Ivory White" />
                  </div>
                  <div>
                    <label className={labelCls}>Fabric Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={inputCls}
                      onChange={e => setFabricImageFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Description</label>
                    <textarea className={`${inputCls} resize-none`} rows={2} value={fabricForm.fabric_description}
                      onChange={e => setFabricForm(f => ({ ...f, fabric_description: e.target.value }))}
                      placeholder="Fabric use case / composition details" />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select className={inputCls} value={fabricForm.availability_status}
                      onChange={e => setFabricForm(f => ({ ...f, availability_status: e.target.value as 'available' | 'out_of_stock' }))}>
                      <option value="available">Available</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                    <button type="submit" disabled={fabricFormLoading} className="rk-btn-primary text-sm">
                      {fabricFormLoading ? 'Saving…' : 'Add Fabric'}
                    </button>
                    <button type="button" onClick={() => { setShowFabricForm(false); setFabricForm(defaultFabricForm); setFabricImageFile(null); }}
                      className="rk-btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Fabrics table */}
            <div className="rk-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      {['ID','Fabric','Type','Mill','Color','₹/m','Length (m)','Status',''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fabrics.map(f => (
                      <tr key={f.fabric_id || (f as unknown as { id?: string }).id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 max-w-[120px] truncate" title={f.fabric_id}>{f.fabric_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-[160px] truncate" title={f.fabric_name}>{f.fabric_name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{f.fabric_type}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{f.mill?.mill_name ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{f.color}</td>
                        {editId === f.fabric_id ? (
                          <>
                            <td className="py-2 px-3"><input type="number" step="0.01" className="rk-input text-xs w-24 py-1" value={editVals.price_per_meter} onChange={e => setEditVals(v => ({ ...v, price_per_meter: e.target.value }))} /></td>
                            <td className="py-2 px-3"><input type="number" step="0.01" className="rk-input text-xs w-24 py-1" value={editVals.available_length} onChange={e => setEditVals(v => ({ ...v, available_length: e.target.value }))} /></td>
                            <td className="py-2 px-3">
                              <select className="rk-input text-xs py-1" value={editVals.availability_status} onChange={e => setEditVals(v => ({ ...v, availability_status: e.target.value }))}>
                                <option value="available">Available</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 flex gap-1.5">
                              <button onClick={() => saveEdit(f.fabric_id)} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">₹{f.price_per_meter}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{f.available_length}</td>
                            <td className="py-3 px-4">
                              <select
                                className="rk-input text-xs py-1 min-w-[170px]"
                                value={f.availability_status}
                                onChange={(e) => updateAvailability(f.fabric_id, e.target.value as 'available' | 'out_of_stock')}
                              >
                                <option value="available">Available</option>
                                <option value="out_of_stock">Out of Stock</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => startEdit(f)} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteFabric(f.fabric_id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fabrics.length === 0 && <p className="text-center py-8 text-slate-500">No fabrics yet. Add one above.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── MILLS TAB ────────────────────────────── */}
        {tab === 'mills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mill Management</h2>
              <button onClick={() => setShowMillForm(f => !f)} className="rk-btn-primary text-sm flex items-center gap-1.5">
                {showMillForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showMillForm ? 'Cancel' : 'Add Mill'}
              </button>
            </div>

            {showMillForm && (
              <div className="rk-card p-6 border-l-4 border-purple-500">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Mill</h3>
                <form onSubmit={handleAddMill} className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Mill Name *</label>
                    <input className={inputCls} value={millForm.mill_name}
                      onChange={e => setMillForm(m => ({ ...m, mill_name: e.target.value }))}
                      placeholder="e.g. Bangalore Weave Co." required />
                  </div>
                  <div>
                    <label className={labelCls}>Location *</label>
                    <input className={inputCls} value={millForm.location}
                      onChange={e => setMillForm(m => ({ ...m, location: e.target.value }))}
                      placeholder="e.g. Bangalore, Karnataka" required />
                  </div>
                  <div>
                    <label className={labelCls}>Contact</label>
                    <input className={inputCls} value={millForm.contact}
                      onChange={e => setMillForm(m => ({ ...m, contact: e.target.value }))}
                      placeholder="+91-XXX-XXX-XXXX" />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <input className={inputCls} value={millForm.description}
                      onChange={e => setMillForm(m => ({ ...m, description: e.target.value }))}
                      placeholder="Specialization or products" />
                  </div>
                  <div className="sm:col-span-2 flex gap-3 pt-2">
                    <button type="submit" disabled={millFormLoading} className="rk-btn-primary text-sm">
                      {millFormLoading ? 'Saving…' : 'Add Mill'}
                    </button>
                    <button type="button" onClick={() => { setShowMillForm(false); setMillForm(defaultMillForm); }}
                      className="rk-btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="rk-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      {['Mill Name','Location','Contact','Description','Fabrics','Added'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mills.map(m => (
                      <tr key={m.mill_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{m.mill_name}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.location}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.contact ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{m.description ?? '—'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {fabrics.filter(f => f.mill_id === m.mill_id).length}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mills.length === 0 && <p className="text-center py-8 text-slate-500">No mills yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ───────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Orders</h2>
            <div className="rk-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      {['Order ID','Customer Name','Mobile','Address','Fabric Ordered','Length (m)','Total Price','Order Status','Date'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orders.map(o => (
                      <tr key={o.order_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{o.order_id.slice(0,8)}…</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={o.customer_name}>{o.customer_name}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{o.mobile}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={o.address}>{o.address}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{o.fabric_name}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{o.length_ordered}m</td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">₹{o.total_price.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <select
                            value={o.order_status}
                            onChange={e => updateOrderStatus(o.order_id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer focus:outline-none ${STATUS_BADGE[o.order_status] ?? ''}`}
                          >
                            {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <p className="text-center py-8 text-slate-500">No orders yet.</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
