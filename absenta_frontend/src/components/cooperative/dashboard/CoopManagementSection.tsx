import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  PiggyBank, 
  Receipt,
  Bell,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SectionCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/date.utils';
import { CoopApprovalHub } from './CoopApprovalHub';
import { CoopExecutiveKpiCards, formatRupiahCompact } from './CoopExecutiveKpiCards';
import { CoopQuickActionBar } from './CoopQuickActionBar';
import { CoopLiquidityRadarSection } from './CoopLiquidityRadarSection';
import { CoopRatGovernanceBanner } from './CoopRatGovernanceBanner';
import type { CoopManagementSectionProps } from './types';

export const CoopManagementSection: React.FC<CoopManagementSectionProps> = React.memo(({
  stats,
  chartData: propChartData,
  announcements,
  criticalStock,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'all' | 'simpanan' | 'pinjaman' | 'penjualan'>('all');

  const realChartData = (stats.monthlyTrend && stats.monthlyTrend.length > 0)
    ? stats.monthlyTrend
    : (propChartData || []);

  const recentActivities = stats.recentActivities || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full min-w-0">
      
      {/* ── 1. NOTIFIKASI AKSI PENGURUS (Antrean Persetujuan Pinjaman / Anggota) ── */}
      <CoopApprovalHub 
        pendingLoans={stats.pendingLoans}
        pendingMembers={stats.pendingMembers}
      />

      {/* ── 2. 4 KARTU EKSEKUTIF UTAMA (Anti-Truncation, Tipografi Adaptif) ── */}
      <CoopExecutiveKpiCards 
        stats={stats} 
      />

      {/* ── 3. PUSAT KENDALI TINDAKAN HARIAN (Quick Action Bar 1-Klik) ── */}
      <CoopQuickActionBar 
        pendingLoansCount={stats.pendingLoans?.length || 0}
        pendingMembersCount={stats.pendingMembers?.count || 0}
      />

      {/* ── 4. GRID OPERASIONAL UTAMA & PANEL KONTROL KANAN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* Kolom Kiri (2/3): Grafik Analisis Finansial & Radar Likuiditas */}
        <div className="lg:col-span-2 min-w-0 space-y-6">
          
          {/* Grafik Tren 6 Bulan */}
          <SectionCard 
            title="Tren Finansial & Operasional (6 Bulan Terakhir)" 
            fullWidth 
            noPadding
          >
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Agregat mutasi simpanan, pinjaman, dan penjualan toko riil:
                </span>
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartMetric === 'all' 
                        ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('simpanan')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartMetric === 'simpanan' 
                        ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-emerald-600 dark:text-emerald-400" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Simpanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('pinjaman')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartMetric === 'pinjaman' 
                        ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-purple-600 dark:text-purple-400" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Pinjaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('penjualan')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartMetric === 'penjualan' 
                        ? "bg-white dark:bg-slate-950 font-bold shadow-xs text-blue-600 dark:text-blue-400" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    Penjualan Toko
                  </button>
                </div>
              </div>

              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <BarChart
                    data={realChartData}
                    margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis 
                      width={65}
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => {
                        if (val === 0) return 'Rp 0';
                        if (val >= 1000000) return `${(val / 1000000).toLocaleString('id-ID')} Jt`;
                        return `${(val / 1000).toLocaleString('id-ID')} Rb`;
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {(activeChartMetric === 'all' || activeChartMetric === 'simpanan') && (
                      <Bar dataKey="simpanan" name="Simpanan Masuk" fill="#10B981" radius={[4, 4, 0, 0]} />
                    )}
                    {(activeChartMetric === 'all' || activeChartMetric === 'pinjaman') && (
                      <Bar dataKey="pinjaman" name="Pencairan Pinjaman" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    )}
                    {(activeChartMetric === 'all' || activeChartMetric === 'penjualan') && (
                      <Bar dataKey="penjualan" name="Penjualan Toko" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SectionCard>

          {/* Radar Likuiditas & Jatuh Tempo Angsuran */}
          <CoopLiquidityRadarSection stats={stats} />

        </div>

        {/* Kolom Kanan (1/3): Aktivitas Mutasi Terkini & Pengumuman */}
        <div className="lg:col-span-1 min-w-0 space-y-6">
          
          <SectionCard title="Aktivitas Mutasi Terkini" fullWidth noPadding>
            <div className="p-4 space-y-2.5">
              {recentActivities.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-xs italic">Belum ada transaksi mutasi terkini.</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        act.type === 'SAVING' 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                      )}>
                        {act.type === 'SAVING' ? <PiggyBank size={15} /> : <Receipt size={15} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{act.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{act.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className={cn(
                        "text-xs font-mono font-bold",
                        act.type === 'SAVING' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                      )}>
                        {formatRupiahCompact(act.amount)}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {formatTime(act.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {announcements.length > 0 && (
            <SectionCard title="Pengumuman Koperasi" fullWidth noPadding>
              <div className="space-y-3 p-4">
                {announcements.slice(0, 2).map((ann, idx) => (
                  <div key={idx} className="bg-indigo-50/60 dark:bg-indigo-950/20 p-3 rounded-xl border-l-4 border-indigo-500 space-y-1">
                    <div className="flex items-start gap-2">
                      <Bell className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={14} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{ann.title}</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 leading-relaxed">{ann.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>

      </div>

      {/* ── 5. BANNER TATA KELOLA RAT & DIVIDEN SHU ── */}
      <CoopRatGovernanceBanner 
        totalActiveMembers={stats.totalMembers || 5}
        fiscalYear={stats.activePeriod?.year || new Date().getFullYear()}
      />

      {/* ── 6. PERINGATAN STOK KRITIS MINIMARKET (Jika Ada Barang Habis/Menipis) ── */}
      {criticalStock.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Package size={15} className="text-rose-500" />
              Peringatan Stok Kritis Minimarket ({criticalStock.length} Barang)
            </h3>
            <Link 
              to="/cooperative/products" 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Lihat Katalog &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalStock.slice(0, 6).map((item, i) => (
              <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400">{item.category}</p>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0",
                  item.status === 'HABIS' 
                    ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400" 
                    : "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                )}>
                  {item.status}: {item.stock} pcs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
});

CoopManagementSection.displayName = 'CoopManagementSection';
