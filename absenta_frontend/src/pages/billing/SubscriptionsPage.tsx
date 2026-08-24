import React, { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Button, 
  Loader, 
  EnhancedAlert, 
  SearchableSelect, 
  Input, 
  Table, 
  SectionCard, 
  Card 
} from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { getAllPlans, getPublicPlans, formatCurrency as formatCurrencyPlan } from '@/api/plans.api';
import {
  getAllSubscriptions,
  getSubscriptionsByTenant,
  updateSubscription,
  getSubscriptionHistory,
  deleteSubscription,
} from '@/api/subscription.api';
import type { FilteredSubscriptionItem } from '@/api/subscription.api';
import type { Plan } from '@/types/billing';
import type { SubscriptionHistoryItem } from '@/types/subscription';
import { Badge } from '@/components/ui/Badge';
import { 
  Eye, 
  Pause, 
  RefreshCcw, 
  Edit, 
  Plus, 
  HelpCircle, 
  History as HistoryIcon, 
  Search,
  Users,
  ShieldCheck,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { getAllTenants, type Tenant } from '@/api/tenants.api';
import useAuth from '@/hooks/useAuth';
import { mapSubscriptionToUI, type SubscriptionUIState } from '@/utils/subscriptionMapper';
import { SubscriptionTenantView } from '@/components/billing/SubscriptionTenantView';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';
import toast from 'react-hot-toast';

// ─── Lazy-loaded Modals ──────────────────────────────────────────────────────
const SubscriptionEditModal = lazy(() =>
  import('@/components/billing/SubscriptionEditModal').then(m => ({ default: m.SubscriptionEditModal }))
);
const SubscriptionCreateModal = lazy(() =>
  import('@/components/billing/SubscriptionCreateModal').then(m => ({ default: m.SubscriptionCreateModal }))
);
const SubscriptionHistoryModal = lazy(() =>
  import('@/components/billing/SubscriptionHistoryModal').then(m => ({ default: m.SubscriptionHistoryModal }))
);
const ConfirmModal = lazy(() =>
  import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal }))
);

// ─── Zod Schema Validation Guard (Pilar 25) ──────────────────────────────────
const subFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  tenantId: z.string().optional(),
  planId: z.string().optional(),
});

type SubscriptionRow = FilteredSubscriptionItem & {
  has_payment_success?: boolean;
  uiState: SubscriptionUIState;
};

type AuditItem = SubscriptionHistoryItem & {
  old_plan_name?: string | null;
  new_plan_name?: string | null;
  changed_by_name?: string | null;
  changed_by_email?: string | null;
};

