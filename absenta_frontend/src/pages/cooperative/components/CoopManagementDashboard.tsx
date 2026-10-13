import React from 'react';
import { Users, Wallet, TrendingUp, AlertCircle, Bell, CheckCircle2, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../../components/ui';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { cn } from '../../../lib/utils';
import type { CriticalStockItem, Announcement } from '@/components/cooperative/types';

interface CoopManagementDashboardProps {
  stats: {
    totalMembers: number;
    totalSavings: number;
    totalLoans: number;
    dueInstallments: number;
  };
  loadingStats?: boolean;
  chartData: Array<{ name: string; simpanan: number; pinjaman: number }>;
  announcements: Announcement[];
  criticalStock: CriticalStockItem[];
  criticalStockLoading: boolean;
}

export const CoopManagementDashboard: React.FC<CoopManagementDashboardProps> = React.memo(({
  stats,
  loadingStats,
  chartData,
  announcements,
  criticalStock,
  criticalStockLoading,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── SECTION 1: Ringkasan Statistik Agregat Koperasi ─────────────────────────────── */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard 
            title="Total Anggota" 
            value={stats.totalMembers.toString()} 
            icon={<Users size={24} />} 
            gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
            subtitle="Anggota terdaftar"
          />
          <AnalyticsCard 
            title="Total Simpanan" 
            value={`Rp ${parseFloat(stats.totalSavings.toString()).toLocaleString('id-ID')}`} 
            icon={<Wallet size={24} />} 
            gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
            subtitle="Dana terkumpul"
          />
          <AnalyticsCard 
            title="Pinjaman Aktif" 
            value={`Rp ${parseFloat(stats.totalLoans.toString()).toLocaleString('id-ID')}`} 
            icon={<TrendingUp size={24} />} 
            gradient="from-amber-500 to-amber-700 text-white border-amber-400/30" 
            subtitle="Sirkulasi dana"
          />
          <AnalyticsCard 
            title="Jatuh Tempo" 
            value={stats.dueInstallments.toString()} 
            icon={<AlertCircle size={24} />} 
            gradient="from-rose-500 to-rose-700 text-white border-rose-400/30" 
            subtitle="Tagihan bulan ini"
          />
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Status Operasional Koperasi
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2.5 py-1 rounded-md">
            Aktif & Stabil
          </span>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 2: Grafik Pertumbuhan Aset & Pengumuman ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <SectionCard title="Pertumbuhan Aset (6 Bulan Terakhir)" fullWidth noPadding>
            <div className="h-80 p-6 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip
                    formatter={(value: number) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="simpanan" name="Simpanan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pinjaman" name="Pinjaman" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-1">
          <SectionCard title="Pengumuman Terbaru" fullWidth noPadding>
            <div className="space-y-4 p-6">
              {announcements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Tidak ada pengumuman.</p>
              ) : (
                announcements.slice(0, 3)?.map((ann, idx) => (
                  <div key={idx} className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start">
                      <Bell className="text-blue-500 mt-1 mr-3 flex-shrink-0" size={16} />
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{ann.title}</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 line-clamp-2">{ann.content}</p>
                        <p className="text-gray-400 text-[10px] mt-2 text-right">
                          {new Date(ann.created_at || (ann as any).createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 3: Detail Inventori Kritis Minimarket ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-4">
              <Package size={16} className="text-rose-500" />
              Peringatan Stok Kritis Minimarket
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {criticalStockLoading ? (
                <div className="text-center py-8 text-slate-400 italic">Memuat data persediaan...</div>
              ) : criticalStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Semua Stok Aman</p>
                  <p className="text-[10px] text-slate-400">Tidak ada produk dengan persediaan rendah atau habis.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {criticalStock.slice(0, 6)?.map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-400">{item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                          item.status === 'HABIS' ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                        )}>
                          {item.status}: {item.stock} pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {criticalStock.length > 6 && (
            <p className="text-[9px] text-slate-400 font-semibold mt-2">
              * Dan {criticalStock.length - 6} produk kritis lainnya. Periksa menu Katalog & Stok untuk detail lengkap.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500">Panduan Restock</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium dark:text-slate-400">
              Sistem mendeteksi tingkat persediaan barang secara otomatis.
              Apabila persediaan barang berada di bawah batas minimum (status <strong>RENDAH</strong>), atau kosong (status <strong>HABIS</strong>), harap segera lakukan transaksi restock barang masuk untuk menjamin sirkulasi minimarket koperasi tetap lancar.
            </p>
          </div>
          <a 
            href="/cooperative/products" 
            className="text-xs font-bold text-center text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl transition-all shadow-sm"
          >
            Kelola Inventori &rarr;
          </a>
        </div>
      </div>
    </div>
  );
});

CoopManagementDashboard.displayName = 'CoopManagementDashboard';
