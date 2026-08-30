import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UnifiedBillingLayout from '@/components/billing/UnifiedBillingLayout';
import { Button, Loader, EnhancedAlert, Table, Input, StatusBadge, SectionHeader, SectionCard, Card } from '@/components/ui';
import { ModalFooter } from '@/components/ui/Modal';
import { getApprovals, approveApprovalRequest, rejectApprovalRequest } from '@/api/approvals.api';
import type { ApprovalRequest, ApprovalStatus } from '@/types/approvals';
import { CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';
import useConfirm from '@/hooks/useConfirm';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/utils/layoutUtils';

// Lazy loaded heavy components (Pilar 11)
const Modal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.Modal })));
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

// Zod Schema Validation Guard (Pilar 25)
const rejectApprovalSchema = z.object({
  reason: z.string().min(1, 'Alasan penolakan wajib diisi'),
});

const ApprovalsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id?: string; reason: string }>({ open: false, id: undefined, reason: '' });

  // Sorting and pagination states
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // React Query Data Fetching (Pilar 31)
  const { data: approvalsData = [], isLoading: loading, isFetching: refreshing, refetch } = useQuery<ApprovalRequest[]>({
    queryKey: ['billing-approvals-list', statusFilter],
    queryFn: async () => {
      const res = await getApprovals({ status: statusFilter === 'ALL' ? undefined : statusFilter, limit: 100 });
      return res?.data?.approvals ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Mutations with Cache Invalidation (Pilar 32)
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveApprovalRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-approvals-list'] });
      toast.success('Permintaan berhasil disetujui (Approved)');
    },
    onError: (err: unknown) => {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Gagal menyetujui request');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectApprovalRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-approvals-list'] });
      toast.success('Permintaan berhasil ditolak (Rejected)');
      setRejectModal({ open: false, id: undefined, reason: '' });
    },
    onError: (err: unknown) => {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Gagal menolak request');
    }
  });

  const filteredApprovals = useMemo(() => {
    if (!searchTerm) return approvalsData;
    const term = searchTerm.toLowerCase();
    return (approvalsData ?? []).filter((a) =>
      a.action_type?.toLowerCase().includes(term) ||
      a.target_id?.toLowerCase().includes(term) ||
      (a.requested_by_name || '').toLowerCase().includes(term) ||
      (a.reason || '').toLowerCase().includes(term)
    );
  }, [approvalsData, searchTerm]);

  const handleApprove = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Approve Request?',
      description: 'Apakah Anda yakin ingin menyetujui permintaan ini? Tindakan ini akan langsung diterapkan pada sistem.',
      confirmText: 'Ya, Approve',
      cancelText: 'Batal',
      style: 'primary'
    });
    if (!ok) return;

    await approveMutation.mutateAsync(id);
  }, [confirm, approveMutation]);

  const handleOpenReject = useCallback((id: string) => {
    setRejectModal({ open: true, id, reason: '' });
  }, []);

  const handleConfirmReject = useCallback(async () => {
    if (!rejectModal.id) return;
    const parsed = rejectApprovalSchema.safeParse({ reason: rejectModal.reason });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Alasan penolakan wajib diisi');
      return;
    }
    await rejectMutation.mutateAsync({ id: rejectModal.id, reason: rejectModal.reason });
  }, [rejectModal, rejectMutation]);

  const handleSort = useCallback((key: string) => {
    setSortBy(key);
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const columns = useMemo(() => [
    {
      key: 'action_type',
      label: 'Aksi',
      render: (value: unknown) => (
        <span className="font-medium">{String(value).replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'target_type',
      label: 'Target',
      render: (_: unknown, row: ApprovalRequest) => (
        <div className="text-sm">
          <div className="font-medium">{row.target_type} #{row.target_id}</div>
          <div className="text-gray-500 text-xs">Tenant: {row.tenant_id}</div>
        </div>
      ),
    },
    {
      key: 'requested_by_name',
      label: 'Pemohon',
      render: (_: unknown, row: ApprovalRequest) => (
        <div className="text-sm">
          <div className="font-medium">{row.requested_by_name || row.requested_by}</div>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Tanggal Request',
      render: (value: unknown) => (
        <span className="text-xs text-slate-500">{formatDate(String(value || ''))}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Alasan',
      className: 'text-sm',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700 dark:text-slate-300">{String(value || '-')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => (
        value === 'PENDING' ? (
          <StatusBadge status="pending" />
        ) : value === 'APPROVED' ? (
          <StatusBadge status="completed" />
        ) : (
          <StatusBadge status="cancelled" />
        )
      ),
    },
    {
      key: 'id',
      label: 'Aksi',
      render: (_: unknown, row: ApprovalRequest) => (
        row.status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Setujui request ${row.id}`}
              onClick={() => handleApprove(row.id)}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Setujui
            </button>
            <button
              type="button"
              aria-label={`Tolak request ${row.id}`}
              onClick={() => handleOpenReject(row.id)}
              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-800 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Tolak
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-xs font-mono">-</span>
        )
      )
    }
  ], [handleApprove, handleOpenReject]);

  const isMobile = useIsMobile();

  const renderMobileApprovalCard = useCallback((row: ApprovalRequest) => {
    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold text-slate-500 block truncate">{row.action_type}</span>
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-0.5">{row.requested_by_name || 'Pemohon'}</h4>
          </div>
          <div className="shrink-0">
            <StatusBadge status={row.status.toLowerCase()} />
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Target ID</span>
            <span className="font-mono text-slate-700 dark:text-slate-200 text-[11px] truncate block">{row.target_id || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Tanggal Pengajuan</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDate(row.created_at)}
            </span>
          </div>
          {row.reason && (
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 block font-medium">Alasan</span>
              <p className="text-slate-600 dark:text-slate-400 text-xs italic">{row.reason}</p>
            </div>
          )}
        </div>

        {row.status === 'PENDING' && (
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApprove(row.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 font-bold"
            >
              <CheckCircle size={13} className="mr-1" /> Setujui
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenReject(row.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="text-xs text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-50 font-bold"
            >
              <XCircle size={13} className="mr-1" /> Tolak
            </Button>
          </div>
        )}
      </div>
    );
  }, [handleApprove, handleOpenReject, approveMutation.isPending, rejectMutation.isPending]);

  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Persetujuan Aksi' }
  ], []);

  return (
    <AcademicPageLayout
      title="Persetujuan Aksi (Approvals)"
      description="Tinjau dan proses permintaan persetujuan perubahan data serta transaksi dari tenant client."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="billing_approvals"
      topSlot={
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => refetch()} 
            disabled={refreshing} 
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Memuat...' : 'Muat Ulang'}
          </Button>
        </div>
      }
      instruction={{
        title: 'Panduan Persetujuan Aksi',
        description: 'Pusat kendali persetujuan untuk transaksi kritis dan perubahan akun tenant.',
        items: [
          { text: 'Tinjau rincian permintaan (approval request) sebelum mengambil tindakan.' },
          { text: 'Gunakan tombol Setujui untuk mengesahkan atau Tolak dengan menyertakan alasan.' },
          { text: 'Gunakan filter status di atas tabel untuk menyaring riwayat persetujuan.' }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="payments" title="Persetujuan Aksi" subtitle="Tinjau dan proses permintaan persetujuan" showOverview={false}>
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <SectionHeader title="Daftar Permintaan Persetujuan" subtitle="Daftar tiket approval yang membutuhkan respon" />
            </div>

            {/* Filter Bar placed ABOVE Table */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="search-approval-input"
                  aria-label="Cari tiket approval"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari aksi, target, atau pemohon..."
                  className="pl-10 text-xs"
                />
              </div>
              <div className="relative w-full sm:w-52">
                <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />}>
                  <SearchableSelect
                    id="filter-approval-status"
                    aria-label="Filter status persetujuan"
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as ApprovalStatus | 'ALL')}
                    options={[
                      { value: "ALL", label: "Semua Status" },
                      { value: "PENDING", label: "Menunggu (Pending)" },
                      { value: "APPROVED", label: "Disetujui (Approved)" },
                      { value: "REJECTED", label: "Ditolak (Rejected)" }
                    ]}
                    placeholder="Semua Status"
                  />
                </Suspense>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader size="lg" />
              </div>
            ) : isMobile ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                <MobileAcademicList
                  title="Daftar Persetujuan"
                  data={filteredApprovals}
                  emptyMessage="Tidak ada request untuk ditampilkan"
                  pagination={{
                    currentPage,
                    totalPages,
                    totalItems: filteredApprovals.length,
                    itemsPerPage,
                    onPageChange: setCurrentPage,
                    onLimitChange: setItemsPerPage
                  }}
                  renderCard={renderMobileApprovalCard}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
                <Table
                  columns={columns}
                  data={filteredApprovals}
                  emptyMessage="Tidak ada request untuk ditampilkan"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  pagination={{
                    currentPage,
                    totalPages,
                    totalItems: filteredApprovals.length,
                    itemsPerPage,
                    onPageChange: setCurrentPage,
                    onLimitChange: setItemsPerPage
                  }}
                />
              </div>
            )}

            {/* Reject Modal */}
            <Suspense fallback={null}>
              {rejectModal.open && (
                <Modal
                  isOpen={rejectModal.open}
                  onClose={() => setRejectModal({ open: false, id: undefined, reason: '' })}
                  title="Tolak Permintaan Persetujuan"
                  className="max-w-md"
                >
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Masukkan alasan penolakan permintaan ini secara jelas agar pemohon dapat mengetahuinya:
                    </p>
                    <Input
                      id="reject-reason-input"
                      aria-label="Alasan penolakan tiket"
                      type="text"
                      value={rejectModal.reason}
                      onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Contoh: Dokumen lampiran belum lengkap"
                      className="text-xs"
                    />
                    <ModalFooter className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => setRejectModal({ open: false, id: undefined, reason: '' })}>
                        Batal
                      </Button>
                      <Button variant="danger" size="sm" onClick={handleConfirmReject} disabled={rejectMutation.isPending}>
                        {rejectMutation.isPending ? 'Memproses...' : 'Konfirmasi Tolak'}
                      </Button>
                    </ModalFooter>
                  </div>
                </Modal>
              )}
            </Suspense>
          </div>
        </SectionCard>
      </UnifiedBillingLayout>
    </AcademicPageLayout>
  );
});

export default ApprovalsPage;
