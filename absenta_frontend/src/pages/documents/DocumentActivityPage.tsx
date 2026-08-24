import React, { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import {
  Badge,
  Button,
  Input,
  SearchableSelect,
  Table,
  SectionCard,
  Card,
  type Column
} from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '@/utils/layoutUtils';
import { type DocumentAction, type DocumentActivityItem, listDocumentActivities } from '@/api/documents.api';

// Zod Schema Validation Guard (Pilar 25)
const activityFilterSchema = z.object({
  tenantId: z.string().optional(),
  documentId: z.string().optional(),
  actorUserId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

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

function badgeVariantForAction(action: DocumentAction): 'success' | 'info' | 'destructive' | 'secondary' {
  if (action === 'UPLOAD') return 'success';
  if (action === 'DOWNLOAD') return 'info';
  if (action === 'DELETE') return 'destructive';
  return 'secondary';
}

export const DocumentActivityPage: React.FC = React.memo(() => {
  const { user, tenantId } = useAuthStore();
  const { isAdmin } = useCapabilities();
  const isSuperAdmin = isAdmin;
  const tenantIdValue = (user?.tenant_id || tenantId || null) as string | null;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [tenantIdFilter, setTenantIdFilter] = useState('');
  const [documentIdFilter, setDocumentIdFilter] = useState('');
  const [actorUserIdFilter, setActorUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // React Query Fetching (Pilar 31)
  const { data: activityData, isLoading: loading, refetch } = useQuery({
    queryKey: [
      'document-activities',
      currentPage,
      itemsPerPage,
      tenantIdFilter,
      documentIdFilter,
      actorUserIdFilter,
      actionFilter,
      dateFrom,
      dateTo,
      isSuperAdmin
    ],
    queryFn: async () => {
      const res = await listDocumentActivities({
        page: currentPage,
        limit: itemsPerPage,
        tenant_id: isSuperAdmin ? (tenantIdFilter.trim() || undefined) : undefined,
        document_id: documentIdFilter.trim() || undefined,
        actor_user_id: actorUserIdFilter.trim() || undefined,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      if (!res.success) {
        throw new Error(res.message || 'Gagal memuat aktivitas dokumen');
      }

      return res;
    },
    staleTime: 60 * 1000,
  });

  const items: DocumentActivityItem[] = useMemo(() => activityData?.data || [], [activityData]);
  const totalPages = activityData?.pagination?.totalPages || 1;
  const totalItems = activityData?.pagination?.total || 0;

  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc') => {
    setSortBy(columnKey);
    setSortOrder(direction);
  }, []);

  const columns: Column[] = useMemo(() => {
    const base: Column[] = [
      {
        key: 'created_at',
        label: 'Waktu',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-xs text-slate-500">
            {formatDate(value as string, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        ),
      },
      {
        key: 'action',
        label: 'Aksi',
        sortable: true,
        render: (value: unknown) => (
          <Badge variant={badgeVariantForAction(value as DocumentAction)} className="text-[10px] font-bold">
            {formatActionLabel(value as DocumentAction)}
          </Badge>
        ),
      },
      {
        key: 'Document',
        label: 'Dokumen',
        sortable: true,
        render: (_: unknown, row: DocumentActivityItem) => (
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{row.Document?.title || '-'}</div>
            <div className="mt-0.5">
              <Badge variant="secondary" className="text-[9px]">{row.Document?.category || '-'}</Badge>
            </div>
          </div>
        ),
      },
      {
        key: 'ActorUser',
        label: 'Pelaku',
        sortable: true,
        render: (_: unknown, row: DocumentActivityItem) => (
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{row.ActorUser?.full_name || '-'}</div>
            <div className="text-[10px] text-slate-400 truncate">{row.ActorUser?.email || '-'}</div>
          </div>
        ),
      },
    ];

    if (isSuperAdmin && !tenantIdValue) {
      base.splice(3, 0, {
        key: 'actor_tenant_id',
        label: 'Tenant',
        sortable: true,
        render: (value: unknown) => <span className="text-xs text-slate-600 dark:text-slate-300">{(value as string) || '-'}</span>,
      });
    }

    return base;
  }, [isSuperAdmin, tenantIdValue]);

  const handleApplyFilter = useCallback(() => {
    const parsed = activityFilterSchema.safeParse({
      tenantId: tenantIdFilter,
      documentId: documentIdFilter,
      actorUserId: actorUserIdFilter,
      action: actionFilter,
      dateFrom,
      dateTo,
    });
    if (parsed.success) {
      setCurrentPage(1);
      refetch();
    }
  }, [tenantIdFilter, documentIdFilter, actorUserIdFilter, actionFilter, dateFrom, dateTo, refetch]);

  const handleResetFilter = useCallback(() => {
    setTenantIdFilter('');
    setDocumentIdFilter('');
    setActorUserIdFilter('');
    setActionFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Dokumen', path: '/documents' },
    { label: 'Aktivitas Dokumen' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Audit Log Aktivitas Dokumen"
        description="Pantau riwayat unggah, unduh, dan penghapusan dokumen secara sistematis."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="document_activity"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Log Aktivitas Dokumen",
          description: "Gunakan halaman ini untuk memverifikasi jejak audit operasional dokumen.",
          items: [
            { text: "Filter berdasarkan aksi UPLOAD, DOWNLOAD, atau DELETE untuk audit spesifik." },
            { text: "Gunakan rentang tanggal untuk membatasi periode log aktivitas." },
            { text: "Semua aktivitas tercatat secara permanen untuk keamanan kepatuhan." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Filter Section */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isSuperAdmin && !tenantIdValue ? (
                  <Input
                    id="doc-tenant-filter"
                    aria-label="Filter ID Tenant"
                    placeholder="Tenant ID (opsional)"
                    value={tenantIdFilter}
                    onChange={(e) => setTenantIdFilter(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                ) : null}
                <Input
                  id="doc-id-filter"
                  aria-label="Filter ID Dokumen"
                  placeholder="Document ID (opsional)"
                  value={documentIdFilter}
                  onChange={(e) => setDocumentIdFilter(e.target.value)}
                  className="text-xs rounded-xl"
                />
                <Input
                  id="doc-actor-filter"
                  aria-label="Filter ID User Pelaku"
                  placeholder="Actor User ID (opsional)"
                  value={actorUserIdFilter}
                  onChange={(e) => setActorUserIdFilter(e.target.value)}
                  className="text-xs rounded-xl"
                />
                <SearchableSelect
                  id="doc-action-filter"
                  aria-label="Pilih jenis aksi dokumen"
                  value={actionFilter}
                  onValueChange={(v) => setActionFilter(v as ActionFilter)}
                  options={ACTION_OPTIONS}
                  placeholder="Pilih aksi"
                  className="w-full"
                />
                <Input
                  id="doc-date-from"
                  aria-label="Tanggal mulai aktivitas"
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs rounded-xl"
                />
                <Input
                  id="doc-date-to"
                  aria-label="Tanggal akhir aktivitas"
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="toolbarOutline" size="toolbar" onClick={handleResetFilter} disabled={loading} className="rounded-xl">
                  Reset
                </Button>
                <Button variant="toolbarPrimary" size="toolbar" onClick={handleApplyFilter} disabled={loading} className="rounded-xl">
                  Terapkan
                </Button>
              </div>
            </Card>

            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <Table
                columns={columns}
                data={items}
                isLoading={loading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                toolbarLeft={<div className="font-bold text-xs text-slate-800 dark:text-slate-200">Log Aktivitas</div>}
                toolbarRight={
                  <Button variant="toolbarOutline" size="toolbar" onClick={() => refetch()} disabled={loading} className="rounded-xl">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Segarkan
                  </Button>
                }
                emptyMessage="Tidak ada log aktivitas dokumen yang sesuai kriteria."
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems,
                  itemsPerPage,
                  onPageChange: setCurrentPage,
                  onLimitChange: (limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  },
                }}
              />
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default DocumentActivityPage;
