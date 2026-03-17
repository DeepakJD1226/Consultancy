import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, Booking, BookingItem, Invoice, Product } from '../lib/supabase';
import { Calendar, FileText, AlertCircle, Loader } from 'lucide-react';

type BookingsProps = {
  onNavigate: (page: string) => void;
};

type BookingDetail = Booking & {
  items: (BookingItem & { product: Product })[];
  invoice?: Invoice;
};

export function Bookings({ onNavigate }: BookingsProps) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookingsWithDetails = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: items } = await supabase
            .from('booking_items')
            .select('*, product:product_id(*)')
            .eq('booking_id', booking.id);

          const { data: invoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('booking_id', booking.id)
            .maybeSingle();

          return {
            ...booking,
            items: items || [],
            invoice: invoice || undefined,
          };
        })
      );

      setBookings(bookingsWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view your bookings.</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-2">Manage and track your orders</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            New Booking
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No bookings yet</p>
            <p className="text-gray-500 mb-6">Start by browsing our products and placing your first order</p>
            <button
              onClick={() => onNavigate('products')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Booking ID</p>
                      <p className="font-mono text-sm text-gray-900">{booking.id.substring(0, 8)}...</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Booked Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Required Delivery</p>
                      <p className="font-medium text-gray-900">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Items</p>
                      <p className="font-medium text-gray-900">{booking.items.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Total Amount</p>
                      <p className="font-bold text-blue-600">₹{booking.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() =>
                        setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)
                      }
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      {selectedBooking?.id === booking.id ? 'Hide Details' : 'View Details'}
                    </button>
                    {booking.invoice && (
                      <button
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Invoice: {booking.invoice.invoice_number}
                      </button>
                    )}
                  </div>
                </div>

                {selectedBooking?.id === booking.id && (
                  <div className="px-6 py-6 border-t border-gray-200 space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                      <div className="space-y-2">
                        {booking.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.product.name} - {item.product.color}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.quantity}m × ₹{item.unit_price}
                              </p>
                            </div>
                            <p className="font-bold text-gray-900">₹{item.subtotal.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Special Notes</p>
                        <p className="text-sm text-gray-600">{booking.notes}</p>
                      </div>
                    )}

                    {booking.invoice && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Invoice Details</p>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Invoice Number</p>
                            <p className="font-mono font-medium text-gray-900">
                              {booking.invoice.invoice_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Invoice Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.invoice.invoice_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Amount</p>
                            <p className="font-bold text-gray-900">₹{booking.invoice.total_amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Status</p>
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                booking.invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {booking.invoice.status.charAt(0).toUpperCase() + booking.invoice.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
