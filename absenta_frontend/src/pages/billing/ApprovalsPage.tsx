import React, { useEffect, useMemo, useState } from 'react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import { Button, Loader, EnhancedAlert, Table, Input, Modal, StatusBadge, SectionHeader, SearchableSelect } from '../../components/ui';
import { ModalFooter } from '../../components/ui/Modal';
import { getApprovals, approveApprovalRequest, rejectApprovalRequest } from '../../api/approvals.api';
import type { ApprovalRequest, ApprovalStatus } from '../../types/approvals';
import { CheckCircle, XCircle, Filter, RefreshCw, Search } from 'lucide-react';
import { LogService } from '../../utils/LogService';
import useConfirm from '../../hooks/useConfirm';

const ApprovalsPage: React.FC = () => {
  const confirm = useConfirm();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id?: string; reason: string }>({ open: false, id: undefined, reason: '' });

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getApprovals({ status: statusFilter === 'ALL' ? undefined : statusFilter, limit: 50 });
      setApprovals(res.data.approvals);
    } catch (err: any) {
      LogService.error('Failed to load approvals', err, 'ApprovalsPage');
      setError(err?.message || 'Gagal memuat data approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [statusFilter]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
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
      setApprovals((prev) => prev.map((a) => (a.id === id ? res.data : a)));
    } catch (err: any) {
      setError(err?.message || 'Gagal menyetujui request');
    }
  };

  const handleOpenReject = (id: string) => {
    setRejectModal({ open: true, id, reason: '' });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.id) return;
    try {
      const res = await rejectApprovalRequest(rejectModal.id, rejectModal.reason);
      setApprovals((prev) => prev.map((a) => (a.id === rejectModal.id ? res.data : a)));
      setRejectModal({ open: false, id: undefined, reason: '' });
    } catch (err: any) {
      setError(err?.message || 'Gagal menolak request');
    }
  };

  return (
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <Table
              columns={[
                {
                  key: 'action_type',
                  label: 'Aksi',
                  render: (value: any) => (
                    <span className="font-medium">{String(value).replace(/_/g, ' ')}</span>
                  ),
                },
                {
                  key: 'target_type',
                  label: 'Target',
                  render: (_: any, row: ApprovalRequest) => (
                    <div className="text-sm">
                      <div className="font-medium">{row.target_type} #{row.target_id}</div>
                      <div className="text-gray-500 text-xs">Tenant: {row.tenant_id}</div>
                    </div>
                  ),
                },
                {
                  key: 'requested_by_name',
                  label: 'Pemohon',
                  render: (_: any, row: ApprovalRequest) => (
                    <div className="text-sm">
                      <div className="font-medium">{row.requested_by_name || row.requested_by}</div>
                    </div>
                  ),
                },
                {
                  key: 'reason',
                  label: 'Alasan',
                  className: 'text-sm',
                  render: (value: any) => (
                    <span className="text-sm text-gray-700">{value || '-'}</span>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (value: any) => (
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
                  render: (_: any, row: ApprovalRequest) => (
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
              ]}
              data={filteredApprovals}
              emptyMessage="Tidak ada request untuk ditampilkan"
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
  );
};

export default ApprovalsPage;
