import React from 'react';
import { Card } from '@/components/ui';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, CartesianGrid
} from 'recharts';
import type { ComplianceStats } from './ComplianceStatsCards';

interface ComplianceTrendsViewProps {
  stats: ComplianceStats;
}

const PIE_COLORS = [{ color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' }];

export const ComplianceTrendsView: React.FC<ComplianceTrendsViewProps> = React.memo(({ stats }) => {
  const barData = [
    { name: 'RFID Guru', adopsi: stats.teacherRfidPct },
    { name: 'WA Guru', adopsi: stats.teacherWaPct },
    { name: 'RFID Siswa', adopsi: stats.studentRfidPct },
    { name: 'WA Wali Siswa', adopsi: stats.studentWaPct },
  ];

  const pieData = [
    { name: '🟢 Lengkap (≥80%)', value: stats.guruActiveCount || 1, color: '#10b981' },
    { name: '🟡 Sebagian (50-79%)', value: stats.guruPassiveCount || 0, color: '#f59e0b' },
    { name: '🔴 Belum Lengkap (<50%)', value: stats.guruDormantCount || 0, color: '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0 max-w-full">
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4 w-full min-w-0 max-w-full">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
          Tingkat Kesiapan Kartu RFID &amp; WhatsApp Sekolah
        </h3>
        <div className="h-64">
          <ResponsiveContainer minWidth={0} width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Tingkat Kesiapan']} />
              <Bar dataKey="adopsi" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4 w-full min-w-0 max-w-full">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
          Distribusi Kelengkapan Data Guru
        </h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer minWidth={0} width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                dataKey="value"
              >
                {(PIE_COLORS ?? [])?.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} Orang`, 'Jumlah']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
});

ComplianceTrendsView.displayName = 'ComplianceTrendsView';
