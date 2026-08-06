import { CreditCard, Users, Wallet, FileText } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

interface OverviewStatsProps {
  stats: {
    tenants?: number;
    active_subscriptions?: number;
    monthly_revenue?: number;
    total_revenue?: number;
  } | null;
  loading: boolean;
}

const OverviewStats = ({ stats, loading }: OverviewStatsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      <AnalyticsCard 
        title="Total Tenants" 
        value={stats?.tenants || 0} 
        isLoading={loading} 
        icon={<Users size={20} />} 
        gradient="from-indigo-500 to-purple-600" 
      />
      <AnalyticsCard 
        title="Langganan Aktif" 
        value={stats?.active_subscriptions || 0} 
        isLoading={loading} 
        icon={<FileText size={20} />} 
        gradient="from-yellow-500 to-orange-600" 
      />
      <AnalyticsCard 
        title="MRR" 
        value={stats?.monthly_revenue ? `Rp ${stats.monthly_revenue.toLocaleString('id-ID')}` : 'Rp 0'} 
        isLoading={loading} 
        icon={<CreditCard size={20} />} 
        gradient="from-green-500 to-emerald-600" 
      />
      <AnalyticsCard 
        title="Total Revenue" 
        value={stats?.total_revenue ? `Rp ${stats.total_revenue.toLocaleString('id-ID')}` : 'Rp 0'} 
        isLoading={loading} 
        icon={<Wallet size={20} />} 
        gradient="from-blue-500 to-cyan-600" 
      />
    </div>
  );
};

export default OverviewStats;
