import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import useConfirm from '../../hooks/useConfirm';
import { useParams, useNavigate } from 'react-router-dom';
import { LogService } from '../../utils/LogService';
import { 
  Building2, 
  Users, 
  Activity, 
  RefreshCw, 
  Pause, 
  Play, 
  Trash2, 
  ShieldCheck, 
  Loader2,
  FileText,
  Clock,
  CreditCard,
  Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  Button,
  Badge,
  SectionCard,
  TabSwitcher
} from '../../components/ui';
import toast from 'react-hot-toast';
import { useExport } from '../../hooks/useExport';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { TenantInfoCard } from '@/components/superadmin/tenant-detail/TenantInfoCard';
import { TenantStatsOverview } from '@/components/superadmin/tenant-detail/TenantStatsOverview';
import { TenantBillingTab } from '@/components/superadmin/tenant-detail/TenantBillingTab';
import { TenantLogsTab } from '@/components/superadmin/tenant-detail/TenantLogsTab';
import { TenantUserModal } from '@/components/superadmin/tenant-detail/TenantUserModal';
import { TenantUsersTab } from '@/components/superadmin/tenant-detail/TenantUsersTab';
import { TenantAcademicTab } from '@/components/superadmin/tenant-detail/TenantAcademicTab';
import { TenantAttendanceTab } from '@/components/superadmin/tenant-detail/TenantAttendanceTab';

const TenantOverviewCharts = React.lazy(() => import('../../components/charts/TenantOverviewCharts'));

import {
  getTenantDetail,
  getTenantMetrics,
  getRecentActivities,
  getUserStatistics,
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
  suspendTenant,
  activateTenant,
  deleteTenant,
  getAcademicData,
  getAttendanceData,
  getTenantBilling,
  getTenantLogs,
  exportTenantData,
  type TenantDetail,
  type TenantMetrics,
  type RecentActivity,
  type ExportTenantDataParams,
  type UserStatistics,
  type TenantUser,
  type AcademicData,
  type AttendanceData,
  type BillingData,
  type ActivityLogItem,
  type GetTenantLogsParams,
  type CreateTenantUserRequest,
  type UpdateTenantUserRequest
} from '../../api/tenant-detail.api';
import { getRoles, type RoleItem } from '../../api/user.api';
import { formatDateTime } from '../../utils/layoutUtils';

// Zod Schema Validation Guard (Pilar 25)
const userFormSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().optional(),
  role_id: z.string().min(1, 'Role wajib dipilih'),
  status: z.enum(['ACTIVE', 'INACTIVE'])
});

