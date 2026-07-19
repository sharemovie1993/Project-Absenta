import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, MoreVertical, Calendar, CheckCircle, Clock, Search, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { getAllTenants, deleteTenant, requestDeletion, cancelDeletion, type Tenant } from '../../api/tenants.api';
import { getTenantDetail } from '../../api/tenant-detail.api';
import { getSubscriptionsByTenant } from '../../api/subscription.api';
import type { Subscription } from '../../types/subscription';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { Loader, Table } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import axiosInstance from '../../lib/axiosInstance';

const TenantForm = lazy(() => import('../../components/tenant/TenantForm').then(m => ({ default: m.default })));
const DeleteTenantModal = lazy(() => import('../../components/tenant/DeleteTenantModal').then(m => ({ default: m.DeleteTenantModal })));

export default function TenantsPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownId && !(event.target as Element).closest('.action-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownId]);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalTenants: 0,
    activeTenants: 0,
    multiSessionTenants: 0,
    totalUsers: 0
  });

  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getAllTenants(
        {
          page: 1,
          limit: 1000,
          search: undefined
        },
        { skipTenantHeader: isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id) }
      );

      if (response.success) {
        const allTenants = response.data;
        setStatistics({
          totalTenants: response.pagination?.totalItems || allTenants.length,
          activeTenants: allTenants.filter(t => {
            const status = t.status ? String(t.status).toUpperCase() : undefined;
            return status === 'ACTIVE' || t.is_active === true;
          }).length,
          multiSessionTenants: allTenants.filter(t => t.absensi_mode === 'MULTI_SESI').length,
          totalUsers: allTenants.reduce((sum, t) => sum + (t.current_users || t.user_count || t.total_users || 0), 0)
        });
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, [user]);

  const fetchTenants = useCallback(async (page: number = currentPage, search: string = searchTerm, limit: number = itemsPerPage) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllTenants(
        {
          page,
          limit,
          search: search || undefined
        },
        { skipTenantHeader: isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id) }
      );

      if (response.success) {
        const baseTenants = response.data;
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
              const current = subs.find((s) => s.status === 'ACTIVE')
                || subs.find((s) => s.status === 'TRIAL')
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

        setTenants(enriched);

        if (response.pagination) {
          setCurrentPage(response.pagination.currentPage);
          setTotalPages(response.pagination.totalPages);
        } else {
          setTotalPages(1);
        }

        if (page === 1 && !search) {
          fetchStatistics();
        }
      } else {
        setError(response.message || 'Gagal memuat data tenant');
        toast.error('Gagal memuat data tenant');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data tenant';
      console.error('Error fetching tenants:', err);
      setError(message);
      toast.error('Gagal memuat data tenant');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, user, fetchStatistics]);

  useEffect(() => {
    fetchTenants(currentPage, searchTerm);
  }, [currentPage, searchTerm, fetchTenants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTenants(1, searchTerm);
  };

  const handleCreateTenant = () => {
    setEditingTenantId(null);
    setShowForm(true);
  };

  const handleEditTenant = (tenantId: string) => {
    setEditingTenantId(tenantId);
    setShowForm(true);
  };

  const handleViewTenantDetail = (tenantId: string) => {
    navigate(`/tenants/${tenantId}`);
  };

  const handleOpenDeleteModal = (tenantId: string, tenantName: string) => {
    setDeleteTarget({ id: tenantId, name: tenantName });
    setDeleteModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleConfirmDelete = async (confirmationName: string) => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const response = await deleteTenant(deleteTarget.id, confirmationName, true);
      
      if (response.success) {
        toast.success('Tenant berhasil dihapus');
        fetchTenants();
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      } else {
        toast.error(response.message || 'Gagal menghapus tenant');
      }
    } catch (err: unknown) {
      console.error('Error deleting tenant:', err);
      const message = err instanceof Error ? err.message : 'Gagal menghapus tenant';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTenantId(null);
    fetchTenants();
    toast.success(editingTenantId ? 'Tenant berhasil diperbarui' : 'Tenant berhasil ditambahkan');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTenantId(null);
  };

  const handleAssistLogin = async (tenantId: string, tenantName: string) => {
    const ok = await confirm({
      title: 'Assist Login',
      description: `Apakah Anda yakin ingin masuk ke sistem atas nama Administrator Sekolah dari "${tenantName}"?`,
      confirmText: 'Ya, Assist Login',
      cancelText: 'Batal',
      style: 'info'
    });

    if (!ok) return;

    const toastId = toast.loading('Menyiapkan sesi bantuan...');
    try {
      // 1. Dapatkan state zustand persist asli
      const currentStorage = localStorage.getItem('auth-storage');
      if (currentStorage) {
        localStorage.setItem('support_auth_state', currentStorage);
      }

      // 2. Hubungi backend untuk impersonate
      const response = await axiosInstance.post('/auth/impersonate', { tenantId });
      
      if (response.data && response.data.success) {
        const { user: impersonatedUser, token, refreshToken } = response.data.data;

        // 3. Simpan token-token ke local storage standar
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        if (impersonatedUser.tenant_id) {
          localStorage.setItem('tenant_id', impersonatedUser.tenant_id);
        }

        // 4. Tulis langsung sesi asisten baru ke 'auth-storage' secara atomik
        const newAuthStorage = {
          state: {
            isAuthenticated: true,
            user: impersonatedUser,
            subscription: null,
            token: token,
            refreshToken: refreshToken,
            tenantId: impersonatedUser.tenant_id || null,
            tenantMode: impersonatedUser.tenant?.absensi_mode ?? null
          },
          version: 0
        };
        localStorage.setItem('auth-storage', JSON.stringify(newAuthStorage));

        toast.success(`Berhasil assist login sebagai Admin "${tenantName}"`, { id: toastId });
        
        // 5. Alihkan ke dasbor sekolah target secara instan untuk menghindari background race condition
        window.location.href = '/';
      } else {
        toast.error(response.data?.message || 'Gagal menyiapkan sesi bantuan', { id: toastId });
      }
    } catch (err: any) {
      console.error('Assist login error:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal terhubung ke server';
      toast.error(msg, { id: toastId });
    }
  };

  const handleRequestDeletion = async (tenantId: string, tenantName: string) => {
    const ok = await confirm({
      title: 'Request Deletion',
      description: `Apakah Anda yakin ingin meminta penghapusan untuk tenant "${tenantName}"? Tenant akan dihapus secara permanen dalam 30 hari.`,
      confirmText: 'Request Deletion',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (!ok) return;

    try {
      const response = await requestDeletion(tenantId);
      if (response.success) {
        toast.success('Permintaan penghapusan berhasil diajukan');
        fetchTenants();
      } else {
        toast.error(response.message || 'Gagal mengajukan permintaan penghapusan');
      }
    } catch (err: any) {
      console.error('Error requesting deletion:', err);
      const message = err?.response?.data?.message || err.message || 'Gagal mengajukan permintaan penghapusan';
      toast.error(message);
    }
    setActiveDropdownId(null);
  };

  const handleCancelDeletion = async (tenantId: string, tenantName: string) => {
    const ok = await confirm({
      title: 'Batalkan Penghapusan',
      description: `Apakah Anda yakin ingin membatalkan penghapusan untuk tenant "${tenantName}"?`,
      confirmText: 'Batalkan Penghapusan',
      cancelText: 'Tutup',
      style: 'info',
    });
    if (!ok) return;

    try {
      const response = await cancelDeletion(tenantId);
      if (response.success) {
        toast.success('Penghapusan berhasil dibatalkan');
        fetchTenants();
      } else {
        toast.error(response.message || 'Gagal membatalkan penghapusan');
      }
    } catch (err: any) {
      console.error('Error cancelling deletion:', err);
      const message = err?.response?.data?.message || err.message || 'Gagal membatalkan penghapusan';
      toast.error(message);
    }
    setActiveDropdownId(null);
  };

  const calculateRetentionDays = (dateString?: string | null) => {
    if (!dateString || String(dateString) === 'null' || String(dateString) === 'undefined') return 0;
    const requestDate = new Date(dateString);
    if (isNaN(requestDate.getTime())) return 0;
    const deletionDate = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const result = Math.max(0, diffDays);
    return isNaN(result) ? 0 : result;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSubscriptionExpiring = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  // Stats List untuk layout standardisasi
  const statsList = useMemo(() => {
    return [
      {
        title: "Total Tenant",
        value: statistics.totalTenants,
        icon: <Eye className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600"
      },
      {
        title: "Tenant Aktif",
        value: statistics.activeTenants,
        icon: <CheckCircle className="h-4 w-4 text-white" />,
        gradient: "from-green-500 to-emerald-600"
      },
      {
        title: "Mode Multi Sesi",
        value: statistics.multiSessionTenants,
        icon: <Calendar className="h-4 w-4 text-white" />,
        gradient: "from-cyan-500 to-blue-600"
      },
      {
        title: "Total Pengguna",
        value: statistics.totalUsers,
        icon: <Clock className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-violet-600"
      }
    ];
  }, [statistics]);

  // Definisi kolom Table premium
  const columns: Column[] = useMemo(() => [
    {
      key: 'name',
      label: 'Tenant',
      render: (_: any, tenant: Tenant) => (
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-200">{tenant.name}</div>
          {tenant.domain && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{tenant.domain}</div>
          )}
        </div>
      )
    },
    {
      key: 'absensi_mode',
      label: 'Mode Absensi',
      render: (value: any) => (
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
            value === 'MULTI_SESI' 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {value === 'MULTI_SESI' ? 'Multi Sesi' : 'Simple'}
          </span>
          <div className="text-[10px] text-gray-400 mt-1 font-medium">
            {value === 'MULTI_SESI' 
              ? 'Fitur lengkap & dinamis' 
              : 'Gerbang & rekap dasar'
            }
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Kontak',
      render: (_: any, tenant: Tenant) => (
        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium space-y-0.5">
          {tenant.email && <div>{tenant.email}</div>}
          {tenant.phone && <div className="text-gray-400">{tenant.phone}</div>}
          {!tenant.email && !tenant.phone && (
            <div className="text-gray-400 italic">Tidak ada kontak</div>
          )}
        </div>
      )
    },
    {
      key: 'stats',
      label: 'Statistik & Subscription',
      render: (_: any, tenant: Tenant) => (
        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium space-y-0.5">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{tenant.total_users || tenant.current_users || tenant.user_count || 0} Pengguna</div>
          <div className="text-gray-400">
            {tenant.subscription_plan ? `Plan: ${tenant.subscription_plan}` : 'Tidak ada langganan'}
          </div>
          {tenant.subscription_expires_at && (
            <div className={`text-[10px] font-bold ${isSubscriptionExpiring(tenant.subscription_expires_at) ? 'text-rose-500 animate-pulse' : 'text-gray-400'}`}>
              Berakhir: {formatDate(tenant.subscription_expires_at)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, tenant: Tenant) => {
        const rawStatus = tenant.status;
        const status = rawStatus ? String(rawStatus).toUpperCase() : undefined;
        const isPendingDeletion = status === 'PENDING_DELETION' || (tenant as any).deletion_requested_at;
        
        if (isPendingDeletion) {
          const daysLeft = calculateRetentionDays((tenant as any).deletion_requested_at);
          return (
            <div className="flex flex-col gap-1">
               <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                <Clock className="w-3 h-3 mr-1" />
                Pending Deletion
              </span>
              <span className="text-[10px] text-rose-500 font-bold ml-1">
                {daysLeft} hari lagi
              </span>
            </div>
          );
        }

        const isActive = status === 'ACTIVE' || tenant.is_active === true;
        const isSuspended = status === 'SUSPENDED';
        const badgeClass = isActive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
          : isSuspended
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        const label = isActive ? 'Aktif' : isSuspended ? 'Ditangguhkan' : 'Nonaktif';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_: any, tenant: Tenant) => (
        <div className="relative action-dropdown-container flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdownId(activeDropdownId === tenant.id ? null : tenant.id);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          {activeDropdownId === tenant.id && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-950 rounded-xl shadow-xl z-50 border border-gray-100 dark:border-gray-800 action-dropdown py-1 text-left">
              <button
                onClick={() => handleAssistLogin(tenant.id, tenant.name)}
                className="flex items-center w-full px-4 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10"
              >
                <ShieldCheck className="mr-2 h-4 w-4" /> Assist Login
              </button>
              
              <button
                onClick={() => handleViewTenantDetail(tenant.id)}
                className="flex items-center w-full px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Eye className="mr-2 h-4 w-4 text-slate-400" /> Detail Tenant
              </button>
              <button
                onClick={() => handleEditTenant(tenant.id)}
                className="flex items-center w-full px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Sunting Data
              </button>
              
              {(tenant as any).deletion_requested_at ? (
                 <button
                  onClick={() => handleCancelDeletion(tenant.id, tenant.name)}
                  className="flex items-center w-full px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Batalkan Hapus
                </button>
              ) : (
                <button
                  onClick={() => handleRequestDeletion(tenant.id, tenant.name)}
                  className="flex items-center w-full px-4 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10"
                >
                  <Clock className="mr-2 h-4 w-4" /> Ajukan Penghapusan
                </button>
              )}
              
              {isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id) && (
                <>
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                  
                  <button
                    onClick={() => handleOpenDeleteModal(tenant.id, tenant.name)}
                    className="flex items-center w-full px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Paksa Hapus E2E
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )
    }
  ], [activeDropdownId, calculateRetentionDays, formatDate, isSubscriptionExpiring]);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8 space-y-2">
        <p className="font-semibold">{error}</p>
        <button
          onClick={() => fetchTenants()}
          className="text-indigo-600 hover:text-indigo-800 font-bold underline text-sm"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <SuperAdminPageLayout
      title="Manajemen Tenant Sekolah"
      description="Kelola pendaftaran sekolah, konfigurasi mode absensi, dan lisensi langganan platform Absenta.id."
      breadcrumbs={[
        { label: 'Kelola Tenant' }
      ]}
      stats={statsList}
      isLoading={loading && tenants.length === 0}
      hardeningModuleKey="tenantspage"
      instruction={{
        title: 'Panduan Manajemen Tenant',
        description: 'Halaman ini digunakan untuk mengelola seluruh institusi (sekolah) yang terdaftar di platform.',
        items: [
          { text: 'Gunakan fitur Assist Login untuk masuk ke sistem sebagai Admin sekolah tertentu tanpa password.' },
          { text: 'Mode "Multi Sesi" memberikan fitur jadwal KBM dan rekap yang lebih kompleks.' },
          { text: 'Tenant yang diajukan penghapusan akan tetap berada di database selama 30 hari sebelum dihapus permanen.' }
        ]
      }}
    >
      <div className="flex-1 bg-transparent">
        <Table
          columns={columns}
          data={tenants}
          loading={loading}
          emptyMessage="Tidak ada tenant sekolah ditemukan."
          compact={true}
          className="border-none"
          pagination={{
            currentPage,
            totalPages,
            totalItems: statistics.totalTenants,
            itemsPerPage,
            onPageChange: (page) => {
              setCurrentPage(page);
              fetchTenants(page, searchTerm, itemsPerPage);
            },
            onLimitChange: (limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
              fetchTenants(1, searchTerm, limit);
            }
          }}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTenants(1, searchTerm);
                }} 
                className="flex items-center gap-2"
              >
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau domain..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Cari tenant berdasarkan nama atau domain"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                  />
                </div>
                <Button type="submit" variant="toolbarOutline" size="toolbar" className="h-8 py-0">
                  Cari
                </Button>
              </form>

              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleCreateTenant}
                className="gap-1.5 h-8 py-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Tenant
              </Button>
            </div>
          }
        />
      </div>

      {/* Tenant Form Modal */}
      {showForm && (
        <Suspense fallback={<Loader />}>
          <TenantForm
            tenantId={editingTenantId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <Suspense fallback={<Loader />}>
          <DeleteTenantModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
            onConfirm={handleConfirmDelete}
            tenantName={deleteTarget.name}
            isLoading={isDeleting}
          />
        </Suspense>
      )}
    </SuperAdminPageLayout>
  );
}
