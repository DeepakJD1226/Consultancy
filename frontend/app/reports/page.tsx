'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ReportsPage() {
    const [salesReport, setSalesReport] = useState<any>(null);
    const [inventoryReport, setInventoryReport] = useState<any>(null);
    const [customerReport, setCustomerReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const [salesRes, invRes, custRes] = await Promise.all([
                api.reports.getSales(),
                api.reports.getInventory(),
                api.reports.getCustomers(),
            ]);

            if (salesRes.success) setSalesReport(salesRes.data);
            if (invRes.success) setInventoryReport(invRes.data);
            if (custRes.success) setCustomerReport(custRes.data);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

            {/* Sales Report */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                        <p className="text-3xl font-bold text-blue-600">{salesReport?.summary?.total_orders || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-600">
                            ₹{salesReport?.summary?.total_revenue?.toLocaleString() || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
                        <p className="text-3xl font-bold text-purple-600">
                            ₹{salesReport?.summary?.average_order_value?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">Sales by Fabric Type</h3>
                    <div className="space-y-3">
                        {salesReport?.fabric_breakdown?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-900">{item.fabric_type}</p>
                                    <p className="text-sm text-gray-600">{item.orders} orders • {item.quantity_meters}m</p>
                                </div>
                                <p className="text-lg font-bold text-green-600">₹{item.revenue.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Inventory Report */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Total Items</p>
                        <p className="text-3xl font-bold text-blue-600">{inventoryReport?.summary?.total_items || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Total Meters</p>
                        <p className="text-3xl font-bold text-purple-600">{inventoryReport?.summary?.total_meters?.toFixed(2) || 0}m</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-1">Total Value</p>
                        <p className="text-3xl font-bold text-green-600">
                            ₹{inventoryReport?.summary?.total_value?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Stock Levels</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-700">{inventoryReport?.stock_levels?.in_stock || 0}</p>
                            <p className="text-sm text-green-600">In Stock</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-yellow-700">{inventoryReport?.stock_levels?.low_stock || 0}</p>
                            <p className="text-sm text-yellow-600">Low Stock</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-red-700">{inventoryReport?.stock_levels?.out_of_stock || 0}</p>
                            <p className="text-sm text-red-600">Out of Stock</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Report */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Analytics</h2>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Top Customers</h3>
                    <div className="space-y-3">
                        {customerReport?.top_customers?.slice(0, 10).map((customer: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-900">{customer.name}</p>
                                    <p className="text-sm text-gray-600">
                                        {customer.phone} • {customer.business_type || 'N/A'} • {customer.total_orders} orders
                                    </p>
                                </div>
                                <p className="text-lg font-bold text-blue-600">₹{customer.total_spent.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
