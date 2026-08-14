import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Wallet, TrendingUp, AlertCircle, Bell, UserX, UserCheck, Award, ShoppingCart, Eye, Printer, Check, Copy, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api from '../../lib/axiosInstance';
import { SectionCard, Table, Button } from '../../components/ui';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '../../utils/cooperative/coopDocUtils';
import { NonMemberBanner } from '../../components/cooperative/shared/NonMemberBanner';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { useTvStore } from '../../store/tvStore';
import { TvModeToggle } from '../../components/ui/TvModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { CoopTvMode, type CriticalStockItem, type Announcement, type Sale, type SaleItem, type CoopUserInfo } from './components/CoopTvMode';
import { ReceiptModal } from './components/ReceiptModal';

const StrukBadge: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('ID Struk disalin!');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-sm font-semibold"
    >
      <span>#{id.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-500 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
};

interface MemberInfo { User?: { full_name?: string }; memberNo?: string; status?: string; }

const Dashboard: React.FC = React.memo(() => {
  const receiptStyles = { backgroundColor: '#FCFBF7' };
  const { user, subscription } = useAuthStore();
  const { isSuperAdmin } = useCapabilities();

  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const salesPageLimit = 10;

  const { isKoperasi, isKoperasiHead, isKoperasiFinance, isKoperasiStore, isAdmin } = useCapabilities();
  const isKoperasiStaff = isAdmin || isKoperasi || isKoperasiHead || isKoperasiFinance || isKoperasiStore;
  const isGuruOrSiswa = !isKoperasiStaff;

  // Gating Logic
  const features = useMemo(() => (subscription as unknown as Record<string, unknown>)?.features as string[] || subscription?.Plan?.features_json || subscription?.plan?.features_json || [], [subscription]);
  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);

  // Dummy data for chart - in production, fetch this from API
  const chartData = useMemo(() => [
    { name: 'Jan', simpanan: 4000000, pinjaman: 2400000 },
    { name: 'Feb', simpanan: 3000000, pinjaman: 1398000 },
    { name: 'Mar', simpanan: 2000000, pinjaman: 9800000 },
    { name: 'Apr', simpanan: 2780000, pinjaman: 3908000 },
    { name: 'May', simpanan: 1890000, pinjaman: 4800000 },
    { name: 'Jun', simpanan: 2390000, pinjaman: 3800000 },
  ], []);

  // ── React Query Hooks ──
  const { data: memberInfo = null, isLoading: loadingMemberInfo } = useQuery<MemberInfo | null>({
    queryKey: ['cooperative-member-me', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    enabled: isGuruOrSiswa && !isLocked,
  });

  const memberStatus = useMemo<'loading' | 'member' | 'non-member'>(() => {
    if (!isGuruOrSiswa) return 'member';
    if (loadingMemberInfo) return 'loading';
    return memberInfo && memberInfo.status === 'ACTIVE' ? 'member' : 'non-member';
  }, [isGuruOrSiswa, loadingMemberInfo, memberInfo]);

  const { data: stats = { totalMembers: 0, totalSavings: 0, totalLoans: 0, dueInstallments: 0 }, isLoading: loadingStats, dataUpdatedAt } = useQuery({
    queryKey: ['cooperative-dashboard-stats'],
    queryFn: async () => {
      const statsRes = await api.get('/cooperative/dashboard/stats');
      const raw = statsRes.data?.data || {};
      return {
        totalMembers: Number(raw.totalMembers) || 0,
        totalSavings: Number(raw.totalSavings) || 0,
        totalLoans: Number(raw.totalLoans) || 0,
        dueInstallments: Number(raw.dueInstallments) || 0,
      };
    },
    enabled: !isLocked,
    refetchInterval: isTvMode ? 60000 : false,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['cooperative-announcements'],
    queryFn: async () => {
      try {
        const annRes = await api.get('/cooperative/announcements');
        const annList = annRes.data?.data;
        return Array.isArray(annList) ? annList : [];
      } catch {
        return [];
      }
    },
    enabled: !isLocked,
  });

  const { data: criticalStock = [], isLoading: criticalStockLoading } = useQuery<CriticalStockItem[]>({
    queryKey: ['cooperative-critical-stock'],
    queryFn: async () => {
      const res = await api.get('/cooperative/reports/inventory/stock');
      const items = res.data?.items || [];
      return items.filter((item: CriticalStockItem) => item.status === 'HABIS' || item.status === 'RENDAH');
    },
    enabled: !isLocked && !isGuruOrSiswa,
    refetchInterval: isTvMode ? 60000 : false,
  });

  const { data: mySavingsSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-savings', memberInfo?.memberNo],
    queryFn: async () => {
      const savingsRes = await api.get('/cooperative/savings');
      return (savingsRes.data || []).reduce((sum: number, s: { amount?: number | string }) => sum + Number(s.amount || 0), 0);
    },
    enabled: memberStatus === 'member',
  });

  const { data: myShuSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-shu', memberInfo?.memberNo],
    queryFn: async () => {
      const shuRes = await api.get('/cooperative/shu/my-history');
      if (shuRes.data?.success) {
        return (shuRes.data.data || []).reduce((sum: number, h: { totalShu?: number | string }) => sum + Number(h.totalShu || 0), 0);
      }
      return 0;
    },
    enabled: memberStatus === 'member',
  });

  const { data: salesHistory = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history'],
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/history');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: memberStatus === 'member',
  });

  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
  });

  const loading = loadingStats;
  const lastRefresh = useMemo(() => new Date(dataUpdatedAt || Date.now()), [dataUpdatedAt]);

  // TV Mode Auto Rotation
  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  const printReceipt = useCallback((sale: Sale) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || user?.full_name || 'Tamu';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  const fmtTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
      return <div className="flex justify-center items-center h-64 text-gray-500 font-bold dark:text-slate-400">Loading Dashboard...</div>;
  }

  if (isTvMode) {
    return (
      <CoopTvMode
        isGuruOrSiswa={isGuruOrSiswa}
        currentScene={currentScene}
        setCurrentScene={setCurrentScene}
        lastRefresh={lastRefresh}
        mySavingsSum={mySavingsSum}
        myShuSum={myShuSum}
        memberInfo={memberInfo}
        user={user as CoopUserInfo | null}
        announcements={announcements}
        salesHistory={salesHistory}
        stats={stats}
        chartData={chartData}
        criticalStockLoading={criticalStockLoading}
        criticalStock={criticalStock}
      />
    );
  }

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Dashboard Koperasi"
    >
      <AcademicPageLayout
        title="Dashboard Koperasi"
        description="Ringkasan aktivitas dan performa koperasi hari ini"
        hardeningModuleKey="coop_dashboard"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Dashboard', path: '/cooperative/dashboard' },
        ]}
        instruction={{
          title: 'Panduan Dashboard Koperasi',
          description: 'Pantau statistik anggota, simpanan, pinjaman, dan aktivitas belanja dalam satu layar.',
          items: [
            { text: 'Lihat ringkasan total anggota dan sirkulasi dana pada kartu statistik.' },
            { text: 'Pantau grafik simpanan vs pinjaman untuk melihat tren keuangan.' },
            { text: 'Gunakan fitur pengumuman untuk menyebarkan informasi kepada anggota.' },
            { text: 'Riwayat belanja Anda tersedia di bagian bawah jika Anda adalah anggota aktif.' },
          ],
        }}
        toolbar={
          <div className="flex items-center gap-2">
            <TvModeToggle />
            <Link
              to="/cooperative/members"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none"
            >
              <span>Buka Ruang Kerja</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        }
      >
        <div className="space-y-8">

        {/* ── Banner Status Keanggotaan Koperasi ─────────────────────────────── */}
        {isGuruOrSiswa && memberStatus === 'non-member' && (
          <NonMemberBanner />
        )}

        {isGuruOrSiswa && memberStatus === 'member' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium shadow-sm">
            <UserCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Anda terdaftar sebagai <strong>Anggota Aktif</strong> Koperasi Sekolah. Akses penuh telah diaktifkan.</span>
          </div>
        )}

        {/* ── SECTION 1: Ringkasan Statistik & Status ─────────────────────────────── */}
        {isGuruOrSiswa && memberStatus === 'member' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnalyticsCard 
                title="Total Simpanan Saya" 
                value={`Rp ${mySavingsSum.toLocaleString('id-ID')}`} 
                icon={<Wallet size={24} />} 
                gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
                subtitle="Saldo tabungan aktif Anda"
              />

              <AnalyticsCard 
                title="SHU Diterima Saya" 
                value={`Rp ${myShuSum.toLocaleString('id-ID')}`} 
                icon={<Award size={24} />} 
                gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
                subtitle="Total SHU yang sudah cair"
              />

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-2">
                <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Pintasan Layanan</h3>
                <div className="flex gap-2">
                  <a href="/cooperative/savings" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg transition-colors">
                    Mutasi Tabungan &rarr;
                  </a>
                  <a href="/cooperative/shu" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg transition-colors">
                    Detail SHU Saya &rarr;
                  </a>
                </div>
              </div>
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
        ) : (
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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status Operasional Koperasi</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2.5 py-1 rounded-md">Aktif & Stabil</span>
            </div>
          </div>
        )}

        {/* Divider 1 */}
        <hr className="border-slate-200 dark:border-slate-800" />

        {/* ── SECTION 2: Grafik Pertumbuhan & Pengumuman ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!isGuruOrSiswa ? (
            <>
              <div className="lg:col-span-2">
                <SectionCard title="Pertumbuhan Aset (6 Bulan Terakhir)" fullWidth noPadding>
                  <div className="h-80 p-6">
                    <ResponsiveContainer width="100%" height="100%">
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
                                {new Date(ann.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          ) : (
            <div className="lg:col-span-3 space-y-6">
              <SectionCard title="Pengumuman Koperasi Sekolah" fullWidth noPadding>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                  {announcements.length === 0 ? (
                    <p className="col-span-3 text-gray-500 text-center py-8">Tidak ada pengumuman baru saat ini.</p>
                  ) : (
                    announcements.slice(0, 3)?.map((ann, idx) => (
                      <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                              <Bell size={12} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PENGUMUMAN</span>
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight line-clamp-1">{ann.title}</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2 line-clamp-4 leading-relaxed">{ann.content}</p>
                        </div>
                        <p className="text-slate-400 text-[9px] mt-4 font-bold">
                          Diterbitkan: {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        {/* Divider 2 */}
        <hr className="border-slate-200 dark:border-slate-800" />

        {/* ── SECTION 3: Detail Inventori Kritis / Riwayat Belanja ─────────────────────────────── */}
        {!isGuruOrSiswa ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
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

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[220px]">
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
        ) : memberStatus === 'member' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SectionCard title="Riwayat Belanja Saya" fullWidth noPadding>
                <div className="p-6">
                  <Table
                      data={(salesHistory ?? []).slice((salesPage - 1) * salesPageLimit, salesPage * salesPageLimit)}
                      loading={salesLoading}
                      emptyMessage="Anda belum memiliki riwayat transaksi belanja."
                      pagination={{
                        currentPage: salesPage,
                        totalPages: Math.max(1, Math.ceil((salesHistory ?? []).length / salesPageLimit)),
                        totalItems: (salesHistory ?? []).length,
                        itemsPerPage: salesPageLimit,
                        onPageChange: salesPage => setSalesPage(salesPage),
                        onLimitChange: () => {}
                      }}
                      columns={[
                        {
                          label: 'Tanggal',
                          key: 'date',
                          sortable: true,
                          render: (date: string) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: id }),
                        },
                        {
                          label: 'ID Struk',
                          key: 'id',
                          render: (id: string) => <StrukBadge id={id} />,
                        },
                        {
                          label: 'Metode Pembayaran',
                          key: 'paymentMethod',
                          render: (m: string) => (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {m}
                            </span>
                          ),
                        },
                        {
                          label: 'Items',
                          key: 'items',
                          render: (items: SaleItem[]) => `${(items ?? []).length} Item`,
                        },
                        {
                          label: 'Diskon',
                          key: 'discount',
                          render: (val: number) => val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-',
                        },
                        {
                          label: 'Total Belanja',
                          key: 'total',
                          sortable: true,
                          render: (val: number) => (
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Rp {val.toLocaleString('id-ID')}
                            </span>
                          ),
                        },
                        {
                          label: 'Aksi',
                          key: 'action',
                          render: (_: unknown, record: Sale) => (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1"
                              onClick={() => printReceipt(record)}
                            >
                              <Printer size={13} />
                              Cetak
                            </Button>
                          ),
                        }
                      ]}
                  />
                </div>
              </SectionCard>
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
        ) : null}

        </div>

      {/* ── Detail Struk Belanja Modal ─────────────────────────────── */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedSale(null);
        }}
        selectedSale={selectedSale}
        coopSettings={coopSettings}
        memberInfo={memberInfo}
        user={user as CoopUserInfo | null}
        printReceipt={printReceipt}
      />
    </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Dashboard;


