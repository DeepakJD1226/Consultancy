import Link from 'next/link';

interface LowStockAlertProps {
    count: number;
}

export default function LowStockAlert({ count }: LowStockAlertProps) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Alerts</h2>

            {count > 0 ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <div className="flex items-start">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800">Low Stock Alert</h3>
                            <p className="mt-2 text-sm text-red-700">
                                <span className="font-bold text-2xl">{count}</span> item{count !== 1 ? 's' : ''} below 50 meters
                            </p>
                            <Link
                                href="/inventory?filter=low-stock"
                                className="mt-3 inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                View Low Stock Items
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <div className="flex items-start">
                        <div>
                            <h3 className="text-sm font-medium text-green-800">All Good!</h3>
                            <p className="mt-2 text-sm text-green-700">
                                All inventory items are well stocked
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                    <Link
                        href="/orders/new"
                        className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                        New Phone Order
                    </Link>
                    <Link
                        href="/inventory"
                        className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                    >
                        View Inventory
                    </Link>
                </div>
            </div>
        </div>
    );
}
