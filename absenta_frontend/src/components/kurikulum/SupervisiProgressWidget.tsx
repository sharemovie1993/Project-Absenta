import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupervisiItem {
  id: string;
  Guru?: { nama_guru: string };
  mapel?: string;
  tanggal: string;
  status: string;
  is_verified?: boolean;
}

interface SupervisiProgressWidgetProps {
  items: SupervisiItem[];
  isLoading?: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  COMPLETED:  { label: 'Selesai',   color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: <CheckCircle2 size={10} /> },
  SELESAI:    { label: 'Selesai',   color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: <CheckCircle2 size={10} /> },
  SCHEDULED:  { label: 'Terjadwal', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',     icon: <Clock size={10} /> },
  TERJADWAL:  { label: 'Terjadwal', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',     icon: <Clock size={10} /> },
  BELUM:      { label: 'Belum',     color: '#94a3b8', bg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',         icon: <AlertCircle size={10} /> },
};

const formatTanggal = (str: string) => {
  try {
    return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return str; }
};

export const SupervisiProgressWidget: React.FC<SupervisiProgressWidgetProps> = React.memo(({
  items, isLoading = false,
}) => {
  const selesai    = items.filter(i => i.status?.toUpperCase() === 'COMPLETED' || i.status?.toUpperCase() === 'SELESAI').length;
  const terjadwal  = items.filter(i => i.status?.toUpperCase() === 'SCHEDULED' || i.status?.toUpperCase() === 'TERJADWAL').length;
  const belum      = Math.max(0, items.length - selesai - terjadwal);

  const pieData = [
    { name: 'Selesai',   value: selesai,   color: '#10b981' },
    { name: 'Terjadwal', value: terjadwal,  color: '#f59e0b' },
    { name: 'Belum',     value: belum,      color: '#cbd5e1' },
  ].filter(d => d.value > 0);

  const pct = items.length > 0 ? Math.round((selesai / items.length) * 100) : 0;
  const recent = [...items].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 4);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Donut Chart */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={44}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                formatter={(val: number, name: string) => [`${val} guru`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{pct}%</span>
            <span className="text-[8px] text-slate-400 uppercase font-black">Selesai</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Selesai', val: selesai, color: 'bg-emerald-500' },
            { label: 'Terjadwal', val: terjadwal, color: 'bg-amber-400' },
            { label: 'Belum', val: belum, color: 'bg-slate-300 dark:bg-slate-600' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', row.color)} />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{row.label}</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 ml-auto">{row.val}</span>
            </div>
          ))}
          <div className="text-[9px] text-slate-400 uppercase tracking-wider pt-1 font-black">
            Total: {items.length} guru
          </div>
        </div>
      </div>

      {/* Recent Supervisi List */}
      <div className="space-y-2">
        {recent.map(item => {
          const st = STATUS_MAP[item.status?.toUpperCase()] ?? STATUS_MAP.BELUM;
          return (
            <div key={item.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  {item.Guru?.nama_guru ?? '—'}
                </p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Calendar size={8} /> {item.mapel} • {formatTanggal(item.tanggal)}
                </p>
              </div>
              <span className={cn('ml-2 flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full', st.bg)}>
                {st.icon} {st.label}
              </span>
            </div>
          );
        })}
        {recent.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4 italic">Belum ada data supervisi</p>
        )}
      </div>
    </div>
  );
});
