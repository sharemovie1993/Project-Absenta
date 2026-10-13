import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  Bell, 
  CheckCircle2, 
  Package, 
  ShoppingBag, 
  Scale, 
  FileText, 
  PiggyBank, 
  PlusCircle, 
  ArrowUpRight, 
  ShieldAlert, 
  Clock, 
  Coins, 
  ArrowRight,
  Sparkles,
  HelpCircle,
  Receipt
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { SectionCard } from '../../../components/ui';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { cn } from '../../../lib/utils';
import type { CriticalStockItem, Announcement } from '@/components/cooperative/types';

interface CoopManagementDashboardProps {
  stats: {
    totalMembers: number;
    activeMembers?: number;
    totalSavings: number;
    simpananPokok?: number;
    simpananWajib?: number;
    simpananSukarela?: number;
    totalLoans: number;
    activeLoansCount?: number;
    dueInstallments: number;
    dueInstallmentsAmount?: number;
    storeSalesToday?: number;
    storeSalesCountToday?: number;
    storeSalesMonth?: number;
    storeSalesCountMonth?: number;
    activePeriod?: { id: string; year: number; totalShu: number; status: string } | null;
    openTickets?: number;
    pendingLoans?: Array<{ id: string; amount: number; duration: number; createdAt: string; memberName: string }>;
    monthlyTrend?: Array<{ name: string; simpanan: number; pinjaman: number; penjualan: number }>;
    recentActivities?: Array<{ id: string; type: 'SAVING' | 'SALE'; title: string; description: string; amount: number; date: string }>;
  };
  loadingStats?: boolean;
  chartData?: Array<{ name: string; simpanan: number; pinjaman: number; penjualan?: number }>;
  announcements: Announcement[];
  criticalStock: CriticalStockItem[];
  criticalStockLoading: boolean;
}

