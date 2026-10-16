import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../lib/axiosInstance';
import { Button, SectionCard, Table, Badge } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { 
  ArrowLeft, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  Percent, 
  Users, 
  Award, 
  Printer, 
  FileText, 
  Receipt,
  ChevronDown,
  ChevronUp,
  Ban,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import { formatDate } from '../../utils/layoutUtils';
import useConfirm from '../../hooks/useConfirm';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { cn } from '../../lib/utils';

import { PrintLoanCard } from '../../components/cooperative/loans/PrintLoanCard';
import { PrintLoanAgreement } from '../../components/cooperative/loans/PrintLoanAgreement';
import { PrintLoanReceipt } from '../../components/cooperative/loans/PrintLoanReceipt';
import { PrintLoanRepayment } from '../../components/cooperative/loans/PrintLoanRepayment';
import { LoanEligibilitySection } from '../../components/cooperative/loans/LoanEligibilitySection';
import { MemberDetailModalProxy } from '../../components/cooperative/loans/MemberDetailModalProxy';
import { MemberSavingsPassbookModal } from '../../components/cooperative/loans/MemberSavingsPassbookModal';
import { RejectLoanModal } from '../../components/cooperative/loans/RejectLoanModal';
import type { Installment, LoanDetailData, CooperativeSettings } from '../../components/cooperative/loans/types';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useSocket } from '../../hooks/useSocket';
import { invalidateLoansCaches } from '../../lib/coopQueryKeys';

