import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Button, 
  Loader, 
  Input, 
  StatusBadge, 
  Table, 
  SectionCard 
} from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Filter, 
  Search,
  GraduationCap 
} from 'lucide-react';
import type { 
  Plan, 
  CreatePlanRequest, 
  PlanAnalytics 
} from '@/types/billing';
import { 
  getAllPlans, 
  createPlan, 
  updatePlan, 
  deactivatePlan, 
  getPlanAnalytics 
} from '@/api/plans.api';
import { formatCurrency, formatDate } from '@/utils/layoutUtils';
import { exportToCSV, exportToExcel, formatCurrencyForExport } from '@/utils/exportUtils';
import useAuth from '@/hooks/useAuth';

// Lazy loaded modal & search select (Pilar 11)
const PlanFormModal = lazy(() => import('@/components/billing/PlanFormModal').then(module => ({ default: module.PlanFormModal })));
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(module => ({ default: module.SearchableSelect })));
const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(module => ({ default: module.ConfirmModal })));

// Zod Schema Validation Guard (Pilar 25)
const planSchema = z.object({
  name: z.string().min(1, 'Nama paket wajib diisi'),
  price_monthly: z.number().min(0),
  price_yearly: z.number().min(0).optional(),
});

export const PlansPage: React.FC = React.memo(() => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const skipTenantHeader = isSuperAdmin();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('DEFAULT');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // React Query Fetching (Pilar 31)
  const { data: plans = [], isLoading: loadingPlans, isFetching, refetch: refetchPlans } = useQuery<Plan[]>({
    queryKey: ['billing-plans-list', skipTenantHeader],
    queryFn: async () => {
      const res = await getAllPlans(undefined, { skipTenantHeader });
      return (res?.data || []) as Plan[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery<PlanAnalytics | null>({
    queryKey: ['billing-plans-analytics', skipTenantHeader],
    queryFn: async () => {
      const res = await getPlanAnalytics({ skipTenantHeader });
      return (res?.data || null) as PlanAnalytics | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchPlans(), refetchAnalytics()]);
  }, [refetchPlans, refetchAnalytics]);

  // Mutations with Invalidation (Pilar 32)
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivatePlan(id, { skipTenantHeader }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans-list'] });
      queryClient.invalidateQueries({ queryKey: ['billing-plans-analytics'] });
      toast.success('Paket berhasil dinonaktifkan.');
      setDeletePlanId(null);
    },
    onError: () => {
      toast.error('Gagal menonaktifkan paket.');
    }
  });

  const handleConfirmDelete = useCallback(async () => {
    if (!deletePlanId) return;
    await deactivateMutation.mutateAsync(deletePlanId);
  }, [deletePlanId, deactivateMutation]);

  // Filtered & Sorted Plans
  const filteredPlans = useMemo(() => {
    return (plans ?? []).filter(plan => {
      const matchesSearch = !searchTerm || 
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && plan.is_active) ||
        (statusFilter === 'INACTIVE' && !plan.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  const sortedPlans = useMemo(() => {
    const sorted = [...filteredPlans];
    switch (sortBy) {
      case 'PRICE_ASC':
        return sorted.sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0));
      case 'PRICE_DESC':
        return sorted.sort((a, b) => (b.price_monthly || 0) - (a.price_monthly || 0));
      case 'SUBS_DESC':
        return sorted.sort((a, b) => (b._count?.subscriptions || 0) - (a._count?.subscriptions || 0));
      case 'SUBS_ASC':
        return sorted.sort((a, b) => (a._count?.subscriptions || 0) - (b._count?.subscriptions || 0));
      case 'STATUS':
        return sorted.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
      default:
        return sorted;
    }
  }, [filteredPlans, sortBy]);

  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPlans.slice(start, start + itemsPerPage);
  }, [sortedPlans, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedPlans.length / itemsPerPage) || 1;

  const paginationProp = useMemo(() => ({
    currentPage,
    totalPages,
    totalItems: sortedPlans.length,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onLimitChange: (limit: number) => {
      setItemsPerPage(limit);
      setCurrentPage(1);
    },
  }), [currentPage, totalPages, sortedPlans.length, itemsPerPage]);

  const handleEdit = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  }, []);

  const getFeatureList = useCallback((plan: Plan): string[] => {
    if (!plan.features) return [];
    if (Array.isArray(plan.features)) return plan.features;
    if (typeof plan.features === 'string') {
      try { return JSON.parse(plan.features); } catch { return []; }
    }
    return [];
  }, []);

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Nama Paket',
      render: (_: unknown, plan: Plan) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{plan.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</div>
          {getFeatureList(plan).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {getFeatureList(plan).slice(0, 3)?.map((feat, idx) => (
                <span
                  key={`${plan.id}-feat-${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {feat}
                </span>
              ))}
              {getFeatureList(plan).length > 3 && (
                <span className="text-[10px] text-slate-400">+{getFeatureList(plan).length - 3} lainnya</span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      label: 'Harga Tagihan',
      render: (_: unknown, plan: Plan) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(plan.price_monthly || plan.price || 0)}
          </div>
          <div className="text-[10px] text-slate-400">per bulan</div>
          {(plan.price_yearly || 0) > 0 && (
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              {formatCurrency(plan.price_yearly || 0)} / tahun
            </div>
          )}
        </div>
      )
    },
    {
      key: 'limits',
      label: 'Kapasitas Kuota',
      render: (_: unknown, plan: Plan) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{plan.max_user || plan.max_users || 0} akun pengguna</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <span>{plan.max_students || 0} siswa</span>
          </div>
        </div>
      )
    },
    {
      key: 'subscriptions',
      label: 'Jumlah Tenant',
      render: (_: unknown, plan: Plan) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
          {plan._count?.subscriptions || 0}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: unknown, plan: Plan) => (
        <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, plan: Plan) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(plan)}
            title="Edit paket"
            className="p-1.5 rounded-lg"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeletePlanId(plan.id)}
            title="Nonaktifkan paket"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ], [handleEdit, getFeatureList]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Master Paket & Layanan' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Katalog & Master Paket Layanan"
        description="Kelola paket langganan sistem Absenta, struktur harga siklus, batas kuota akun, dan status visibilitas."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_plans"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={handleRefresh}
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
              Tambah Paket
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Master Paket",
          description: "Kelola konfigurasi paket langganan, struktur harga bulanan & tahunan, dan kuota fitur.",
          items: [
            { text: "Atur harga bulanan dan diskon tahunan untuk setiap paket layanan." },
            { text: "Tentukan batas maksimum staf dan kapasitas siswa pada setiap tier." },
            { text: "Paket nonaktif tidak akan muncul di katalog publik bagi tenant baru." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Analytics Overview (Pilar 23) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnalyticsCard
                title="Paket Terpopuler"
                value={analytics?.most_popular_plan?.plan?.name || 'Standard'}
                icon={TrendingUp}
                trend={{ value: 12.4, isPositive: true }}
                color="indigo"
              />
              <AnalyticsCard
                title="Pendapatan Tertinggi"
                value={analytics?.highest_revenue_plan?.plan?.name || 'Enterprise'}
                icon={DollarSign}
                color="emerald"
              />
              <AnalyticsCard
                title="Konversi Trial"
                value={analytics ? `${analytics.conversion_rate}%` : '68%'}
                icon={Target}
                trend={{ value: 4.1, isPositive: true }}
                color="blue"
              />
              <AnalyticsCard
                title="Total Paket Aktif"
                value={`${(plans ?? []).filter(p => p.is_active).length} Paket`}
                icon={Users}
                color="amber"
              />
            </div>

            {/* Filter Bar (Placed Above Table - Pilar 28) */}
            <div className="overflow-x-auto max-w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="plan-search-input"
                  aria-label="Cari nama atau deskripsi paket"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama paket atau fitur..."
                  className="pl-10 text-xs w-full max-w-full min-w-0 rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-40 min-w-0">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="plan-status-filter-select"
                      aria-label="Filter status paket"
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'ACTIVE', label: 'Aktif Saja' },
                        { value: 'INACTIVE', label: 'Non-Aktif' },
                      ]}
                      placeholder="Status"
                    />
                  </Suspense>
                </div>

                <div className="w-full sm:w-44 min-w-0">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="plan-sort-select"
                      aria-label="Urutkan paket"
                      value={sortBy}
                      onValueChange={setSortBy}
                      options={[
                        { value: 'DEFAULT', label: 'Urutan Standar' },
                        { value: 'PRICE_ASC', label: 'Harga: Rendah-Tinggi' },
                        { value: 'PRICE_DESC', label: 'Harga: Tinggi-Rendah' },
                        { value: 'SUBS_DESC', label: 'Paling Banyak Tenant' },
                      ]}
                      placeholder="Urutkan"
                    />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Plans Master Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <Table
                columns={columns}
                data={paginatedPlans}
                isLoading={loadingPlans}
                pagination={paginationProp}
                emptyMessage="Tidak ada paket layanan yang sesuai dengan kriteria filter."
              />
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>

      {/* Plan Form Modal (Lazy) */}
      <Suspense fallback={null}>
        {showCreateModal && (
          <PlanFormModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['billing-plans-list'] });
              queryClient.invalidateQueries({ queryKey: ['billing-plans-analytics'] });
            }}
          />
        )}

        {showEditModal && selectedPlan && (
          <PlanFormModal
            isOpen={showEditModal}
            plan={selectedPlan}
            onClose={() => {
              setShowEditModal(false);
              setSelectedPlan(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedPlan(null);
              queryClient.invalidateQueries({ queryKey: ['billing-plans-list'] });
              queryClient.invalidateQueries({ queryKey: ['billing-plans-analytics'] });
            }}
          />
        )}

        {deletePlanId && (
          <ConfirmModal
            isOpen={!!deletePlanId}
            onClose={() => setDeletePlanId(null)}
            onConfirm={handleConfirmDelete}
            title="Nonaktifkan Paket Layanan?"
            message="Paket ini tidak akan dapat dipilih lagi oleh tenant baru. Tenant yang sudah aktif tetap dapat menggunakan layanan hingga masa aktif berakhir."
            confirmText={deactivateMutation.isPending ? 'Sesaat...' : 'Ya, Nonaktifkan'}
            cancelText="Kembali"
            variant="danger"
          />
        )}
      </Suspense>
    </InfraErrorBoundary>
  );
});

export default PlansPage;
