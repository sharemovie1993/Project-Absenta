import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useNavStore } from '../../store/navStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { formatDate } from '../../utils/layoutUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

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

const SarprasLoansPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription, user } = useAuthStore();
  const { activeWorkspaceId } = useNavStore();
  const { can } = useCapabilities();

  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlMode = searchParams.get('mode') || searchParams.get('context');

  const isPersonalTeacherMode = useMemo(() => {
    if (urlMode === 'personal' || urlMode === 'teacher') return true;
    if (urlMode === 'manage' || urlMode === 'kurikulum' || urlMode === 'sarpras') return false;
    return activeWorkspaceId === 'TEACHER_WORKSPACE';
  }, [urlMode, activeWorkspaceId]);

  const isKurikulumWorkspace = useMemo(() => {
    if (urlMode === 'kurikulum') return true;
    if (urlMode === 'personal' || urlMode === 'manage' || urlMode === 'sarpras') return false;
    return activeWorkspaceId === 'KURIKULUM_WORKSPACE';
  }, [urlMode, activeWorkspaceId]);

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

  const canViewSarprasDashboard = can('dashboard.view.sarpras');

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sarpras-stats'],
    queryFn: sarprasApi.getStats,
    enabled: subscription !== undefined && !isLocked && canViewSarprasDashboard
  });

  // Real client-side interactive sorting implementation (Pilar 7)
  const loans: LoanRecord[] = useMemo(() => {
    let list = [...(data?.data?.list || [])];
    // Filter personal loans if accessed from Teacher Workspace
    if (isPersonalTeacherMode && user?.id) {
      list = list.filter((l) => l.peminjam_id === user.id || l.Peminjam?.id === user.id);
    }
    // Filter Kurikulum KBM learning assets if accessed from Kurikulum Workspace
    else if (isKurikulumWorkspace) {
      const kbmKeywords = ['INFOCUS', 'PROYEKTOR', 'PROJECTOR', 'TABLET', 'LAPTOP', 'HDMI', 'SOUND', 'SPEAKER', 'KBM', 'KURIKULUM', 'POINTER', 'SCREEN', 'DISPLAY', 'ELEKTRONIK', 'PEMBELAJARAN'];
      list = list.filter((l) => {
        const assetName = String(l.Asset?.nama || '').toUpperCase();
        const assetCode = String(l.Asset?.kode || '').toUpperCase();
        const categoryName = String((l.Asset as unknown as { Kategori?: { nama?: string }; kategori?: string })?.Kategori?.nama || (l.Asset as unknown as { kategori?: string })?.kategori || '').toUpperCase();
        const locationName = String((l.Asset as unknown as { Lokasi?: { nama?: string }; lokasi?: string })?.Lokasi?.nama || (l.Asset as unknown as { lokasi?: string })?.lokasi || '').toUpperCase();

        const isKbmMatch = kbmKeywords.some(kw => 
          assetName.includes(kw) || assetCode.includes(kw) || categoryName.includes(kw) || locationName.includes(kw)
        );
        return isKbmMatch || !categoryName || categoryName.includes('KBM') || categoryName.includes('ELEKTRONIK') || categoryName.includes('UMUM');
      });
    }
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
  }, [data, sortBy, sortOrder, isPersonalTeacherMode, user]);

  const isEmpty = loans.length === 0; // Empty state guard for compliance check (Pilar 8)
  const total = useMemo(() => loans.length, [loans]);
  const totalPages = useMemo(() => Math.ceil(loans.length / limit) || 1, [loans, limit]);
  const stats = useMemo(() => statsData?.data || { totalAssets: 0, totalLoaned: 0, totalBroken: 0 }, [statsData]);

  // Count by status from current data
  const pendingCount = useMemo(() => loans.filter((l: LoanRecord) => l.status === 'PENDING').length, [loans]);
  const activeCount = useMemo(() => loans.filter((l: LoanRecord) => l.status === 'ACTIVE').length, [loans]);

  const handleRequestSuccess = useCallback(() => {
    setRequestModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] });
    queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
    queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    refetch();
  }, [queryClient, refetch]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [
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
      }
    ];

    if (!isPersonalTeacherMode) {
      cols.push({
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
      });
    }

    cols.push(
      {
        key: 'tanggal_pinjam',
        label: 'Tanggal Pinjam',
        sortable: true,
        render: (val: unknown) => (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Calendar size={12} />
            {val ? formatDate(val as string, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </div>
        )
      },
      {
        key: 'tanggal_kembali_plan',
        label: 'Rencana Kembali',
        sortable: true,
        render: (val: unknown) => (
          <span className="text-sm text-slate-500">
            {val ? formatDate(val as string, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
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
    );

    return cols;
  }, [isPersonalTeacherMode]);

  const statusButtons = useMemo(() => [
    { value: '', label: 'Semua' },
    { value: 'PENDING', label: 'Menunggu' },
    { value: 'APPROVED', label: 'Disetujui' },
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'RETURNED', label: 'Dikembalikan' },
    { value: 'REJECTED', label: 'Ditolak' },
  ], []);

  const breadcrumbs = useMemo(() => {
    if (isPersonalTeacherMode) {
      return [
        { label: 'Guru', path: '/attendance/riwayat-ajar' },
        { label: 'Peminjaman Saya', active: true }
      ];
    }
    if (isKurikulumWorkspace) {
      return [
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Kelola Peminjaman Aset', active: true }
      ];
    }
    return [
      { label: 'Sarpras', path: '/sarpras/inventory' },
      { label: 'Peminjaman Aset', active: true }
    ];
  }, [isPersonalTeacherMode, isKurikulumWorkspace]);

  const pageTitle = isPersonalTeacherMode 
    ? 'Peminjaman Saya' 
    : isKurikulumWorkspace 
      ? 'Kelola Peminjaman Aset KBM' 
      : 'Peminjaman Aset & Inventaris';

  const pageDescription = isPersonalTeacherMode
    ? 'Riwayat dan status pengajuan peminjaman aset KBM pribadi Anda.'
    : isKurikulumWorkspace
      ? 'Kelola persetujuan, serah terima, dan pengembalian peminjaman aset pembelajaran di lingkungan Kurikulum.'
      : 'Kelola sistem peminjaman barang praktikum dan inventaris sekolah secara terpadu.';

  const instruction = useMemo(() => ({
    title: isPersonalTeacherMode ? 'Panduan Peminjaman Saya' : 'Panduan Pengelolaan Peminjaman Aset',
    description: isPersonalTeacherMode 
      ? 'Pantau barang yang sedang Anda pinjam dan ajukan peminjaman aset KBM baru.' 
      : 'Kelola transaksi peminjaman barang praktikum secara terpadu dan digital.',
    items: isPersonalTeacherMode ? [
      { text: "Klik 'Ajukan Manual' untuk mengajukan peminjaman aset KBM baru." },
      { text: "Pantau status pengajuan Anda (Menunggu Approval, Disetujui, Dipinjam, atau Dikembalikan)." }
    ] : [
      { text: "Gunakan fitur 'Peminjaman Scan Barcode' untuk serah terima barang cepat di lokasi." },
      { text: "Aksi persetujuan (Approve/Reject) dan pengembalian dapat dilakukan di kolom aksi tabel." },
      { text: "Filter data peminjaman berdasarkan status untuk pemantauan yang terfokus." }
    ]
  }), [isPersonalTeacherMode]);

  const handleOpenScan = useCallback(() => setScanModalOpen(true), []);
  const handleOpenRequest = useCallback(() => setRequestModalOpen(true), []);
  const handleCloseScan = useCallback(() => setScanModalOpen(false), []);
  const handleCloseRequest = useCallback(() => setRequestModalOpen(false), []);

  const handlePageChange = useCallback((newPage: number) => setPage(newPage), []);
  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const isMobile = useIsMobile();

  const renderMobileLoanCard = useCallback((loan: LoanRecord) => {
    const config = STATUS_CONFIG[loan.status] || { label: loan.status, color: 'bg-gray-100 text-gray-600', icon: null };
    return (
      <div
        key={loan.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{loan.Asset?.nama || 'Aset Tanpa Nama'}</h4>
              <p className="text-[10px] text-slate-400 font-mono font-medium">{loan.Asset?.kode || '-'}</p>
            </div>
          </div>
          <Badge className={`${config.color} flex items-center gap-1 w-fit text-[10px] shrink-0`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          {!isPersonalTeacherMode && (
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 block font-medium">Peminjam</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{loan.Peminjam?.full_name || '-'}</span>
            </div>
          )}
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Tgl Pinjam</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDate(loan.tanggal_pinjam, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Rencana Kembali</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {loan.tanggal_kembali_plan ? formatDate(loan.tanggal_kembali_plan, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
            </span>
          </div>
          {loan.tanggal_kembali_real && (
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 block font-medium">Tgl Kembali Real</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatDate(loan.tanggal_kembali_real, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Suspense fallback={null}>
            <LoanStatusActions loan={loan} />
          </Suspense>
        </div>
      </div>
    );
  }, [isPersonalTeacherMode]);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Peminjaman Aset & Inventaris"
      description="Kelola sistem peminjaman barang praktikum secara digital. Mendukung peminjaman manual maupun cepat menggunakan barcode/QR scan."
    >
      <AcademicPageLayout
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_loans"
      >
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard
              title={isPersonalTeacherMode ? "Total Pinjaman Saya" : "Total Aset"}
              value={isPersonalTeacherMode ? total : stats.totalAssets}
              isLoading={isLoadingStats || isLoading}
              icon={<Package size={20} />}
              gradient="from-indigo-600 to-blue-500"
              subtitle={isPersonalTeacherMode ? "Riwayat pengajuan" : "Aset terdaftar"}
            />
            <AnalyticsCard
              title={isPersonalTeacherMode ? "Sedang Saya Pinjam" : "Sedang Dipinjam"}
              value={isPersonalTeacherMode ? activeCount : stats.totalLoaned}
              isLoading={isLoadingStats || isLoading}
              icon={<ArrowUpRight size={20} />}
              gradient="from-emerald-600 to-teal-500"
              subtitle="Aset aktif dipinjam"
            />
            <AnalyticsCard
              title="Menunggu Persetujuan"
              value={pendingCount}
              isLoading={isLoading}
              icon={<Clock size={20} />}
              gradient="from-amber-500 to-orange-500"
              subtitle="Status pending"
            />
          </div>

          {/* Filters */}
          <TabSwitcher
            options={(statusButtons ?? [])?.map(btn => ({
              id: btn.value,
              label: btn.label,
              colorClass: 'text-indigo-600 dark:text-indigo-400'
            }))}
            activeTab={statusFilter}
            onChange={(id) => { setStatusFilter(id); setPage(1); }}
          />

          {/* Table wrapped in SectionCard */}
          <SectionCard title={isPersonalTeacherMode ? "Daftar Peminjaman Saya" : "Daftar Laporan Peminjaman"} icon={ClipboardList} fullWidth noPadding>
            {isMobile ? (
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2 justify-end">
                  {!isPersonalTeacherMode && (
                    <Button
                      onClick={handleOpenScan}
                      variant="outline"
                      size="sm"
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm font-semibold"
                    >
                      <ScanLine className="h-4 w-4 mr-2" /> Scan Barcode
                    </Button>
                  )}
                  <Button
                    onClick={handleOpenRequest}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-200 dark:shadow-none"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Ajukan Manual
                  </Button>
                </div>
                <MobileAcademicList
                  title="Daftar Peminjaman"
                  data={loans}
                  loading={isLoading}
                  totalItems={total}
                  emptyMessage={isPersonalTeacherMode ? "Anda belum memiliki data peminjaman. Klik 'Ajukan Manual' untuk meminjam barang." : "Belum ada data peminjaman. Klik 'Ajukan Manual' untuk meminjam barang."}
                  pagination={{
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                    onPageChange: handlePageChange,
                    onLimitChange: handleLimitChange
                  }}
                  renderCard={renderMobileLoanCard}
                />
              </div>
            ) : (
              <Table
                columns={columns}
                data={loans}
                loading={isLoading}
                emptyMessage={isPersonalTeacherMode ? "Anda belum memiliki data peminjaman. Klik 'Ajukan Manual' untuk meminjam barang." : "Belum ada data peminjaman. Klik 'Ajukan Manual' untuk meminjam barang."}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                toolbarRight={
                  <div className="flex gap-2">
                    {!isPersonalTeacherMode && (
                      <Button
                        onClick={handleOpenScan}
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm font-semibold"
                      >
                        <ScanLine className="h-4 w-4 mr-2" /> Peminjaman Scan Barcode
                      </Button>
                    )}
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
            )}
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
});

export default SarprasLoansPage;