export interface LoanDetailProps {
  loanId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

const LoanDetail: React.FC<LoanDetailProps> = React.memo(({
  loanId,
  isModal = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const params = useParams<{ id: string }>();
  const id = loanId || params.id;
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [printTarget, setPrintTarget] = useState<'CARD' | 'AGREEMENT' | 'RECEIPT' | 'REPAYMENT' | null>(null);
  const [selectedRepayment, setSelectedRepayment] = useState<{ installment: Installment; index: number } | null>(null);
  const [installmentPage, setInstallmentPage] = useState(1);
  const installmentLimit = 12;

  // Browser print trigger when printTarget changes
  useEffect(() => {
    if (printTarget) {
      const handleAfterPrint = () => {
        setPrintTarget(null);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      const timer = setTimeout(() => {
        window.print();
      }, 150);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [printTarget]);

  // Proxy Modals State (Pilar Komponen Bersama Modal & Proxy Pattern)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPassbookModalOpen, setIsPassbookModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Responsiveness state (Pilar 30 Hardening)
  const [activeDetailTab, setActiveDetailTab] = useState<'installments' | 'eligibility'>('installments');
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  useModuleAccess('KOPERASI');

  // Capability checks
  const isOperator = user?.capabilities?.includes('cooperative.loans.repay');
  const canApprove = user?.capabilities?.includes('cooperative.loans.approve');
  const canReject = user?.capabilities?.includes('cooperative.loans.reject');

  // React Query Hooks
  const coopSettingsQuery = useQuery({
    queryKey: ['koperasi-settings-detail'],
    queryFn: async () => {
      const data = await fetchCoopSettings();
      return data as CooperativeSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
  const coopSettings = coopSettingsQuery.data || null;

  const loanDetailQuery = useQuery({
    queryKey: ['koperasi-loan-detail', id],
    queryFn: async () => {
      const response = await api.get(`/cooperative/loans/${id}`);
      return response.data as LoanDetailData;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  const loan = loanDetailQuery.data || null;
  const loading = loanDetailQuery.isLoading;

  const { subscribe, unsubscribe } = useSocket();

  // Realtime Live Sync: Dengarkan event transaksi/status pinjaman via WebSocket (Pilar 4 Hardening)
  useEffect(() => {
    const handleLoanUpdate = () => {
      invalidateLoansCaches(queryClient, id);
    };

    subscribe('coop_loan_update', handleLoanUpdate);
    return () => {
      unsubscribe('coop_loan_update', handleLoanUpdate);
    };
  }, [subscribe, unsubscribe, queryClient, id]);

  const changeStatusMutation = useMutation({
    mutationFn: async ({ status, rejectionReason }: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => {
      const res = await api.put(`/cooperative/loans/${id}/status`, { status, rejectionReason });
      return { data: res.data, status };
    },
    onSuccess: ({ status }) => {
      const actionLabel = status === 'APPROVED' ? 'disetujui' : 'ditolak';
      toast.success(`Pengajuan pinjaman berhasil ${actionLabel}!`);
      setIsRejectModalOpen(false);
      invalidateLoansCaches(queryClient, id);
    },
    onError: (error) => {
      const err = error as { response?: { data?: { message?: string } } };
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengajuan');
    }
  });

  const handleChangeStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED') {
      setIsRejectModalOpen(true);
      return;
    }

    const isConfirmed = await confirm({
      title: 'Setujui Pengajuan Pinjaman?',
      description: 'Apakah Anda yakin ingin menyetujui pengajuan pinjaman ini? Jadwal cicilan dan pembukuan jurnal kas akan diproses otomatis.',
      confirmText: 'Ya, Setujui',
      cancelText: 'Batal',
      style: 'success'
    });
    if (!isConfirmed) return;
    await changeStatusMutation.mutateAsync({ status: 'APPROVED' });
  };

  const payInstallmentMutation = useMutation({
    mutationFn: async ({ installmentId, installmentNo }: { installmentId: string; installmentNo: number }) => {
      const res = await api.post('/cooperative/loans/pay-installment', { installmentId }, {
        headers: {
          'Idempotency-Key': crypto.randomUUID()
        }
      });
      return { data: res.data, installmentNo };
    },
    onSuccess: ({ installmentNo }) => {
      toast.success(`Pembayaran angsuran ke-${installmentNo} berhasil diproses!`);
      invalidateLoansCaches(queryClient, id);
    },
    onError: (error) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Pembayaran gagal');
    }
  });

  const handlePayInstallment = useCallback(async (installmentId: string, installmentNo: number) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Pembayaran',
      description: `Konfirmasi pembayaran angsuran ke-${installmentNo}?`,
      confirmText: 'Bayar',
      cancelText: 'Batal',
      style: 'success'
    });
    if (!isConfirmed) return;
    await payInstallmentMutation.mutateAsync({ installmentId, installmentNo });
  }, [confirm, payInstallmentMutation]);

  // Remaining balance (Hanya bernilai jika status APPROVED atau PAID)
  const remainingBalance = useMemo(() => {
    if (!loan || loan.status === 'REJECTED' || loan.status === 'PENDING') return 0;
    const unpaid = (loan.installments || []).filter(ins => ins.status === 'UNPAID');
    return unpaid.reduce((sum, ins) => sum + parseFloat(ins.amount), 0);
  }, [loan]);

  // Tab Options (Pilar 30 TabSwitcher Standard)
  const tabOptions: TabOption[] = useMemo(() => {
    const isRejected = loan?.status === 'REJECTED';
    return [
      { 
        id: 'installments', 
        label: isRejected ? 'Status Keputusan Penolakan' : (loan?.status === 'PENDING' ? 'Simulasi Estimasi Angsuran' : 'Jadwal Rincian Angsuran'), 
        icon: isRejected ? Ban : Calendar 
      },
      { id: 'eligibility', label: 'Analisis Kelayakan & Jaminan', icon: Award },
    ];
  }, [loan?.status]);

  // Installment Columns
  const installmentColumns: Column[] = useMemo(() => {
    const cols: Column[] = [
      { 
        key: 'no', 
        label: 'Angsuran Ke', 
        render: (_, __, index) => <span className="font-bold text-slate-500">{index + 1}</span> 
      },
      { 
        key: 'dueDate', 
        label: 'Jatuh Tempo',
        sortable: true, 
        render: (_, row: Installment) => (
          <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
            <Calendar size={13} className="text-slate-400" />
            {formatDate(row.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )
      },
      { 
        key: 'amount', 
        label: 'Jumlah Tagihan',
        sortable: true, 
        render: (_, row: Installment) => (
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            Rp {Math.round(parseFloat(row.amount)).toLocaleString('id-ID')}
          </span>
        ) 
      },
      { 
        key: 'status', 
        label: 'Status',
        sortable: true, 
        render: (_, row: Installment) => (
          <Badge 
            variant={row.status === 'PAID' ? 'success' : (loan?.status === 'PENDING' ? 'warning' : 'destructive')} 
            className="font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
          >
            {row.status === 'PAID' ? 'Lunas' : (loan?.status === 'PENDING' ? 'Simulasi' : 'Belum Lunas')}
          </Badge>
        )
      },
      { 
        key: 'paidDate', 
        label: 'Tanggal Bayar', 
        render: (_, row: Installment) => row.paidDate ? (
          <span className="text-slate-400 text-[11px] font-bold">
            {formatDate(row.paidDate, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        ) : <span className="text-slate-300 dark:text-slate-700">-</span>
      }
    ];

    if (loan?.status === 'APPROVED' || loan?.status === 'PAID') {
      cols.push({
        key: 'actions',
        label: 'Tindakan',
        render: (_, row: Installment, index) => {
          if (row.status === 'UNPAID') {
            return isOperator ? (
              <Button 
                size="xs" 
                variant="success"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] px-3.5 py-1"
                onClick={() => handlePayInstallment(row.id, index + 1)}
              >
                Terima Bayar
              </Button>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider">-</span>
            );
          } else {
            return (
              <Button 
                size="xs" 
                variant="outline"
                className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-slate-800 font-bold rounded-lg text-[9px] px-2.5 py-1 flex items-center gap-1 shadow-xs h-6 inline-flex"
                onClick={() => {
                  setSelectedRepayment({ installment: row, index: index + 1 });
                  setPrintTarget('REPAYMENT');
                }}
              >
                <Printer size={10} /> Slip Setor
              </Button>
            );
          }
        }
      });
    }

    return cols;
  }, [isOperator, loan, handlePayInstallment]);

  const isMobile = useIsMobile();

  // Mobile Installment Card (Pilar 30 Zero-clipping & Responsive Grid)
  const renderMobileInstallmentCard = useCallback((row: Installment, index: number) => {
    const isPaid = row.status === 'PAID';
    const isUnpaid = row.status === 'UNPAID';
    const installmentNumber = (installmentPage - 1) * installmentLimit + index + 1;

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 w-full max-w-full min-w-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Angsuran Ke-{installmentNumber}
            </span>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
              Rp {Math.round(parseFloat(row.amount)).toLocaleString('id-ID')}
            </div>
          </div>
          <Badge
            variant={isPaid ? 'success' : (loan?.status === 'PENDING' ? 'warning' : 'destructive')}
            className="font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0"
          >
            {isPaid ? 'Lunas' : (loan?.status === 'PENDING' ? 'Simulasi' : 'Belum Lunas')}
          </Badge>
        </div>

        {/* Responsive Grid with sm: prefix (Pilar 30 Guard) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full max-w-full min-w-0">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Jatuh Tempo</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate">
              {formatDate(row.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Tanggal Bayar</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate">
              {row.paidDate ? formatDate(row.paidDate, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
          {isPaid && (
            <Button
              size="xs"
              variant="outline"
              className="text-slate-600 dark:text-slate-400 font-bold border-slate-200 dark:border-slate-700 rounded-lg text-[10px] px-3 py-1 inline-flex items-center gap-1"
              onClick={() => {
                setSelectedRepayment({ installment: row, index });
                setPrintTarget('REPAYMENT');
              }}
            >
              <Printer size={10} /> Cetak Bukti
            </Button>
          )}

          {isUnpaid && (loan?.status === 'APPROVED' || loan?.status === 'PAID') && isOperator && (
            <Button
              size="xs"
              variant="success"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] px-3.5 py-1"
              onClick={() => handlePayInstallment(row.id, installmentNumber)}
              disabled={payInstallmentMutation.isPending}
            >
              {payInstallmentMutation.isPending ? 'Memproses...' : 'Bayar Angsuran'}
            </Button>
          )}
        </div>
      </div>
    );
  }, [installmentPage, installmentLimit, loan?.status, isOperator, payInstallmentMutation.isPending, handlePayInstallment]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const fromManage = user?.capabilities?.includes('cooperative.loans.approve') || user?.capabilities?.includes('cooperative.loans.reject');
    return [
      { label: 'Koperasi', path: '/cooperative/dashboard' },
      { label: fromManage ? 'Daftar Pinjaman' : 'Pinjaman Saya', path: fromManage ? '/cooperative/loans/manage' : '/cooperative/loans' },
      { label: 'Detail', path: `/cooperative/loans/${id}` }
    ];
  }, [id, user]);

  if (loading) {
    if (isModal) {
      return (
        <div className="flex justify-center items-center h-64 w-full">
          <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      );
    }
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Detail Pinjaman Anggota">
        <AcademicPageLayout
          title="Detail Pinjaman Anggota"
          description="Informasi detail pinjaman dan jadwal angsuran"
          hardeningModuleKey="coop_loandetail"
          instruction={{
            title: "Detail Pinjaman Anggota",
            description: "Halaman ini menampilkan rincian status pinjaman, jadwal angsuran, dan analisis kelayakan kredit anggota koperasi.",
            items: [
              { text: "Tinjau informasi pokok pinjaman, bunga, dan tenor pada panel metrik." },
              { text: "Pengurus dapat menyetujui atau menolak pengajuan yang berstatus PENDING." },
              { text: "Gunakan tombol cetak untuk menghasilkan kartu kendali, akad, dan kuitansi." }
            ]
          }}
          breadcrumbs={breadcrumbs}
        >
          <div className="flex justify-center items-center h-64 w-full">
            <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  if (!loan) {
    if (isModal) {
      return (
        <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs border border-slate-200 dark:border-slate-800 rounded-2xl w-full">
          Berkas pinjaman tidak ditemukan atau Anda tidak memiliki hak akses.
        </div>
      );
    }
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Detail Pinjaman Anggota">
        <AcademicPageLayout
          title="Detail Pinjaman Anggota"
          description="Informasi detail pinjaman dan jadwal angsuran"
          hardeningModuleKey="coop_loandetail"
          instruction={{
            title: "Detail Pinjaman Anggota",
            description: "Halaman ini menampilkan rincian status pinjaman, jadwal angsuran, dan analisis kelayakan kredit anggota koperasi.",
            items: [
              { text: "Tinjau informasi pokok pinjaman, bunga, dan tenor pada panel metrik." },
              { text: "Pengurus dapat menyetujui atau menolak pengajuan yang berstatus PENDING." },
              { text: "Gunakan tombol cetak untuk menghasilkan kartu kendali, akad, dan kuitansi." }
            ]
          }}
          breadcrumbs={breadcrumbs}
        >
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs border border-slate-200 dark:border-slate-800 rounded-2xl w-full">
            Berkas pinjaman tidak ditemukan atau Anda tidak memiliki hak akses.
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  // Rejection Notice Section (Pemberitahuan Resmi Berkas Ditolak)
  const rejectedNoticeSection = (
    <div className="p-6 sm:p-8 bg-rose-50/70 dark:bg-rose-950/20 border-2 border-dashed border-rose-200 dark:border-rose-900/60 rounded-3xl text-center space-y-4 animate-in fade-in duration-200 w-full max-w-full">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
        <Ban size={28} className="stroke-[2.5]" />
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-black text-rose-900 dark:text-rose-200">
          Pengajuan Pinjaman Ditolak
        </h3>
        <p className="text-xs text-rose-700/80 dark:text-rose-400/80 leading-relaxed">
          Pengajuan pinjaman ini telah ditolak oleh pengurus koperasi. Berkas ini disimpan sebagai arsip riwayat resmi dan tidak menimbulkan kewajiban pembayaran apa pun bagi anggota.
        </p>
      </div>

      <div className="max-w-lg mx-auto p-4 bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800 rounded-2xl shadow-xs text-left space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block flex items-center gap-1">
          <FileText size={12} /> Alasan Resmi Penolakan:
        </span>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
          {loan.rejectionReason || 'Tidak memenuhi kriteria kelayakan pembiayaan koperasi.'}
        </p>
      </div>
    </div>
  );

  // Table Angsuran (Bisa dipakai murni di Modal atau di dalam Tab Halaman Penuh)
  const installmentsTableSection = (
    <SectionCard fullWidth className="p-3 sm:p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs space-y-4 w-full max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {loan.status === 'PENDING' ? 'Simulasi Estimasi Angsuran' : 'Jadwal Rincian Angsuran'}
          </h3>
          <p className="text-[10px] text-slate-400">
            {loan.status === 'PENDING' ? 'Estimasi cicilan jika disetujui (tagihan belum aktif)' : 'Perjalanan kartu kendali pembayaran cicilan anggota'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isModal && (
            <span className="text-[11px] font-semibold text-slate-500">
              Plafon: <strong className="text-slate-800 dark:text-slate-100">Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}</strong> ({loan.duration} Bln)
            </span>
          )}
          {isModal && <span className="text-slate-300 dark:text-slate-700">•</span>}
          <Badge variant="outline" className="text-[10px] font-bold text-slate-500 w-fit">
            {loan.installments.filter(i => i.status === 'PAID').length} dari {loan.installments.length} Lunas
          </Badge>
        </div>
      </div>

      {loan.status === 'PENDING' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Clock size={16} className="shrink-0 text-amber-600" />
          <span>Pengajuan pinjaman ini masih berstatus <strong>MENUNGGU (PENDING)</strong>. Jadwal di bawah merupakan simulasi estimasi angsuran jika disetujui. Tagihan belum aktif.</span>
        </div>
      )}

      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        {isMobile ? (
          <MobileAcademicList
            title="Daftar Jadwal Angsuran"
            data={loan.installments.slice((installmentPage - 1) * installmentLimit, installmentPage * installmentLimit)}
            loading={false}
            totalItems={loan.installments.length}
            emptyMessage="Tidak ada data jadwal angsuran terdaftar."
            pagination={{
              currentPage: installmentPage,
              itemsPerPage: installmentLimit,
              totalItems: loan.installments.length,
              totalPages: Math.ceil(loan.installments.length / installmentLimit),
              onPageChange: (newPage) => setInstallmentPage(newPage),
              onLimitChange: () => {}
            }}
            renderCard={(item, index) => renderMobileInstallmentCard(item, index)}
          />
        ) : (
          <Table 
            data={loan.installments.slice((installmentPage - 1) * installmentLimit, installmentPage * installmentLimit)}
            columns={installmentColumns}
            rowKey="id"
            emptyMessage="Tidak ada data jadwal angsuran terdaftar."
            pagination={{
              currentPage: installmentPage,
              itemsPerPage: installmentLimit,
              totalItems: loan.installments.length,
              totalPages: Math.ceil(loan.installments.length / installmentLimit),
              onPageChange: (newPage) => setInstallmentPage(newPage),
              onLimitChange: () => {}
            }}
          />
        )}
      </div>
    </SectionCard>
  );

  const mainContent = (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 print:hidden w-full max-w-full min-w-0">
          
          {/* Topbar Navigation & Action buttons (Pilar 30 Zero-Clipping & Redundant Badge Hidden on <640px) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full max-w-full min-w-0 print:hidden bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {!isModal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shrink-0 text-xs"
                  >
                    <ArrowLeft size={14} /> <span className="hidden sm:inline">Kembali</span>
                  </Button>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate max-w-[220px] sm:max-w-md">
                    {loan.member.name}
                  </h2>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-semibold truncate">
                    No. Anggota: {loan.member.memberNo}
                  </span>
                </div>
              </div>

              {/* Status badge: disembunyikan pada layar ponsel (<640px) agar judul halaman mendapatkan 100% ruang lebar */}
              <span className={cn(
                "hidden sm:inline-flex px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border shrink-0",
                loan.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20' :
                loan.status === 'APPROVED' ? 'bg-blue-50 text-blue-600 border-blue-500/20' :
                loan.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-500/20' :
                loan.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-500/20' :
                'bg-slate-50 text-slate-500 border-slate-200'
              )}>
                Status: {loan.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-start sm:justify-end min-w-0 shrink-0">
              {(loan.status === 'APPROVED' || loan.status === 'PAID') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintTarget('CARD')}
                    className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-xs text-xs"
                  >
                    <Printer size={13} /> <span className="hidden sm:inline">Cetak</span> Kartu Kendali
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintTarget('AGREEMENT')}
                    className="text-slate-700 hover:bg-slate-50 border-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-xs text-xs"
                  >
                    <FileText size={13} /> <span className="hidden sm:inline">Cetak</span> Akad
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintTarget('RECEIPT')}
                    className="text-emerald-600 hover:bg-emerald-50/20 border-emerald-200 dark:text-emerald-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-xs text-xs"
                  >
                    <Receipt size={13} /> <span className="hidden sm:inline">Cetak</span> Kuitansi
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Screen Content Wrapper */}
          <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">

            {/* Profile and Metrics Panel with Compact-Premium & Mobile Collapsible (Pilar 30) */}
            <div className="w-full max-w-full min-w-0 space-y-2">
              <div className="flex sm:hidden items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ringkasan Pinjaman</span>
                <button
                  type="button"
                  onClick={() => setIsStatsCollapsed(prev => !prev)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 p-1"
                >
                  {isStatsCollapsed ? 'Tampilkan Ringkasan' : 'Hemat Ruang (Ciutkan)'}
                  {isStatsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
              </div>

              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0 transition-all duration-200",
                isStatsCollapsed ? "hidden sm:grid" : "grid"
              )}>
                {/* Anggota Peminjam (Compact-Premium) */}
                <AnalyticsCard
                  title="Anggota Peminjam"
                  value={loan.member.name}
                  subtitle={`No: ${loan.member.memberNo} • Status: ${loan.status}`}
                  icon={<Users className="w-4 h-4 text-white" />}
                  gradient="from-emerald-600 to-teal-700"
                  variant="compact-premium"
                  mobileCompact={true}
                  onClick={() => setIsProfileModalOpen(true)}
                />

                {/* Total Pinjaman (Compact-Premium) */}
                <AnalyticsCard
                  title="Total Nilai Pinjaman"
                  value={`Rp ${Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}`}
                  subtitle={`Suku Bunga: ${loan.interestRate}% / bln`}
                  icon={<Percent className="w-4 h-4 text-white" />}
                  gradient="from-blue-600 to-indigo-700"
                  variant="compact-premium"
                  mobileCompact={true}
                />

                {/* Sisa Saldo Tagihan (Compact-Premium) */}
                <AnalyticsCard
                  title="Sisa Saldo Tagihan"
                  value={loan.status === 'REJECTED' ? 'Rp 0' : `Rp ${Math.round(remainingBalance).toLocaleString('id-ID')}`}
                  subtitle={loan.status === 'REJECTED' ? 'Pengajuan Ditolak (Tidak Ada Tagihan)' : loan.status === 'PENDING' ? 'Pengajuan Menunggu Persetujuan' : 'Tagihan Pokok + Jasa Bunga'}
                  icon={<DollarSign className="w-4 h-4 text-white" />}
                  gradient={loan.status === 'REJECTED' ? 'from-slate-600 to-slate-700' : 'from-rose-600 to-rose-700'}
                  variant="compact-premium"
                  mobileCompact={true}
                />

                {/* Tenor / Jangka Waktu (Compact-Premium) */}
                <AnalyticsCard
                  title="Tenor / Jangka Waktu"
                  value={`${loan.duration} Bulan`}
                  subtitle="Total cicilan bulanan"
                  icon={<Calendar className="w-4 h-4 text-white" />}
                  gradient="from-purple-600 to-violet-700"
                  variant="compact-premium"
                  mobileCompact={true}
                />
              </div>
            </div>

            {/* Tab Navigation Touch-Scroll Container (Pilar 30) */}
            <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar flex-nowrap pb-1">
              <TabSwitcher
                tabs={tabOptions}
                activeTab={activeDetailTab}
                onChange={(tab) => setActiveDetailTab(tab as 'installments' | 'eligibility')}
                className="whitespace-nowrap"
              />
            </div>

            {/* Tab 1: Jadwal Rincian Angsuran atau Pengumuman Ditolak */}
            {activeDetailTab === 'installments' && (loan.status === 'REJECTED' ? rejectedNoticeSection : installmentsTableSection)}

            {/* Tab 2: Analisis Kelayakan & Persetujuan Kredit */}
            {activeDetailTab === 'eligibility' && (
              <LoanEligibilitySection
                loan={loan}
                canApprove={Boolean(canApprove)}
                canReject={Boolean(canReject)}
                onChangeStatus={handleChangeStatus}
                onOpenSavingsPassbook={() => setIsPassbookModalOpen(true)}
                onOpenMemberProfile={() => setIsProfileModalOpen(true)}
              />
            )}
          </div>

          {/* Style Cetak */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              #root {
                display: none !important;
              }
              body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #print-loan-card, #print-loan-agreement, #print-loan-receipt, #print-loan-repayment {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
              }
            }
          `}} />
        </div>
  );

  const sharedModalsAndPortals = (
    <>
      {/* Proxy Modals for Member Profile and Savings Passbook */}
      {loan && (
        <>
          <MemberDetailModalProxy
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            memberId={loan.memberId}
          />
          <MemberSavingsPassbookModal
            isOpen={isPassbookModalOpen}
            onClose={() => setIsPassbookModalOpen(false)}
            memberId={loan.memberId}
            memberName={loan.member.name}
            memberNo={loan.member.memberNo}
          />
          <RejectLoanModal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectModalOpen(false)}
            onConfirm={(reason) => {
              changeStatusMutation.mutate({ status: 'REJECTED', rejectionReason: reason });
            }}
            isLoading={changeStatusMutation.isPending}
            memberName={loan.member.name}
            loanAmount={loan.amount}
          />
        </>
      )}

      {loan && printTarget && createPortal(
        <>
          {printTarget === 'CARD' && (
            <PrintLoanCard 
              loan={loan} 
              remainingBalance={remainingBalance} 
              coopSettings={coopSettings}
            />
          )}
          {printTarget === 'AGREEMENT' && (
            <PrintLoanAgreement 
              loan={loan} 
              coopSettings={coopSettings}
            />
          )}
          {printTarget === 'RECEIPT' && (
            <PrintLoanReceipt 
              loan={loan} 
              coopSettings={coopSettings}
            />
          )}
          {printTarget === 'REPAYMENT' && selectedRepayment && (
            <PrintLoanRepayment 
              loan={loan}
              installment={selectedRepayment.installment}
              installmentNo={selectedRepayment.index}
              coopSettings={coopSettings}
            />
          )}
        </>,
        document.body
      )}
    </>
  );

  if (isModal) {
    return (
      <div className="w-full max-w-full min-w-0">
        {loan.status === 'REJECTED' ? rejectedNoticeSection : installmentsTableSection}

        {/* Portal Cetak Slip Setor jika anggota klik cetak bukti di baris cicilan */}
        {loan && printTarget === 'REPAYMENT' && selectedRepayment && createPortal(
          <PrintLoanRepayment 
            loan={loan}
            installment={selectedRepayment.installment}
            installmentNo={selectedRepayment.index}
            coopSettings={coopSettings}
          />,
          document.body
        )}
      </div>
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Detail Pinjaman Anggota"
    >
      <AcademicPageLayout
        title="Detail Angsuran & Pinjaman"
        description="Rincian status kelayakan, total tagihan, dan rekonsiliasi pembayaran cicilan"
        hardeningModuleKey="coop_loandetail"
        instruction={{
          title: "Detail Pinjaman Anggota",
          description: "Halaman ini menampilkan rincian status pinjaman, jadwal angsuran, dan analisis kelayakan kredit anggota koperasi.",
          items: [
            { text: "Tinjau informasi pokok pinjaman, bunga, dan tenor pada panel metrik." },
            { text: "Pengurus dapat menyetujui atau menolak pengajuan yang berstatus PENDING." },
            { text: "Gunakan tombol cetak untuk menghasilkan kartu kendali, akad, dan kuitansi." }
          ]
        }}
        breadcrumbs={breadcrumbs}
      >
        {mainContent}
        {sharedModalsAndPortals}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

LoanDetail.displayName = 'LoanDetail';

export default LoanDetail;
