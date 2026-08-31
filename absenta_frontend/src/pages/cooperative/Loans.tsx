import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button, SectionCard, Table, Badge, SearchableSelect, Input } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { Plus, Eye, Clock, Ban } from 'lucide-react';
import { LoanStatsBanner } from '../../components/cooperative/loans/LoanStatsBanner';
import { LoanRestrictionsAlerts } from '../../components/cooperative/loans/LoanRestrictionsAlerts';
import type { Loan, Member, StudentMetrics, OperatorMetrics } from '../../components/cooperative/loans/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { cn } from '../../lib/utils';
import useConfirm from '../../hooks/useConfirm';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { useModuleAccess } from '../../hooks/useModuleAccess';

// Lazy-load heavy modals to optimize initial bundle splitting
const CreateLoanModal = lazy(() => 
  import('../../components/cooperative/loans/CreateLoanModal').then(module => ({ default: module.CreateLoanModal }))
);
const PaymentInstructionsModal = lazy(() => 
  import('../../components/cooperative/loans/PaymentInstructionsModal').then(module => ({ default: module.PaymentInstructionsModal }))
);

// Zod Schema Validation Guard (Pilar 25)
const loanFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
});

const Loans: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user, subscription } = useAuthStore();
  const { isKoperasiHead, isKoperasiFinance, isAdmin, can } = useCapabilities();
  const confirm = useConfirm();
  
  const isManageMode = window.location.pathname.endsWith('/manage');
  const canApprove = isAdmin || isKoperasiHead || isKoperasiFinance || can('cooperative.loans.approve');
  const canReject = can('cooperative.loans.reject');
  const canApply = can('cooperative.loans.apply');
  const canInputOnBehalf = can('cooperative.loans.approve') || 
                           can('cooperative.loans.repay');
  const isCoopStaff = can('cooperative.loans.approve') || 
                      can('cooperative.loans.reject') ||
                      can('cooperative.loans.view.list') || 
                      can('cooperative.savings.deposit');
  const isOperatorMode = isManageMode && isCoopStaff;
  const isStudent = !isOperatorMode;

  const [isPaymentInstructionsOpen, setIsPaymentInstructionsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultInterestRate, setDefaultInterestRate] = useState<string>('1.5');
  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    interestRate: '1.5',
    duration: '12',
    notes: ''
  });

  // Table Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  const { isLocked } = useModuleAccess('KOPERASI');

  // Member Status query
  const memberStatusQuery = useQuery({
    queryKey: ['koperasi-member-status-me'],
    queryFn: async () => {
      if (isOperatorMode) return { status: 'member' as const, id: '' };
      const res = await api.get('/cooperative/members/me');
      const data = res?.data?.data;
      if (data && data.status === 'ACTIVE') {
        return { status: 'member' as const, id: data.id as string };
      }
      return { status: 'non-member' as const, id: '' };
    },
    staleTime: 5 * 60 * 1000,
  });

  const memberStatus = isOperatorMode ? 'member' : (memberStatusQuery.data?.status || (memberStatusQuery.isLoading ? 'loading' : 'non-member'));
  const myMemberId = isOperatorMode ? '' : (memberStatusQuery.data?.id || '');

  useEffect(() => {
    if (isStudent && myMemberId) {
      setFormData(prev => ({ ...prev, memberId: myMemberId }));
    }
  }, [isStudent, myMemberId]);

  // Load cooperative settings to fetch default interest rate
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const settings = await fetchCoopSettings();
        if (!cancelled && settings && settings.default_interest_rate) {
          const interestString = String(settings.default_interest_rate);
          setDefaultInterestRate(interestString);
          setFormData(prev => ({ ...prev, interestRate: interestString }));
        }
      } catch (err) {
        console.warn('Failed to load default interest rate from settings:', err);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // Reset pagination when search query or filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // 1. Fetch Loans Data (React Query - Pilar 31)
  const loansQuery = useQuery({
    queryKey: ['cooperative-loans', isOperatorMode, page, limit, searchQuery, statusFilter],
    queryFn: async () => {
      const endpoint = isOperatorMode ? '/cooperative/loans/manage' : '/cooperative/loans';
      const res = await api.get(endpoint, {
        params: {
          page,
          limit,
          search: searchQuery || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter
        }
      });
      return res.data;
    },
    enabled: subscription !== undefined,
    staleTime: 60 * 1000,
  });

  const loans: Loan[] = useMemo(() => {
    const raw = loansQuery.data?.data?.loans || loansQuery.data?.data;
    return Array.isArray(raw) ? raw : [];
  }, [loansQuery.data]);

  const totalPages = loansQuery.data?.data?.pagination?.totalPages || 1;
  const totalItems = loansQuery.data?.data?.pagination?.total || loans.length;

  // 2. Fetch Metrics (Student / Operator)
  const studentMetricsQuery = useQuery<StudentMetrics>({
    queryKey: ['cooperative-student-metrics'],
    queryFn: async () => {
      const res = await api.get('/cooperative/loans/student-metrics');
      return res.data?.data;
    },
    enabled: isStudent,
    staleTime: 60 * 1000,
  });
  const studentMetrics = studentMetricsQuery.data;

  const operatorMetricsQuery = useQuery<OperatorMetrics>({
    queryKey: ['cooperative-operator-metrics'],
    queryFn: async () => {
      const res = await api.get('/cooperative/loans/operator-metrics');
      return res.data?.data;
    },
    enabled: isOperatorMode,
    staleTime: 60 * 1000,
  });
  const operatorMetrics = operatorMetricsQuery.data;

  // 3. Fetch Members for selection
  const membersQuery = useQuery<Member[]>({
    queryKey: ['cooperative-members-active-list'],
    queryFn: async () => {
      const res = await api.get('/cooperative/members?limit=1000&status=ACTIVE');
      return res.data?.data?.members || [];
    },
    enabled: isModalOpen && isOperatorMode,
    staleTime: 5 * 60 * 1000,
  });
  const members = membersQuery.data || [];

  // Mutation: Create Loan
  const createLoanMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/cooperative/loans', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengajuan pinjaman berhasil dibuat!');
      setIsModalOpen(false);
      setFormData({
        memberId: isStudent && myMemberId ? myMemberId : '',
        amount: '',
        interestRate: defaultInterestRate,
        duration: '12',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['cooperative-loans'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-student-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-operator-metrics'] });
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengajukan pinjaman';
      toast.error(errorMsg);
    }
  });

  // Mutation: Change Loan Status
  const changeLoanStatusMutation = useMutation({
    mutationFn: async ({ loanId, status }: { loanId: string; status: 'APPROVED' | 'REJECTED' }) => {
      const res = await api.patch(`/cooperative/loans/${loanId}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const actionText = variables.status === 'APPROVED' ? 'disetujui' : 'ditolak';
      toast.success(`Pengajuan pinjaman berhasil ${actionText}`);
      queryClient.invalidateQueries({ queryKey: ['cooperative-loans'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-operator-metrics'] });
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengubah status pinjaman';
      toast.error(errorMsg);
    }
  });

  const handleChangeLoanStatus = useCallback(async (loanId: string, status: 'APPROVED' | 'REJECTED') => {
    const isApproved = status === 'APPROVED';
    const isConfirmed = await confirm({
      title: isApproved ? 'Setujui Pinjaman?' : 'Tolak Pinjaman?',
      message: isApproved 
        ? 'Apakah Anda yakin ingin menyetujui pengajuan pinjaman ini? Jadwal cicilan akan otomatis dibuat di sistem.' 
        : 'Apakah Anda yakin ingin menolak pengajuan pinjaman ini?',
      confirmText: isApproved ? 'Ya, Setujui' : 'Ya, Tolak',
      variant: isApproved ? 'primary' : 'danger'
    });

    if (isConfirmed) {
      changeLoanStatusMutation.mutate({ loanId, status });
    }
  }, [confirm, changeLoanStatusMutation]);

  const handleOpenModal = useCallback(() => {
    if (isStudent && memberStatus !== 'member') {
      toast.error('Anda belum terdaftar sebagai anggota koperasi.');
      return;
    }
    setIsModalOpen(true);
  }, [isStudent, memberStatus]);

  const columns: Column[] = useMemo(() => {
    const baseCols: Column[] = [
      {
        key: 'amount',
        label: 'Nominal Pinjaman',
        sortable: true,
        render: (_, row: Loan) => (
          <div>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs">
              {formatCurrency(Number(row.amount))}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Total: {formatCurrency(Number(row.totalAmount))}
            </p>
          </div>
        )
      },
      {
        key: 'interestRate',
        label: 'Bunga',
        render: (_, row: Loan) => (
          <span className="font-bold text-slate-500">{row.interestRate}%</span>
        )
      },
      {
        key: 'duration',
        label: 'Tenor',
        sortable: true,
        render: (_, row: Loan) => (
          <span className="font-bold text-slate-600 dark:text-slate-400">{row.duration} Bulan</span>
        )
      },
    ];

    if (isStudent) {
      baseCols.push({
        key: 'progress',
        label: 'Progres Pelunasan',
        render: (_, row: Loan) => {
          if (row.status !== 'APPROVED' && row.status !== 'PAID') {
            return <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">-</span>;
          }
          const totalIns = row.installments?.length || 0;
          const paidIns = row.installments?.filter(ins => ins.status === 'PAID').length || 0;
          const percent = totalIns > 0 ? Math.round((paidIns / totalIns) * 100) : 0;
          
          return (
            <div className="w-full max-w-[140px] space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                <span>{paidIns}/{totalIns} Cicilan</span>
                <span>{percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        }
      });
    }

    baseCols.push(
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (_, row: Loan) => {
          let variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary' = 'warning';
          if (row.status === 'APPROVED') variant = 'info';
          else if (row.status === 'PAID') variant = 'success';
          else if (row.status === 'REJECTED') variant = 'destructive';
          
          return (
            <Badge variant={variant} className="font-black uppercase tracking-wider text-[9px] rounded-full px-2.5 py-0.5 border">
              {row.status}
            </Badge>
          );
        }
      },
      {
        key: 'createdAt',
        label: 'Tanggal Pengajuan',
        sortable: true,
        render: (_, row: Loan) => (
          <span className="text-slate-500 font-bold text-[11px]">
            {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Tindakan',
        render: (_, row: Loan) => (
          <div className="flex gap-1.5 justify-center">
            <Link to={`/cooperative/loans/${row.id}`}>
              <Button size="xs" variant="outline" className="font-bold text-[10px] inline-flex items-center gap-1">
                <Eye size={10} /> Detail
              </Button>
            </Link>

            {(canApprove || canReject) && row.status === 'PENDING' && (
              <>
                {canApprove && (
                  <Button 
                    size="xs" 
                    variant="success" 
                    className="font-bold text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2"
                    onClick={() => handleChangeLoanStatus(row.id, 'APPROVED')}
                  >
                    Setuju
                  </Button>
                )}
                {canReject && (
                  <Button 
                    size="xs" 
                    className="font-bold text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2"
                    onClick={() => handleChangeLoanStatus(row.id, 'REJECTED')}
                  >
                    Tolak
                  </Button>
                )}
              </>
            )}
          </div>
        )
      }
    );

    if (!isStudent) {
      baseCols.unshift({
        key: 'member',
        label: 'Anggota',
        sortable: true,
        render: (_, row: Loan) => (
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{row.member.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{row.member.memberNo}</p>
          </div>
        )
      });
    }

    return baseCols;
  }, [isStudent, canApprove, canReject, handleChangeLoanStatus]);

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((row: Loan) => {
    let variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary' = 'warning';
    if (row.status === 'APPROVED') variant = 'info';
    else if (row.status === 'PAID') variant = 'success';
    else if (row.status === 'REJECTED') variant = 'destructive';

    const totalIns = row.installments?.length || Number(row.duration) || 0;
    const paidIns = row.installments?.filter(ins => ins.status === 'PAID').length || 0;
    const percent = totalIns > 0 ? Math.round((paidIns / totalIns) * 100) : 0;

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            {!isStudent && (
              <>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{row.member.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">{row.member.memberNo}</p>
              </>
            )}
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurrency(row.amount)}
            </div>
          </div>
          <Badge variant={variant} className="font-black uppercase tracking-wider text-[9px] rounded-full px-2.5 py-0.5 border shrink-0">
            {row.status}
          </Badge>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Total Pengembalian</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(row.totalAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Tenor / Bunga</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.duration} Bln ({row.interestRate}%)</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-slate-400 block font-medium">Tanggal Pengajuan</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Progress bar cicilan */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Progress Cicilan: {paidIns}/{totalIns}</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Link to={`/cooperative/loans/${row.id}`}>
            <Button size="sm" variant="outline" className="font-bold text-[11px] inline-flex items-center gap-1">
              <Eye size={12} /> Detail
            </Button>
          </Link>

          {(canApprove || canReject) && row.status === 'PENDING' && (
            <>
              {canApprove && (
                <Button 
                  size="sm" 
                  variant="success" 
                  className="font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3"
                  onClick={() => handleChangeLoanStatus(row.id, 'APPROVED')}
                >
                  Setuju
                </Button>
              )}
              {canReject && (
                <Button 
                  size="sm" 
                  className="font-bold text-[11px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3"
                  onClick={() => handleChangeLoanStatus(row.id, 'REJECTED')}
                >
                  Tolak
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }, [isStudent, canApprove, canReject, handleChangeLoanStatus]);

  const breadcrumbs = useMemo(() => {
    return [
      { label: 'Koperasi', path: '/cooperative/dashboard' },
      { label: isStudent ? 'Pinjaman Saya' : 'Daftar Pinjaman', path: isStudent ? '/cooperative/loans' : '/cooperative/loans/manage' }
    ];
  }, [isStudent]);

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Layanan Pinjaman & Pembiayaan Anggota"
      description="Ajukan pinjaman koperasi sekolah dengan bunga bersaing, kalkulasi cicilan otomatis, dan pelacakan pembayaran transparan."
    >
      <AcademicPageLayout
        title={isStudent ? 'Pinjaman Anggota Koperasi' : 'Manajemen Kredit & Pinjaman Anggota'}
        description={isStudent 
          ? 'Kelola pengajuan pinjaman, pantau histori pencairan dan status pembayaran cicilan Anda.' 
          : 'Kelola verifikasi, persetujuan pinjaman, dan pemantauan portofolio piutang koperasi sekolah.'}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="coop_loans"
        topSlot={
          canApply && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenModal}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajukan Pinjaman
              </Button>
            </div>
          )
        }
        instruction={{
          title: "Panduan Layanan Pinjaman",
          description: "Gunakan modul ini untuk mengajukan pembiayaan koperasi atau mengelola persetujuan berkas kredit.",
          items: [
            { text: "Pastikan status keanggotaan aktif sebelum membuat pengajuan pinjaman baru." },
            { text: "Jadwal cicilan dan penghitungan bunga otomatis disimulasikan sesuai tenor yang dipilih." },
            { text: "Klik tombol Detail pada baris untuk melihat riwayat cicilan atau pelunasan." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Top Banner Stats */}
            <LoanStatsBanner
              isStudent={isStudent}
              studentMetrics={studentMetrics}
              operatorMetrics={operatorMetrics}
            />

            {/* Restrictions Banner */}
            <LoanRestrictionsAlerts
              isStudent={isStudent}
              studentMetrics={studentMetrics}
              memberStatus={memberStatus}
            />

            {/* Filter Bar (Placed Above Table) */}
            <div className="overflow-x-auto max-w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Input
                  id="loans-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const parsed = loanFilterSchema.safeParse({ search: e.target.value });
                    if (parsed.success) {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }
                  }}
                  placeholder="Cari nama atau no. anggota..."
                  aria-label="Cari anggota atau nomor anggota"
                  className="w-full max-w-full min-w-0 text-xs rounded-xl"
                />
              </div>

              <div className="w-full sm:w-44 min-w-0">
                <SearchableSelect
                  id="loans-status-select"
                  aria-label="Filter status pinjaman"
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { label: 'Semua Status', value: 'ALL' },
                    { label: 'PENDING', value: 'PENDING' },
                    { label: 'APPROVED', value: 'APPROVED' },
                    { label: 'PAID', value: 'PAID' },
                    { label: 'REJECTED', value: 'REJECTED' }
                  ]}
                  placeholder="Status Pinjaman"
                />
              </div>
            </div>

            {/* Loans Table Master */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {isMobile ? (
                <div className="p-4">
                  <MobileAcademicList
                    title="Daftar Pinjaman Koperasi"
                    data={loans}
                    loading={loansQuery.isLoading}
                    totalItems={totalItems}
                    emptyMessage="Belum ada data pinjaman yang tercatat."
                    pagination={{
                      currentPage: page,
                      totalPages,
                      totalItems,
                      itemsPerPage: limit,
                      onPageChange: setPage,
                      onLimitChange: setLimit,
                    }}
                    renderCard={renderMobileCard}
                  />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={loans}
                  isLoading={loansQuery.isLoading}
                  emptyMessage="Belum ada data pinjaman yang tercatat."
                  pagination={{
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    onPageChange: setPage,
                    onLimitChange: setLimit,
                  }}
                />
              )}
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>

      {/* Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <CreateLoanModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            formData={formData}
            setFormData={setFormData}
            onSubmit={(e) => {
              e.preventDefault();
              createLoanMutation.mutate(formData);
            }}
            loading={createLoanMutation.isPending}
            isStudent={isStudent}
            isOperatorMode={isOperatorMode}
            members={members}
            studentMetrics={studentMetrics}
          />
        )}

        {isPaymentInstructionsOpen && (
          <PaymentInstructionsModal
            isOpen={isPaymentInstructionsOpen}
            onClose={() => setIsPaymentInstructionsOpen(false)}
          />
        )}
      </Suspense>
    </PremiumFeatureGate>
  );
});

export default Loans;
