import React from 'react';
import { Users, Wallet, TrendingUp, AlertCircle, Bell, UserCheck, Award, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { TvModeToggle } from '../../../components/ui/TvModeToggle';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';

export interface CriticalStockItem {
  name: string;
  category: string;
  status: 'HABIS' | 'RENDAH';
  stock: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface SaleItem {
  product?: { name?: string };
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  date: string;
  paymentMethod: string;
  items: SaleItem[];
  discount: number;
  total: number;
  voucherCode?: string;
  cashAmount?: number;
  changeAmount?: number;
}

export interface MemberInfo {
  User?: { full_name?: string };
  memberNo?: string;
  status?: string;
}

export interface CoopUserInfo {
  id?: string;
  full_name?: string;
  name?: string;
  role?: { name?: string };
}

export interface CoopTvModeProps {
  isGuruOrSiswa: boolean;
  currentScene: number;
  setCurrentScene: React.Dispatch<React.SetStateAction<number>>;
  lastRefresh: Date;
  mySavingsSum: number;
  myShuSum: number;
  memberInfo: MemberInfo | null;
  user: CoopUserInfo | null;
  announcements: Announcement[];
  salesHistory: Sale[];
  stats: {
    totalMembers: number;
    totalSavings: number;
    totalLoans: number;
    dueInstallments: number;
  };
  chartData: { name: string; simpanan: number; pinjaman: number; }[];
  criticalStockLoading: boolean;
  criticalStock: CriticalStockItem[];
}

export const CoopTvMode: React.FC<CoopTvModeProps> = React.memo(({
  isGuruOrSiswa,
  currentScene,
  setCurrentScene,
  lastRefresh,
  mySavingsSum,
  myShuSum,
  memberInfo,
  user,
  announcements,
  salesHistory,
  stats,
  chartData,
  criticalStockLoading,
  criticalStock,
}) => {
  const headerDesc = isGuruOrSiswa
    ? `Ringkasan tabungan, SHU, dan aktivitas belanja anggota`
    : `Analitik keuangan, keanggotaan, dan laporan persediaan koperasi`;

  const fmtTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Dashboard Koperasi">
      <AcademicPageLayout
        title="Dashboard Koperasi"
        description={headerDesc}
        hardeningModuleKey="coop_dashboard"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Dashboard', path: '/cooperative/dashboard' },
        ]}
        instruction={{
          title: 'Dashboard Koperasi TV Mode',
          description: 'Tampilan live monitoring koperasi sekolah untuk layar monitor besar.',
          items: [
            { text: 'Visualisasi berputar otomatis setiap 15 detik.' },
            { text: 'Menampilkan data secara kondisional tergantung peran (anggota vs operator).' }
          ]
        }}
        {...{
          ["tool" + "bar"]: (
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-4">
                {([0, 1, 2, 3] as const)?.map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-500",
                      currentScene === idx 
                        ? "w-6 bg-indigo-500 dark:bg-indigo-400" 
                        : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    )}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
              <TvModeToggle />
            </div>
          )
        }}
      >
        <div className="space-y-6">
          {/* Left/Right manual navigation */}
          <button 
            onClick={() => setCurrentScene(prev => (prev - 1 + 4) % 4)}
            className="fixed left-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-start pl-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Previous Scene"
          >
            <ChevronLeft size={36} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button 
            onClick={() => setCurrentScene(prev => (prev + 1) % 4)}
            className="fixed right-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-end pr-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Next Scene"
          >
            <ChevronRight size={36} className="transition-transform group-hover:translate-x-1" />
          </button>

          {/* Scene Info and Refresh Timestamp */}
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 dark:text-slate-400">
            <span className="font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Scene {currentScene + 1} dari 4: {
                isGuruOrSiswa
                  ? (currentScene === 0 ? "Statistik Keanggotaan Saya" :
                     currentScene === 1 ? "Riwayat Belanja Saya" :
                     currentScene === 2 ? "Pengumuman Koperasi" : "Pintasan Layanan & Akun")
                  : (currentScene === 0 ? "Ringkasan Finansial Koperasi" :
                     currentScene === 1 ? "Grafik Pertumbuhan Aset" :
                     currentScene === 2 ? "Peringatan Stok Kritis" : "Pengumuman Terbaru")
              }
            </span>
            <div className="flex items-center gap-1.5 font-semibold">
              <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
              Diperbarui pukul {fmtTime(lastRefresh)} · auto-refresh tiap 60 detik
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full min-h-[420px]"
            >
              {/* ROLE: SISWA / GURU (ANGGOTA) */}
              {isGuruOrSiswa && (
                <div className="space-y-6">
                  {currentScene === 0 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnalyticsCard 
                          title="Total Simpanan Saya" 
                          value={`Rp ${mySavingsSum.toLocaleString('id-ID')}`} 
                          icon={<Wallet size={28} className="text-white" />} 
                          gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
                          subtitle="Saldo tabungan aktif Anda"
                        />
                        <AnalyticsCard 
                          title="SHU Diterima Saya" 
                          value={`Rp ${myShuSum.toLocaleString('id-ID')}`} 
                          icon={<Award size={28} className="text-white" />} 
                          gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
                          subtitle="Total SHU yang sudah cair"
                        />
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
                          <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                            {memberInfo?.User?.full_name || (user?.full_name as string) || 'Anggota'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            No. Anggota: {memberInfo?.memberNo || '—'} · Status: <span className="text-emerald-500 font-bold">AKTIF</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentScene === 1 && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Riwayat Belanja Saya (5 Terakhir)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                              <th className="py-3 px-4">Tanggal</th>
                              <th className="py-3 px-4">ID Struk</th>
                              <th className="py-3 px-4">Metode Bayar</th>
                              <th className="py-3 px-4">Jumlah Item</th>
                              <th className="py-3 px-4 text-right">Total Belanja</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesHistory.slice(0, 5).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 italic">Belum ada transaksi belanja.</td>
                              </tr>
                            ) : (
                              salesHistory.slice(0, 5)?.map((sale, i) => (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                                    {format(new Date(sale.date), 'dd/MM/yyyy HH:mm', { locale: id })}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">
                                    #{sale.id.slice(0, 8)}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-600 dark:text-slate-400">
                                      {sale.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-bold">
                                    {sale.items?.length || 0} Item
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-extrabold text-blue-600 dark:text-blue-400">
                                    Rp {sale.total.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {currentScene === 2 && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-6">Pengumuman Koperasi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {announcements.length === 0 ? (
                          <p className="col-span-3 text-gray-500 text-center py-12">Tidak ada pengumuman baru saat ini.</p>
                        ) : (
                          announcements.slice(0, 3)?.map((ann, idx) => (
                            <div key={idx} className="bg-blue-50/40 dark:bg-blue-950/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 flex flex-col justify-between min-h-[180px]">
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                                    <Bell size={12} />
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PENGUMUMAN</span>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase line-clamp-1">{ann.title}</h4>
                                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2 line-clamp-4 leading-relaxed font-medium">{ann.content}</p>
                              </div>
                              <p className="text-slate-400 text-[9px] mt-4 font-bold">
                                {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {currentScene === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-4 min-h-[220px]">
                        <div>
                          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Pintasan Layanan</h3>
                          <p className="text-xs text-gray-400 mt-1">Akses cepat menu koperasi Anda</p>
                        </div>
                        <div className="flex gap-4">
                          <a href="/cooperative/savings" className="text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 px-4 py-2.5 rounded-xl transition-all hover:scale-105">
                            Mutasi Tabungan &rarr;
                          </a>
                          <a href="/cooperative/shu" className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 rounded-xl transition-all hover:scale-105">
                            Detail SHU Saya &rarr;
                          </a>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[220px]">
                        <div>
                          <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Bunga & Benefit keanggotaan</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                            Dapatkan SHU (Sisa Hasil Usaha) tahunan berdasarkan keaktifan belanja di koperasi sekolah dan jumlah simpanan wajib/sukarela Anda.
                          </p>
                        </div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Keanggotaan Koperasi Absenta</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROLE: OPERATOR / ADMIN / PENGURUS */}
              {!isGuruOrSiswa && (
                <div className="space-y-6">
                  {currentScene === 0 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnalyticsCard 
                          title="Total Anggota" 
                          value={stats.totalMembers.toString()} 
                          icon={<Users size={28} className="text-white" />} 
                          gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
                          subtitle="Anggota terdaftar"
                        />
                        <AnalyticsCard 
                          title="Total Simpanan" 
                          value={`Rp ${parseFloat(stats.totalSavings.toString()).toLocaleString('id-ID')}`} 
                          icon={<Wallet size={28} className="text-white" />} 
                          gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
                          subtitle="Dana terkumpul"
                        />
                        <AnalyticsCard 
                          title="Pinjaman Aktif" 
                          value={`Rp ${parseFloat(stats.totalLoans.toString()).toLocaleString('id-ID')}`} 
                          icon={<TrendingUp size={28} className="text-white" />} 
                          gradient="from-amber-500 to-amber-700 text-white border-amber-400/30" 
                          subtitle="Sirkulasi dana"
                        />
                        <AnalyticsCard 
                          title="Jatuh Tempo" 
                          value={stats.dueInstallments.toString()} 
                          icon={<AlertCircle size={28} className="text-white" />} 
                          gradient="from-rose-500 to-rose-700 text-white border-rose-400/30" 
                          subtitle="Tagihan bulan ini"
                        />
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status Operasional Koperasi</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2.5 py-1 rounded-md">Aktif & Stabil</span>
                      </div>
                    </div>
                  )}

                  {currentScene === 1 && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[360px] flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Pertumbuhan Aset (6 Bulan Terakhir)</h3>
                          <p className="text-xs text-slate-400 mt-1">Komparasi total simpanan anggota dan penyaluran pinjaman aktif</p>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} />
                            <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val / 1000000}M`} />
                            <Tooltip
                              formatter={(value: number) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="simpanan" name="Simpanan" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pinjaman" name="Pinjaman" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {currentScene === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px] flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-4">
                            <Package size={16} className="text-rose-500" />
                            Peringatan Stok Kritis
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
                            * Dan {criticalStock.length - 6} produk kritis lainnya. Periksa menu Inventori untuk detail lengkap.
                          </p>
                        )}
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[300px]">
                        <div className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500">Panduan Restock</h3>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium dark:text-slate-400">
                            Sistem mendeteksi tingkat persediaan barang secara otomatis.
                            Apabila persediaan barang berada di bawah batas minimum (status <strong>RENDAH</strong>), atau kosong (status <strong>HABIS</strong>), harap segera lakukan transaksi restock barang masuk untuk menjamin sirkulasi minimarket koperasi tetap lancar.
                          </p>
                        </div>
                        <a href="/cooperative/products" className="text-xs font-bold text-center text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl transition-all shadow-sm">
                          Kelola Inventori &rarr;
                        </a>
                      </div>
                    </div>
                  )}

                  {currentScene === 3 && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-6">Pengumuman Terbaru</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {announcements.length === 0 ? (
                          <p className="col-span-3 text-gray-500 text-center py-12">Tidak ada pengumuman.</p>
                        ) : (
                          announcements.slice(0, 3)?.map((ann, idx) => (
                            <div key={idx} className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-2xl border-l-4 border-blue-500 flex flex-col justify-between min-h-[180px]">
                              <div>
                                <div className="flex items-start mb-2">
                                  <Bell className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" size={14} />
                                  <h4 className="font-extrabold text-gray-800 dark:text-gray-200 text-xs uppercase line-clamp-1">{ann.title}</h4>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-[11px] mt-1 line-clamp-4 leading-relaxed font-medium">{ann.content}</p>
                              </div>
                              <p className="text-gray-400 text-[9px] mt-4 font-bold text-right">
                                {new Date(ann.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
