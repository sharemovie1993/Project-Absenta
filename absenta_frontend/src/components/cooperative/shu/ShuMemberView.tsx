import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import { useSocket } from '../../../hooks/useSocket';
import { SectionCard, Modal, Button, Table } from '../../ui';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { 
  TrendingUp, 
  Award, 
  DollarSign, 
  AlertCircle, 
  Sparkles, 
  ShoppingBag, 
  PiggyBank, 
  ArrowUpRight,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  Wallet,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import PremiumFeatureGate from '../../auth/PremiumFeatureGate';
import { NonMemberBanner } from '../shared/NonMemberBanner';
import { useAuthStore } from '../../../store/authStore';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '../../../utils/cooperative/coopDocUtils';
import type { Sale, SaleItem } from '../types';
import type { Saving } from '../savings/types';
import type { MyShuHistory } from '../../../pages/cooperative/SHU';

const StrukBadge: React.FC<{ id: string }> = ({ id: receiptId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(receiptId);
    setCopied(true);
    toast.success('ID Struk disalin!');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-sm font-semibold cursor-pointer"
      title="Salin ID Struk"
    >
      <span>#{receiptId.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-500 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
};

interface ShuMemberViewProps {
  memberStatus: 'loading' | 'member' | 'non-member';
  myHistory: MyShuHistory[];
  loadingHistory: boolean;
  hardeningModuleKey: string;
  memberInstruction: {
    title: string;
    description: string;
    items: { text: string }[];
  };
  embedded?: boolean;
}

export const ShuMemberView = React.memo<ShuMemberViewProps>(({
  memberStatus,
  myHistory,
  loadingHistory,
  hardeningModuleKey,
  memberInstruction,
  embedded = false
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State untuk modal interaktif
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const salesPageLimit = 8;

  // Live estimate data
  const { data: estimateData } = useQuery({
    queryKey: ['my-shu-live-estimate'],
    queryFn: async () => {
      const res = await api.get('/cooperative/shu/my-estimate');
      return res.data?.data;
    },
    enabled: memberStatus === 'member',
    staleTime: 30 * 1000,
  });

  // Data Member Me (untuk identitas struk)
  const { data: memberInfo = null } = useQuery({
    queryKey: ['cooperative-member-me', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    enabled: memberStatus === 'member',
  });

  // Settings Koperasi (untuk cetak struk)
  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
    enabled: isPurchasesModalOpen,
  });

  // Riwayat Belanja Saya (Kasir POS)
  const { data: salesHistory = [], isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history'],
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/history');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: memberStatus === 'member' && isPurchasesModalOpen,
  });

  // Daftar Rekening Simpanan Saya
  const { data: mySavings = [], isLoading: loadingSavings } = useQuery<Saving[]>({
    queryKey: ['cooperative-my-savings-detail'],
    queryFn: async () => {
      const res = await api.get('/cooperative/savings');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: memberStatus === 'member' && isSavingsModalOpen,
  });

  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['my-shu-live-estimate'] });
      if (isPurchasesModalOpen) {
        queryClient.invalidateQueries({ queryKey: ['cooperative-sales-history'] });
      }
      if (isSavingsModalOpen) {
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-savings-detail'] });
      }
    };
    subscribe('coop_shu_update', handleUpdate);
    subscribe('coop_pos_update', handleUpdate);
    subscribe('coop_saving_update', handleUpdate);
    return () => {
      unsubscribe('coop_shu_update', handleUpdate);
      unsubscribe('coop_pos_update', handleUpdate);
      unsubscribe('coop_saving_update', handleUpdate);
    };
  }, [subscribe, unsubscribe, queryClient, isPurchasesModalOpen, isSavingsModalOpen]);

  // Handle cetak struk mandiri
  const handlePrintReceipt = useCallback((sale: Sale) => {
    if (!sale || !coopSettings) {
      toast.error('Menyiapkan template struk...');
      return;
    }
    const rawName = memberInfo?.User?.full_name || memberInfo?.name || user?.full_name || 'Anggota Koperasi';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  if (memberStatus === 'loading') {
    const loadingContent = (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );

    if (embedded) return loadingContent;

    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
        <AcademicPageLayout
          title="SHU Saya"
          description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
          hardeningModuleKey={hardeningModuleKey}
          breadcrumbs={[
            { label: 'Koperasi', path: '/cooperative' },
            { label: 'SHU Saya', path: '/cooperative/shu' }
          ]}
          instruction={memberInstruction}
        >
          {loadingContent}
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  if (memberStatus === 'non-member') {
    const nonMemberContent = (
      <NonMemberBanner 
        description="Laporan pembagian SHU personal hanya tersedia bagi anggota aktif koperasi. Hubungi Bendahara atau Pengurus Koperasi sekolah untuk melakukan pendaftaran anggota."
      />
    );

    if (embedded) return nonMemberContent;

    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
        <AcademicPageLayout
          title="SHU Saya"
          description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
          hardeningModuleKey={hardeningModuleKey}
          breadcrumbs={[
            { label: 'Koperasi', path: '/cooperative' },
            { label: 'SHU Saya', path: '/cooperative/shu' }
          ]}
          instruction={memberInstruction}
        >
          {nonMemberContent}
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  const mainContent = (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Live Estimate Banner (Hanya jika diaktifkan oleh Ketua Koperasi) */}
      {estimateData?.enabled && estimateData?.hasActivePeriod && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-indigo-700/40">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                {estimateData.isOfficialCalculated ? (
                  <span>Kalkulasi Resmi SHU Tahun Buku {estimateData.year}</span>
                ) : (
                  <span>Simulasi / Proyeksi SHU Berjalan Tahun {estimateData.year}</span>
                )}
              </div>
              <span className="text-[11px] text-indigo-200/70 italic">
                {estimateData.isOfficialCalculated ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold not-italic">
                    <Check size={13} className="text-emerald-400" />
                    Terverifikasi: Hasil Perhitungan Pengurus ({estimateData.status})
                  </span>
                ) : (
                  '*Estimasi sementara sebelum RAT disahkan'
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-indigo-200/80 font-medium">
                  {estimateData.isOfficialCalculated ? 'Alokasi SHU Anda' : 'Estimasi Total SHU Anda'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                  Rp {Number(estimateData.estimatedTotalShu || 0).toLocaleString('id-ID')}
                </h2>
                <p className="text-[10px] text-indigo-300/70">
                  (Modal: Rp {Number(estimateData.estimatedJasaModal || 0).toLocaleString('id-ID')} + Transaksi: Rp {Number(estimateData.estimatedJasaTransaksi || 0).toLocaleString('id-ID')})
                </p>
                {estimateData.notes && (
                  <p className="text-[10px] text-indigo-200/70 pt-1 leading-relaxed">
                    {estimateData.notes}
                  </p>
                )}
              </div>

              {/* Card 1: Simpanan Modal Saya (Clickable -> Buka Detail Simpanan) */}
              <button
                type="button"
                onClick={() => setIsSavingsModalOpen(true)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-indigo-400/50 backdrop-blur-md transition-all text-left cursor-pointer group"
                title="Klik untuk melihat rincian mutasi simpanan modal"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 group-hover:scale-110 transition-transform">
                  <PiggyBank size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-indigo-200/70 uppercase font-black tracking-wider">Simpanan Modal Saya</p>
                    <ArrowUpRight size={13} className="text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-base font-bold text-white">
                    Rp {Number(estimateData.myTotalSimpananModal || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[9px] text-emerald-400 font-medium">Pokok + Wajib Aktif &bull; Lihat Rincian &rarr;</p>
                </div>
              </button>

              {/* Card 2: Volume Belanja Saya (Clickable -> Buka Riwayat Struk Belanja) */}
              <button
                type="button"
                onClick={() => setIsPurchasesModalOpen(true)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 hover:border-purple-400/50 backdrop-blur-md transition-all text-left cursor-pointer group"
                title="Klik untuk melihat riwayat struk belanja di koperasi"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-indigo-200/70 uppercase font-black tracking-wider">Volume Belanja Saya</p>
                    <ArrowUpRight size={13} className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-base font-bold text-white">
                    Rp {Number(estimateData.myBelanja || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[9px] text-sky-400 font-medium">Belanja Tahun {estimateData.year} &bull; Lihat Struk &rarr;</p>
                </div>
              </button>
            </div>

            <p className="text-[11px] text-indigo-200/60 leading-relaxed pt-2 border-t border-indigo-800/60">
              💡 <strong>Tips Meningkatkan SHU:</strong> Semakin aktif Anda berbelanja kebutuhan sekolah di toko koperasi dan menabung simpanan wajib, semakin besar porsi pembagian dividen SHU yang akan Anda terima di akhir tahun!
            </p>
          </div>

          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total SHU Diterima</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Rp {(myHistory || []).reduce((sum, h) => sum + Number(h.totalShu), 0).toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
        </SectionCard>

        <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penerimaan Terakhir</p>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {(myHistory || []).length > 0 
                ? `Rp ${Number(myHistory?.[0]?.totalShu || 0).toLocaleString('id-ID')} (${myHistory?.[0]?.Period?.year || ''})`
                : 'Belum ada data'
              }
            </h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
        </SectionCard>

        <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Anggota</p>
            <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              AKTIF & BERHAK
            </h3>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
        </SectionCard>
      </div>

      {/* History Table */}
      <SectionCard fullWidth className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Riwayat Distribusi SHU</h3>
        {loadingHistory ? (
          <div className="flex items-center justify-center min-h-[150px]">
            <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (myHistory || []).length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
            Belum ada data riwayat penerimaan SHU.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 text-center w-12">No</th>
                  <th className="p-4">Tahun Buku</th>
                  <th className="p-4 text-right">Simpanan Modal Saya</th>
                  <th className="p-4 text-right">Vol. Transaksi Saya (Rp)
                    <span className="block text-[8px] font-normal text-slate-400 normal-case">Deposit + Pinjaman</span>
                  </th>
                  <th className="p-4 text-right">Jasa Modal (Rp)</th>
                  <th className="p-4 text-right">Jasa Transaksi (Rp)</th>
                  <th className="p-4 text-right font-black text-indigo-600 dark:text-indigo-400">Total SHU (Rp)</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(myHistory || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{item.Period.year}</td>
                    <td className="p-4 text-right font-medium">Rp {Number(item.totalSimpananModal).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-medium">Rp {Number(item.totalTransaksi).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">Rp {Number(item.jasaModal).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-medium text-sky-600 dark:text-sky-400">Rp {Number(item.jasaTransaksi).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                      Rp {Number(item.totalShu).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        item.status === 'DISTRIBUTED' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {item.status === 'DISTRIBUTED' ? 'DIDISTRIBUSIKAN' : 'DRAFT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ================= MODAL 1: RINCIAN SIMPANAN MODAL ================= */}
      <Modal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        title="Rincian Simpanan Modal Saya"
        size="lg"
      >
        <div className="space-y-5 p-1">
          {/* Highlight Summary Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <PiggyBank size={14} /> Total Simpanan Modal Berjalan
              </span>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                Rp {Number(estimateData?.myTotalSimpananModal || 0).toLocaleString('id-ID')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Sesuai ketentuan AD/ART koperasi, simpanan yang diperhitungkan dalam alokasi <strong>Jasa Modal SHU</strong> adalah <strong>Simpanan Pokok</strong> dan <strong>Simpanan Wajib</strong>.
              </p>
            </div>
            <div className="sm:self-end">
              <Link
                to="/cooperative/savings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm whitespace-nowrap"
              >
                <span>Halaman Tabungan</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Rekening Simpanan Terdaftar
            </h4>

            {loadingSavings ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-7 h-7 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : mySavings.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-400 text-xs">
                Belum ada rekening simpanan terdaftar atas nama Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {mySavings.map((saving) => {
                  const balance = parseFloat(saving.amount) || 0;
                  const catCode = saving.category?.code?.toUpperCase() || saving.type?.toUpperCase() || '';
                  const isModalShu = catCode === 'POKOK' || catCode === 'WAJIB' || saving.category?.isIncludedInShu;

                  return (
                    <div
                      key={saving.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {saving.category?.name || saving.type || 'Simpanan'}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Kode: {catCode || '-'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                          isModalShu 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isModalShu ? 'Dihitung SHU' : 'Tabungan Reguler'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">Saldo Aktif:</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                          Rp {balance.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSavingsModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL 2: RIWAYAT STRUK BELANJA ================= */}
      <Modal
        isOpen={isPurchasesModalOpen}
        onClose={() => setIsPurchasesModalOpen(false)}
        title="Riwayat Belanja di Koperasi"
        size="2xl"
      >
        <div className="space-y-5 p-1">
          {/* Highlight Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-100 dark:border-purple-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <ShoppingBag size={14} /> Akumulasi Volume Belanja Tahun Berjalan
              </span>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                Rp {Number(estimateData?.myBelanja || 0).toLocaleString('id-ID')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Setiap pembelian di kasir toko/kantin koperasi sekolah secara otomatis masuk ke perhitungan <strong>Jasa Transaksi SHU</strong> Anda.
              </p>
            </div>
            <div className="sm:self-end">
              <Link
                to="/cooperative/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all shadow-sm whitespace-nowrap"
              >
                <span>Dashboard Koperasi</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Daftar Struk Transaksi Kasir POS
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                Total: {salesHistory.length} Transaksi
              </span>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <Table
                data={salesHistory.slice((salesPage - 1) * salesPageLimit, salesPage * salesPageLimit)}
                loading={loadingSales}
                emptyMessage="Anda belum memiliki riwayat transaksi belanja di toko koperasi."
                pagination={{
                  currentPage: salesPage,
                  totalPages: Math.max(1, Math.ceil(salesHistory.length / salesPageLimit)),
                  totalItems: salesHistory.length,
                  itemsPerPage: salesPageLimit,
                  onPageChange: (p) => setSalesPage(p),
                }}
                columns={[
                  {
                    label: 'Tanggal & Waktu',
                    key: 'date',
                    render: (d: string, row: any) => {
                      const rawDate = d || row?.created_at;
                      if (!rawDate) return '-';
                      try {
                        return (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Clock size={12} className="text-slate-400" />
                            <span>{format(new Date(rawDate), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
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
                    label: 'Metode',
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
                    render: (val: number) => val > 0 ? `Rp ${Number(val).toLocaleString('id-ID')}` : '-',
                  },
                  {
                    label: 'Total Belanja',
                    key: 'total',
                    render: (val: number, row: any) => {
                      const totalVal = val ?? row?.total_amount ?? 0;
                      return (
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">
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
                        className="h-7 text-[10px] gap-1 px-2.5 rounded-lg border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600"
                        onClick={() => handlePrintReceipt(record)}
                        title="Cetak struk belanja"
                      >
                        <Printer size={12} />
                        Cetak
                      </Button>
                    ),
                  }
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPurchasesModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (embedded) return mainContent;

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Manajemen SHU">
      <AcademicPageLayout
        title="SHU Saya"
        description="Riwayat penerimaan pembagian Sisa Hasil Usaha (SHU) Koperasi"
        hardeningModuleKey={hardeningModuleKey}
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'SHU Saya', path: '/cooperative/shu' }
        ]}
        instruction={memberInstruction}
      >
        {mainContent}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

ShuMemberView.displayName = 'ShuMemberView';
