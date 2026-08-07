import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { Badge } from '@/components/ui/Badge';
import { infraApi, type GlobalSocketStats, type TenantSocketStats } from '@/api/superadmin-infra.api';
import { Activity, Users, Cpu, Zap, ShieldCheck } from 'lucide-react';

// Impor sub-komponen modular real-time kita
import { InfraSocketPanel } from '@/components/superadmin/infra/InfraSocketPanel';

export default function InfrastructureDashboard() {
  const [history, setHistory] = useState<{ time: string; rate: number }[]>([]);

  const statsQuery = useQuery({
    queryKey: ['superadmin-infra-global-stats'],
    queryFn: async () => {
      const response = await infraApi.getGlobalStats();
      const data = response.data;
      setHistory(prev => {
        const newPoint = { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          rate: data.eventRate 
        };
        const newHistory = [...prev, newPoint];
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
      return data;
    },
    refetchInterval: 2000,
    staleTime: 1000,
  });

  const stats = statsQuery.data || null;
  const loading = statsQuery.isLoading;
  const error = statsQuery.error ? 'Gagal mengambil statistik infrastruktur. Pastikan server backend berjalan.' : null;

  const getSystemMood = () => {
    if (!stats) return { mood: 'Mencoba terhubung...', status: 'blue', textClass: 'text-blue-500' };
    
    if (stats.eventRate > 50) return { mood: 'Lalu lintas data sangat sibuk', status: 'amber', textClass: 'text-amber-500' };
    if (stats.eventRate > 10) return { mood: 'Aktivitas sistem sedang aktif', status: 'emerald', textClass: 'text-emerald-500' };
    if (stats.totalConnections > 100) return { mood: 'Banyak sistem terhubung', status: 'emerald', textClass: 'text-emerald-500' };
    
    return { mood: 'Sistem sedang tenang dan optimal', status: 'emerald', textClass: 'text-emerald-500' };
  };

  const { mood } = getSystemMood();

  const getStatusBadge = (tenant: TenantSocketStats) => {
    if (tenant.eventRate > 15 || tenant.activeConnections > 45) {
      return <Badge variant="destructive" className="text-[9px] font-bold px-2 py-0.5 tracking-wide">PENGGUNAAN TINGGI</Badge>;
    }
    if (tenant.eventRate > 10 || tenant.activeConnections > 30) {
      return <Badge variant="warning" className="text-[9px] font-bold px-2 py-0.5 tracking-wide">AKTIF</Badge>;
    }
    return <Badge variant="success" className="text-[9px] font-bold px-2 py-0.5 tracking-wide">NORMAL</Badge>;
  };

  // Metrik stats global terstandar untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    if (!stats) {
      return [
        { title: "WebSocket Terhubung", value: "-", icon: <Users className="h-4 w-4 text-white" />, gradient: "from-blue-500 to-indigo-600", subtitle: "Mendapatkan data..." },
        { title: "Laju Aliran Data", value: "-", icon: <Zap className="h-4 w-4 text-white" />, gradient: "from-emerald-500 to-teal-600", subtitle: "Mendapatkan data..." },
        { title: "Estimasi Beban CPU", value: "-", icon: <Cpu className="h-4 w-4 text-white" />, gradient: "from-purple-500 to-fuchsia-600", subtitle: "Mendapatkan data..." },
        { title: "Status Saluran", value: "-", icon: <ShieldCheck className="h-4 w-4 text-white" />, gradient: "from-orange-500 to-amber-600", subtitle: "Mendapatkan data..." }
      ];
    }

    return [
      {
        title: "WebSocket Terhubung",
        value: stats.totalConnections.toLocaleString(),
        icon: <Users className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Client aktif terhubung"
      },
      {
        title: "Aliran Data (Trafik)",
        value: `${stats.eventRate}/detik`,
        icon: <Zap className="h-4 w-4 text-white" />,
        gradient: stats.eventRate > 30 ? "from-amber-500 to-orange-600" : "from-emerald-500 to-teal-600",
        subtitle: "Jumlah event diproses"
      },
      {
        title: "Estimasi Beban CPU",
        value: `${stats.cpuEstimate}%`,
        icon: <Cpu className="h-4 w-4 text-white" />,
        gradient: Number(stats.cpuEstimate) > 70 ? "from-rose-500 to-pink-600" : "from-purple-500 to-fuchsia-600",
        subtitle: "Dampak CPU global vital"
      },
      {
        title: "Kondisi Infrastruktur",
        value: stats.totalConnections > 0 ? "AKTIF (ONLINE)" : "TENANG",
        icon: <ShieldCheck className="h-4 w-4 text-white" />,
        gradient: "from-indigo-500 to-violet-600",
        subtitle: mood
      }
    ];
  }, [stats, mood]);

  // Toolbar slot dengan pembaruan real-time badge
  const toolbarSlot = useMemo(() => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 dark:bg-slate-900/80 border border-indigo-100/50 dark:border-slate-800 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
      Real-Time (2s)
    </div>
  ), []);

  return (
    <SuperAdminPageLayout
      title="Status Socket Server (Infrastruktur Live)"
      description="Pantau beban koneksi WebSocket global, transmisi log event per detik secara real-time, serta rincian beban kontribusi per tenant."
      breadcrumbs={[
        { label: 'System Utilities' },
        { label: 'Status Socket Server' }
      ]}
      stats={statsList}
      isLoading={loading && !stats}
      toolbar={toolbarSlot}
    >
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-600 font-bold border border-rose-100 dark:border-rose-900">
          {error}
        </div>
      )}

      {stats && (
        <InfraSocketPanel
          history={history}
          tenantsData={stats.tenants || []}
          getStatusBadge={getStatusBadge}
        />
      )}
    </SuperAdminPageLayout>
  );
}
