import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import {
  Badge,
  Button,
  Input,
  Loader,
  SectionHeader,
  SearchableSelect,
  Table,
  ToastContainer,
} from '@/components/ui';
import { formatDateTime } from '@/utils/layoutUtils';
import { type DocumentAction, type DocumentActivityItem, listDocumentActivities } from '@/api/documents.api';

type ActionFilter = DocumentAction | 'ALL';

const ACTION_OPTIONS: Array<{ value: ActionFilter; label: string }> = [
  { value: 'ALL', label: 'Semua Aksi' },
  { value: 'UPLOAD', label: 'Upload' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'DELETE', label: 'Delete' },
];

function formatActionLabel(action: DocumentAction) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function badgeVariantForAction(action: DocumentAction) {
  if (action === 'UPLOAD') return 'success';
  if (action === 'DOWNLOAD') return 'info';
  if (action === 'DELETE') return 'error';
  return 'outline';
}

export default function DocumentActivityPage() {
  const { toasts, error, removeToast } = useToast();
  const { user, tenantId } = useAuthStore();

  const roleName = ((user as any)?.role?.name || (user as any)?.role || '') as string;
  const isSuperAdmin = roleName === 'SUPERADMIN';
  const tenantIdValue = ((user as any)?.tenant_id ?? tenantId ?? null) as string | null;

  const [items, setItems] = useState<DocumentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [tenantIdFilter, setTenantIdFilter] = useState('');
  const [documentIdFilter, setDocumentIdFilter] = useState('');
  const [actorUserIdFilter, setActorUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const itemsPerPage = 20;

  const fetchActivities = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await listDocumentActivities({
          page,
          limit: itemsPerPage,
          tenant_id: isSuperAdmin ? (tenantIdFilter.trim() || undefined) : undefined,
          document_id: documentIdFilter.trim() || undefined,
          actor_user_id: actorUserIdFilter.trim() || undefined,
          action: actionFilter === 'ALL' ? undefined : actionFilter,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });

        if (!res.success) {
          error(res.message || 'Gagal memuat aktivitas dokumen');
          return;
        }

        setItems(res.data || []);
        setCurrentPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      } catch (e: any) {
        error(e?.message || 'Gagal memuat aktivitas dokumen');
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, actorUserIdFilter, dateFrom, dateTo, documentIdFilter, error, isSuperAdmin, tenantIdFilter]
  );

  useEffect(() => {
    fetchActivities(1);
    setCurrentPage(1);
  }, [fetchActivities]);

  const paginationInfo = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    if (totalItems === 0) return 'Menampilkan 0 data';
    return `Menampilkan ${start}-${end} dari ${totalItems} data`;
  }, [currentPage, totalItems]);

  const columns = useMemo(() => {
    const base = [
      {
        key: 'created_at',
        label: 'Waktu',
        className: 'w-52',
        render: (value: string) => formatDateTime(value),
      },
      {
        key: 'action',
        label: 'Aksi',
        className: 'w-32',
        render: (value: DocumentAction) => <Badge variant={badgeVariantForAction(value) as any}>{formatActionLabel(value)}</Badge>,
      },
      {
        key: 'Document',
        label: 'Dokumen',
        render: (_: any, row: DocumentActivityItem) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.Document?.title || '-'}</div>
            <div className="mt-1">
              <Badge variant="outline">{row.Document?.category || '-'}</Badge>
            </div>
          </div>
        ),
      },
      {
        key: 'ActorUser',
        label: 'Pelaku',
        render: (_: any, row: DocumentActivityItem) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.ActorUser?.full_name || '-'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.ActorUser?.email || '-'}</div>
          </div>
        ),
      },
    ];

    if (isSuperAdmin && !tenantIdValue) {
      base.splice(3, 0, {
        key: 'actor_tenant_id',
        label: 'Tenant',
        className: 'w-64',
        render: (value: string | null) => <span className="text-sm">{value || '-'}</span>,
      });
    }

    return base as any[];
  }, [isSuperAdmin, tenantIdValue]);

  const handleApplyFilter = useCallback(() => {
    setCurrentPage(1);
    fetchActivities(1);
  }, [fetchActivities]);

  const handleResetFilter = useCallback(() => {
    setTenantIdFilter('');
    setDocumentIdFilter('');
    setActorUserIdFilter('');
    setActionFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    fetchActivities(1);
  }, [fetchActivities]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchActivities(page);
    },
    [fetchActivities]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Aktivitas Dokumen"
        subtitle="Audit log: upload, download, dan delete"
        icon={<Activity className="w-6 h-6" />}
      >
        <Button variant="outline" onClick={() => fetchActivities(currentPage)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </SectionHeader>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isSuperAdmin && !tenantIdValue ? (
            <Input
              placeholder="Tenant ID (opsional)"
              value={tenantIdFilter}
              onChange={(e) => setTenantIdFilter(e.target.value)}
            />
          ) : null}
          <Input
            placeholder="Document ID (opsional)"
            value={documentIdFilter}
            onChange={(e) => setDocumentIdFilter(e.target.value)}
          />
          <Input
            placeholder="Actor User ID (opsional)"
            value={actorUserIdFilter}
            onChange={(e) => setActorUserIdFilter(e.target.value)}
          />
          <SearchableSelect
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as ActionFilter)}
            options={ACTION_OPTIONS}
            placeholder="Pilih aksi"
            className="w-full"
          />
          <Input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={handleResetFilter} disabled={loading}>
            Reset
          </Button>
          <Button onClick={handleApplyFilter} disabled={loading}>
            Terapkan
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader size="lg" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <Table columns={columns as any} data={items} emptyMessage="Tidak ada aktivitas" />

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">{paginationInfo}</div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
