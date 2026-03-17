import { useMemo, useState, type FormEvent } from 'react';
import { sendOrderRequestEmail, isValidMobileNumber } from '../lib/orderEmail';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type OrderRequestProps = {
  onNavigate: (page: string) => void;
};

type Notice = { kind: 'ok' | 'err'; msg: string } | null;

export function OrderRequest({ onNavigate }: OrderRequestProps) {
  const requestedFabric = useMemo(() => localStorage.getItem('requested_fabric') ?? 'Fabric not selected', []);

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!customerName.trim() || !mobileNumber.trim() || !address.trim()) {
      setNotice({ kind: 'err', msg: 'Please fill all required fields.' });
      return;
    }

    if (!isValidMobileNumber(mobileNumber)) {
      setNotice({ kind: 'err', msg: 'Please enter a valid mobile number.' });
      return;
    }

    setSending(true);
    try {
      await sendOrderRequestEmail({
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        requestedFabric,
      });

      setNotice({ kind: 'ok', msg: 'Request sent successfully. We will contact you soon.' });
      setCustomerName('');
      setMobileNumber('');
      setAddress('');
      localStorage.removeItem('requested_fabric');
    } catch (error) {
      setNotice({
        kind: 'err',
        msg: error instanceof Error ? error.message : 'Failed to send request. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen rk-fade-up bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rk-card p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Order Request</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Fill your details and our admin team will reach you by phone.
          </p>

          <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
            <p className="text-sm text-cyan-800 font-medium">Requested Fabric</p>
            <p className="text-cyan-900 font-semibold">{requestedFabric}</p>
          </div>

          {notice && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 flex items-start gap-2 ${
                notice.kind === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {notice.kind === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
              <p className="text-sm">{notice.msg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
              <input
                className="rk-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input
                className="rk-input"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="Enter mobile number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                className="rk-input resize-none"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete address"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={() => onNavigate('shop')} className="rk-btn-secondary sm:flex-1">
                Back to Shop
              </button>
              <button type="submit" disabled={sending} className="rk-btn-primary sm:flex-1 inline-flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
