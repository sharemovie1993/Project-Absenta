import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button, SectionCard, Table, Badge, SearchableSelect } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { Plus, Eye, Clock, Ban } from 'lucide-react';
import { LoanStatsBanner } from '../../components/cooperative/loans/LoanStatsBanner';
import { LoanRestrictionsAlerts } from '../../components/cooperative/loans/LoanRestrictionsAlerts';
import type { Loan, Member, StudentMetrics, OperatorMetrics } from '../../components/cooperative/loans/types';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { cn } from '../../lib/utils';
import useConfirm from '../../hooks/useConfirm';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';

// Lazy-load heavy modals to optimize initial bundle splitting
const CreateLoanModal = lazy(() => 
  import('../../components/cooperative/loans/CreateLoanModal').then(module => ({ default: module.CreateLoanModal }))
);
const PaymentInstructionsModal = lazy(() => 
  import('../../components/cooperative/loans/PaymentInstructionsModal').then(module => ({ default: module.PaymentInstructionsModal }))
);

// Shared interfaces are now imported from types.ts

const Loans: React.FC = () => {
  const { user, subscription, can } = useAuth();
  const confirm = useConfirm();
  
  const isManageMode = window.location.pathname.endsWith('/manage');
  const canApprove = can('cooperative.loans.approve');
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

  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<'loading' | 'member' | 'non-member'>('loading');
  const [myMemberId, setMyMemberId] = useState<string>('');
  const [isPaymentInstructionsOpen, setIsPaymentInstructionsOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
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

  // Gating Logic
  const subWithFeatures = subscription as any;
  const features = subWithFeatures?.features || 
                   subWithFeatures?.Plan?.features_json || 
                   subWithFeatures?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  // Check membership status
  useEffect(() => {
    if (isOperatorMode) {
      setMemberStatus('member');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        if (!cancelled) {
          const data = res?.data?.data;
          if (data && data.status === 'ACTIVE') {
            setMemberStatus('member');
            setMyMemberId(data.id);
            setFormData(prev => ({ ...prev, memberId: data.id }));
          } else {
            setMemberStatus('non-member');
          }
        }
      } catch {
        if (!cancelled) setMemberStatus('non-member');
      }
    })();
    return () => { cancelled = true; };
  }, [isOperatorMode]);

  // Load cooperative settings to fetch default interest rate
  useEffect(() => {
    let cancelled = false;
    const fetchDefaultInterestRate = async () => {
      try {
        const settings = await fetchCoopSettings();
        if (!cancelled && settings.cooperative_default_interest_rate) {
          const rate = String(settings.cooperative_default_interest_rate);
          setDefaultInterestRate(rate);
          setFormData(prev => ({ ...prev, interestRate: rate }));
        }
      } catch (err) {
        console.error('Error fetching cooperative default interest rate:', err);
      }
    };
    fetchDefaultInterestRate();
    return () => { cancelled = true; };
  }, []);

  const fetchLoans = useCallback(async () => {
    if (isLocked || subscription === undefined) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = isStudent ? '/cooperative/loans/me' : '/cooperative/loans';
      const response = await api.get(url);
      setLoans(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data pinjaman.');
    } finally {
      setLoading(false);
    }
  }, [isLocked, subscription, isStudent]);

  const fetchMembers = useCallback(async () => {
    if (isLocked || isStudent) return;
    try {
      const res = await api.get('/cooperative/members');
      setMembers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, [isLocked, isStudent]);

  useEffect(() => {
    if (subscription === undefined) return;
    if (isOperatorMode || memberStatus === 'member') {
      fetchLoans();
      fetchMembers();
    } else if (memberStatus === 'non-member') {
      setLoading(false);
    }
  }, [subscription, fetchLoans, fetchMembers, isOperatorMode, memberStatus]);

  const simulation = useMemo(() => {
    const amountVal = parseFloat(formData.amount);
    const rateVal = parseFloat(formData.interestRate);
    const durationVal = parseInt(formData.duration);

    if (isNaN(amountVal) || amountVal <= 0) {
      return { interest: 0, total: 0, monthly: 0 };
    }

    const interest = Math.round(amountVal * (rateVal / 100));
    const total = amountVal + interest;
    const monthly = durationVal > 0 ? Math.round(total / durationVal) : 0;

    return { interest, total, monthly };
  }, [formData.amount, formData.interestRate, formData.duration]);

  // Metrics calculation
  const metrics = useMemo<StudentMetrics | OperatorMetrics>(() => {
    const activeList = loans || [];
    
    if (isStudent) {
      const approvedLoans = activeList.filter(l => l.status === 'APPROVED');
      const approvedAndPaidLoans = activeList.filter(l => l.status === 'APPROVED' || l.status === 'PAID');
      const totalAmount = approvedAndPaidLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
      
      let remainingBalance = 0;
      let monthlyDue = 0;
      let nearestDueDate: string | null = null;
      let earliestDateMs = Infinity;
      let totalRepayable = 0;
      let totalPaid = 0;
      let totalPaidInstallments = 0;
      let totalInstallmentsCount = 0;

      approvedLoans.forEach(l => {
        const unpaidInstallments = l.installments?.filter(ins => ins.status === 'UNPAID') || [];
        remainingBalance += unpaidInstallments.reduce((sum, ins) => sum + parseFloat(ins.amount), 0);
        if (unpaidInstallments.length > 0) {
          monthlyDue += parseFloat(unpaidInstallments[0].amount);
        }

        if (l.installments) {
          totalInstallmentsCount += l.installments.length;
          l.installments.forEach(ins => {
            const insAmount = parseFloat(ins.amount);
            totalRepayable += insAmount;
            if (ins.status === 'PAID') {
              totalPaid += insAmount;
              totalPaidInstallments++;
            } else if (ins.dueDate) {
              const ms = new Date(ins.dueDate).getTime();
              if (ms < earliestDateMs) {
                earliestDateMs = ms;
                nearestDueDate = ins.dueDate;
              }
            }
          });
        }
      });

      const percentPaid = totalRepayable > 0 ? Math.round((totalPaid / totalRepayable) * 100) : 0;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      let isOverdue = false;
      let isApproaching = false;

      if (nearestDueDate) {
        const dueDate = new Date(nearestDueDate);
        dueDate.setHours(0,0,0,0);
        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          isOverdue = true;
        } else if (diffDays <= 3) {
          isApproaching = true;
        }
      }

      const card3Sub = nearestDueDate 
        ? `Jatuh tempo: ${new Date(nearestDueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` 
        : 'Tidak ada tagihan aktif';

      return {
        card1Title: 'Total Pinjaman',
        card1Val: `Rp ${Math.round(totalAmount).toLocaleString('id-ID')}`,
        card1Sub: approvedAndPaidLoans.length > 0 ? `${approvedAndPaidLoans.length} Berkas Pinjaman` : 'Tidak ada pinjaman',
        card2Title: 'Sisa Saldo Tagihan',
        card2Val: `Rp ${Math.round(remainingBalance).toLocaleString('id-ID')}`,
        card2Sub: approvedLoans.length > 0 
          ? `${percentPaid}% Terbayar (${totalPaidInstallments}/${totalInstallmentsCount} Cicilan)` 
          : (approvedAndPaidLoans.length > 0 ? 'Semua pinjaman telah lunas' : 'Belum ada pembayaran'),
        card3Title: 'Angsuran Bulan Ini',
        card3Val: `Rp ${Math.round(monthlyDue).toLocaleString('id-ID')}`,
        card3Sub: card3Sub,
        isOverdue,
        isApproaching,
        hasApprovedLoans: approvedLoans.length > 0,
        hasActiveLoan: activeList.some(l => l.status === 'APPROVED'),
        hasPendingLoan: activeList.some(l => l.status === 'PENDING'),
      } as StudentMetrics;
    } else {
      const pendingLoans = activeList.filter(l => l.status === 'PENDING');
      const approvedLoans = activeList.filter(l => l.status === 'APPROVED');
      const paidLoans = activeList.filter(l => l.status === 'PAID');

      const pendingCount = pendingLoans.length;
      const activeTotal = approvedLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
      const paidCount = paidLoans.length;

      return {
        card1Title: 'Pengajuan Pending',
        card1Val: `${pendingCount} Berkas`,
        card2Title: 'Penyaluran Aktif',
        card2Val: `Rp ${Math.round(activeTotal).toLocaleString('id-ID')}`,
        card3Title: 'Pinjaman Lunas',
        card3Val: `${paidCount} Berkas`,
      } as OperatorMetrics;
    }
  }, [loans, isStudent]);

  const studentMetrics = isStudent ? (metrics as StudentMetrics) : null;
  const operatorMetrics = !isStudent ? (metrics as OperatorMetrics) : null;

  const handleOpenModal = () => {
    if (isLocked) return;

    if (isStudent && studentMetrics) {
      if (studentMetrics.hasActiveLoan) {
        toast.error('Anda masih memiliki pinjaman aktif yang berjalan. Lunasi seluruh cicilan terlebih dahulu sebelum mengajukan pinjaman baru.', { duration: 5000 });
        return;
      }
      if (studentMetrics.hasPendingLoan) {
        toast.error('Pengajuan pinjaman Anda sebelumnya masih menunggu keputusan pengurus koperasi. Harap tunggu hingga pengajuan tersebut diputuskan.', { duration: 5000 });
        return;
      }
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLocked) return;
    e.preventDefault();

    const targetMemberId = isStudent ? myMemberId : formData.memberId;
    if (!targetMemberId) {
      toast.error('Pilih anggota terlebih dahulu.');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post('/cooperative/loans', {
        ...formData,
        memberId: targetMemberId,
        amount: Number(formData.amount),
        interestRate: Number(formData.interestRate),
        duration: Number(formData.duration)
      });
      toast.success('Pengajuan pinjaman berhasil dibuat!');
      setIsModalOpen(false);
      setFormData({
        memberId: isStudent ? myMemberId : '',
        amount: '',
        interestRate: defaultInterestRate,
        duration: '12',
        notes: ''
      });
      fetchLoans();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal membuat pengajuan.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (loanId: string, status: 'APPROVED' | 'REJECTED') => {
    const actionLabel = status === 'APPROVED' ? 'menyetujui' : 'menolak';
    const isConfirmed = await confirm({
      title: status === 'APPROVED' ? 'Setujui Pengajuan' : 'Tolak Pengajuan',
      description: `Apakah Anda yakin ingin ${actionLabel} pengajuan pinjaman ini?`,
      confirmText: status === 'APPROVED' ? 'Setujui' : 'Tolak',
      cancelText: 'Batal',
      style: status === 'APPROVED' ? 'success' : 'danger'
    });
    if (!isConfirmed) return;

    try {
      const res = await api.put(`/cooperative/loans/${loanId}/status`, { status });
      if (res.data) {
        toast.success(`Pengajuan pinjaman berhasil di-${status.toLowerCase()}!`);
        fetchLoans();
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error(error);
      toast.error(error.response?.data?.message || 'Gagal mengubah status pengajuan.');
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchSearch = isStudent 
        ? true 
        : l.member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          l.member.memberNo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [loans, searchQuery, statusFilter, isStudent]);

  // Paginated data for the Table component
  const paginatedLoans = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLoans.slice(start, start + limit);
  }, [filteredLoans, page, limit]);

  const columns: Column[] = useMemo(() => {
    const baseCols: Column[] = [
      {
        key: 'amount',
        label: 'Nilai Pinjaman',
        sortable: true,
        render: (_, row: Loan) => (
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            Rp {Math.round(parseFloat(row.amount)).toLocaleString('id-ID')}
          </span>
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
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden border border-slate-200/20">
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
          <span className="text-slate-450 font-bold text-[11px]">
            {new Date(row.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                    onClick={() => handleUpdateStatus(row.id, 'APPROVED')}
                  >
                    Setuju
                  </Button>
                )}
                {canReject && (
                  <Button 
                    size="xs" 
                    className="font-bold text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2"
                    onClick={() => handleUpdateStatus(row.id, 'REJECTED')}
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
  }, [isStudent, canApprove, canReject]);

  const breadcrumbs = useMemo(() => {
    return [
      { label: 'Koperasi', path: '/cooperative/dashboard' },
      { label: isStudent ? 'Pinjaman Saya' : 'Daftar Pinjaman', path: isStudent ? '/cooperative/loans' : '/cooperative/loans/manage' }
    ];
  }, [isStudent]);

  // Operational Table Toolbars (slots on Table component)
  const TableToolbarLeft = useMemo(() => (
    <div className="flex flex-col">
      <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
        {isStudent ? 'Riwayat Pinjaman Saya' : 'Daftar Berkas Kredit & Pinjaman'}
      </h3>
      <p className="text-[10px] text-slate-400">
        {isStudent ? 'Daftar pengajuan pinjaman dan status aktif Anda' : 'Kelola keputusan persetujuan berkas kredit anggota'}
      </p>
    </div>
  ), [isStudent]);

  const TableToolbarRight = useMemo(() => {
    const isRestricted = isStudent && studentMetrics && (studentMetrics.hasActiveLoan || studentMetrics.hasPendingLoan);
    const titleText = isRestricted 
      ? (studentMetrics?.hasActiveLoan ? 'Lunasi pinjaman aktif terlebih dahulu' : 'Tunggu keputusan pengajuan yang sedang di-review') 
      : 'Ajukan pinjaman baru';

    return (
      <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto justify-end">
        {/* Search query (Operator only) */}
        {isOperatorMode && (
          <input
            id="loans-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari anggota / no. anggota..."
            aria-label="Cari anggota atau nomor anggota"
            className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium w-48 sm:w-60 text-slate-800 dark:text-slate-200"
          />
        )}

        {/* Status Filter */}
        <SearchableSelect
          id="loans-status-select"
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
          placeholder="Filter status..."
          className="w-40"
          triggerClassName="h-9 font-bold text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl cursor-pointer"
        />

        {/* Apply Loan Button (Any active member or Coop Staff) */}
        {canApply && (isStudent || isOperatorMode) && (
          <Button 
            onClick={handleOpenModal}
            size="sm"
            disabled={!isOperatorMode && !!isRestricted}
            title={isOperatorMode ? 'Input pengajuan pinjaman anggota' : titleText}
            className={cn(
              "font-bold flex items-center gap-1.5 rounded-xl text-xs h-9 transition-all duration-200",
              (!isOperatorMode && isRestricted)
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 shadow-none"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
            )}
          >
            {(!isOperatorMode && isRestricted) ? <Ban size={14} /> : <Plus size={14} />}
            {isOperatorMode ? 'Input Pengajuan Baru' : (isRestricted ? 'Pinjaman Tidak Tersedia' : 'Ajukan Pinjaman Baru')}
          </Button>
        )}
      </div>
    );
  }, [isOperatorMode, isStudent, searchQuery, statusFilter, studentMetrics, handleOpenModal, canApply]);

  if (isStudent && memberStatus === 'loading') {
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Pinjaman Koperasi">
        <AcademicPageLayout
          title="Pinjaman Koperasi"
          description="Akses pengajuan pinjaman dan histori angsuran"
          instruction={{
            title: "Memuat Data",
            description: "Harap tunggu, sistem sedang memuat status keanggotaan dan riwayat pengajuan pinjaman koperasi sekolah Anda."
          }}
          breadcrumbs={breadcrumbs}
        >
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-650/20 border-t-indigo-650 rounded-full animate-spin"></div>
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  if (isStudent && memberStatus === 'non-member') {
    return (
      <PremiumFeatureGate moduleName="KOPERASI" featureName="Pinjaman Koperasi">
        <AcademicPageLayout
          title="Pinjaman Koperasi"
          description="Akses pengajuan pinjaman dan histori angsuran"
          instruction={{
            title: "Pendaftaran Koperasi",
            description: "Anda belum terdaftar sebagai anggota aktif koperasi sekolah. Hubungi Bendahara Koperasi untuk melakukan pendaftaran agar dapat mengakses layanan pinjaman."
          }}
          breadcrumbs={breadcrumbs}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 shadow-lg shadow-indigo-500/20">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg leading-tight">
                  Anda Belum Terdaftar sebagai Anggota Koperasi
                </h3>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed">
                  Layanan pengajuan pinjaman koperasi hanya tersedia bagi anggota aktif koperasi sekolah. Silakan hubungi pengurus atau Bendahara Koperasi sekolah untuk pendaftaran.
                </p>
              </div>
            </div>
          </div>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Pinjaman Koperasi"
    >
      <AcademicPageLayout
        title={isStudent ? 'Pinjaman Saya' : 'Manajemen Kredit & Pinjaman'}
        description="Kelola pengajuan pinjaman serta data angsuran anggota koperasi"
        instruction={{
          title: isStudent ? "Panduan Pinjaman Saya" : "Panduan Manajemen Kredit",
          description: isStudent 
            ? "Halaman ini digunakan untuk melihat histori pengajuan pinjaman Anda, melacak progres pelunasan angsuran bulanan, dan melakukan pengajuan pinjaman koperasi sekolah yang baru dengan simulasi bunga transparan."
            : "Halaman ini digunakan oleh pengurus dan staf koperasi untuk mengelola, meninjau kelayakan berkas, dan memutasi persetujuan status kredit pengajuan pinjaman anggota koperasi sekolah."
        }}
        hardeningModuleKey="coop_loans"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Metrics Panel */}
          <LoanStatsBanner
            isStudent={isStudent}
            studentMetrics={studentMetrics}
            operatorMetrics={operatorMetrics}
            onPaymentInstructionsOpen={() => setIsPaymentInstructionsOpen(true)}
          />

          {/* Table Container */}
          <SectionCard fullWidth className="p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-6">

            {/* === KSP Restriction Alert banners === */}
            <LoanRestrictionsAlerts
              isStudent={isStudent}
              studentMetrics={studentMetrics}
            />

            <Table 
              data={paginatedLoans} 
              columns={columns} 
              rowKey="id" 
              loading={loading}
              emptyMessage={isStudent ? 'Anda belum memiliki riwayat pengajuan pinjaman.' : 'Belum ada data pinjaman terdaftar.'}
              toolbarLeft={TableToolbarLeft}
              toolbarRight={TableToolbarRight}
              pagination={{
                currentPage: page,
                itemsPerPage: limit,
                totalItems: filteredLoans.length,
                totalPages: Math.ceil(filteredLoans.length / limit),
                onPageChange: (newPage) => setPage(newPage),
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }
              }}
            />
          </SectionCard>
        </div>

        {/* Heavy components wrapped in React Suspense to guarantee clean bundle splitting */}
        <Suspense fallback={null}>
          <CreateLoanModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            isStudent={isStudent || !canInputOnBehalf}
            members={members}
            formData={formData}
            onFormDataChange={setFormData}
            simulation={simulation}
            submitLoading={submitLoading}
          />
          <PaymentInstructionsModal
            isOpen={isPaymentInstructionsOpen}
            onClose={() => setIsPaymentInstructionsOpen(false)}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default Loans;
