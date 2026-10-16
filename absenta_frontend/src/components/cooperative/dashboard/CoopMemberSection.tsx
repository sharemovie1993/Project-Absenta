import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Award, 
  UserCheck, 
  Bell, 
  Printer, 
  Check, 
  Copy, 
  Clock, 
  ShoppingBag, 
  Vote, 
  ArrowRight,
  QrCode,
  BookOpen,
  Tag,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { SectionCard, Table, Button } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { NonMemberBanner } from '@/components/cooperative/shared/NonMemberBanner';
import { MemberDetailModalProxy } from '@/components/cooperative/loans/MemberDetailModalProxy';
import { MemberSavingsPassbookModal } from '@/components/cooperative/loans/MemberSavingsPassbookModal';
import { formatDate } from '@/utils/date.utils';
import type { Sale, SaleItem } from '@/components/cooperative/types';
import type { CoopMemberSectionProps } from './types';

const StrukBadge: React.FC<{ id: string }> = ({ id: receiptId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(receiptId);
    setCopied(true);
    toast.success('ID Struk disalin!');
    setTimeout(() => setCopied(false), 1500);
  }, [receiptId]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-xs font-semibold cursor-pointer"
      title="Salin ID Struk"
    >
      <span>#{receiptId.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-500 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
};