export const SubscriptionsPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin, user, getCurrentTenantId, can } = useAuth();
  const isSA = isSuperAdmin();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planId, setPlanId] = useState('ALL');
  const [tenantFilterId, setTenantFilterId] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SubscriptionRow | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySubscriptionId, setHistorySubscriptionId] = useState('');
  const [historyItems, setHistoryItems] = useState<AuditItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // React Query Data Fetching (Pilar 31)
  const { data: subData, isLoading: loadingSubs, isFetching, refetch: refetchSubs } = useQuery({
    queryKey: ['billing-subscriptions-list', isSA, currentPage, itemsPerPage, searchTerm, statusFilter, tenantFilterId, planId, sortBy, sortOrder],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        tenant_id: tenantFilterId === 'ALL' ? undefined : tenantFilterId,
        plan_id: planId === 'ALL' ? undefined : planId,
        sort_by: sortBy || undefined,
        sort_order: sortOrder,
      };
      const res = isSA
        ? await getAllSubscriptions(params)
        : await getSubscriptionsByTenant(getCurrentTenantId() || '');
      return res?.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: plansData = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['billing-plans-options', isSA],
    queryFn: async () => {
      const res = isSA
        ? await getAllPlans({ page: 1, limit: 200 }, { skipTenantHeader: true })
        : await getPublicPlans();
      const raw = Array.isArray(res?.data) ? res.data : (res?.data as { plans?: Plan[] })?.plans || [];
      return (raw ?? [])?.map((p: Plan) => ({ id: p.id, name: p.name }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: tenantsData = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['billing-tenants-options'],
    queryFn: async () => {
      if (!isSA) return [];
      const res = await getAllTenants();
      const raw = Array.isArray(res?.data) ? res.data : (res?.data as { tenants?: Tenant[] })?.tenants || [];
      return (raw ?? [])?.map((t: Tenant) => ({ id: t.id, name: t.name }));
    },
    enabled: isSA,
    staleTime: 5 * 60 * 1000,
  });

  const items: SubscriptionRow[] = useMemo(() => {
    const rawList = Array.isArray(subData) ? subData : (subData as { subscriptions?: FilteredSubscriptionItem[] })?.subscriptions || [];
    return (rawList ?? [])?.map((sub: FilteredSubscriptionItem) => ({
      ...sub,
      uiState: mapSubscriptionToUI(sub),
    }));
  }, [subData]);

  const totalItems = useMemo(() => {
    return (subData as { total?: number })?.total || items.length;
  }, [subData, items.length]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Mutations with Cache Invalidation (Pilar 32)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionRow> }) => updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscriptions-list'] });
      toast.success('Langganan berhasil diperbarui.');
      setShowEditModal(false);
    },
    onError: () => {
      toast.error('Gagal memperbarui langganan.');
    }
  });

  const handleEditSave = useCallback(async () => {
    if (!selectedItem?.id) return;
    await updateMutation.mutateAsync({
      id: selectedItem.id,
      data: {
        status: editStatus as FilteredSubscriptionItem['status'],
        auto_renew: editAutoRenew,
      }
    });
  }, [selectedItem, editStatus, editAutoRenew, updateMutation]);

  const handleOpenHistory = useCallback(async (subId: string) => {
    setHistorySubscriptionId(subId);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getSubscriptionHistory(subId);
      setHistoryItems((res?.data || []) as AuditItem[]);
    } catch {
      setHistoryError('Gagal memuat histori langganan.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const summary = useMemo(() => ({
    activeCount: (items ?? []).filter(r => r.status === 'ACTIVE').length,
    trialCount: (items ?? []).filter(r => r.status === 'TRIAL').length,
    estimatedMrr: (items ?? []).reduce((acc, r) => acc + (r.plan?.price_monthly ?? r.Plan?.price_monthly ?? 0), 0),
  }), [items]);

  const columns = useMemo(() => [
    {
      key: 'tenant',
      label: 'Tenant Sekolah',
      render: (_: unknown, row: SubscriptionRow) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">
            {row.tenant?.name || row.Tenant?.name || 'Sekolah Mitra'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            ID: {row.tenant_id?.substring(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: 'plan',
      label: 'Paket Layanan',
      render: (_: unknown, row: SubscriptionRow) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">
            {row.plan?.name || row.Plan?.name || 'Paket Layanan'}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
            {formatCurrency(row.plan?.price_monthly || row.Plan?.price_monthly || 0)} / bln
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: unknown, row: SubscriptionRow) => (
        <Badge
          variant={row.status === 'ACTIVE' ? 'success' : row.status === 'TRIAL' ? 'warning' : 'destructive'}
          className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase"
        >
          {row.status}
        </Badge>
      )
    },
    {
      key: 'dates',
      label: 'Masa Aktif',
      render: (_: unknown, row: SubscriptionRow) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Mulai: {formatDate(row.start_date)}
          </div>
          <div className="text-slate-500 text-[10px]">
            s.d {formatDate(row.end_date)}
          </div>
        </div>
      )
    },
    {
      key: 'auto_renew',
      label: 'Auto Renew',
      render: (_: unknown, row: SubscriptionRow) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
          row.auto_renew 
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
        }`}>
          {row.auto_renew ? 'ON' : 'OFF'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: SubscriptionRow) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedItem(row);
              setEditStatus(row.status || 'ACTIVE');
              setEditAutoRenew(!!row.auto_renew);
              setShowEditModal(true);
            }}
            title="Edit langganan"
            className="p-1.5 rounded-lg"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenHistory(row.id)}
            title="Riwayat perubahan"
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ], [handleOpenHistory]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Langganan Tenant' }
  ], []);

  const paginationProp = useMemo(() => ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onLimitChange: (limit: number) => {
      setItemsPerPage(limit);
      setCurrentPage(1);
    },
  }), [currentPage, totalPages, totalItems, itemsPerPage]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Manajemen Langganan Tenant"
        description="Pantau lisensi paket aktif, masa trial, dan konfigurasi auto-renew seluruh tenant sekolah Absenta."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_subscriptions"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => refetchSubs()}
              disabled={isFetching}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Langganan
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Manajemen Langganan",
          description: "Pantau dan kelola seluruh langganan aktif, masa trial, dan status auto-renew tenant Absenta.",
          items: [
            { text: "Gunakan filter Status untuk menyaring langganan berdasarkan kondisi (Aktif, Trial, Kedaluwarsa)." },
            { text: "Klik tombol Riwayat di tiap baris untuk melihat jejak audit perubahan lisensi." },
            { text: "Gunakan toolbar atas untuk membuat subscription baru secara manual bagi tenant." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Analytics Stats Overview (Pilar 23) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnalyticsCard
                title="Total Langganan"
                value={String(totalItems)}
                icon={Users}
                color="indigo"
              />
              <AnalyticsCard
                title="Langganan Aktif"
                value={String(summary.activeCount)}
                icon={CheckCircle}
                color="emerald"
              />
              <AnalyticsCard
                title="Masa Trial"
                value={String(summary.trialCount)}
                icon={Clock}
                color="blue"
              />
              <AnalyticsCard
                title="Estimasi MRR"
                value={formatCurrency(summary.estimatedMrr)}
                icon={RefreshCcw}
                color="amber"
              />
            </div>

            {/* Filter Bar (Placed Above Table - Pilar 28) */}
            <div className="overflow-x-auto max-w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="sub-search-input"
                  aria-label="Cari nama tenant atau paket"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    const parsed = subFilterSchema.safeParse({ search: e.target.value });
                    if (parsed.success) {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }
                  }}
                  placeholder="Cari nama tenant sekolah..."
                  className="pl-10 text-xs w-full max-w-full min-w-0 rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-36 min-w-0">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="sub-status-filter-select"
                      aria-label="Filter status langganan"
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'ACTIVE', label: 'Aktif' },
                        { value: 'TRIAL', label: 'Masa Trial' },
                        { value: 'EXPIRED', label: 'Kedaluwarsa' },
                        { value: 'SUSPENDED', label: 'Ditangguhkan' },
                      ]}
                      placeholder="Status"
                    />
                  </Suspense>
                </div>

                <div className="w-full sm:w-44 min-w-0">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="sub-plan-filter-select"
                      aria-label="Filter paket langganan"
                      value={planId}
                      onValueChange={(val) => {
                        setPlanId(val);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'ALL', label: 'Semua Paket' },
                        ...(plansData ?? [])?.map(p => ({ value: p.id, label: p.name }))
                      ]}
                      placeholder="Pilih Paket"
                    />
                  </Suspense>
                </div>

                {isSA && (
                  <div className="w-full sm:w-48 min-w-0">
                    <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                      <SearchableSelect
                        id="sub-tenant-filter-select"
                        aria-label="Filter tenant sekolah"
                        value={tenantFilterId}
                        onValueChange={(val) => {
                          setTenantFilterId(val);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: 'ALL', label: 'Semua Tenant' },
                          ...(tenantsData ?? [])?.map(t => ({ value: t.id, label: t.name }))
                        ]}
                        placeholder="Pilih Tenant"
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <Table
                columns={columns}
                data={items}
                isLoading={loadingSubs}
                pagination={paginationProp}
                emptyMessage="Tidak ada data langganan yang sesuai dengan filter."
              />
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>

      {/* Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {showEditModal && (
          <SubscriptionEditModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            editStatus={editStatus}
            editAutoRenew={editAutoRenew}
            onAutoRenewChange={setEditAutoRenew}
            onSave={handleEditSave}
            loading={updateMutation.isPending}
          />
        )}

        {showCreateModal && (
          <SubscriptionCreateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            isSA={isSA}
            userId={user?.id}
            userTenantId={user?.tenant_id || getCurrentTenantId() || undefined}
            planOptions={plansData}
            planDetails={{}}
            tenantOptions={tenantsData}
            plansLoading={false}
            tenantsLoading={false}
            getCurrentTenantId={getCurrentTenantId}
            isSuperAdmin={isSuperAdmin}
            loadSubscriptions={() => queryClient.invalidateQueries({ queryKey: ['billing-subscriptions-list'] })}
            onSuccess={(msg) => toast.success(msg)}
            onError={(msg) => toast.error(msg)}
          />
        )}

        {showHistoryModal && (
          <SubscriptionHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            subscriptionId={historySubscriptionId}
            historyItems={historyItems}
            historyLoading={historyLoading}
            historyError={historyError}
            onDismissError={() => setHistoryError(null)}
          />
        )}
      </Suspense>
    </InfraErrorBoundary>
  );
});

export default SubscriptionsPage;
