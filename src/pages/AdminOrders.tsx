import { AdminDashboard } from './AdminDashboard';

export function AdminOrders({ onNavigate }: { onNavigate: (page: string) => void }) {
  return <AdminDashboard onNavigate={onNavigate} initialTab="orders" />;
}
