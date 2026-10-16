import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button, SectionCard, Table, Badge, SearchableSelect } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { Plus, Eye, Clock, Ban, Users, Wallet, HeartHandshake, Search } from 'lucide-react';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
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
import { useSocket } from '../../hooks/useSocket';
import { CoopFiscalYearSelector } from '../../components/cooperative/shared/CoopFiscalYearSelector';
import { invalidateLoansCaches } from '../../lib/coopQueryKeys';

// Lazy-load heavy modals to optimize initial bundle splitting
const CreateLoanModal = lazy(() => 
  import('../../components/cooperative/loans/CreateLoanModal').then(module => ({ default: module.CreateLoanModal }))
);
const PaymentInstructionsModal = lazy(() => 
  import('../../components/cooperative/loans/PaymentInstructionsModal').then(module => ({ default: module.PaymentInstructionsModal }))
);
const LoanSuccessModal = lazy(() => 
  import('../../components/cooperative/loans/LoanSuccessModal').then(module => ({ default: module.LoanSuccessModal }))
);
const RejectLoanModal = lazy(() => 
  import('../../components/cooperative/loans/RejectLoanModal').then(module => ({ default: module.RejectLoanModal }))
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isOperator =
    isAdmin ||
    isKoperasiHead ||
    isKoperasiFinance ||
    can('cooperative.loans.approve') ||
    can('cooperative.loans.reject') ||
    can('cooperative.loans.view.list') ||
    can('cooperative.loans.manage');

  const isManageRoute = window.location.pathname.endsWith('/manage');
  const tabParam = searchParams.get('tab');

  const activeTab: 'manage' | 'personal' = useMemo(() => {
    if (!isOperator) return 'personal';
    if (tabParam === 'personal') return 'personal';
    if (tabParam === 'manage' || isManageRoute) return 'manage';
    return 'manage';
  }, [isOperator, tabParam, isManageRoute]);

  const setActiveTab = useCallback((tab: 'manage' | 'personal') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'personal') {
        next.set('tab', 'personal');
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const isOperatorMode = activeTab === 'manage';
  const isStudent = !isOperatorMode;

  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'manage', label: 'Kelola Pinjaman Anggota', icon: Users },
    { id: 'personal', label: 'Pinjaman Saya', icon: Wallet },
  ], []);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id as 'manage' | 'personal');
  }, [setActiveTab]);

  const navigate = useNavigate();

  const canApprove = isAdmin || isKoperasiHead || isKoperasiFinance || can('cooperative.loans.approve');
  const canReject = can('cooperative.loans.reject');
  const canApply = can('cooperative.loans.apply');
  const canInputOnBehalf = isOperator;

  const [isPaymentInstructionsOpen, setIsPaymentInstructionsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdLoanData, setCreatedLoanData] = useState<any | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [rejectTargetLoan, setRejectTargetLoan] = useState<Loan | null>(null);
  const [coopSettings, setCoopSettings] = useState<any>(null);
  const [defaultInterestRate, setDefaultInterestRate] = useState<string>('1.5');
  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    interestRate: '1.5',
    duration: '12',
    notes: '',
    autoApprove: true
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
        if (!cancelled && settings) {
          setCoopSettings(settings);
          const rate = settings?.cooperative_default_interest_rate || (settings as any)?.default_interest_rate;
          if (rate) {
            const interestString = String(rate);
            setDefaultInterestRate(interestString);
            setFormData(prev => ({ ...prev, interestRate: interestString }));
          }
        }
      } catch (err) {
        console.warn('Failed to load default interest rate from settings:', err);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const { subscribe, unsubscribe } = useSocket();

  // Realtime Live Sync: Dengarkan event transaksi/status pinjaman via WebSocket (Pilar 4 Hardening)
  useEffect(() => {
    const handleLoanUpdate = () => {
      invalidateLoansCaches(queryClient);
    };

    subscribe('coop_loan_update', handleLoanUpdate);
    return () => {
      unsubscribe('coop_loan_update', handleLoanUpdate);
    };
  }, [subscribe, unsubscribe, queryClient]);

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
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          personal: isStudent ? 'true' : undefined
        }
      });
      return res.data;
    },
    enabled: subscription !== undefined,
    staleTime: 60 * 1000,
  });

  const loans: Loan[] = useMemo(() => {
    const raw = Array.isArray(loansQuery.data)
      ? loansQuery.data
      : (loansQuery.data?.data?.loans || loansQuery.data?.data || []);
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
      const res = await api.get('/cooperative/members');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data?.members || res.data?.data || []);
      return (list || []).filter((m: any) => !m.status || m.status === 'ACTIVE');
    },
    enabled: isOperatorMode,
    staleTime: 5 * 60 * 1000,
  });
  const members = membersQuery.data || [];
  const loadingMembers = membersQuery.isLoading;

  // Mutation: Create Loan (dengan Idempotency Key Guard)
  const createLoanMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/cooperative/loans', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID()
        }
      });
      return res.data;
    },
    onSuccess: (data) => {
      setIsModalOpen(false);
      invalidateLoansCaches(queryClient);

      if (isOperatorMode) {
        setCreatedLoanData(data);
        setIsSuccessModalOpen(true);
      } else {
        toast.success('Pengajuan pinjaman berhasil dibuat!');
      }

      setFormData({
        memberId: isStudent && myMemberId ? myMemberId : '',
        amount: '',
        interestRate: defaultInterestRate,
        duration: '12',
        notes: '',
        autoApprove: true
      });
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengajukan pinjaman';
      toast.error(errorMsg);
    }
  });

  // Mutation: Change Loan Status
  const changeLoanStatusMutation = useMutation({
    mutationFn: async ({ loanId, status, rejectionReason }: { loanId: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => {
      const res = await api.put(`/cooperative/loans/${loanId}/status`, { status, rejectionReason });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const actionText = variables.status === 'APPROVED' ? 'disetujui' : 'ditolak';
      toast.success(`Pengajuan pinjaman berhasil ${actionText}`);
      setRejectTargetLoan(null);
      invalidateLoansCaches(queryClient, variables.loanId);
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengubah status pinjaman';
      toast.error(errorMsg);
    }
  });

  const handleChangeLoanStatus = useCallback(async (loanId: string, status: 'APPROVED' | 'REJECTED', loanRow?: Loan) => {
    if (status === 'REJECTED') {
      const target = loanRow || loans.find(l => l.id === loanId) || null;
      setRejectTargetLoan(target);
      return;
    }

    const isConfirmed = await confirm({
      title: 'Setujui Pinjaman?',
      message: 'Apakah Anda yakin ingin menyetujui pengajuan pinjaman ini? Jadwal cicilan dan jurnal kas akan otomatis diproses.',
      confirmText: 'Ya, Setujui',
      variant: 'primary'
    });

    if (isConfirmed) {
      changeLoanStatusMutation.mutate({ loanId, status });
    }
  }, [confirm, changeLoanStatusMutation, loans]);

  const handleOpenModal = useCallback(() => {
    if (isStudent && memberStatus !== 'member') {
      toast.error('Anda belum terdaftar sebagai anggota koperasi.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      memberId: isStudent && myMemberId ? myMemberId : prev.memberId,
      interestRate: defaultInterestRate,
      autoApprove: isOperatorMode,
    }));
    setIsModalOpen(true);
  }, [isStudent, isOperatorMode, memberStatus, myMemberId, defaultInterestRate]);

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
            <div className="space-y-0.5">
              <Badge variant={variant} className="font-black uppercase tracking-wider text-[9px] rounded-full px-2.5 py-0.5 border">
                {row.status}
              </Badge>
              {row.status === 'REJECTED' && row.rejectionReason && (
                <p className="text-[9px] text-rose-500 font-medium truncate max-w-[140px]" title={row.rejectionReason}>
                  Alasan: {row.rejectionReason}
                </p>
              )}
            </div>
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
                    onClick={() => handleChangeLoanStatus(row.id, 'REJECTED', row)}
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
          <div className="text-right">
            <Badge variant={variant} className="font-black uppercase tracking-wider text-[9px] rounded-full px-2.5 py-0.5 border shrink-0">
              {row.status}
            </Badge>
            {row.status === 'REJECTED' && row.rejectionReason && (
              <p className="text-[9px] text-rose-500 font-medium truncate max-w-[120px] mt-0.5" title={row.rejectionReason}>
                Alasan: {row.rejectionReason}
              </p>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full max-w-full min-w-0">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Total Pengembalian</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(row.totalAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Tenor / Bunga</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.duration} Bln ({row.interestRate}%)</span>
          </div>
          <div className="col-span-1 sm:col-span-2">
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
                  onClick={() => handleChangeLoanStatus(row.id, 'REJECTED', row)}
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
      { label: isStudent ? 'Pinjaman Saya' : 'Kelola Pinjaman Anggota', path: isStudent ? '/cooperative/loans?tab=personal' : '/cooperative/loans' }
    ];
  }, [isStudent]);

  const TableToolbarLeftComponent = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            id="loans-search-input"
            value={searchQuery}
            onChange={(e) => {
              const parsed = loanFilterSchema.safeParse({ search: e.target.value });
              if (parsed.success) {
                setSearchQuery(e.target.value);
                setPage(1);
              }
            }}
            placeholder={isStudent ? "Cari riwayat pinjaman..." : "Cari nama, nomor anggota..."}
            aria-label="Cari pinjaman atau anggota"
            className="w-full h-9 pl-9 pr-4 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
        </div>

        <div className="w-full sm:w-auto">
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
            triggerClassName="w-full sm:w-auto sm:min-w-[140px] text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>
    ),
    [searchQuery, statusFilter, isStudent, setSearchQuery, setStatusFilter, setPage]
  );

  const TableToolbarRightComponent = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
        <CoopFiscalYearSelector />
        {isStudent && (
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => setIsPaymentInstructionsOpen(true)}
            className="text-xs font-bold tracking-tight rounded-xl border-slate-200 text-slate-700 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50 transition-all duration-200 shadow-sm"
          >
            <Clock size={13} className="mr-2 text-amber-500" />
            Petunjuk Bayar
          </Button>
        )}
        {canApply && (
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleOpenModal}
            className="text-xs font-bold tracking-tight rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/15 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>{isOperatorMode ? 'Input Pinjaman Anggota' : 'Ajukan Pinjaman'}</span>
          </Button>
        )}
      </div>
    ),
    [isStudent, canApply, handleOpenModal, isOperatorMode]
  );

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Layanan Pinjaman & Pembiayaan Anggota"
      description="Ajukan pinjaman koperasi sekolah dengan bunga bersaing, kalkulasi cicilan otomatis, dan pelacakan pembayaran transparan."
    >
      <AcademicPageLayout
        title={isStudent ? 'Pinjaman Saya' : 'Kelola Pinjaman Anggota'}
        description={isStudent 
          ? 'Pantau status pengajuan pinjaman, jadwal cicilan, dan histori pembayaran angsuran pribadi Anda.' 
          : 'Kelola verifikasi, persetujuan pengajuan pinjaman anggota, dan monitoring cicilan kredit koperasi.'}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="coop_loans"
        instruction={{
          title: isStudent ? "Panduan Pinjaman Saya" : "Panduan Manajemen Pinjaman Anggota",
          description: isStudent 
            ? "Gunakan halaman ini untuk memantau status pinjaman, jadwal cicilan, dan mengajukan pinjaman baru."
            : "Gunakan modul ini untuk memverifikasi, menyetujui, menolak pengajuan pinjaman anggota, atau menginput pinjaman atas nama anggota.",
          items: isStudent ? [
            { text: "Pastikan status keanggotaan aktif sebelum membuat pengajuan pinjaman baru." },
            { text: "Jadwal cicilan dan penghitungan bunga otomatis disimulasikan sesuai tenor yang dipilih." },
            { text: "Klik tombol Detail pada kartu pinjaman untuk melihat riwayat cicilan atau tata cara pembayaran." }
          ] : [
            { text: "Tinjau pengajuan pinjaman berstatus PENDING, lalu klik Setuju atau Tolak." },
            { text: "Gunakan kolom pencarian untuk menyaring pinjaman berdasarkan nama anggota atau status." },
            { text: "Klik tombol Input Pinjaman Anggota untuk membantu membuatkan pengajuan atas nama anggota secara langsung." }
          ]
        }}
      >
        <div className="space-y-6">
          {/* Header Action & Custom Status Badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                HARDENED (DEV AUDIT A+)
              </span>
            </div>
          </div>

          {/* Context Switcher (Khusus Pengurus / Operator) */}
          {isOperator && (
            <div className="w-full max-w-full min-w-0 overflow-x-auto no-scrollbar flex-nowrap pb-1">
              <TabSwitcher
                tabs={tabOptions}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>
          )}

          {/* Top Banner Stats */}
          <LoanStatsBanner
            isStudent={isStudent}
            studentMetrics={studentMetrics}
            operatorMetrics={operatorMetrics}
            variant="compact-premium"
            mobileCompact={true}
          />

          {/* Restrictions Banner */}
          <LoanRestrictionsAlerts
            isStudent={isStudent}
            studentMetrics={studentMetrics}
            memberStatus={memberStatus}
          />

          {/* SectionCard dengan Table persis pola Members.tsx */}
          <SectionCard 
            title={isStudent ? "Daftar Pinjaman Saya" : "Data Pinjaman Anggota Koperasi"} 
            icon={HeartHandshake} 
            fullWidth 
            noPadding
          >
            {isMobile ? (
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  {TableToolbarLeftComponent}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {TableToolbarRightComponent}
                  </div>
                </div>
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
                toolbarLeft={TableToolbarLeftComponent}
                toolbarRight={TableToolbarRightComponent}
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
          </SectionCard>
        </div>
      </AcademicPageLayout>

      {/* Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <CreateLoanModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            formData={formData}
            setFormData={setFormData}
            onFormDataChange={setFormData}
            onSubmit={(e) => {
              e.preventDefault();
              createLoanMutation.mutate(formData);
            }}
            loading={createLoanMutation.isPending}
            submitLoading={createLoanMutation.isPending}
            isStudent={isStudent}
            isOperatorMode={isOperatorMode}
            members={members}
            loadingMembers={loadingMembers}
            studentMetrics={studentMetrics}
          />
        )}

        {isPaymentInstructionsOpen && (
          <PaymentInstructionsModal
            isOpen={isPaymentInstructionsOpen}
            onClose={() => setIsPaymentInstructionsOpen(false)}
          />
        )}

        {isSuccessModalOpen && createdLoanData && (
          <LoanSuccessModal
            isOpen={isSuccessModalOpen}
            onClose={() => {
              setIsSuccessModalOpen(false);
              setCreatedLoanData(null);
            }}
            loan={createdLoanData}
            coopSettings={coopSettings}
            onViewDetail={(loanId) => {
              navigate(`/cooperative/loans/${loanId}`);
            }}
          />
        )}

        {rejectTargetLoan && (
          <RejectLoanModal
            isOpen={!!rejectTargetLoan}
            onClose={() => setRejectTargetLoan(null)}
            onConfirm={(reason) => {
              changeLoanStatusMutation.mutate({
                loanId: rejectTargetLoan.id,
                status: 'REJECTED',
                rejectionReason: reason
              });
            }}
            isLoading={changeLoanStatusMutation.isPending}
            memberName={rejectTargetLoan.member?.name}
            loanAmount={rejectTargetLoan.amount}
          />
        )}
      </Suspense>
    </PremiumFeatureGate>
  );
});

export default Loans;
