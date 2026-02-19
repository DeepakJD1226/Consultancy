'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function BillingPage() {
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadBills();
    }, [filter]);

    const loadBills = async () => {
        try {
            const params = filter !== 'all' ? { payment_status: filter } : {};
            const response = await api.bills.getAll(params);
            if (response.success) {
                setBills(response.data);
            }
        } catch (error) {
            console.error('Error loading bills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (billId: string) => {
        const url = api.bills.download(billId);
        window.open(url, '_blank');
    };

    const handlePaymentUpdate = async (billId: string, status: string) => {
        try {
            const response = await api.bills.updatePayment(billId, status);
            if (response.success) {
                alert('Payment status updated!');
                loadBills();
            }
        } catch (error: any) {
            alert(error.message || 'Error updating payment status');
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bills & Invoices</h1>
                    <p className="text-gray-600 mt-1">Manage billing and payments</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="flex gap-2">
                    {['all', 'Pending', 'Paid'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'All Bills' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bills List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : bills.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bill Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bills.map((bill) => (
                                <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {bill.bill_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{bill.customers?.name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{bill.customers?.phone || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(bill.bill_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        ₹{parseFloat(bill.total_amount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bill.payment_status === 'Paid'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {bill.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                        <button
                                            onClick={() => handleDownload(bill.id)}
                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                            Download
                                        </button>
                                        {bill.payment_status === 'Pending' && (
                                            <button
                                                onClick={() => handlePaymentUpdate(bill.id, 'Paid')}
                                                className="text-green-600 hover:text-green-900 font-medium"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <p className="text-gray-500 text-lg">No bills found</p>
                </div>
            )}
        </div>
    );
}
