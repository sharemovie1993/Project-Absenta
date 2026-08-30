import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Calendar, CheckCircle, Clock, Search, Plus, ShieldCheck, XCircle, Building2, Users, Layers, Shield, RefreshCw } from 'lucide-react';
import { Button, Table, SectionCard, Badge } from '../../components/ui';
import { getAllTenants, deleteTenant, requestDeletion, cancelDeletion, type Tenant } from '../../api/tenants.api';
import { getTenantDetail } from '../../api/tenant-detail.api';
import { getSubscriptionsByTenant } from '../../api/subscription.api';
import type { Subscription } from '../../types/subscription';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import type { Column } from '../../components/ui/Table';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

const TenantForm = lazy(() => import('../../components/tenant/TenantForm').then(m => ({ default: m.default })));
const DeleteTenantModal = lazy(() => import('../../components/tenant/DeleteTenantModal').then(m => ({ default: m.DeleteTenantModal })));

// Zod Schema Validation Guard (Pilar 25)
const searchSchema = z.object({
  search: z.string().optional()
});

export const TenantsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id);

  // React Query Tenants Fetch (Pilar 31)
  const { data: tenantsResponse, isLoading: loading, refetch } = useQuery({
    queryKey: ['tenants', currentPage, itemsPerPage, activeSearch],
    queryFn: async () => {
      const response = await getAllTenants(
        {
          page: currentPage,
          limit: itemsPerPage,
          search: activeSearch || undefined
        },
        { skipTenantHeader: isSuperAdmin }
      );

      if (!response.success) throw new Error(response.message || 'Gagal memuat tenant');

      const baseTenants = response.data || [];
      const enriched = await Promise.all((baseTenants ?? [])?.map(async (t) => {
        try {
          const [detailRes, subsRes] = await Promise.all([
            getTenantDetail(t.id).catch(() => null),
            getSubscriptionsByTenant(t.id).catch(() => null)
          ]);

          const contact_email = detailRes?.data?.contact_email || undefined;
          const contact_phone = detailRes?.data?.contact_phone || undefined;

          let subscription_plan: string | undefined = t.subscription_plan;
          let subscription_expires_at: string | undefined = t.subscription_expires_at;
          const subs: Subscription[] = (subsRes?.data?.subscriptions || []) as Subscription[];
          if (!subscription_plan || !subscription_expires_at) {
            const current = (subs ?? []).find((s) => s.status === 'ACTIVE')
              || (subs ?? []).find((s) => s.status === 'TRIAL')
              || subs[0];
            if (current) {
              const planName = current?.Plan?.name || current?.plan?.name;
              subscription_plan = subscription_plan || planName;
              subscription_expires_at = subscription_expires_at || (current?.end_date || undefined);
            }
          }

          return {
            ...t,
            email: t.email || contact_email,
            phone: t.phone || contact_phone,
            subscription_plan,
            subscription_expires_at,
          } as Tenant;
        } catch {
          return t;
        }
      }));

      return {
        tenants: enriched,
        pagination: response.pagination || { totalItems: enriched.length, totalPages: Math.ceil(enriched.length / itemsPerPage) }
      };
    }
  });

  const tenants = useMemo(() => tenantsResponse?.tenants || [], [tenantsResponse]);
  const totalPages = useMemo(() => tenantsResponse?.pagination?.totalPages || 1, [tenantsResponse]);
  const totalItems = useMemo(() => tenantsResponse?.pagination?.totalItems || 0, [tenantsResponse]);

  // Statistics Fetch
  const { data: statsData } = useQuery({
    queryKey: ['tenants-statistics'],
    queryFn: async () => {
      const response = await getAllTenants(
        { page: 1, limit: 1000 },
        { skipTenantHeader: isSuperAdmin }
      );
      if (!response.success) return { totalTenants: 0, activeTenants: 0, multiSessionTenants: 0, totalUsers: 0 };
      const allTenants = response.data || [];
      return {
        totalTenants: response.pagination?.totalItems || allTenants.length,
        activeTenants: (allTenants ?? []).filter(t => {
          const status = t.status ? String(t.status).toUpperCase() : undefined;
          return status === 'ACTIVE' || t.is_active === true;
        }).length,
        multiSessionTenants: (allTenants ?? []).filter(t => t.absensi_mode === 'MULTI_SESI').length,
        totalUsers: (allTenants ?? []).reduce((sum, t) => sum + (t.current_users || t.user_count || t.total_users || 0), 0)
      };
    }
  });

  const statistics = useMemo(() => statsData || {
    totalTenants: totalItems,
    activeTenants: 0,
    multiSessionTenants: 0,
    totalUsers: 0
  }, [statsData, totalItems]);

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await deleteTenant(tenantId);
      if (!response.success) throw new Error(response.message || 'Gagal menghapus tenant');
      return response;
    },
    onSuccess: () => {
      toast.success('Tenant berhasil dihapus permanen');
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants-statistics'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus tenant';
      toast.error(msg);
    }
  });

  const handleCreateTenant = useCallback(() => {
    setEditingTenantId(null);
    setShowForm(true);
  }, []);

  const handleEditTenant = useCallback((tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setShowForm(true);
  }, []);

  const handleViewTenant = useCallback((tenant: Tenant) => {
    navigate(`/superadmin/tenants/${tenant.id}`);
  }, [navigate]);

  const handleOpenDeleteModal = useCallback((tenant: Tenant) => {
    setDeleteTarget({ id: tenant.id, name: tenant.name });
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }, [deleteTarget, deleteMutation]);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingTenantId(null);
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['tenants-statistics'] });
  }, [queryClient]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingTenantId(null);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = searchSchema.safeParse({ search: searchTerm });
    if (parsed.success) {
      setActiveSearch(searchTerm.trim());
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'name',
      label: 'Nama Sekolah / Institusi',
      render: (_, row: Tenant) => (
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 dark:text-white text-xs">{row.name}</p>
          <p className="text-[11px] font-mono text-slate-400">{row.subdomain ? `${row.subdomain}.absenta.id` : '-'}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status Operasional',
      render: (_, row: Tenant) => {
        const isActive = row.status === 'ACTIVE' || row.is_active === true;
        return (
          <Badge variant={isActive ? 'success' : 'destructive'} className="text-[9px] font-bold uppercase">
            {isActive ? 'Aktif' : 'Non-Aktif'}
          </Badge>
        );
      }
    },
    {
      key: 'absensi_mode',
      label: 'Mode Absensi',
      render: (_, row: Tenant) => (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.absensi_mode || 'STANDARD'}
        </span>
      )
    },
    {
      key: 'subscription',
      label: 'Paket Layanan',
      render: (_, row: Tenant) => (
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {row.subscription_plan || 'TRIAL'}
          </Badge>
          {row.subscription_expires_at && (
            <span className="text-[9px] text-slate-400 block font-mono">
              Exp: {new Date(row.subscription_expires_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (_, row: Tenant) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleViewTenant(row)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
            title="Lihat Detail"
          >
            <Eye size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleEditTenant(row)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 rounded-lg"
            title="Edit Tenant"
          >
            <Edit size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDeleteModal(row)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
            title="Hapus Tenant"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleViewTenant, handleEditTenant, handleOpenDeleteModal]);

  const statsList = useMemo(() => [
    {
      title: "Total Tenant",
      value: statistics.totalTenants,
      icon: <Building2 size={16} className="text-white" />,
      gradient: "from-blue-600 to-indigo-800",
      subtitle: "Sekolah terdaftar"
    },
    {
      title: "Tenant Aktif",
      value: statistics.activeTenants,
      icon: <CheckCircle size={16} className="text-white" />,
      gradient: "from-emerald-600 to-teal-800",
      subtitle: "Status operasional"
    },
    {
      title: "Mode Multi Sesi",
      value: statistics.multiSessionTenants,
      icon: <Layers size={16} className="text-white" />,
      gradient: "from-purple-600 to-pink-800",
      subtitle: "KBM kompleks aktif"
    },
    {
      title: "Total Pengguna",
      value: statistics.totalUsers,
      icon: <Users size={16} className="text-white" />,
      gradient: "from-amber-600 to-orange-800",
      subtitle: "Civitas akademika"
    }
  ], [statistics]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kelola Tenant' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Manajemen Tenant',
    description: 'Halaman ini digunakan untuk mengelola seluruh institusi (sekolah) yang terdaftar di platform.',
    items: [
      { text: 'Gunakan fitur Assist Login untuk masuk ke sistem sebagai Admin sekolah tertentu tanpa password.' },
      { text: 'Mode "Multi Sesi" memberikan fitur jadwal KBM dan rekap yang lebih kompleks.' },
      { text: 'Tenant yang diajukan penghapusan akan tetap berada di database selama 30 hari sebelum dihapus permanen.' }
    ]
  }), []);

  const isMobile = useIsMobile();

  const renderMobileTenantCard = useCallback((row: Tenant) => {
    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{row.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono font-medium">{row.domain || '-'}</p>
            </div>
          </div>
          <div className="shrink-0">
            {row.status === 'DELETION_PENDING' ? (
              <Badge variant="destructive" className="flex items-center gap-1 text-[9px]">
                <Clock size={10} /> Pending Hapus
              </Badge>
            ) : row.is_active ? (
              <Badge variant="success" className="flex items-center gap-1 text-[9px]">
                <CheckCircle size={10} /> Aktif
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1 text-[9px]">
                <XCircle size={10} /> Nonaktif
              </Badge>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Paket Langganan</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.subscription_plan || 'Free Trial'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Masa Berlaku</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {row.subscription_expires_at ? new Date(row.subscription_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Kontak Email</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{row.email || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Mode KBM</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.is_multi_session ? 'Multi Sesi' : 'Standar'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            {isSuperAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAssistLogin(row)}
                className="text-xs text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 font-bold"
              >
                <ShieldCheck size={13} className="mr-1" /> Assist Login
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleViewTenant(row)}
              className="text-xs text-slate-600 dark:text-slate-300 font-bold"
            >
              <Eye size={13} className="mr-1" /> Detail
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleEditTenant(row)}
              className="text-xs text-indigo-600 font-bold"
            >
              <Edit size={13} className="mr-1" /> Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDeleteModal(row)}
              className="text-xs text-rose-600 font-bold"
            >
              <Trash2 size={13} className="mr-1" /> Hapus
            </Button>
          </div>
        </div>
      </div>
    );
  }, [handleAssistLogin, handleViewTenant, handleEditTenant, handleOpenDeleteModal, isSuperAdmin]);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="Manajemen Tenant Sekolah"
        description="Kelola pendaftaran sekolah, konfigurasi mode absensi, dan lisensi langganan platform Absenta.id."
        breadcrumbs={breadcrumbs}
        stats={statsList}
        isLoadingStats={loading && tenants.length === 0}
        hardeningModuleKey="superadmin_tenants"
        instruction={instruction}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="w-full min-w-0 max-w-full">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
              {isMobile ? (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama atau domain..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          aria-label="Cari tenant berdasarkan nama atau domain"
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                      <Button type="submit" variant="toolbarOutline" size="toolbar" className="rounded-xl">
                        Cari
                      </Button>
                    </form>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => refetch()}
                        disabled={loading}
                        className="rounded-xl"
                      >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      </Button>
                      <Button
                        type="button"
                        variant="toolbarPrimary"
                        size="toolbar"
                        onClick={handleCreateTenant}
                        className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Tambah
                      </Button>
                    </div>
                  </div>

                  <MobileAcademicList
                    title="Daftar Tenant Sekolah"
                    data={tenants}
                    loading={loading}
                    totalItems={statistics.totalTenants}
                    emptyMessage="Tidak ada tenant sekolah ditemukan."
                    pagination={{
                      currentPage,
                      totalPages,
                      totalItems: statistics.totalTenants,
                      itemsPerPage,
                      onPageChange: (page) => setCurrentPage(page),
                      onLimitChange: (limit) => {
                        setItemsPerPage(limit);
                        setCurrentPage(1);
                      }
                    }}
                    renderCard={renderMobileTenantCard}
                  />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={tenants}
                  loading={loading}
                  emptyMessage="Tidak ada tenant sekolah ditemukan."
                  pagination={{
                    currentPage,
                    totalPages,
                    totalItems: statistics.totalTenants,
                    itemsPerPage,
                    onPageChange: (page) => {
                      setCurrentPage(page);
                    },
                    onLimitChange: (limit) => {
                      setItemsPerPage(limit);
                      setCurrentPage(1);
                    }
                  }}
                  toolbarLeft={
                    <div className="flex flex-wrap items-center gap-3">
                      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama atau domain..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Cari tenant berdasarkan nama atau domain"
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          />
                        </div>
                        <Button type="submit" variant="toolbarOutline" size="toolbar" className="rounded-xl">
                          Cari
                        </Button>
                      </form>
                    </div>
                  }
                  toolbarRight={
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => refetch()}
                        disabled={loading}
                        className="rounded-xl"
                      >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      </Button>
                      <Button
                        type="button"
                        variant="toolbarPrimary"
                        size="toolbar"
                        onClick={handleCreateTenant}
                        className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Tambah Tenant
                      </Button>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Tenant Form Modal */}
        {showForm && (
          <Suspense fallback={null}>
            <TenantForm
              tenantId={editingTenantId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </Suspense>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && deleteTarget && (
          <Suspense fallback={null}>
            <DeleteTenantModal
              isOpen={deleteModalOpen}
              onClose={() => {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
              onConfirm={handleConfirmDelete}
              tenantName={deleteTarget.name}
              isLoading={deleteMutation.isPending}
            />
          </Suspense>
        )}
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default TenantsPage;
