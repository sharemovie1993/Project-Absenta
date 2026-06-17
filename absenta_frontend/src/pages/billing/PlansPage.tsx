import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import useConfirm from '../../hooks/useConfirm';
import { 
  Button, 
  Loader, 
  EnhancedAlert,
  Input,
  StatusBadge
} from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import SuperAdminPageLayout from '@/components/layout/SuperAdminPageLayout';
import { cn } from '@/lib/utils';
import Card from '../../components/ui/Card';

const PlanFormModal = lazy(() => import('../../components/billing/PlanFormModal').then(module => ({ default: module.PlanFormModal })));
import { Table } from '../../components/ui';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
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
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import { GraduationCap } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import type { 
  Plan, 
  CreatePlanRequest, 
  PlanAnalytics
} from '../../types/billing';
import { 
  getAllPlans, 
  createPlan, 
  updatePlan, 
  deactivatePlan,
  getPlanAnalytics,
} from '../../api/plans.api';
import { formatErrorMessage } from '../../api/apiUtils';
import { formatCurrency } from '../../utils/layoutUtils';
import { exportToCSV, exportToExcel, formatCurrencyForExport } from '../../utils/exportUtils';
import { LogService } from '../../utils/LogService';
import { ExportButton } from '../../components/ExportButton';
import useAuth from '../../hooks/useAuth';

