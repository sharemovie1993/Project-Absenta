import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../../lib/axiosInstance';
import { Button, SectionCard, Table, Badge } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { ArrowLeft, CheckCircle, Clock, Calendar, DollarSign, Percent, Users, Award, Printer, FileText, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import { formatDate } from '../../utils/layoutUtils';
import useConfirm from '../../hooks/useConfirm';

import { PrintLoanCard } from '../../components/cooperative/loans/PrintLoanCard';
import { PrintLoanAgreement } from '../../components/cooperative/loans/PrintLoanAgreement';
import { PrintLoanReceipt } from '../../components/cooperative/loans/PrintLoanReceipt';
import { PrintLoanRepayment } from '../../components/cooperative/loans/PrintLoanRepayment';
import type { Installment, LoanDetailData, CooperativeSettings } from '../../components/cooperative/loans/types';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

const LoanDetail: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user, subscription } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [printTarget, setPrintTarget] = useState<'CARD' | 'AGREEMENT' | 'RECEIPT' | 'REPAYMENT' | null>(null);
  const [selectedRepayment, setSelectedRepayment] = useState<{ installment: Installment; index: number } | null>(null);
  const [installmentPage, setInstallmentPage] = useState(1);
  const installmentLimit = 12;

  // Gating Logic
  const subData = subscription as unknown as Record<string, unknown>;
  const features = (subData?.features as string[]) || (subData?.Plan as Record<string, unknown>)?.features_json as string[] || (subData?.plan as Record<string, unknown>)?.features_json as string[] || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

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
  const fetchDetail = useCallback(async () => {
    await loanDetailQuery.refetch();
  }, [loanDetailQuery]);

  const changeStatusMutation = useMutation({
    mutationFn: async (status: 'APPROVED' | 'REJECTED') => {
      const res = await api.put(`/cooperative/loans/${id}/status`, { status });
      return { data: res.data, status };
    },
    onSuccess: ({ status }) => {
      toast.success(`Pengajuan pinjaman berhasil di-${status.toLowerCase()}!`);
      queryClient.invalidateQueries({ queryKey: ['koperasi-loan-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-loans-list'] });
    },
    onError: (error) => {
      const err = error as { response?: { data?: { message?: string } } };
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengajuan');
    }
  });

  const handleChangeStatus = async (status: 'APPROVED' | 'REJECTED') => {
    const actionLabel = status === 'APPROVED' ? 'menyetujui' : 'menolak';
    const isConfirmed = await confirm({
      title: status === 'APPROVED' ? 'Setujui Pengajuan' : 'Tolak Pengajuan',
      description: `Apakah Anda yakin ingin ${actionLabel} pengajuan pinjaman ini?`,
      confirmText: status === 'APPROVED' ? 'Setujui' : 'Tolak',
      cancelText: 'Batal',
      style: status === 'APPROVED' ? 'success' : 'danger'
    });
    if (!isConfirmed) return;
    await changeStatusMutation.mutateAsync(status);
  };

  const payInstallmentMutation = useMutation({
    mutationFn: async ({ installmentId, installmentNo }: { installmentId: string; installmentNo: number }) => {
      const res = await api.post('/cooperative/loans/pay-installment', { installmentId });
      return { data: res.data, installmentNo };
    },
    onSuccess: ({ installmentNo }) => {
      toast.success(`Pembayaran angsuran ke-${installmentNo} berhasil diproses!`);
      queryClient.invalidateQueries({ queryKey: ['koperasi-loan-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-loans-list'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-savings-list'] });
    },
    onError: (error) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Pembayaran gagal');
    }
  });

  const handlePayInstallment = async (installmentId: string, installmentNo: number) => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Pembayaran',
      description: `Konfirmasi pembayaran angsuran ke-${installmentNo}?`,
      confirmText: 'Bayar',
      cancelText: 'Batal',
      style: 'success'
    });
    if (!isConfirmed) return;
    await payInstallmentMutation.mutateAsync({ installmentId, installmentNo });
  };

  // Remaining balance
  const remainingBalance = useMemo(() => {
    if (!loan) return 0;
    const unpaid = loan.installments.filter(ins => ins.status === 'UNPAID');
    return unpaid.reduce((sum, ins) => sum + parseFloat(ins.amount), 0);
  }, [loan]);

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
            variant={row.status === 'PAID' ? 'success' : 'destructive'} 
            className="font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
          >
            {row.status === 'PAID' ? 'Lunas' : 'Belum Lunas'}
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
                className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-slate-800 font-bold rounded-lg text-[9px] px-2.5 py-1 flex items-center gap-1 shadow-sm h-6 inline-flex"
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
  }, [isOperator, loan]);

  const isMobile = useIsMobile();

  const renderMobileInstallmentCard = useCallback((row: Installment, index: number) => {
    const isPaid = row.status === 'PAID';
    const isUnpaid = row.status === 'UNPAID';
    const installmentNumber = (installmentPage - 1) * installmentLimit + index + 1;

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Angsuran Ke-{installmentNumber}</span>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              Rp {Math.round(parseFloat(row.amount)).toLocaleString('id-ID')}
            </div>
          </div>
          <Badge
            variant={isPaid ? 'success' : 'destructive'}
            className="font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0"
          >
            {isPaid ? 'Lunas' : 'Belum Lunas'}
          </Badge>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Jatuh Tempo</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDate(row.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Tanggal Bayar</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {row.paidDate ? formatDate(row.paidDate, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-650 rounded-full animate-spin"></div>
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  if (!loan) {
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
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs border border-slate-200 dark:border-slate-800 rounded-2xl">
            Berkas pinjaman tidak ditemukan atau Anda tidak memiliki hak akses.
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
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
        <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
          {/* Action buttons */}
          <div className="flex justify-between items-center print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8"
            >
              <ArrowLeft size={14} /> Kembali
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintTarget('CARD')}
                className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-sm"
              >
                <Printer size={14} /> Cetak Kartu Kendali
              </Button>
              {(loan.status === 'APPROVED' || loan.status === 'PAID') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintTarget('AGREEMENT')}
                    className="text-slate-700 hover:bg-slate-50 border-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-sm"
                  >
                    <FileText size={14} /> Cetak Akad Pinjaman
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintTarget('RECEIPT')}
                    className="text-emerald-600 hover:bg-emerald-50/20 border-emerald-200 dark:text-emerald-400 dark:hover:bg-slate-800 font-bold inline-flex items-center gap-1.5 rounded-xl h-8 shadow-sm"
                  >
                    <Receipt size={14} /> Cetak Kuitansi
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Screen Content Wrapper */}
          <div className="space-y-6">

            {/* Profile and Metrics Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* User Profile Card */}
              <SectionCard className="lg:col-span-1 p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100/30">
                    {loan.member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight uppercase truncate">
                      {loan.member.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {loan.member.memberNo}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center">
                  <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                    loan.status === 'PAID' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20' 
                      : loan.status === 'APPROVED' 
                      ? 'bg-blue-50 text-blue-600 border-blue-500/20' 
                      : loan.status === 'PENDING' 
                      ? 'bg-amber-50 text-amber-600 border-amber-500/20' 
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    Status: {loan.status}
                  </span>
                </div>
              </SectionCard>

              {/* Metrics */}
              <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Nilai Pinjaman</p>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                    Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1">
                  <Percent size={11} className="text-indigo-500" /> Suku Bunga: {loan.interestRate}%
                </p>
              </SectionCard>

              <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sisa Saldo Tagihan</p>
                  <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    Rp {Math.round(remainingBalance).toLocaleString('id-ID')}
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1">
                  <DollarSign size={11} className="text-rose-500" /> Tagihan Pokok + Jasa Bunga
                </p>
              </SectionCard>

              <SectionCard className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tenor / Jangka Waktu</p>
                  <h3 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    {loan.duration} Bulan
                  </h3>
                </div>
                <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1">
                  <Calendar size={11} className="text-indigo-500" /> Total cicilan bulanan
                </p>
              </SectionCard>
            </div>

            {/* Analisis Kelayakan & Persetujuan Kredit */}
            {(canApprove || canReject) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                {/* Collateral / Savings Guarantee & DTI Analysis */}
                <SectionCard className="lg:col-span-2 p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Award size={16} className="text-indigo-600" /> Analisis Kelayakan & Simpanan Anggota
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Penilaian jaminan saldo simpanan internal koperasi untuk meminimalkan risiko kredit</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Simpanan</p>
                      <h4 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                        Rp {Math.round(loan.member.totalSavings || 0).toLocaleString('id-ID')}
                      </h4>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rasio Simpanan vs Pinjaman</p>
                      {(() => {
                        const amountVal = parseFloat(loan.amount);
                        const savingsVal = loan.member.totalSavings || 0;
                        const ratio = savingsVal > 0 ? Math.round((savingsVal / amountVal) * 100) : 0;
                        let badgeColor = 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
                        if (ratio >= 100) badgeColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
                        else if (ratio >= 50) badgeColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';

                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-black text-slate-800 dark:text-slate-100">{ratio}%</span>
                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full ${badgeColor}`}>
                              {ratio >= 100 ? 'Aman' : ratio >= 50 ? 'Sedang' : 'Tinggi'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Riwayat Pinjaman Lain</p>
                      <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                        {loan.member.loanHistory?.length || 0} Kali
                      </div>
                    </div>
                  </div>

                  {/* Savings Breakdown */}
                  {loan.member.savingsBreakdown && loan.member.savingsBreakdown.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Rincian Saldo Simpanan</p>
                      <div className="flex flex-wrap gap-2">
                        {loan.member.savingsBreakdown?.map((s, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {s.categoryName}: Rp {Math.round(s.amount).toLocaleString('id-ID')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* Approval Action Panel */}
                <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <CheckCircle size={16} className="text-emerald-600" /> Keputusan Ketua / Pengawas
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {loan.status === 'PENDING' 
                        ? 'Harap tinjau kemampuan bayar anggota berdasarkan data kelayakan di samping sebelum menyetujui pengajuan ini.' 
                        : `Pengajuan ini telah diputuskan dengan status final: ${loan.status}.`}
                    </p>
                  </div>

                  {loan.status === 'PENDING' ? (
                    <div className="space-y-3 mt-6">
                      {canApprove && (
                        <Button
                          variant="success"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm"
                          onClick={() => handleChangeStatus('APPROVED')}
                        >
                          Setujui Pengajuan
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm"
                          onClick={() => handleChangeStatus('REJECTED')}
                        >
                          Tolak Pengajuan
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Keputusan</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1 uppercase">
                        {loan.status === 'APPROVED' ? 'DISETUJUI' : loan.status === 'REJECTED' ? 'DITOLAK' : 'LUNAS'}
                      </p>
                    </div>
                  )}

                  {/* Quick Navigation Links */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Navigasi Cepat</p>
                    <div className="flex gap-2">
                      <Link to={`/cooperative/savings?search=${loan.member.name}`} className="flex-1">
                        <Button variant="outline" size="xs" className="w-full text-[10px] font-bold py-1.5 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                          Buku Tabungan
                        </Button>
                      </Link>
                      <Link to={`/cooperative/members?id=${loan.memberId}`} className="flex-1">
                        <Button variant="outline" size="xs" className="w-full text-[10px] font-bold py-1.5 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50">
                          Profil Anggota
                        </Button>
                      </Link>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Installment Table */}
            <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Jadwal Rincian Angsuran</h3>
                <p className="text-[10px] text-slate-400">Daftar kartu kendali angsuran bulanan yang harus dibayar anggota</p>
              </div>

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
            </SectionCard>
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
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default LoanDetail;
