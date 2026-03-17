import { useMemo } from 'react';

type BillPayload = {
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  mobile: string;
  address: string;
  items: Array<{
    id: string;
    fabricName: string;
    color: string | null;
    selectedLength: number;
    pricePerMeter: number;
    totalPrice: number;
  }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  grandTotal: number;
  orderStatus: string;
};

export function OrderConfirmation({ onNavigate }: { onNavigate: (page: string) => void }) {
  const bill = useMemo(() => {
    const raw = localStorage.getItem('latest_bill');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BillPayload;
    } catch {
      return null;
    }
  }, []);

  const subtotal = bill?.subtotal ?? bill?.grandTotal ?? 0;
  const shippingCost = bill?.shippingCost ?? 0;
  const tax = bill?.tax ?? 0;
  const grandTotal = bill?.grandTotal ?? subtotal + shippingCost + tax;

  if (!bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rk-card p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">No bill found</h1>
          <p className="text-slate-500">Place an order to generate your invoice.</p>
          <button className="rk-btn-primary mt-5" onClick={() => onNavigate('shop')}>Browse Fabrics</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rk-fade-up">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rk-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">RK Textiles Invoice</h1>
              <p className="text-sm text-slate-500 mt-1">Order ID: {bill.orderId}</p>
              <p className="text-sm text-slate-500">Order Date: {bill.orderDate}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              {bill.orderStatus}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="font-semibold text-slate-700">Customer</p>
              <p>{bill.customerName}</p>
              <p>{bill.customerEmail}</p>
              <p>{bill.mobile}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="font-semibold text-slate-700">Delivery Address</p>
              <p>{bill.address}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2">Fabric</th>
                  <th className="py-2">Length</th>
                  <th className="py-2">Price/m</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">{item.fabricName}{item.color ? ` (${item.color})` : ''}</td>
                    <td className="py-2">{item.selectedLength}m</td>
                    <td className="py-2">Rs.{item.pricePerMeter.toFixed(2)}</td>
                    <td className="py-2 font-semibold">Rs.{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-between items-center border-t border-slate-200 pt-4">
            <div className="w-full max-w-sm ml-auto space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>Rs.{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>Rs.{shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>Rs.{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <p className="text-lg font-semibold text-slate-900">Grand Total</p>
                <p className="text-2xl font-bold text-cyan-700">Rs.{grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={() => onNavigate('my-orders')} className="rk-btn-primary sm:flex-1">View My Orders</button>
            <button onClick={() => onNavigate('shop')} className="rk-btn-secondary sm:flex-1">Continue Shopping</button>
          </div>
        </div>
      </div>
    </div>
  );
}
