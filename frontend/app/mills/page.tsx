'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function MillsPage() {
    const [mills, setMills] = useState<any[]>([]);
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [performance, setPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [millsRes, rawMatsRes, perfRes] = await Promise.all([
                api.mills.getAll(),
                api.mills.getRawMaterials(),
                api.mills.getPerformance(),
            ]);

            if (millsRes.success) setMills(millsRes.data);
            if (rawMatsRes.success) setRawMaterials(rawMatsRes.data);
            if (perfRes.success) setPerformance(perfRes.data);
        } catch (error) {
            console.error('Error loading mill data:', error);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Mill Management</h1>

            {/* Mills List */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Our Mills</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mills.map((mill) => (
                        <div key={mill.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                                    🏭
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900">{mill.mill_name}</h3>
                                    <p className="text-gray-600 text-sm mt-1">📍 {mill.location || 'N/A'}</p>
                                    <p className="text-gray-600 text-sm">👤 {mill.contact_person || 'N/A'}</p>
                                    <p className="text-gray-600 text-sm">📞 {mill.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Performance */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Mill Performance</h2>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Material (kg)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fabric Received (m)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {performance.map((perf, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{perf.mill_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_raw_material_kg.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{perf.total_fabric_received_meters.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                            {perf.pending_production_count}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                            {perf.completed_count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Raw Materials */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Raw Material Tracking</h2>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (kg)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fabric Received</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rawMaterials.map((rm) => (
                                <tr key={rm.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {rm.mills?.mill_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rm.material_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rm.quantity_kg}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(rm.sent_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${rm.status === 'Completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {rm.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {rm.fabric_received_meters ? `${rm.fabric_received_meters}m` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