export const CoopManagementDashboard: React.FC<CoopManagementDashboardProps> = React.memo(({
  stats,
  loadingStats,
  chartData: propChartData,
  announcements,
  criticalStock,
  criticalStockLoading,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'all' | 'simpanan' | 'pinjaman' | 'penjualan'>('all');

  // Gunakan data tren bulanan riil dari stats jika tersedia
  const realChartData = (stats.monthlyTrend && stats.monthlyTrend.length > 0)
    ? stats.monthlyTrend
    : (propChartData || []);

  const pendingLoans = stats.pendingLoans || [];
  const recentActivities = stats.recentActivities || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ── SECTION 0: Quick Action Command Bar (Aksi Cepat Pengurus) ──────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Pusat Kendali Pengurus
              </span>
              <span className="text-xs text-indigo-200/70">
                Tahun Buku {stats.activePeriod ? stats.activePeriod.year : new Date().getFullYear()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              Aksi Cepat Manajemen Koperasi
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200/80">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Operasional Koperasi Berjalan Normal
          </div>
        </div>

        {/* Tombol Jalan Pintas Pengurus */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <Link
            to="/cooperative/savings"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform mb-1.5">
              <PiggyBank size={18} />
            </div>
            <span className="text-xs font-bold text-white">Catat Simpanan</span>
            <span className="text-[10px] text-emerald-300/80">Setor/Tarik</span>
          </Link>

          <Link
            to="/cooperative/pos"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform mb-1.5">
              <ShoppingBag size={18} />
            </div>
            <span className="text-xs font-bold text-white">Kasir Toko (POS)</span>
            <span className="text-[10px] text-indigo-300/80">Transaksi Kasir</span>
          </Link>

          <Link
            to="/cooperative/loans"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform mb-1.5">
              <Wallet size={18} />
            </div>
            <span className="text-xs font-bold text-white">Kelola Pinjaman</span>
            <span className="text-[10px] text-amber-300/80">{pendingLoans.length > 0 ? `${pendingLoans.length} Menunggu` : 'Cicilan & Akad'}</span>
          </Link>

          <Link
            to="/cooperative/accounting?tab=income-statement"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform mb-1.5">
              <Scale size={18} />
            </div>
            <span className="text-xs font-bold text-white">Laporan Keuangan</span>
            <span className="text-[10px] text-sky-300/80">Laba Rugi & Neraca</span>
          </Link>

          <Link
            to="/cooperative/shu"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform mb-1.5">
              <Coins size={18} />
            </div>
            <span className="text-xs font-bold text-white">Kelola SHU</span>
            <span className="text-[10px] text-purple-300/80">Kalkulasi RAT</span>
          </Link>

          <Link
            to="/cooperative/products"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 transition-all text-center group cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform mb-1.5">
              <Package size={18} />
            </div>
            <span className="text-xs font-bold text-white">Katalog & Stok</span>
            <span className="text-[10px] text-rose-300/80">{criticalStock.length > 0 ? `${criticalStock.length} Kritis` : 'Inventori'}</span>
          </Link>
        </div>
      </div>

      {/* ── SECTION 1: Ringkasan Statistik Agregat & Finansial Koperasi ──────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Anggota */}
          <AnalyticsCard 
            title="Total Anggota" 
            value={stats.totalMembers.toString()} 
            icon={<Users size={24} />} 
            gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
            subtitle={`${stats.activeMembers || stats.totalMembers} Anggota aktif`}
          />

          {/* Total Simpanan Terkumpul */}
          <AnalyticsCard 
            title="Total Simpanan" 
            value={`Rp ${Math.round(Number(stats.totalSavings || 0)).toLocaleString('id-ID')}`} 
            icon={<Wallet size={24} />} 
            gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
            subtitle={`Pokok: Rp ${(stats.simpananPokok || 0).toLocaleString('id-ID')} | Wajib: Rp ${(stats.simpananWajib || 0).toLocaleString('id-ID')}`}
          />

          {/* Pinjaman Aktif */}
          <AnalyticsCard 
            title="Pinjaman Beredar" 
            value={`Rp ${Math.round(Number(stats.totalLoans || 0)).toLocaleString('id-ID')}`} 
            icon={<TrendingUp size={24} />} 
            gradient="from-amber-500 to-amber-700 text-white border-amber-400/30" 
            subtitle={`${stats.activeLoansCount || 0} Pinjaman sedang berjalan`}
          />

          {/* Cicilan Jatuh Tempo */}
          <AnalyticsCard 
            title="Jatuh Tempo" 
            value={stats.dueInstallments.toString()} 
            icon={<AlertCircle size={24} />} 
            gradient="from-rose-500 to-rose-700 text-white border-rose-400/30" 
            subtitle={stats.dueInstallmentsAmount ? `Tunggakan: Rp ${stats.dueInstallmentsAmount.toLocaleString('id-ID')}` : 'Semua cicilan lancar'}
          />
        </div>

        {/* Baris Sekunder: Mini Metric Toko & SHU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Omzet Toko Bulan Ini</p>
                <p className="text-base font-black text-slate-800 dark:text-white">
                  Rp {Math.round(Number(stats.storeSalesMonth || 0)).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg">
              {stats.storeSalesCountMonth || 0} Transaksi
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                <Coins size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Tahun Buku SHU</p>
                <p className="text-base font-black text-slate-800 dark:text-white">
                  {stats.activePeriod ? `Tahun ${stats.activePeriod.year}` : 'Belum Ditetapkan'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${
              stats.activePeriod 
                ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {stats.activePeriod ? stats.activePeriod.status : 'DRAFT'}
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tiket & Pengaduan</p>
                <p className="text-base font-black text-slate-800 dark:text-white">
                  {stats.openTickets ? `${stats.openTickets} Menunggu` : 'Semua Tertangani'}
                </p>
              </div>
            </div>
            <Link 
              to="/cooperative/tickets"
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-0.5"
            >
              Lihat Tiket &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Approval Center / Tindakan Pengurus yang Tertunda ───────────── */}
      {pendingLoans.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80 dark:border-amber-800/40">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <ShieldAlert size={18} className="text-amber-600" />
              <span>Persetujuan Pinjaman Mendesak ({pendingLoans.length} Pengajuan Menunggu)</span>
            </div>
            <Link
              to="/cooperative/loans"
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              Buka Semua Pinjaman &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {pendingLoans.map(loan => (
              <div key={loan.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{loan.memberName}</p>
                  <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                    Rp {Number(loan.amount).toLocaleString('id-ID')} ({loan.duration} Bulan)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Diajukan: {new Date(loan.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <Link
                  to={`/cooperative/loans?detail=${loan.id}`}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                >
                  Tinjau
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3: Grafik Pertumbuhan Riil & Aktivitas Finansial Terkini ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Grafik Analisis Finansial (6 Bulan Riil) */}
        <div className="lg:col-span-2 min-w-0">
          <SectionCard 
            title="Tren Finansial & Operasional (6 Bulan Terakhir)" 
            fullWidth 
            noPadding
          >
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Agregat mutasi simpanan, pinjaman, dan penjualan toko riil:
                </span>
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeChartMetric === 'all' ? 'bg-white dark:bg-slate-950 font-bold shadow-xs text-indigo-600' : 'text-slate-500'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('simpanan')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeChartMetric === 'simpanan' ? 'bg-white dark:bg-slate-950 font-bold shadow-xs text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    Simpanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('pinjaman')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeChartMetric === 'pinjaman' ? 'bg-white dark:bg-slate-950 font-bold shadow-xs text-purple-600' : 'text-slate-500'
                    }`}
                  >
                    Pinjaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric('penjualan')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeChartMetric === 'penjualan' ? 'bg-white dark:bg-slate-950 font-bold shadow-xs text-blue-600' : 'text-slate-500'
                    }`}
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
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}K`}
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
        </div>

        {/* Kolom Kanan: Log Aktivitas Keuangan Terkini (Real-time Mutasi) */}
        <div className="lg:col-span-1 min-w-0 space-y-6">
          <SectionCard title="Aktivitas Mutasi Terkini" fullWidth noPadding>
            <div className="p-4 space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-xs italic">Belum ada transaksi mutasi terkini.</p>
              ) : (
                recentActivities.map(act => (
                  <div key={act.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        act.type === 'SAVING' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                      }`}>
                        {act.type === 'SAVING' ? <PiggyBank size={15} /> : <Receipt size={15} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{act.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{act.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className={`text-xs font-mono font-bold ${
                        act.type === 'SAVING' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        Rp {act.amount.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(act.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Pengumuman Terbaru */}
          <SectionCard title="Pengumuman Koperasi" fullWidth noPadding>
            <div className="space-y-3 p-4">
              {announcements.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-xs italic">Tidak ada pengumuman baru.</p>
              ) : (
                announcements.slice(0, 2).map((ann, idx) => (
                  <div key={idx} className="bg-indigo-50/60 dark:bg-indigo-950/20 p-3 rounded-xl border-l-4 border-indigo-500 space-y-1">
                    <div className="flex items-start gap-2">
                      <Bell className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={14} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{ann.title}</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 leading-relaxed">{ann.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

      </div>

      {/* ── SECTION 4: Detail Inventori Minimarket & Restock ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Package size={16} className="text-rose-500" />
                Peringatan Stok Kritis Minimarket
              </h3>
              <Link 
                to="/cooperative/products" 
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Katalog Produk &rarr;
              </Link>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {criticalStockLoading ? (
                <div className="text-center py-8 text-slate-400 italic text-xs">Memeriksa stok barang...</div>
              ) : criticalStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-center gap-2">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Semua Stok Barang Terkendali</p>
                  <p className="text-[10px] text-slate-500">Tidak ada produk dengan stok di bawah batas minimum.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {criticalStock.slice(0, 6).map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          item.status === 'HABIS' 
                            ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400" 
                            : "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
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
            <p className="text-[10px] text-slate-400 font-semibold mt-3">
              * Dan {criticalStock.length - 6} produk kritis lainnya. Silakan cek menu Katalog Produk untuk laporan selengkapnya.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={14} />
              Panduan Manajemen Koperasi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium dark:text-slate-400">
              Gunakan dashboard pengelola untuk memantau sirkulasi kas, persetujuan pinjaman anggota, kelancaran minimarket, dan persiapan pembagian SHU pada RAT.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Tip Efisiensi:</p>
              <p className="text-[10px] text-slate-500 leading-normal">
                Pastikan transaksi kasir POS selalu memasukkan nomor anggota agar SHU Jasa Transaksi terhitung otomatis ke hak anggota.
              </p>
            </div>
          </div>
          <Link 
            to="/cooperative/accounting" 
            className="text-xs font-bold text-center text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl transition-all shadow-sm mt-3"
          >
            Buka Laporan Keuangan Lengkap &rarr;
          </Link>
        </div>
      </div>

    </div>
  );
});

CoopManagementDashboard.displayName = 'CoopManagementDashboard';