const PlansPage: React.FC = () => {
  const confirm = useConfirm();
  const { isSuperAdmin, isLoading } = useAuth();

  const skipTenantHeader = isSuperAdmin();

  // State Management
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<PlanAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  
  // Filter States
  const [rawSearch, setRawSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'SUBS_ASC' | 'SUBS_DESC' | 'STATUS'>('DEFAULT');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { toasts, error: showErrorToast, success: showSuccessToast, removeToast } = useToast();

  // Debounce rawSearch to searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(rawSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [rawSearch]);

  // Reset pagination to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Load Data

  const loadPlansData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllPlans(undefined, { skipTenantHeader });
        if (response.success) {
          setPlans(response.data);
        } else {
        setError(response.message || 'Gagal memuat data plans');
        showErrorToast(response.message || 'Gagal memuat data plans');
      }
    } catch (err: unknown) {
      const msg = formatErrorMessage(err);
      setError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }, [skipTenantHeader, showErrorToast]);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await getPlanAnalytics({ skipTenantHeader });
      if (response.success) {
        setAnalytics(response.data);
      } else {
        LogService.error('Gagal memuat analytics:', response.message);
      }
    } catch (err: unknown) {
      LogService.error('Gagal memuat analytics:', formatErrorMessage(err));
    }
  }, [skipTenantHeader]);

  useEffect(() => {
    if (isLoading) return;
    loadPlansData();
    loadAnalytics();
  }, [isLoading, loadPlansData, loadAnalytics]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // CRUD Operations
  const handleCreatePlanSubmit = async (data: CreatePlanRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validasi form
      if (!data.name.trim()) {
        setError('Nama plan harus diisi');
        showErrorToast('Nama plan harus diisi');
        return;
      }
      
      if (data.price_monthly <= 0) {
        setError('Harga harus lebih dari 0');
        showErrorToast('Harga harus lebih dari 0');
        return;
      }
      
      if ((data.max_user || 0) <= 0) {
        setError('Maksimal user harus lebih dari 0');
        showErrorToast('Maksimal user harus lebih dari 0');
        return;
      }
      
      // Convert frontend form data to backend format
      const createData = {
        name: data.name.trim(),
        description: data.description?.trim(),
        price_monthly: data.price_monthly,
        currency: data.currency || 'IDR',
        max_user: data.max_user,
        features: data.features?.trim() || undefined,
        is_active: data.is_active
      };
      
      const response = await createPlan(createData, { skipTenantHeader });
      if (response.success) {
        setPlans(prev => [...prev, response.data]);
        setSuccess('Plan berhasil dibuat');
        showSuccessToast('Plan berhasil dibuat');
        setShowCreateModal(false);
        // Refresh analytics
        await loadAnalytics();
      } else {
        setError(response.message || 'Gagal membuat plan');
        showErrorToast(response.message || 'Gagal membuat plan');
      }
    } catch (err: unknown) {
      LogService.error('Error creating plan:', formatErrorMessage(err));
      const msg = formatErrorMessage(err);
      setError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlanSubmit = async (data: CreatePlanRequest) => {
    if (!selectedPlan) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Validasi form
      if (!data.name.trim()) {
        setError('Nama plan harus diisi');
        showErrorToast('Nama plan harus diisi');
        return;
      }
      
      if (data.price_monthly <= 0) {
        setError('Harga harus lebih dari 0');
        showErrorToast('Harga harus lebih dari 0');
        return;
      }
      
      if ((data.max_user || 0) <= 0) {
        setError('Maksimal user harus lebih dari 0');
        showErrorToast('Maksimal user harus lebih dari 0');
        return;
      }
      
      // Convert frontend form data to backend format
      const updateData = {
        name: data.name.trim(),
        description: data.description?.trim(),
        price_monthly: data.price_monthly,
        currency: data.currency || 'IDR',
        max_user: data.max_user,
        features: data.features?.trim() || undefined,
        is_active: data.is_active
      };
      
      const response = await updatePlan(selectedPlan.id, updateData, { skipTenantHeader });
      if (response.success) {
        setPlans(prev => prev?.map(plan => 
          plan.id === selectedPlan.id ? response.data : plan
        ) || []);
        setSuccess('Plan berhasil diperbarui');
        showSuccessToast('Plan berhasil diperbarui');
        setShowEditModal(false);
        setSelectedPlan(null);
        // Refresh analytics
        await loadAnalytics();
      } else {
        setError(response.message || 'Gagal diperbarui plan');
        showErrorToast(response.message || 'Gagal diperbarui plan');
      }
    } catch (err: unknown) {
      LogService.error('Error updating plan:', formatErrorMessage(err));
      const msg = formatErrorMessage(err);
      setError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const planName = plan?.name || 'plan ini';
    
    const ok = await confirm({
      title: 'Konfirmasi Nonaktifkan Plan',
      description: `Apakah Anda yakin ingin menonaktifkan "${planName}"? Plan akan dinonaktifkan dan tidak dapat digunakan untuk langganan baru.`,
      confirmText: 'Nonaktifkan',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (!ok) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await deactivatePlan(planId, { skipTenantHeader });
      if (response.success) {
        // Update plan status instead of removing from list
        setPlans(prev => prev?.map(plan => 
          plan.id === planId ? { ...plan, is_active: false } : plan
        ) || []);
        setSuccess(`Plan "${planName}" berhasil dinonaktifkan`);
        showSuccessToast(`Plan "${planName}" berhasil dinonaktifkan`);
        // Refresh analytics
        await loadAnalytics();
      } else {
        setError(response.message || 'Gagal menonaktifkan plan');
        showErrorToast(response.message || 'Gagal menonaktifkan plan');
      }
    } catch (err: unknown) {
      LogService.error('Error deactivating plan:', formatErrorMessage(err));
      const msg = formatErrorMessage(err);
      setError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper Functions
  const handleEdit = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  }, []);

  // Filter plans
  const [moduleFilter, setModuleFilter] = useState<string>('');

  const getFeatureList = useCallback((plan: Plan): string[] => {
    const fx = (plan as unknown as { features_json?: unknown }).features_json;
    const fromJson = Array.isArray(fx) ? fx?.map(String) : [];
    const raw = plan.features || '';
    const fromString = raw
      ? raw.split(/[\n,]/)?.map(s => s.trim()).filter(Boolean)
      : [];
    const combined = fromJson.length ? fromJson : fromString;
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const f of combined) {
      const tag = String(f);
      if (!seen.has(tag)) { seen.add(tag); unique.push(tag); }
    }
    return unique;
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (plan.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || 
                           (statusFilter === 'ACTIVE' && plan.is_active) ||
                           (statusFilter === 'INACTIVE' && !plan.is_active);
      const matchesModule = moduleFilter === '' || getFeatureList(plan)?.map(s => s.toUpperCase()).includes(moduleFilter);
      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [plans, searchTerm, statusFilter, moduleFilter, getFeatureList]);

  // Sorting
  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      switch (sortBy) {
        case 'PRICE_ASC':
          return (a.price_monthly || 0) - (b.price_monthly || 0);
        case 'PRICE_DESC':
          return (b.price_monthly || 0) - (a.price_monthly || 0);
        case 'SUBS_ASC':
          return (a._count?.subscriptions || 0) - (b._count?.subscriptions || 0);
        case 'SUBS_DESC':
          return (b._count?.subscriptions || 0) - (a._count?.subscriptions || 0);
        case 'STATUS':
          // Active first
          return (a.is_active === b.is_active) ? 0 : (a.is_active ? -1 : 1);
        default:
          return 0;
      }
    });
  }, [filteredPlans, sortBy]);

  // Export handler
  const handleExportPlans = useCallback((format: 'CSV' | 'EXCEL') => {
    try {
      const filename = `plans_${new Date().toISOString().split('T')[0]}`;
      const rows = sortedPlans?.map(p => ({
        name: p.name,
        description: p.description || '',
        price_monthly: p.price_monthly || 0,
        currency: p.currency || 'IDR',
        max_user: p.max_user || 0,
        features: p.features || '',
        is_active: p.is_active ? 'ACTIVE' : 'INACTIVE',
        subscriptions_count: p._count?.subscriptions || 0
      })) || [];

      const columns = [
        { key: 'name', label: 'Nama Plan' },
        { key: 'description', label: 'Deskripsi' },
        { key: 'price_monthly', label: 'Harga/Bulan', formatter: formatCurrencyForExport },
        { key: 'currency', label: 'Mata Uang' },
        { key: 'max_user', label: 'Max Users' },
        { key: 'features', label: 'Fitur' },
        { key: 'is_active', label: 'Status' },
        { key: 'subscriptions_count', label: 'Jumlah Langganan' }
      ];

      if (format === 'CSV') {
        exportToCSV({ filename, columns: columns as any, data: rows, format });
      } else {
        exportToExcel({ filename, columns: columns as any, data: rows, format });
      }

      showSuccessToast(`Berhasil mengekspor ${rows.length} plan ke ${format}`);
    } catch (err: unknown) {
      LogService.error('Export plans error:', formatErrorMessage(err));
      showErrorToast(formatErrorMessage(err));
    }
  }, [sortedPlans, showSuccessToast, showErrorToast]);

  // Pagination Computations
  const totalItems = useMemo(() => sortedPlans.length, [sortedPlans]);
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage) || 1, [totalItems, itemsPerPage]);

  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPlans.slice(start, start + itemsPerPage);
  }, [sortedPlans, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  }, []);

  const paginationProp = useMemo(() => ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange: handlePageChange,
    onLimitChange: handleLimitChange,
  }), [currentPage, totalPages, totalItems, itemsPerPage, handlePageChange, handleLimitChange]);

  // Table columns
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Nama Plan',
      render: (_: unknown, plan: Plan) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</div>
          {(() => { const tdRaw = (plan as unknown as { trial_days?: unknown }).trial_days; const td = typeof tdRaw === 'number' ? tdRaw : Number(tdRaw); return td > 0; })() && (
            <div className="mt-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                title={`Trial ${String((() => { const r = (plan as unknown as { trial_days?: unknown }).trial_days; const n = typeof r === 'number' ? r : Number(r); return n; })())} hari`}
              >
                {(() => { const r = (plan as unknown as { trial_days?: unknown }).trial_days; const n = typeof r === 'number' ? r : Number(r); return `Trial ${String(n)} hari`; })()}
              </span>
            </div>
          )}
          {getFeatureList(plan).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {getFeatureList(plan).slice(0, 4)?.map((feat, idx) => (
                <span
                  key={`${plan.id}-feat-${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  title={feat}
                >
                  {feat}
                </span>
              ))}
              {getFeatureList(plan).length > 4 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">+{getFeatureList(plan).length - 4} lainnya</span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      label: 'Harga',
      render: (_: unknown, plan: Plan) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(plan.price_monthly || plan.price || 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            per bulan
          </div>
          {(() => { const pyRaw = (plan as unknown as { price_yearly?: unknown }).price_yearly; const py = typeof pyRaw === 'number' ? pyRaw : Number(pyRaw); return py > 0; })() && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {(() => { const pyRaw = (plan as unknown as { price_yearly?: unknown }).price_yearly; const py = typeof pyRaw === 'number' ? pyRaw : Number(pyRaw); return `atau ${formatCurrency(Number(py))} per tahun`; })()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'limits',
      label: 'Batas',
      render: (_: unknown, plan: Plan) => (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span>{plan.max_user || plan.max_users || 0} users</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <GraduationCap className="w-4 h-4 text-gray-500" />
            <span>{plan.max_students || 0} siswa</span>
          </div>
        </div>
      )
    },
    {
      key: 'subscriptions',
      label: 'Langganan',
      render: (_: unknown, plan: Plan) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            {plan._count?.subscriptions || 0}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: unknown, plan: Plan) => (
        <StatusBadge 
          status={plan.is_active ? 'active' : 'inactive'}
        />
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, plan: Plan) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(plan)}
            title="Edit plan"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeletePlan(plan.id)}
            title="Nonaktifkan plan"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDeletePlan, getFeatureList]);

  // Stats List terstandar untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    return [
      {
        title: "Plan Terpopuler",
        value: analytics?.most_popular_plan?.plan?.name || 'N/A',
        icon: <TrendingUp className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: `${analytics?.most_popular_plan?.subscription_count || 0} langganan`
      },
      {
        title: "Revenue Tertinggi",
        value: analytics?.highest_revenue_plan?.plan?.name || 'N/A',
        icon: <DollarSign className="h-4 w-4 text-white" />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: analytics ? formatCurrency(analytics.highest_revenue_plan?.total_revenue || 0) : 'Rp 0'
      },
      {
        title: "Conversion Rate",
        value: analytics ? `${analytics.conversion_rate}%` : '0%',
        icon: <Target className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-pink-600",
        subtitle: "Trial → Berlangganan"
      },
      {
        title: "Total Paket Layanan",
        value: String(plans.length),
        icon: <Users className="h-4 w-4 text-white" />,
        gradient: "from-orange-500 to-red-600",
        subtitle: `${plans.filter(p => p.is_active).length} paket aktif`
      }
    ];
  }, [analytics, plans]);

  const toolbarSlot = useMemo(() => (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={loadPlansData}
        disabled={loading}
        size="sm"
        className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin" : "")} />
        {loading ? 'Refreshing...' : 'Segarkan'}
      </Button>
      <ExportButton
        onExport={(format) => handleExportPlans(format)}
        variant="outline"
        size="sm"
        label="Export"
      />
      <Button 
        onClick={() => setShowCreateModal(true)}
        size="sm"
        className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Buat Paket Baru
      </Button>
    </div>
  ), [loading, sortedPlans]);
  const pageConfig = BILLING_PAGE_CONFIG.plans;

  const breadcrumbs = useMemo(() => [
    { label: 'Billing Platform' },
    { label: 'Paket Layanan' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Manajemen Paket Layanan",
    description: "Kelola paket lisensi multitenant, batas maksimum pengguna/siswa, tarif penagihan bulanan, serta modul fungsional aktif untuk setiap tenant sekolah.",
    items: [
      { text: "Paket Layanan menentukan batasan kuota user dan siswa untuk setiap tenant sekolah." },
      { text: "Modul fungsional (seperti Absensi, Koperasi, dll) dapat diaktifkan atau dinonaktifkan per paket." },
      { text: "Perubahan pada harga paket hanya akan berdampak pada langganan baru atau siklus tagihan berikutnya." }
    ]
  }), []);

  if (loading && plans.length === 0) {
    return <Loader />;
  }

  return (
    <SuperAdminPageLayout
      title="Manajemen Paket Layanan (SaaS Plans)"
      description="Kelola paket lisensi multitenant, batas maksimum pengguna/siswa, tarif penagihan bulanan, serta modul fungsional aktif untuk setiap tenant sekolah."
      breadcrumbs={breadcrumbs}
      stats={statsList}
      isLoading={loading && plans.length === 0}
      instruction={instruction}
      hardeningModuleKey="superadmin_plans"
    >
      {error && (
        <EnhancedAlert
          variant="destructive"
          title="Error"
          description={error}
          dismissible
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      <div>
        {/* Plans Table with Integrated Filters */}
        <Card className="overflow-hidden">
          <Table
            data={paginatedPlans}
            columns={columns}
            loading={loading}
            emptyMessage={pageConfig.emptyMessage || "Tidak ada paket yang cocok dengan filter pencarian"}
            pagination={paginationProp}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-64">
                  <Input
                    type="text"
                    value={rawSearch}
                    onChange={(e) => setRawSearch(e.target.value)}
                    placeholder={pageConfig.searchPlaceholder || "Cari paket..."}
                    leftIcon={<Search className="text-gray-400 h-4 w-4" />}
                    className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/80 dark:border-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div className="w-48">
                  <SearchableSelect
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter((value || '') as '' | 'ACTIVE' | 'INACTIVE')}
                    options={[
                      { value: "", label: "Semua Status" },
                      { value: "ACTIVE", label: "Aktif" },
                      { value: "INACTIVE", label: "Nonaktif" }
                    ]}
                    placeholder="Semua Status"
                    searchPlaceholder="Cari status..."
                    triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
                  />
                </div>

                <div className="w-48">
                  <SearchableSelect
                    value={sortBy}
                    onValueChange={(val) => setSortBy(val as any)}
                    options={[
                      { value: "DEFAULT", label: "Urutkan: Default" },
                      { value: "PRICE_ASC", label: "Harga: Termurah" },
                      { value: "PRICE_DESC", label: "Harga: Termahal" },
                      { value: "SUBS_ASC", label: "Langganan: Terendah" },
                      { value: "SUBS_DESC", label: "Langganan: Tertinggi" },
                      { value: "STATUS", label: "Status: Aktif dulu" }
                    ]}
                    placeholder="Urutkan..."
                    searchPlaceholder="Cari urutan..."
                    triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
                  />
                </div>

                <div className="w-48">
                  <SearchableSelect
                    value={moduleFilter}
                    onValueChange={(val) => setModuleFilter((val || '') as string)}
                    options={[
                      { value: '', label: 'Semua Modul' },
                      { value: 'ABSENSI', label: 'Absensi' },
                      { value: 'KOPERASI', label: 'Koperasi' },
                      { value: 'RAPORT', label: 'Raport' },
                      { value: 'PPDB', label: 'PPDB' },
                    ]}
                    placeholder="Filter modul..."
                    searchPlaceholder="Cari modul..."
                    triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
                  />
                </div>
              </div>
            }
            toolbarRight={toolbarSlot}
          />
        </Card>

        {/* Dynamic Lazy-loaded Form Modal */}
        <Suspense fallback={null}>
          {(showCreateModal || showEditModal) && (
            <PlanFormModal
              isOpen={showCreateModal || showEditModal}
              onClose={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedPlan(null);
              }}
              onSubmit={showCreateModal ? handleCreatePlanSubmit : handleUpdatePlanSubmit}
              plan={showEditModal ? selectedPlan : null}
              loading={loading}
            />
          )}
        </Suspense>

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </SuperAdminPageLayout>
  );
};

export default PlansPage;
