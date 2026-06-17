import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Activity, Server, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { type TenantSocketStats } from '@/api/superadmin-infra.api';

interface InfraSocketPanelProps {
  history: { time: string; rate: number }[];
  tenantsData: TenantSocketStats[];
  getStatusBadge: (tenant: TenantSocketStats) => React.ReactNode;
}

export const InfraSocketPanel: React.FC<InfraSocketPanelProps> = React.memo(({
  history,
  tenantsData,
  getStatusBadge
}) => {
  const columns: Column[] = [
    { 
      key: 'tenantId', 
      label: 'Tenant / Pelanggan',
      sortable: true,
      className: 'font-mono text-xs',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{row.tenantName || 'Tenant Tanpa Nama'}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.tenantId}</span>
        </div>
      )
    },
    { 
      key: 'activeConnections', 
      label: 'Koneksi Aktif',
      sortable: true,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-sm font-mono">{val}</span>
        </div>
      )
    },
    { 
      key: 'eventRate', 
      label: 'Laju Data (Events/s)',
      sortable: true,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="font-mono text-sm font-semibold">{val}</span>
        </div>
      )
    },
    { 
      key: 'cpuUsageEstimate', 
      label: 'Beban CPU Est.',
      sortable: true,
      render: (val: string | number) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${Number(val) > 70 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
              style={{ width: `${Math.min(100, Number(val))}%` }} 
            />
          </div>
          <span className="text-xs font-mono font-bold">{val}%</span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status Beban', 
      render: (_, row: any) => getStatusBadge(row) 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Area Recharts Real-Time */}
        <Card className="lg:col-span-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Activity className="text-emerald-500 w-5 h-5 shrink-0" /> Riwayat Aliran Data Global (Live)
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tren kecepatan transmisi data real-time dalam 1 menit terakhir.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-widest animate-pulse">
              ● Live
            </div>
          </CardHeader>
          <CardContent className="h-[280px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94A3B8' }} 
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94A3B8' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card Ringkasan Keamanan & SLA */}
        <Card className="rounded-xl border border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Activity size={150} />
          </div>
          <div>
            <div className="p-3 bg-white/10 rounded-xl w-fit mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-sm font-bold mb-2 uppercase tracking-wider">Keamanan & Performa</h3>
            <p className="text-[11px] text-white/80 leading-relaxed font-medium">
              Sistem secara otomatis mendeteksi anomali trafik di setiap tenant. Status *"PENGGUNAAN TINGGI"* akan muncul jika sistem mendeteksi lonjakan aktivitas yang tidak wajar.
            </p>
          </div>
          
          <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
              <span>Efisiensi Saluran</span>
              <span className="font-mono text-xs">100% guaranteed</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
              <span>SLA Target</span>
              <span className="font-mono text-xs">99.99%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabel Detail Beban Tenant */}
      <Card className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="bg-gradient-to-r from-slate-50/50 to-indigo-50/10 dark:from-slate-900/60 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/80 py-4">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Server className="text-indigo-500 w-5 h-5 shrink-0" /> Rincian Beban per Tenant Aktif
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar pengguna aktif dan kontribusi beban mereka terhadap infrastruktur WebSocket.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table 
            columns={columns} 
            data={tenantsData} 
            emptyMessage="Belum ada tenant yang terhubung saat ini."
          />
        </CardContent>
      </Card>
    </div>
  );
});

InfraSocketPanel.displayName = 'InfraSocketPanel';
export default InfraSocketPanel;
