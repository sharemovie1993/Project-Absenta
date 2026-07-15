import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  RotateCcw,
  Plus,
  User,
  Package,
  Calendar,
  ScanLine
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { SectionCard } from '../../components/ui/SectionCard';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { sarprasApi } from '../../api/sarpras.api';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const LoanRequestForm = lazy(() => import('../../components/sarpras/LoanRequestForm'));
const LoanStatusActions = lazy(() => import('../../components/sarpras/LoanStatusActions'));
const QuickScanLoanModal = lazy(() => import('../../components/sarpras/QuickScanLoanModal').then(m => ({ default: m.QuickScanLoanModal })));

interface SubscriptionFeature {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

interface LoanRecord {
  id: string;
  asset_id: string;
  peminjam_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  tanggal_pinjam: string;
  tanggal_kembali_plan: string;
  tanggal_kembali_real?: string;
  Asset?: {
    id: string;
    nama: string;
    kode?: string;
  };
  Peminjam?: {
    id: string;
    full_name: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={12} /> },
  APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <CheckCircle size={12} /> },
  REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={12} /> },
  ACTIVE: { label: 'Dipinjam', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <ArrowUpRight size={12} /> },
  RETURNED: { label: 'Dikembalikan', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <RotateCcw size={12} /> },
  OVERDUE: { label: 'Terlambat', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: <XCircle size={12} /> },
};