export const TenantDetailPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'academic' | 'attendance' | 'billing' | 'logs'>('overview');

  // Logs filters & states
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [logsFilters, setLogsFilters] = useState<GetTenantLogsParams>({
    page: 1,
    limit: 10
  });
  const [logsStats, setLogsStats] = useState({
    totalLogs: 0,
    uniqueUsers: 0,
    uniqueActions: 0,
    dateRange: { from: '', to: '' }
  });

  // Users filter state
  const [usersFilters, setUsersFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    role: '',
    status: '',
    lastLogin: '',
    sortBy: 'name'
  });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  const { isExporting } = useExport({});

  // 1. Fetch Tenant Detail via React Query (Pilar 31)
  const { data: tenantDetail, isLoading: tenantLoading, refetch: refetchTenant } = useQuery<TenantDetail>({
    queryKey: ['tenant-detail', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getTenantDetail(tenantId);
      return res.data;
    },
    enabled: Boolean(tenantId)
  });

  // 2. Fetch Metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<TenantMetrics>({
    queryKey: ['tenant-metrics', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getTenantMetrics(tenantId);
      return res.data;
    },
    enabled: Boolean(tenantId)
  });

  // 3. Fetch User Statistics
  const { data: userStats } = useQuery<UserStatistics>({
    queryKey: ['tenant-user-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getUserStatistics(tenantId);
      return res.data;
    },
    enabled: Boolean(tenantId)
  });

  // 4. Fetch Recent Activities
  const { data: activities = [] } = useQuery<RecentActivity[]>({
    queryKey: ['tenant-activities', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await getRecentActivities(tenantId);
      return (Array.isArray(res.data) ? res.data : []) as RecentActivity[];
    },
    enabled: Boolean(tenantId)
  });

  // 5. Fetch Roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleItem[]>({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const res = await getRoles();
      return (res.data || []) as RoleItem[];
    }
  });

  // 6. Fetch Users (when users tab active)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users', tenantId, usersFilters],
    queryFn: async () => {
      if (!tenantId) return { users: [] };
      const res = await getTenantUsers(tenantId, usersFilters);
      return res.data || { users: [] };
    },
    enabled: Boolean(tenantId) && activeTab === 'users'
  });

  const users = useMemo(() => {
    return (Array.isArray(usersData?.users) ? usersData.users : []) as TenantUser[];
  }, [usersData]);

  // 7. Fetch Academic Data
  const { data: academicData, isLoading: academicLoading } = useQuery<AcademicData>({
    queryKey: ['tenant-academic', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getAcademicData(tenantId);
      return res.data;
    },
    enabled: Boolean(tenantId) && (activeTab === 'academic' || activeTab === 'overview')
  });

  // 8. Fetch Attendance Data
  const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery<AttendanceData>({
    queryKey: ['tenant-attendance', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getAttendanceData(tenantId, { period: 'weekly' });
      return res.data;
    },
    enabled: Boolean(tenantId) && (activeTab === 'attendance' || activeTab === 'overview')
  });

  // 9. Fetch Billing Data
  const { data: billingData, isLoading: billingLoading } = useQuery<BillingData>({
    queryKey: ['tenant-billing', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');
      const res = await getTenantBilling(tenantId);
      return res.data;
    },
    enabled: Boolean(tenantId) && activeTab === 'billing'
  });

  // 10. Fetch Logs Data
  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['tenant-logs', tenantId, logsFilters],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await getTenantLogs(tenantId, logsFilters);
      return res.data;
    },
    enabled: Boolean(tenantId) && activeTab === 'logs'
  });

  const logsData = useMemo(() => {
    return (logsResponse?.logs || [])?.map((l: Partial<ActivityLogItem>, idx: number) => ({
      id: l.id || `log-${idx}`,
      action: l.action || '-',
      entity: l.entity || '-',
      entity_id: l.entity_id || null,
      timestamp: l.timestamp || new Date().toISOString(),
      metadata: l.metadata || null,
      ip_address: l.ip_address,
      user: l.user
    })) as ActivityLogItem[];
  }, [logsResponse]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kelola Tenant' },
    { label: tenantDetail?.name || 'Detail Tenant' }
  ], [tenantDetail]);

  const instruction = useMemo(() => ({
    title: 'Panduan Detail Tenant',
    description: 'Halaman ini memberikan visibilitas penuh terhadap operasional satu sekolah spesifik.',
    items: [
      { text: 'Tab "Overview" menampilkan metrik performa absensi dan statistik pengguna harian.' },
      { text: 'Gunakan tab "Akademik" untuk memantau data master (guru, kelas, siswa) yang terdaftar.' },
      { text: 'Tab "Log Aktivitas" mencatat jejak aktivitas sistem yang dilakukan oleh staf di sekolah ini.' },
      { text: 'Anda dapat mengelola akun administrator sekolah langsung dari tab "Pengguna".' }
    ]
  }), []);

  const headerStats = useMemo(() => [
    {
      title: "Total Pengguna",
      value: (userStats?.totalUsers ?? metrics?.users?.total) || 0,
      icon: <Users size={14} className="text-white" />,
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      title: "Total Siswa",
      value: (metrics?.users?.siswa ?? academicData?.statistics?.totalSiswa) || 0,
      icon: <Users size={14} className="text-white" />,
      gradient: "from-purple-600 to-indigo-700"
    },
    {
      title: "Total Guru",
      value: (metrics?.users?.guru ?? academicData?.statistics?.totalGuru) || 0,
      icon: <Users size={14} className="text-white" />,
      gradient: "from-amber-600 to-orange-600"
    },
    {
      title: "Total Kelas",
      value: (metrics?.academic?.kelas ?? academicData?.statistics?.totalKelas) || 0,
      icon: <Building2 size={14} className="text-white" />,
      gradient: "from-teal-600 to-emerald-600"
    }
  ], [userStats, metrics, academicData]);

  const handleExportData = async (
    entities: string[],
    format: 'JSON' | 'CSV' | 'EXCEL',
    dateFrom?: string,
    dateTo?: string
  ) => {
    if (!tenantId) return;
    try {
      const params: ExportTenantDataParams = { entities, format, date_from: dateFrom, date_to: dateTo };
      const response = await exportTenantData(tenantId, params);
      if (response.success) {
        if (format === 'JSON') {
          const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `tenant-${tenantDetail?.name || tenantId}-export.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (response.data.download_url) {
          const link = document.createElement('a');
          link.href = response.data.download_url;
          link.download = `tenant-${tenantDetail?.name || tenantId}-export.${format.toLowerCase()}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toast.success(`Data berhasil diekspor dalam format ${format}`);
      } else {
        toast.error(response.message || 'Gagal mengekspor data');
      }
    } catch (error) {
      LogService.error('Export error:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    }
  };

  // Tenant lifecycle mutation (Pilar 32 Cache Invalidation)
  const tenantActionMutation = useMutation({
    mutationFn: async (action: 'suspend' | 'activate' | 'delete') => {
      if (!tenantId) return;
      if (action === 'suspend') return suspendTenant(tenantId, { reason: 'Admin suspended via UI' });
      if (action === 'activate') return activateTenant(tenantId);
      if (action === 'delete') return deleteTenant(tenantId);
    },
    onSuccess: (_, action) => {
      toast.success(`Tenant berhasil di-${action}`);
      if (action === 'delete') {
        navigate('/tenants');
      } else {
        queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantId] });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memproses aksi tenant';
      toast.error(msg);
    }
  });

  const handleTenantAction = async (action: 'suspend' | 'activate' | 'delete') => {
    const isDelete = action === 'delete';
    const ok = await confirm({
      title: `Konfirmasi ${action.toUpperCase()} Tenant`,
      description: isDelete
        ? `Hapus tenant "${tenantDetail?.name}" secara permanen? Semua data akademik sekolah akan dihapus.`
        : `Apakah Anda yakin ingin melakukan ${action} pada tenant "${tenantDetail?.name}"?`,
      confirmText: isDelete ? 'Hapus Permanen' : 'Lanjutkan',
      cancelText: 'Batal',
      style: isDelete ? 'danger' : 'primary'
    });
    if (ok) {
      tenantActionMutation.mutate(action);
    }
  };

  const handleAssistLogin = useCallback(() => {
    if (!tenantDetail) return;
    toast.success(`Memulai sesi assist login untuk ${tenantDetail.name}...`);
  }, [tenantDetail]);

  const handleAddUser = useCallback(() => {
    setSelectedUser(null);
    setUserFormData({ full_name: '', email: '', password: '', role_id: '', status: 'ACTIVE' });
    setShowUserModal(true);
  }, []);

  const handleEditUser = useCallback((u: TenantUser) => {
    setSelectedUser(u);
    setUserFormData({
      full_name: u.full_name,
      email: u.email,
      password: '',
      role_id: u.role_id,
      status: u.status as 'ACTIVE' | 'INACTIVE'
    });
    setShowUserModal(true);
  }, []);

  // User Mutation (Pilar 32 Cache Invalidation)
  const userMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      const parsed = userFormSchema.safeParse(userFormData);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Data pengguna tidak valid');
      }
      if (selectedUser) {
        const payload: UpdateTenantUserRequest = {
          full_name: userFormData.full_name,
          email: userFormData.email,
          role_id: userFormData.role_id,
          status: userFormData.status,
          ...(userFormData.password ? { password: userFormData.password } : {})
        };
        return updateTenantUser(tenantId, selectedUser.id, payload);
      } else {
        const payload: CreateTenantUserRequest = {
          full_name: userFormData.full_name,
          email: userFormData.email,
          password: userFormData.password || 'Temporary@123',
          role_id: userFormData.role_id,
          status: userFormData.status
        };
        return createTenantUser(tenantId, payload);
      }
    },
    onSuccess: () => {
      toast.success(selectedUser ? 'Pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
      setShowUserModal(false);
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-user-stats', tenantId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pengguna';
      toast.error(msg);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!tenantId) throw new Error('Tenant ID missing');
      return deleteTenantUser(tenantId, userId);
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-user-stats', tenantId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pengguna';
      toast.error(msg);
    }
  });

  const handleDeleteUser = useCallback(async (u: TenantUser) => {
    const ok = await confirm({
      title: 'Hapus Pengguna',
      description: `Hapus akun "${u.full_name}" (${u.email})?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      deleteUserMutation.mutate(u.id);
    }
  }, [confirm, deleteUserMutation]);

  const usersDisplay = useMemo(() => {
    const page = usersFilters.page || 1;
    const limit = usersFilters.limit || 10;
    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { list: users, pagination: { page, limit, total, totalPages } };
  }, [users, usersFilters]);

  const tabOptions = useMemo(() => [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Pengguna' },
    { key: 'academic', label: 'Akademik' },
    { key: 'attendance', label: 'Absensi' },
    { key: 'billing', label: 'Penagihan' },
    { key: 'logs', label: 'Log Aktivitas' },
  ], []);

  if (tenantLoading && !tenantDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Profil Tenant...</p>
      </div>
    );
  }

  if (!tenantDetail) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs font-bold">
        Tenant tidak ditemukan atau telah dihapus.
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title={tenantDetail.name}
        description="Detail profil, metrik performa, dan manajemen data operasional tenant sekolah."
        breadcrumbs={breadcrumbs}
        stats={headerStats}
        isLoadingStats={tenantLoading}
        instruction={instruction}
        hardeningModuleKey="superadmin_tenant_detail"
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Action Toolbar Section */}
            <SectionCard
              title="Aksi Cepat Manajemen Tenant"
              fullWidth
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={handleAssistLogin}
                    className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-black text-white"
                  >
                    <ShieldCheck size={13} className="mr-1.5" /> Assist Login
                  </Button>

                  {tenantDetail?.status === 'ACTIVE' ? (
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => handleTenantAction('suspend')}
                      className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Pause size={13} className="mr-1.5" /> Suspend
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="toolbarOutline"
                      size="toolbar"
                      onClick={() => handleTenantAction('activate')}
                      className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <Play size={13} className="mr-1.5" /> Activate
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => handleTenantAction('delete')}
                    className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={13} className="mr-1.5" /> Delete
                  </Button>
                </div>
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge variant={tenantDetail?.status === 'ACTIVE' ? 'success' : 'destructive'} className="h-8 px-4 font-bold uppercase tracking-wider text-[10px]">
                    Status Tenant: {tenantDetail?.status || 'UNKNOWN'}
                  </Badge>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => refetchTenant()}
                    className="rounded-xl h-8"
                  >
                    <RefreshCw size={12} className={tenantLoading ? 'animate-spin mr-1' : 'mr-1'} /> Segarkan Data
                  </Button>
                </div>
              </div>
            </SectionCard>

            {/* 1. Basic Info Card */}
            <TenantInfoCard tenantDetail={tenantDetail} />

            {/* 2. Reusable Tab Switcher (Pilar 18) */}
            <div className="w-full min-w-0 max-w-full">
              <TabSwitcher
                tabs={tabOptions}
                activeTab={activeTab}
                onChange={(key) => setActiveTab(key as typeof activeTab)}
              />
            </div>

            {/* 3. Tab Contents */}
            <div className="mt-4 w-full min-w-0 max-w-full">
              {activeTab === 'overview' && (
                <div className="space-y-6 w-full min-w-0 max-w-full">
                  <TenantStatsOverview
                    metrics={metrics || null}
                    userStats={userStats || null}
                    academicData={academicData || null}
                    attendanceData={attendanceData || null}
                    metricsLoading={metricsLoading}
                    attendanceLoading={attendanceLoading}
                  />
                  <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat diagram analitik...</div>}>
                    <TenantOverviewCharts userStats={userStats || null} metrics={metrics || null} tenantId={tenantId!} />
                  </React.Suspense>

                  <SectionCard title="Aktivitas Terkini di Tenant" icon={Activity} fullWidth>
                    <div className="space-y-3 w-full">
                      {(activities ?? []).slice(0, 5)?.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
                          <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{activity.description}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">oleh {activity.user_name} • {formatDateTime(activity.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              {activeTab === 'users' && (
                <TenantUsersTab
                  usersDisplay={usersDisplay}
                  usersFilters={usersFilters}
                  setUsersFilters={setUsersFilters}
                  usersLoading={usersLoading}
                  onAddUser={handleAddUser}
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {activeTab === 'academic' && (
                <TenantAcademicTab
                  academicData={academicData || null}
                  academicLoading={academicLoading}
                  onExport={(format) => handleExportData(['academic'], format)}
                  isExporting={isExporting}
                />
              )}

              {activeTab === 'attendance' && (
                <TenantAttendanceTab
                  attendanceData={attendanceData || null}
                  attendanceLoading={attendanceLoading}
                  onRefresh={() => refetchAttendance()}
                  tenantId={tenantId || ''}
                />
              )}

              {activeTab === 'billing' && (
                <TenantBillingTab billingData={billingData || null} billingLoading={billingLoading} />
              )}

              {activeTab === 'logs' && (
                <TenantLogsTab
                  logsData={logsData}
                  logsLoading={logsLoading}
                  logsStats={logsStats}
                  logsFilters={logsFilters}
                  setLogsFilters={setLogsFilters}
                  loadTenantLogs={async (filters) => {
                    if (filters) setLogsFilters(prev => ({ ...prev, ...filters }));
                    refetchLogs();
                  }}
                  users={users}
                  logsPagination={logsPagination}
                />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Modal Pengguna */}
        <TenantUserModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          selectedUser={selectedUser}
          userFormData={userFormData}
          setUserFormData={setUserFormData}
          onSubmit={() => userMutation.mutate()}
          loading={userMutation.isPending}
          roles={roles}
          rolesLoading={rolesLoading}
        />
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default TenantDetailPage;
