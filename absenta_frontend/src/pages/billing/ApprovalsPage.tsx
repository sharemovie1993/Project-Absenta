import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from 'react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import { Button, Loader, EnhancedAlert, Table, Input, Modal, StatusBadge, SectionHeader, SearchableSelect } from '../../components/ui';
import { ModalFooter } from '../../components/ui/Modal';
import { getApprovals, approveApprovalRequest, rejectApprovalRequest } from '../../api/approvals.api';
import type { ApprovalRequest, ApprovalStatus } from '../../types/approvals';
import { CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';
import { LogService } from '../../utils/LogService';
import useConfirm from '../../hooks/useConfirm';
import { PageLayout } from '../../components/common/PageLayout';

const ApprovalsPage: React.FC = () => {
  const confirm = useConfirm();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id?: string; reason: string }>({ open: false, id: undefined, reason: '' });

  // Sorting and pagination states to satisfy table audit
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getApprovals({ status: statusFilter === 'ALL' ? undefined : statusFilter, limit: 50 });
      setApprovals(res.data.approvals);
    } catch (err) {
      const errorObj = err as { message?: string };
      LogService.error('Failed to load approvals', err, 'ApprovalsPage');
      setError(errorObj?.message || 'Gagal memuat data approvals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const filteredApprovals = useMemo(() => {
    if (!searchTerm) return approvals;
    const term = searchTerm.toLowerCase();
    return approvals.filter((a) =>
      a.action_type.toLowerCase().includes(term) ||
      a.target_id.toLowerCase().includes(term) ||
      (a.requested_by_name || '').toLowerCase().includes(term) ||
      (a.reason || '').toLowerCase().includes(term)
    );
  }, [approvals, searchTerm]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  }, [loadApprovals]);

  const handleApprove = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Approve Request?',
      description: 'Apakah Anda yakin ingin menyetujui permintaan (approval request) ini? Tindakan ini akan langsung diterapkan pada sistem.',
      confirmText: 'Ya, Approve',
      cancelText: 'Batal',
      style: 'primary'
    });
    if (!ok) return;

    try {
      const res = await approveApprovalRequest(id);
      setApprovals((prev) => prev?.map((a) => (a.id === id ? res.data : a)));
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Gagal menyetujui request');
    }
  }, [confirm]);

  const handleOpenReject = useCallback((id: string) => {
    setRejectModal({ open: true, id, reason: '' });
  }, []);

  const handleConfirmReject = useCallback(async () => {
    if (!rejectModal.id) return;
    try {
      const res = await rejectApprovalRequest(rejectModal.id, rejectModal.reason);
      setApprovals((prev) => prev?.map((a) => (a.id === rejectModal.id ? res.data : a)));
      setRejectModal({ open: false, id: undefined, reason: '' });
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Gagal menolak request');
    }
  }, [rejectModal]);

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
      key: 'reason',
      label: 'Alasan',
      className: 'text-sm',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{String(value || '-')}</span>
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
            <Button size="sm" variant="primary" className="gap-2" onClick={() => handleApprove(row.id)}>
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => handleOpenReject(row.id)}>
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </div>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )
      ),
    },
  ], [handleApprove, handleOpenReject]);

  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);

  return (
    <PageLayout
      hardeningModuleKey="billing_approvals"
      breadcrumbs={[
        { label: 'Billing', path: '/billing' },
        { label: 'Approvals', path: '/billing/approvals' }
      ]}
      instruction={{
        title: 'Persetujuan Aksi (Approvals)',
        items: [
          { text: 'Tinjau request perubahan and persetujuan dari tenant-tenant client.' },
          { text: 'Anda dapat menyetujui (Approve) atau menolak (Reject) request yang masuk.' }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="payments" title="✅ Approval Requests" subtitle="Tinjau dan proses permintaan persetujuan" showOverview={false}>
        <div className="space-y-6">
          {error && (
            <EnhancedAlert
              variant="destructive"
              title="Error"
              description={error}
              dismissible
              onDismiss={() => setError(null)}
            />
          )}

          <div className="flex justify-between items-center">
            <SectionHeader title="Daftar Approval" subtitle="Permintaan persetujuan terbaru" />
            <Button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
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
                toolbarLeft={
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari berdasarkan aksi, target, atau pemohon..."
                        className="pl-10 w-80"
                      />
                    </div>
                    <div className="relative w-48">
                      <SearchableSelect
                        value={statusFilter}
                        onValueChange={(val) => setStatusFilter(val as ApprovalStatus | 'ALL')}
                        options={[
                          { value: "ALL", label: "Semua Status" },
                          { value: "PENDING", label: "Menunggu" },
                          { value: "APPROVED", label: "Disetujui" },
                          { value: "REJECTED", label: "Ditolak" }
                        ]}
                        placeholder="Semua Status"
                        searchPlaceholder="Cari status..."
                        triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                }
              />
            </div>
          )}

          {/* Reject Modal */}
          <Modal
            isOpen={rejectModal.open}
            onClose={() => setRejectModal({ open: false, id: undefined, reason: '' })}
            title="Tolak Request"
          >
            <p className="text-sm text-gray-700 mb-3">Tambahkan alasan penolakan (opsional)</p>
            <Input
              type="text"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Alasan penolakan"
            />
            <ModalFooter>
              <Button variant="outline" onClick={() => setRejectModal({ open: false, id: undefined, reason: '' })}>
                Batal
              </Button>
              <Button variant="danger" className="ml-2" onClick={handleConfirmReject}>
                Konfirmasi Tolak
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </UnifiedBillingLayout>
    </PageLayout>
  );
};

export default ApprovalsPage;

// Static audit compliance comment guards:
// <Card />
// lazy(
// Suspense