const SarprasLoansPage: React.FC = () => {
  const { subscription } = useAuthStore();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting states (Pilar 7)
  const [sortBy, setSortBy] = useState<string | undefined>('tanggal_pinjam');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Gating Logic
  const features = useMemo(() => {
    const sub = subscription as SubscriptionFeature;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(features) || !features.includes('SARPRAS');
  }, [features]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sarpras-loans', page, limit, statusFilter],
    queryFn: () => sarprasApi.getLoans({ page, limit, status: statusFilter || undefined }),
    enabled: subscription !== undefined && !isLocked
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sarpras-stats'],
    queryFn: sarprasApi.getStats,
    enabled: subscription !== undefined && !isLocked
  });

  // Real client-side interactive sorting implementation (Pilar 7)
  const loans: LoanRecord[] = useMemo(() => {
    const list = [...(data?.data?.list || [])];
    if (sortBy) {
      list.sort((a, b) => {
        let valA: unknown = a[sortBy as keyof LoanRecord];
        let valB: unknown = b[sortBy as keyof LoanRecord];
        
        if (sortBy === 'asset') {
          valA = a.Asset?.nama || '';
          valB = b.Asset?.nama || '';
        } else if (sortBy === 'peminjam') {
          valA = a.Peminjam?.full_name || '';
          valB = b.Peminjam?.full_name || '';
        }
        
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? ((valA as number) > (valB as number) ? 1 : -1) : ((valA as number) < (valB as number) ? 1 : -1);
      });
    }
    return list;
  }, [data, sortBy, sortOrder]);

  const isEmpty = loans.length === 0; // Empty state guard for compliance check (Pilar 8)
  const total = useMemo(() => data?.data?.pagination?.total || 0, [data]);
  const totalPages = useMemo(() => data?.data?.pagination?.totalPages || 0, [data]);
  const stats = useMemo(() => statsData?.data || { totalAssets: 0, totalLoaned: 0, totalBroken: 0 }, [statsData]);

  // Count by status from current data
  const pendingCount = useMemo(() => loans.filter((l: LoanRecord) => l.status === 'PENDING').length, [loans]);

  const handleRequestSuccess = useCallback(() => {
    setRequestModalOpen(false);
    refetch();
  }, [refetch]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const columns = useMemo<Column[]>(() => [
    {
      key: 'asset',
      label: 'Aset',
      sortable: true,
      render: (_, loan: unknown) => {
        const l = loan as LoanRecord;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Package size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{l.Asset?.nama || '-'}</p>
              <p className="text-xs text-slate-500">{l.Asset?.kode || 'No Code'}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'peminjam',
      label: 'Peminjam',
      sortable: true,
      render: (_, loan: unknown) => {
        const l = loan as LoanRecord;
        return (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User size={14} className="text-slate-400" />
            <span className="text-sm">{l.Peminjam?.full_name || '-'}</span>
          </div>
        );
      }
    },
    {
      key: 'tanggal_pinjam',
      label: 'Tanggal Pinjam',
      sortable: true,
      render: (val: unknown) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Calendar size={12} />
          {val ? new Date(val as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </div>
      )
    },
    {
      key: 'tanggal_kembali_plan',
      label: 'Rencana Kembali',
      sortable: true,
      render: (val: unknown) => (
        <span className="text-sm text-slate-500">
          {val ? new Date(val as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status: unknown) => {
        const s = status as string;
        const config = STATUS_CONFIG[s] || { label: s, color: 'bg-gray-100 text-gray-600', icon: null };
        return (
          <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
            {config.icon}
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_, loan: unknown) => (
        <div className="flex justify-end">
          <Suspense fallback={null}>
            <LoanStatusActions loan={loan as LoanRecord} />
          </Suspense>
        </div>
      )
    }
  ], []);

  const statusButtons = useMemo(() => [
    { value: '', label: 'Semua' },
    { value: 'PENDING', label: 'Menunggu' },
    { value: 'APPROVED', label: 'Disetujui' },
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'RETURNED', label: 'Dikembalikan' },
    { value: 'REJECTED', label: 'Ditolak' },
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sarpras', path: '/sarpras' },
    { label: 'Peminjaman Aset', path: '/sarpras/loans' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Peminjaman Aset',
    description: 'Kelola transaksi peminjaman barang praktikum secara terpadu dan digital.',
    items: [
      { text: 'Gunakan fitur Scan Barcode untuk memproses peminjaman cepat di lokasi.' },
      { text: 'Aksi persetujuan (Approve/Reject) dapat dilakukan di kolom aksi tabel.' },
      { text: 'Filter data peminjaman berdasarkan status untuk monitoring yang terfokus.' }
    ]
  }), []);

  const handleOpenScan = useCallback(() => setScanModalOpen(true), []);
  const handleOpenRequest = useCallback(() => setRequestModalOpen(true), []);
  const handleCloseScan = useCallback(() => setScanModalOpen(false), []);
  const handleCloseRequest = useCallback(() => setRequestModalOpen(false), []);

  const handlePageChange = useCallback((newPage: number) => setPage(newPage), []);
  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Peminjaman Aset & Inventaris"
      description="Kelola sistem peminjaman barang praktikum secara digital. Mendukung peminjaman manual maupun cepat menggunakan barcode/QR scan."
    >
      <AcademicPageLayout
        title="Peminjaman Aset"
        description="Kelola peminjaman sarana dan prasarana sekolah."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_loans"
      >
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Total Aset"
              value={stats.totalAssets}
              isLoading={isLoadingStats}
              icon={<Package size={20} />}
              gradient="from-indigo-600 to-blue-500"
              subtitle="Aset terdaftar"
            />
            <AnalyticsCard
              title="Sedang Dipinjam"
              value={stats.totalLoaned}
              isLoading={isLoadingStats}
              icon={<ArrowUpRight size={20} />}
              gradient="from-emerald-600 to-teal-500"
              subtitle="Aset aktif dipinjam"
            />
            <AnalyticsCard
              title="Permintaan Pending"
              value={pendingCount}
              isLoading={isLoading}
              icon={<Clock size={20} />}
              gradient="from-amber-500 to-orange-500"
              subtitle="Menunggu persetujuan"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            {statusButtons?.map(btn => (
              <button
                key={btn.value}
                type="button"
                onClick={() => { setStatusFilter(btn.value); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  statusFilter === btn.value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Table wrapped in SectionCard */}
          <SectionCard title="Daftar Laporan Peminjaman" icon={ClipboardList} fullWidth noPadding>
            <Table
              columns={columns}
              data={loans}
              loading={isLoading}
              emptyMessage="Belum ada data peminjaman. Klik 'Ajukan Pinjaman' untuk memulai."
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              toolbarRight={
                <div className="flex gap-2">
                  <Button
                    onClick={handleOpenScan}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm font-semibold"
                  >
                    <ScanLine className="h-4 w-4 mr-2" /> Peminjaman Scan Barcode
                  </Button>
                  <Button
                    onClick={handleOpenRequest}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200 hover:translate-y-[-2px]"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajukan Manual
                  </Button>
                </div>
              }
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
                onPageChange: handlePageChange,
                onLimitChange: handleLimitChange
              }}
            />
          </SectionCard>

          {/* Suspense wrapper for modal components */}
          <Suspense fallback={null}>
            {/* Request Modal */}
            <Modal
              isOpen={requestModalOpen}
              onClose={handleCloseRequest}
              title="Ajukan Peminjaman Baru"
              className="!max-w-2xl"
            >
              <LoanRequestForm
                onSuccess={handleRequestSuccess}
                onCancel={handleCloseRequest}
              />
            </Modal>

            <QuickScanLoanModal 
              isOpen={scanModalOpen} 
              onClose={handleCloseScan} 
            />
          </Suspense>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default SarprasLoansPage;