export const CoopMemberSection: React.FC<CoopMemberSectionProps> = React.memo(({
  memberStatus,
  memberInfo,
  user,
  mySavingsSum,
  myShuSum,
  announcements,
  salesHistory,
  salesLoading,
  printReceipt,
  memberSummary,
}) => {
  const [salesPage, setSalesPage] = useState(1);
  const salesPageLimit = 10;

  // Modal State for Digital Member Card & Savings Passbook
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isPassbookModalOpen, setIsPassbookModalOpen] = useState(false);

  // Identity resolution
  const currentMemberId = memberInfo?.id || memberSummary?.memberInfo?.id || null;
  const currentMemberName = memberInfo?.User?.full_name || memberInfo?.name || memberSummary?.memberInfo?.name || user?.full_name || 'Anggota Koperasi';
  const currentMemberNo = memberInfo?.memberNo || memberSummary?.memberInfo?.memberNo || '—';
  const currentMemberType = memberInfo?.type || memberSummary?.memberInfo?.type || (user?.role === 'TEACHER' ? 'GURU' : user?.role === 'STUDENT' ? 'SISWA' : 'ANGGOTA');

  // Savings & Obligations Breakdown
  const totalSavings = memberSummary?.mySavings?.total ?? mySavingsSum;
  const pokok = memberSummary?.mySavings?.pokok ?? 0;
  const wajib = memberSummary?.mySavings?.wajib ?? 0;
  const sukarela = memberSummary?.mySavings?.sukarela ?? 0;
  const unpaidWajib = memberSummary?.mySavings?.unpaidWajibThisMonth ?? false;

  // SHU Dividend Projections
  const estimatedShu = memberSummary?.myShuEstimate?.estimatedAmount ?? myShuSum;
  const shuYear = memberSummary?.myShuEstimate?.periodYear ?? new Date().getFullYear();

  // Purchases Breakdown
  const purchasesList = useMemo(() => salesHistory ?? [], [salesHistory]);
  const totalSpent = useMemo(() => {
    return (purchasesList ?? []).reduce((acc, sale) => {
      const val = sale.total ?? (sale as { total_amount?: number })?.total_amount ?? 0;
      return acc + Number(val || 0);
    }, 0);
  }, [purchasesList]);

  // Modal Trigger Handlers
  const handleOpenCardModal = useCallback(() => {
    if (!currentMemberId) {
      toast.error('Data profil keanggotaan belum termuat.');
      return;
    }
    setIsCardModalOpen(true);
  }, [currentMemberId]);

  const handleOpenPassbookModal = useCallback(() => {
    if (!currentMemberId) {
      toast.error('Data rekening tabungan belum termuat.');
      return;
    }
    setIsPassbookModalOpen(true);
  }, [currentMemberId]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full max-w-full min-w-0">
      {/* ── Non-Member State ─────────────────────────────── */}
      {memberStatus === 'non-member' && (
        <NonMemberBanner />
      )}

      {/* ── Member Verified Section ─────────────────────────────── */}
      {memberStatus === 'member' && (
        <>
          {/* 1. Integrated Member Identity & Digital Access Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-full min-w-0">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                    {currentMemberName}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                    <ShieldCheck size={11} />
                    <span>AKTIF</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {currentMemberType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                  <span>No. Anggota:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {currentMemberNo}
                  </span>
                  <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">&bull;</span>
                  <span className="hidden sm:inline-block text-emerald-600 dark:text-emerald-400 font-medium">Terverifikasi Sistem Koperasi</span>
                </p>
              </div>
            </div>

            {/* Quick Modal Triggers */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPassbookModal}
                className="flex-1 md:flex-initial h-9 sm:h-10 text-xs font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <BookOpen size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Buku Tabungan</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCardModal}
                className="flex-1 md:flex-initial h-9 sm:h-10 text-xs font-bold gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
              >
                <QrCode size={15} />
                <span>Kartu Digital &amp; QR</span>
              </Button>
            </div>
          </div>

          {/* 2. Pengingat Kewajiban Simpanan Wajib Bulan Berjalan */}
          {unpaidWajib && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-800/60 rounded-2xl text-amber-950 dark:text-amber-200 text-xs shadow-xs w-full max-w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="truncate">
                  <strong>Pengingat Iuran Wajib:</strong> Anda belum melakukan setoran simpanan wajib untuk bulan ini.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenPassbookModal}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs"
                >
                  Lihat Rekening
                </button>
              </div>
            </div>
          )}

          {/* 3. Tiga Kartu Metrik Finansial Utama */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full min-w-0">
            <AnalyticsCard 
              title="Total Simpanan Saya" 
              value={`Rp ${totalSavings.toLocaleString('id-ID')}`} 
              icon={<Wallet size={24} />} 
              gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
              subtitle={`Pokok: Rp ${pokok.toLocaleString('id-ID')} • Wajib: Rp ${wajib.toLocaleString('id-ID')} • Sukarela: Rp ${sukarela.toLocaleString('id-ID')}`}
            />

            {unpaidWajib ? (
              <AnalyticsCard 
                title="Status Iuran Wajib Bulan Ini" 
                value="Belum Bayar" 
                icon={<AlertCircle size={24} />} 
                gradient="from-amber-500 to-rose-600 text-white border-amber-400/30" 
                subtitle="Segera lakukan setoran simpanan wajib periode ini"
              />
            ) : (
              <AnalyticsCard 
                title="Status Iuran Wajib Bulan Ini" 
                value="Lunas Terverifikasi" 
                icon={<ShieldCheck size={24} />} 
                gradient="from-teal-600 to-emerald-700 text-white border-teal-400/30" 
                subtitle="Kewajiban simpanan bulanan tertib & aktif"
              />
            )}

            <AnalyticsCard 
              title="Estimasi Dividen SHU" 
              value={`Rp ${estimatedShu.toLocaleString('id-ID')}`} 
              icon={<Award size={24} />} 
              gradient="from-indigo-600 to-purple-700 text-white border-indigo-400/30" 
              subtitle={`Proyeksi SHU Tahun Buku ${shuYear}`}
            />
          </div>

          {/* 4. Action Hub: Pintasan Cepat Layanan Anggota */}
          <div className="space-y-3 w-full max-w-full min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Aksi &amp; Layanan Cepat Anggota</span>
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Shortcut 1: Katalog Toko */}
              <Link
                to="/cooperative/products"
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag size={18} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Katalog Toko
                  </h5>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    Produk &amp; alat tulis sekolah
                  </p>
                </div>
              </Link>

              {/* Shortcut 2: Buku Tabungan Digital Modal */}
              <button
                type="button"
                onClick={handleOpenPassbookModal}
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen size={18} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Buku Tabungan
                  </h5>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    Mutasi setor, tarik &amp; saldo
                  </p>
                </div>
              </button>

              {/* Shortcut 3: Voucher & Promo */}
              <Link
                to="/cooperative/vouchers"
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-rose-400 dark:hover:border-rose-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Tag size={18} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    Voucher Belanja
                  </h5>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    Klaim kupon promo &amp; diskon
                  </p>
                </div>
              </Link>

              {/* Shortcut 4: Sidang RAT & e-Voting */}
              <Link
                to="/cooperative/rat"
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-purple-400 dark:hover:border-purple-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Vote size={18} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Sidang RAT
                  </h5>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    Bilik suara &amp; kedaulatan voting
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* 5. Sleek Compact RAT Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-md border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-full min-w-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-inner">
                <Vote className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Kedaulatan Anggota
                  </span>
                  <span className="text-[11px] text-purple-200/80 font-medium truncate">
                    Asas One Member One Vote
                  </span>
                </div>
                <h4 className="font-bold text-sm sm:text-base text-white truncate">
                  Rapat Anggota Tahunan (RAT) &amp; Bilik Suara Digital
                </h4>
                <p className="text-xs text-purple-200/80 max-w-xl truncate">
                  Pantau kuorum persidangan dan gunakan hak e-Voting Anda dalam musyawarah tertinggi.
                </p>
              </div>
            </div>
            <Link
              to="/cooperative/rat"
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-purple-50 font-bold text-xs shadow-sm inline-flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Masuk Sidang RAT</span>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>
          </div>
        </>
      )}

      {/* Divider */}
      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 2: Pengumuman Koperasi Sekolah ─────────────────────────────── */}
      <div className="space-y-4 w-full max-w-full min-w-0">
        <SectionCard title="Pengumuman Koperasi Sekolah" fullWidth noPadding>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 sm:p-6 w-full max-w-full min-w-0">
            {(announcements ?? []).length === 0 ? (
              <p className="col-span-3 text-gray-500 text-center py-8 text-xs">
                Tidak ada pengumuman baru saat ini.
              </p>
            ) : (
              (announcements ?? []).slice(0, 3)?.map((ann, idx) => (
                <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/10 p-4 sm:p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                        <Bell size={12} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        PENGUMUMAN
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight line-clamp-1">
                      {ann.title}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2 line-clamp-3 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                  <p className="text-slate-400 text-[9px] mt-4 font-bold">
                    Diterbitkan: {formatDate(ann.created_at || (ann as { createdAt?: string }).createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Divider */}
      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 3: Riwayat Transaksi Belanja Kasir Toko & Statistik Benefit ─────────────────────────────── */}
      {memberStatus === 'member' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full min-w-0">
          <div className="lg:col-span-2 w-full max-w-full min-w-0">
            <SectionCard title="Riwayat Belanja Saya" fullWidth noPadding>
              <div className="p-4 sm:p-6 w-full max-w-full min-w-0 overflow-x-auto">
                <Table
                  data={(salesHistory ?? []).slice((salesPage - 1) * salesPageLimit, salesPage * salesPageLimit)}
                  loading={salesLoading}
                  emptyMessage="Anda belum memiliki riwayat transaksi belanja."
                  pagination={{
                    currentPage: salesPage,
                    totalPages: Math.max(1, Math.ceil((salesHistory ?? []).length / salesPageLimit)),
                    totalItems: (salesHistory ?? []).length,
                    itemsPerPage: salesPageLimit,
                    onPageChange: (p) => setSalesPage(p),
                    onLimitChange: () => {}
                  }}
                  columns={[
                    {
                      label: 'Tanggal & Jam',
                      key: 'date',
                      sortable: true,
                      render: (date: string, row: Sale) => {
                        const raw = date || (row as { created_at?: string })?.created_at;
                        if (!raw) return '-';
                        try {
                          return (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock size={12} className="text-slate-400" />
                              <span>{format(new Date(raw), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
                            </div>
                          );
                        } catch {
                          return '-';
                        }
                      },
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
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          {m || 'CASH'}
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
                      render: (val: number, row: Sale) => {
                        const totalVal = val ?? (row as { total_amount?: number })?.total_amount ?? 0;
                        return (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            Rp {Number(totalVal).toLocaleString('id-ID')}
                          </span>
                        );
                      },
                    },
                    {
                      label: 'Aksi',
                      key: 'action',
                      render: (_: unknown, record: Sale) => (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1 px-2.5 rounded-lg border-slate-200 dark:border-slate-700"
                          onClick={() => printReceipt(record)}
                          title="Cetak struk belanja"
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

          {/* Right Column: Benefit & Statistik Belanja */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between min-h-[220px] w-full max-w-full min-w-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                    Statistik &amp; Benefit Belanja
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block">Akumulasi Usaha Anggota</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Belanja</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                    Rp {totalSpent.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Frekuensi</span>
                  <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 block mt-0.5">
                    {purchasesList.length} Transaksi
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Setiap transaksi belanja Anda di toko koperasi akan meningkatkan bobot alokasi pembagian <strong>SHU Jasa Usaha Anggota</strong> pada akhir tahun buku.
              </p>

              <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 leading-snug">
                💡 <strong>Tips:</strong> Bawa kartu anggota digital Anda saat berbelanja di kasir sekolah untuk pencatatan otomatis transaksi dan reward dividen.
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                Keanggotaan Absenta
              </span>
              <Link
                to="/cooperative/products"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Belanja Sekarang</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Ready-Made Shared Proxy Modals ─────────────────────────────── */}
      {currentMemberId && (
        <>
          <MemberDetailModalProxy
            isOpen={isCardModalOpen}
            onClose={() => setIsCardModalOpen(false)}
            memberId={currentMemberId}
          />
          <MemberSavingsPassbookModal
            isOpen={isPassbookModalOpen}
            onClose={() => setIsPassbookModalOpen(false)}
            memberId={currentMemberId}
            memberName={currentMemberName}
            memberNo={currentMemberNo}
          />
        </>
      )}
    </div>
  );
});

CoopMemberSection.displayName = 'CoopMemberSection';
