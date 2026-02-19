'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NewOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [searchPhone, setSearchPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [availability, setAvailability] = useState<any>(null);

    const [formData, setFormData] = useState({
        customer_id: '',
        fabric_type: '',
        quantity_meters: '',
        rate_per_meter: '',
        notes: '',
    });

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            const response = await api.inventory.getAll();
            if (response.success) {
                setInventory(response.data);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };

    const handlePhoneSearch = async () => {
        if (!searchPhone) return;

        try {
            const response = await api.customers.searchByPhone(searchPhone);
            if (response.success && response.found) {
                setSelectedCustomer(response.data.customer);
                setFormData({ ...formData, customer_id: response.data.customer.id });
            } else {
                alert('Customer not found. Please add customer first.');
            }
        } catch (error) {
            console.error('Error searching customer:', error);
        }
    };

    const handleFabricChange = async (fabricType: string) => {
        const selectedFabric = inventory.find(item => item.fabric_type === fabricType);
        if (selectedFabric) {
            setFormData({
                ...formData,
                fabric_type: fabricType,
                rate_per_meter: selectedFabric.rate_per_meter,
            });
        }
    };

    const checkAvailability = async () => {
        if (!formData.fabric_type || !formData.quantity_meters) return;

        try {
            const response = await api.orders.checkAvailability({
                fabric_type: formData.fabric_type,
                quantity_meters: parseFloat(formData.quantity_meters),
            });
            if (response.success) {
                setAvailability(response);
            }
        } catch (error) {
            console.error('Error checking availability:', error);
        }
    };

    useEffect(() => {
        if (formData.fabric_type && formData.quantity_meters) {
            checkAvailability();
        }
    }, [formData.fabric_type, formData.quantity_meters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            alert('Please search and select a customer first');
            return;
        }

        if (!availability?.available) {
            alert('Insufficient stock for this order');
            return;
        }

        setLoading(true);
        try {
            const response = await api.orders.create({
                ...formData,
                quantity_meters: parseFloat(formData.quantity_meters),
                rate_per_meter: parseFloat(formData.rate_per_meter),
            });

            if (response.success) {
                alert('Order created successfully!');
                router.push('/orders');
            }
        } catch (error: any) {
            alert(error.message || 'Error creating order');
        } finally {
            setLoading(false);
        }
    };

    const estimatedAmount = formData.quantity_meters && formData.rate_per_meter
        ? parseFloat(formData.quantity_meters) * parseFloat(formData.rate_per_meter)
        : 0;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">New Phone Order</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
                {/* Customer Search */}
                <div className="border-b pb-6">
                    <h2 className="text-lg font-semibold mb-4">1. Customer Information</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Enter customer phone number"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={handlePhoneSearch}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                    </div>

                    {selectedCustomer && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-semibold text-green-900">Customer Found</p>
                            <p className="text-green-700 mt-1"><strong>Name:</strong> {selectedCustomer.name}</p>
                            <p className="text-green-700"><strong>Business:</strong> {selectedCustomer.business_type || 'N/A'}</p>
                        </div>
                    )}
                </div>

                {/* Order Details */}
                <div className="border-b pb-6">
                    <h2 className="text-lg font-semibold mb-4">2. Order Details</h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fabric Type</label>
                            <select
                                value={formData.fabric_type}
                                onChange={(e) => handleFabricChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select fabric type</option>
                                {inventory.map((item) => (
                                    <option key={item.id} value={item.fabric_type}>
                                        {item.fabric_type} ({item.fabric_color}) - {item.quantity_meters}m available
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (meters)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.quantity_meters}
                                onChange={(e) => setFormData({ ...formData, quantity_meters: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {availability && (
                        <div className={`p-4 rounded-lg ${availability.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                            <p className={`font-semibold ${availability.available ? 'text-green-900' : 'text-red-900'}`}>
                                {availability.available ? 'Stock Available' : 'Insufficient Stock'}
                            </p>
                            <p className={availability.available ? 'text-green-700' : 'text-red-700'}>
                                Available: {availability.available_quantity}m | Requested: {availability.requested_quantity}m
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rate per Meter (₹)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.rate_per_meter}
                                onChange={(e) => setFormData({ ...formData, rate_per_meter: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Amount</label>
                            <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-lg font-bold">
                                ₹{estimatedAmount.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedCustomer || !availability?.available}
                        className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}
