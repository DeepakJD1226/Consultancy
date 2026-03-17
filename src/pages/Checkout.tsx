import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { clearCart, readCart } from '../lib/cart';
import type { CartItem } from '../lib/cart';
import { calculateInvoiceTotals, type InvoiceLineItem } from '../lib/invoice';
import { sendOrderConfirmationEmails, isValidMobileNumber } from '../lib/orderEmail';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type Notice = { kind: 'ok' | 'err'; msg: string } | null;

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  const msg = (err.message ?? '').toLowerCase();
  const col = column.toLowerCase();

  return (
    err.code === 'PGRST204' ||
    msg.includes(`column "${col}" does not exist`) ||
    msg.includes(`column '${col}' does not exist`) ||
    msg.includes(`column ${col} does not exist`) ||
    msg.includes(`.${col} does not exist`) ||
    msg.includes(`could not find the '${col}' column`)
  );
}

function isRpcUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  const msg = (err.message ?? '').toLowerCase();
  return (
    err.code === 'PGRST202' ||
    msg.includes('could not find the function') ||
    msg.includes('function checkout_place_order')
  );
}

export function Checkout({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setItems(readCart());
    if (user?.email) setEmail(user.email);
  }, []);

  const invoiceItems = useMemo<InvoiceLineItem[]>(
    () =>
      items.map((item) => ({
        name: `${item.fabricName}${item.color ? ` (${item.color})` : ''}`,
        quantity: item.selectedLength,
        quantityLabel: `${item.selectedLength} m`,
        unitPrice: item.pricePerMeter,
        total: item.totalPrice,
      })),
    [items]
  );

  const pricing = useMemo(() => calculateInvoiceTotals(invoiceItems), [invoiceItems]);

  const placeSingleOrder = async (item: CartItem): Promise<{ orderId: string; orderDate: string }> => {
    console.log('[placeSingleOrder] calling RPC for:', item.fabricName, item.fabricId, 'length:', item.selectedLength);

    const params = {
      p_user_id:         user!.id,
      p_customer_name:   customerName.trim(),
      p_mobile:          mobile.trim(),
      p_address:         address.trim(),
      p_email:           email.trim(),
      p_fabric_id:       item.fabricId,
      p_fabric_name:     item.fabricName,
      p_length_ordered:  item.selectedLength,
      p_price_per_meter: item.pricePerMeter,
      p_total_price:     item.totalPrice,
    };

    const { data, error } = await supabase.rpc('checkout_place_order', params);
    console.log('Order result', data, error);

    if (!error) {
      const result = data as { success: boolean; order_id: string };
      if (!result?.success) throw new Error('Order placement failed');
      return { orderId: result.order_id, orderDate: new Date().toISOString() };
    }

    // Fallback for: RPC not deployed yet (PGRST202), missing column errors, or other schema issues.
    if (!isMissingColumnError(error, 'fabric_id') && !isRpcUnavailableError(error)) {
      console.log('Order error:', error);
      throw new Error(error.message);
    }

    console.warn('[placeSingleOrder] RPC unavailable or schema mismatch — falling back to direct insert.', (error as { message?: string }).message);

    // 1) Fetch fabric row — try fabric_id PK first (always exists), then id alias.
    let fabricRow: Record<string, unknown> | null = null;
    let lookupColumn: string = 'fabric_id';

    const pkLookup = await supabase.from('fabrics').select('*').eq('fabric_id', item.fabricId).maybeSingle();
    if (!pkLookup.error && pkLookup.data) {
      fabricRow = pkLookup.data as Record<string, unknown>;
    } else if (pkLookup.error && !isMissingColumnError(pkLookup.error, 'fabric_id')) {
      throw new Error(pkLookup.error.message);
    }

    // If not found by fabric_id, try the id alias column
    if (!fabricRow) {
      const idLookup = await supabase.from('fabrics').select('*').eq('id', item.fabricId).maybeSingle();
      if (!idLookup.error && idLookup.data) {
        fabricRow = idLookup.data as Record<string, unknown>;
        lookupColumn = 'id';
      } else if (idLookup.error && !isMissingColumnError(idLookup.error, 'id')) {
        throw new Error(idLookup.error.message);
      }
    }

    if (!fabricRow) {
      throw new Error(`Fabric "${item.fabricName}" not found. Please run the latest DB migration.`);
    }

    const available = Number(fabricRow.available_length ?? fabricRow.length ?? 0);
    if (item.selectedLength > available) {
      throw new Error(`Insufficient length for ${item.fabricName}. Available ${available}m.`);
    }

    // 2) Insert order using required marketplace columns.
    const fabricIdentifier = String(fabricRow[lookupColumn] ?? item.fabricId);
    const nextLength = available - item.selectedLength;

    // 3) Insert order; retry without fabric_id if the column is missing.
    const baseOrderPayload = {
      user_id: user!.id,
      customer_name: customerName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      fabric_name: item.fabricName,
      length_ordered: item.selectedLength,
      price_per_meter: item.pricePerMeter,
      total_price: item.totalPrice,
      order_status: 'pending',
    };

    const withFabricId = {
      ...baseOrderPayload,
      fabric_id: fabricIdentifier,
    };

    let insert = await supabase.from('orders').insert([withFabricId]).select('id').single();

    if (insert.error && isMissingColumnError(insert.error, 'fabric_id')) {
      insert = await supabase.from('orders').insert([baseOrderPayload]).select('id').single();
    }

    console.log('Order result', insert.data, insert.error);
    if (insert.error) {
      console.log('Order error:', insert.error);
      throw new Error(insert.error.message);
    }

    // 4) Update inventory only after successful order insert.
    // Prevent negative inventory by writing the already-validated nextLength.
    const stockUpdate = await supabase
      .from('fabrics')
      .update({
        available_length: nextLength,
      })
      .eq(lookupColumn, fabricIdentifier)
      .gte('available_length', item.selectedLength);

    if (stockUpdate.error) {
      console.warn('[placeSingleOrder] Stock update skipped (RLS or schema):', stockUpdate.error.message);
    }

    return {
      orderId: String(insert.data?.id ?? crypto.randomUUID()),
      orderDate: new Date().toISOString(),
    };
  };

  const handlePlaceOrder = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (items.length === 0) {
      setNotice({ kind: 'err', msg: 'Cart is empty.' });
      return;
    }

    if (!user) {
      setNotice({ kind: 'err', msg: 'Please login to place order.' });
      onNavigate('login');
      return;
    }

    if (!customerName.trim() || !mobile.trim() || !address.trim() || !email.trim()) {
      setNotice({ kind: 'err', msg: 'Please fill all required checkout fields.' });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNotice({ kind: 'err', msg: 'Enter a valid email address.' });
      return;
    }

    if (!isValidMobileNumber(mobile)) {
      setNotice({ kind: 'err', msg: 'Enter a valid mobile number.' });
      return;
    }

    setPlacing(true);
    try {
      let firstOrderId = '';
      let firstOrderDate = '';
      for (const item of items) {
        const placed = await placeSingleOrder(item);
        if (!firstOrderId) {
          firstOrderId = placed.orderId;
          firstOrderDate = placed.orderDate;
        }
      }

      const orderId = firstOrderId || crypto.randomUUID();
      const orderDate = firstOrderDate
        ? new Date(firstOrderDate).toLocaleString('en-IN')
        : new Date().toLocaleString('en-IN');

      try {
        await sendOrderConfirmationEmails({
          customerName: customerName.trim(),
          customerEmail: email.trim(),
          mobileNumber: mobile.trim(),
          address: address.trim(),
          orderId,
          orderDate,
          orderStatus: 'pending',
          items: invoiceItems,
          shippingCost: pricing.shippingCost,
          taxAmount: pricing.tax,
        });
      } catch (emailError) {
        console.warn('Order placed but email notification failed:', emailError);
      }

      localStorage.setItem(
        'latest_bill',
        JSON.stringify({
          orderId,
          orderDate,
          customerName: customerName.trim(),
          customerEmail: email.trim(),
          mobile: mobile.trim(),
          address: address.trim(),
          items,
          subtotal: pricing.subtotal,
          shippingCost: pricing.shippingCost,
          tax: pricing.tax,
          grandTotal: pricing.grandTotal,
          orderStatus: 'pending',
        })
      );

      clearCart();
      setItems([]);
      setNotice({ kind: 'ok', msg: 'Order placed successfully. Bill generated.' });
      setTimeout(() => onNavigate('order-confirmation'), 1000);
    } catch (error) {
      console.error('Order failed', error);
      setNotice({ kind: 'err', msg: error instanceof Error ? error.message : 'Failed to place order.' });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rk-fade-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Checkout</h1>

        {notice && (
          <div
            className={`mb-6 rounded-xl p-4 flex items-start gap-2 ${
              notice.kind === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {notice.kind === 'ok' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
            <p className="text-sm">{notice.msg}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <form onSubmit={handlePlaceOrder} className="lg:col-span-2 rk-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Details</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
              <input className="rk-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input className="rk-input" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input className="rk-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address</label>
              <textarea className="rk-input resize-none" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => onNavigate('cart')} className="rk-btn-secondary flex-1">Back to Cart</button>
              <button type="submit" disabled={placing || items.length === 0} className="rk-btn-primary flex-1 inline-flex items-center justify-center gap-2">
                {placing ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing...</> : 'Place Order'}
              </button>
            </div>
          </form>

          <aside className="rk-card p-6 h-fit">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Order Summary</h2>
            <div className="space-y-3 max-h-80 overflow-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="border-b border-slate-100 dark:border-slate-700 pb-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{item.fabricName}</p>
                  <p className="text-xs text-slate-500">{item.selectedLength}m × ₹{item.pricePerMeter}</p>
                  <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">₹{item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between text-lg font-bold">
              <span>Subtotal</span>
              <span className="text-cyan-700 dark:text-cyan-400">₹{pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="pt-3 flex justify-between text-sm text-slate-500 dark:text-slate-300">
              <span>Shipping</span>
              <span>₹{pricing.shippingCost.toFixed(2)}</span>
            </div>
            <div className="pt-2 flex justify-between text-sm text-slate-500 dark:text-slate-300">
              <span>Tax</span>
              <span>₹{pricing.tax.toFixed(2)}</span>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-cyan-700 dark:text-cyan-400">₹{pricing.grandTotal.toFixed(2)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
