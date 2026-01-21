import Link from 'next/link';

interface RecentOrdersProps {
    orders: any[];
}

export default function RecentOrders({ orders }: RecentOrdersProps) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <Link href="/orders" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All →
                </Link>
            </div>

            {orders && orders.length > 0 ? (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{order.customers?.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {order.fabric_type} • {order.quantity_meters}m
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">₹{parseFloat(order.total_amount).toLocaleString()}</p>
                                    <span
                                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${order.status === 'Completed'
                                                ? 'bg-green-100 text-green-700'
                                                : order.status === 'Pending'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">📭</p>
                    <p className="mt-2">No recent orders</p>
                </div>
            )}
        </div>
    );
}
