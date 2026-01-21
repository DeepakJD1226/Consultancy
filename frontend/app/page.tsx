'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import RecentOrders from '@/components/RecentOrders';
import LowStockAlert from '@/components/LowStockAlert';

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.reports.getDashboard();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to R.K. Textiles Management System</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Customers"
          value={stats?.customers?.total || 0}
          icon="👥"
          color="blue"
        />
        <StatsCard
          title="Total Orders"
          value={stats?.orders?.total || 0}
          subtitle={`${stats?.orders?.pending || 0} pending`}
          icon="📦"
          color="green"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${stats?.revenue?.total?.toLocaleString() || 0}`}
          subtitle={`₹${stats?.revenue?.pending_payments?.toLocaleString() || 0} pending`}
          icon="💰"
          color="yellow"
        />
        <StatsCard
          title="Inventory Value"
          value={`₹${stats?.inventory?.total_value?.toLocaleString() || 0}`}
          subtitle={`${stats?.inventory?.low_stock_items || 0} low stock items`}
          icon="📊"
          color="red"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentOrders orders={stats?.recent_orders || []} />
        </div>

        {/* Low Stock Alert - Takes 1 column */}
        <div>
          <LowStockAlert count={stats?.inventory?.low_stock_items || 0} />
        </div>
      </div>
    </div>
  );
}
