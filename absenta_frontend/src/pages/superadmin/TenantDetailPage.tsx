import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CreditCard,
  Loader
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import axiosInstance from '../../lib/axiosInstance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Badge,
  SectionCard
} from '../../components/ui';
import toast from 'react-hot-toast';
import { useExport } from '../../hooks/useExport';
import { useCache } from '../../hooks/useCache';
import { useErrorHandler, isRetryableError } from '../../hooks/useErrorHandler';
import { ExportButton } from '../../components/ExportButton';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
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
  type GetTenantLogsParams
} from '../../api/tenant-detail.api';
import { getRoles, type RoleItem } from '../../api/user.api';
import type { CreateTenantUserRequest, UpdateTenantUserRequest } from '../../api/tenant-detail.api';
import { getStatusBadgeClass, getStatusLabel, formatDateShort, formatCurrency, formatDateTime } from '../../utils/layoutUtils';

export default function TenantDetailPage() {
  const confirm = useConfirm();
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();

  // State management
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersAll, setUsersAll] = useState<TenantUser[]>([]);
  const [usersAllLoading, setUsersAllLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'academic' | 'attendance' | 'billing' | 'logs'>('overview');
  const [usersLoading, setUsersLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Academic data state
  const [academicData, setAcademicData] = useState<AcademicData | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);

  // Attendance data state
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Partial<Record<'metrics'|'activities'|'logs'|'attendance'|'billing'|'users', Date>>>({});
  
  const updateTimestamp = (type: 'metrics' | 'activities' | 'logs' | 'attendance' | 'billing' | 'users') => {
    setLastUpdated(prev => ({ ...prev, [type]: new Date() }));
  };

  // Billing data state
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Logs data state
  const [logsData, setLogsData] = useState<ActivityLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
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

  const breadcrumbs = useMemo(() => [
    { label: 'Kelola Tenant', href: '/tenants' },
    { label: tenantDetail?.name || 'Detail Tenant' }
  ], [tenantDetail]);

  const instruction = useMemo(() => ({
    title: 'Panduan Detail Tenant',
    description: 'Halaman ini memberikan visibilitas penuh terhadap operasional satu sekolah spesifik.',
    items: [
      { text: 'Tab "Overview" menampilkan metrik performa absensi dan statistik pengguna harian.' },
      { text: 'Gunakan tab "Akademik" untuk memantau data master (guru, kelas, siswa) yang terdaftar.' },
      { text: 'Tab "Logs" mencatat jejak aktivitas sistem yang dilakukan oleh staf di sekolah ini.' },
      { text: 'Anda dapat mengelola akun administrator sekolah langsung dari tab "Pengguna".' }
    ]
  }), []);

  // Roles data state
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

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
  const [userFormLoading, setUserFormLoading] = useState(false);

  const { isExporting } = useExport({});
  const cache = useCache<unknown>({ ttl: 5 * 60 * 1000 });
  const { withRetry, withErrorBoundary } = useErrorHandler();

  const headerStats = useMemo(() => [
    {
      title: "Total Pengguna",
      value: (userStats?.totalUsers ?? metrics?.users?.total) || 0,
      icon: <Users size={14} />,
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Total Siswa",
      value: (metrics?.users?.siswa ?? academicData?.statistics?.totalSiswa) || 0,
      icon: <Users size={14} />,
      gradient: "from-purple-500 to-indigo-700"
    },
    {
      title: "Total Guru",
      value: (metrics?.users?.guru ?? academicData?.statistics?.totalGuru) || 0,
      icon: <Users size={14} />,
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "Total Kelas",
      value: (metrics?.academic?.kelas ?? academicData?.statistics?.totalKelas) || 0,
      icon: <Building2 size={14} />,
      gradient: "from-teal-500 to-emerald-600"
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

  const loadTenantDetail = useCallback(async () => {
    const cacheKey = `tenant-detail-${tenantId}`;
    const cached = cache.get(cacheKey);
    if (cached.exists && cached.data && !cached.isStale) {
      setTenantDetail(cached.data as TenantDetail);
      return;
    }
    const fetchWithRetry = withErrorBoundary(() => withRetry(() => getTenantDetail(tenantId!), { maxRetries: 3 }));
    try {
      const response = await fetchWithRetry();
      if (response?.data) {
        setTenantDetail(response.data);
        cache.set(cacheKey, response.data);
      }
    } catch {
      if (cached.exists && cached.data) {
        setTenantDetail(cached.data as TenantDetail);
        toast('Menggunakan data tersimpan', { icon: '⚠️' });
      }
    }
  }, [tenantId, cache, withErrorBoundary, withRetry]);

  const loadTenantMetrics = useCallback(async () => {
    const cacheKey = `tenant-metrics-${tenantId}`;
    const cached = cache.get(cacheKey);
    if (cached.exists && cached.data && !cached.isStale) {
      setMetrics(cached.data as TenantMetrics);
      return;
    }
    const fetchWithRetry = withErrorBoundary(() => withRetry(() => getTenantMetrics(tenantId!), { maxRetries: 3 }));
    try {
      const response = await fetchWithRetry();
      if (response?.data) {
        setMetrics(response.data);
        cache.set(cacheKey, response.data);
      }
    } catch {
      if (cached.exists && cached.data) setMetrics(cached.data as TenantMetrics);
    }
  }, [tenantId, cache, withErrorBoundary, withRetry]);

  const loadRecentActivities = useCallback(async () => {
    try {
      const response = await getRecentActivities(tenantId!);
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setActivities([]);
    }
  }, [tenantId]);

  const loadUserStatistics = useCallback(async () => {
    try {
      const response = await getUserStatistics(tenantId!);
      setUserStats(response.data);
    } catch (error) {}
  }, [tenantId]);

  const loadTenantUsers = useCallback(async () => {
    if (!tenantId) return;
    try {
      setUsersLoading(true);
      const response = await getTenantUsers(tenantId, usersFilters);
      setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
    } catch (error) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId, usersFilters]);

  const loadAllTenantUsersForStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      setUsersAllLoading(true);
      const response = await getTenantUsers(tenantId, { page: 1, limit: 2000 });
      setUsersAll(Array.isArray(response.data?.users) ? response.data.users : []);
    } catch (error) {
      setUsersAll([]);
    } finally {
      setUsersAllLoading(false);
    }
  }, [tenantId]);

  const applyUserTableFiltersAndSorting = useCallback((list: TenantUser[], filters: typeof usersFilters): TenantUser[] => {
    let result = [...list];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(u => (u.full_name?.toLowerCase().includes(q)) || (u.email?.toLowerCase().includes(q)));
    }
    if (filters.role) result = result.filter(u => u.role_name === filters.role);
    if (filters.status) {
      const target = filters.status === 'active' ? 'ACTIVE' : filters.status === 'inactive' ? 'INACTIVE' : null;
      if (target) result = result.filter(u => u.status === target);
      else result = [];
    }
    const sortBy = filters.sortBy || 'name';
    result.sort((a, b) => {
      const safeStr = (s?: string) => (s || '').toLowerCase();
      const safeDate = (s?: string) => (s ? new Date(s).getTime() : 0);
      switch (sortBy) {
        case 'name_desc': return safeStr(b.full_name).localeCompare(safeStr(a.full_name));
        case 'created_at': return safeDate(b.created_at) - safeDate(a.created_at);
        case 'created_at_desc': return safeDate(a.created_at) - safeDate(b.created_at);
        case 'last_login': return safeDate(b.last_login) - safeDate(a.last_login);
        case 'role': return safeStr(a.role_name).localeCompare(safeStr(b.role_name));
        default: return safeStr(a.full_name).localeCompare(safeStr(b.full_name));
      }
    });
    return result;
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && tenantId) {
      loadTenantUsers();
      loadAllTenantUsersForStats();
    }
  }, [activeTab, tenantId, usersFilters, loadTenantUsers, loadAllTenantUsersForStats]);

  const usersDisplay = useMemo(() => {
    const page = usersFilters.page || 1;
    const limit = usersFilters.limit || 10;
    const source = usersAll.length > 0 ? usersAll : users;
    const filtered = applyUserTableFiltersAndSorting(source, usersFilters);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    return { list: filtered.slice(start, end), pagination: { page, limit, total, totalPages } };
  }, [usersAll, usersFilters, users, applyUserTableFiltersAndSorting]);

  const loadRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const response = await getRoles();
      setRoles(response.data);
    } catch (error) {} finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.allSettled([
          loadTenantDetail(),
          loadTenantMetrics(),
          loadRecentActivities(),
          loadUserStatistics(),
          loadRoles(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [tenantId]);

  const loadAcademicData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setAcademicLoading(true);
      const response = await getAcademicData(tenantId);
      setAcademicData(response.data);
    } catch (error) {
      toast.error('Gagal memuat data akademik');
    } finally {
      setAcademicLoading(false);
    }
  }, [tenantId]);

  const loadAttendanceData = useCallback(async (options = {}) => {
    if (!tenantId) return;
    try {
      setAttendanceLoading(true);
      const response = await getAttendanceData(tenantId, options);
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Gagal memuat data absensi');
    } finally {
      setAttendanceLoading(false);
    }
  }, [tenantId]);

  const loadBillingData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setBillingLoading(true);
      const response = await getTenantBilling(tenantId);
      setBillingData(response.data);
    } catch (error) {
      toast.error('Gagal memuat data billing');
    } finally {
      setBillingLoading(false);
    }
  }, [tenantId]);

  const normalizeLogItem = (log: Partial<ActivityLogItem>, idx: number): ActivityLogItem => {
    const obj = log || {};
    return {
      id: obj.id || `log-${idx}`,
      action: obj.action || '-',
      entity: obj.entity || '-',
      entity_id: obj.entity_id || null,
      timestamp: obj.timestamp || new Date().toISOString(),
      metadata: obj.metadata || null,
      ip_address: obj.ip_address,
      user: obj.user
    };
  };

  const loadTenantLogs = useCallback(async (filters?: Partial<GetTenantLogsParams>) => {
    if (!tenantId) return;
    try {
      setLogsLoading(true);
      const params = { ...logsFilters, ...filters };
      const response = await getTenantLogs(tenantId, params);
      const normalized = (response.data?.logs || []).map((l: Partial<ActivityLogItem>, idx: number) => normalizeLogItem(l, idx));
      setLogsData(normalized);
      setLogsPagination(response.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setLogsStats({
        totalLogs: response.data?.summary?.totalLogs || 0,
        uniqueUsers: response.data?.summary?.uniqueUsers || 0,
        uniqueActions: response.data?.summary?.uniqueActions || 0,
        dateRange: {
          from: response.data?.summary?.dateRange?.earliest || '',
          to: response.data?.summary?.dateRange?.latest || ''
        }
      });
      if (filters) setLogsFilters(prev => ({ ...prev, ...filters }));
    } catch (error) {
      toast.error('Gagal memuat log');
    } finally {
      setLogsLoading(false);
    }
  }, [tenantId, logsFilters]);

  useEffect(() => {
    if (activeTab === 'academic' && !academicData) loadAcademicData();
    if (activeTab === 'attendance' && !attendanceData) loadAttendanceData({ period: 'weekly' });
    if (activeTab === 'billing' && !billingData) loadBillingData().then(() => updateTimestamp('billing'));
    if (activeTab === 'logs') loadTenantLogs().then(() => updateTimestamp('logs'));
  }, [activeTab, tenantId]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserFormData({ full_name: '', email: '', password: '', role_id: '', status: 'ACTIVE' });
    setShowUserModal(true);
  };

  const handleEditUser = (user: TenantUser) => {
    setSelectedUser(user);
    const role = roles.find(r => r.name === user.role_name);
    setUserFormData({ full_name: user.full_name, email: user.email, password: '', role_id: role?.id || '', status: user.status });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({ title: 'Hapus Pengguna?', description: 'Tindakan ini permanen.', style: 'danger' });
    if (!ok) return;
    try {
      const res = await deleteTenantUser(tenantId!, userId);
      if (res.success) { toast.success('Berhasil dihapus'); loadTenantUsers(); }
    } catch (error) { toast.error('Gagal menghapus'); }
  };

  const handleUserFormSubmit = async () => {
    if (!userFormData.full_name || !userFormData.email || (!selectedUser && !userFormData.password)) {
      toast.error('Lengkapi semua field'); return;
    }
    setUserFormLoading(true);
    try {
      const roleName = roles.find(r => r.id === userFormData.role_id)?.name;
      const data: CreateTenantUserRequest | UpdateTenantUserRequest = { 
        full_name: userFormData.full_name, 
        name: userFormData.full_name, 
        email: userFormData.email, 
        status: userFormData.status, 
        role: roleName || ''
      };
      if (userFormData.password) (data as CreateTenantUserRequest).password = userFormData.password;
      const res = selectedUser ? await updateTenantUser(tenantId!, selectedUser.id, data as UpdateTenantUserRequest) : await createTenantUser(tenantId!, data as CreateTenantUserRequest);
      if (res.success) { toast.success('Berhasil disimpan'); setShowUserModal(false); loadTenantUsers(); }
    } catch (error) { toast.error('Gagal menyimpan'); } finally { setUserFormLoading(false); }
  };

  const handleAssistLogin = async () => {
    if (!tenantDetail) return;
    const ok = await confirm({ title: 'Assist Login', description: `Masuk sebagai admin ${tenantDetail.name}?`, style: 'info' });
    if (!ok) return;
    try {
      const res = await axiosInstance.post('/auth/impersonate', { tenantId });
      if (res.data?.success) {
        const { user: impUser, token, refreshToken } = res.data.data;
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('auth-storage', JSON.stringify({ state: { isAuthenticated: true, user: impUser, token, refreshToken, tenantId: impUser.tenant_id }, version: 0 }));
        window.location.href = '/';
      }
    } catch (error) { toast.error('Gagal assist login'); }
  };

  const handleTenantAction = async (action: 'suspend' | 'activate' | 'delete') => {
    const ok = await confirm({ title: 'Konfirmasi', description: `Yakin ingin ${action} tenant?`, style: action === 'delete' ? 'danger' : 'warning' });
    if (!ok) return;
    try {
      let res;
      if (action === 'suspend') res = await suspendTenant(tenantId!);
      else if (action === 'activate') res = await activateTenant(tenantId!);
      else res = await deleteTenant(tenantId!);
      if (res.success) {
        if (action === 'delete') navigate('/tenants');
        else loadTenantDetail();
        toast.success('Berhasil');
      }
    } catch (error) { toast.error('Gagal'); }
  };

  const formatLastUpdated = (date: Date) => {
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}d yang lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m yang lalu`;
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || !tenantDetail) {
    return <div className="flex items-center justify-center min-h-screen"><Loader className="animate-spin h-12 w-12 text-blue-600" /></div>;
  }

  const toolbarActions = (
    <div className="flex items-center space-x-2">
      <Badge variant={getStatusBadgeClass(tenantDetail.status, 'users') as any}>{getStatusLabel(tenantDetail.status, 'users')}</Badge>
      <Button variant="outline" size="sm" onClick={() => loadTenantDetail()} title="Refresh detail"><RefreshCw className="h-4 w-4" /></Button>
      <Button variant="primary" size="sm" onClick={handleAssistLogin} className="bg-sky-600 text-white"><ShieldCheck className="mr-2 h-4 w-4" /> Assist Login</Button>
      {tenantDetail.status === 'ACTIVE' ? 
        <Button variant="outline" size="sm" onClick={() => handleTenantAction('suspend')} className="text-orange-600"><Pause className="h-4 w-4" /></Button> :
        <Button variant="outline" size="sm" onClick={() => handleTenantAction('activate')} className="text-green-600"><Play className="h-4 w-4" /></Button>
      }
      {isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id) && 
        <Button variant="outline" size="sm" onClick={() => handleTenantAction('delete')} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
      }
    </div>
  );

  return (
    <SuperAdminPageLayout
      title={tenantDetail.name}
      description="Detail profil, metrik performa, dan manajemen data operasional tenant sekolah."
      breadcrumbs={breadcrumbs}
      stats={headerStats}
      isLoadingStats={loading}
      instruction={instruction}
      hardeningModuleKey="tenantdetailpage"
    >
      <div className="space-y-6">
        {/* Action Toolbar Section */}
        <SectionCard noPadding fullWidth className="bg-transparent border-none shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <Badge variant={tenantDetail?.status === 'ACTIVE' ? 'success' : 'destructive'} className="h-8 px-4 font-black uppercase tracking-widest text-[10px]">
                  {tenantDetail?.status || 'UNKNOWN'}
               </Badge>
               <Button onClick={() => loadTenantDetail()} variant="outline" size="sm" className="rounded-xl h-8">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
               </Button>
            </div>
            <div className="flex items-center gap-2">
               <Button onClick={() => handleAssistLogin()} variant="primary" size="sm" className="rounded-xl h-8 font-black uppercase tracking-widest text-[9px] bg-slate-900 hover:bg-black">
                  <ShieldCheck size={14} className="mr-2" /> Assist Login
               </Button>
               {tenantDetail?.status === 'ACTIVE' ? (
                 <Button onClick={() => handleTenantAction('suspend')} variant="outline" size="sm" className="rounded-xl h-8 font-black uppercase tracking-widest text-[9px] border-rose-100 text-rose-600 hover:bg-rose-50">
                    <Pause size={14} className="mr-2" /> Suspend
                 </Button>
               ) : (
                 <Button onClick={() => handleTenantAction('activate')} variant="outline" size="sm" className="rounded-xl h-8 font-black uppercase tracking-widest text-[9px] border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                    <Play size={14} className="mr-2" /> Activate
                 </Button>
               )}
               <Button onClick={() => handleTenantAction('delete')} variant="outline" size="sm" className="rounded-xl h-8 font-black uppercase tracking-widest text-[9px] border-red-100 text-red-600 hover:bg-red-50">
                  <Trash2 size={14} className="mr-2" /> Delete
               </Button>
            </div>
          </div>
        </SectionCard>

        {/* 1. Basic Info & Quick Stats */}
        <TenantInfoCard tenantDetail={tenantDetail} />
      </div>
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)}>
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex w-max max-w-full overflow-x-auto">
            <TabsTrigger value="overview" className="px-4 py-2 text-xs font-bold uppercase">Overview</TabsTrigger>
            <TabsTrigger value="users" className="px-4 py-2 text-xs font-bold uppercase">Pengguna</TabsTrigger>
            <TabsTrigger value="academic" className="px-4 py-2 text-xs font-bold uppercase">Akademik</TabsTrigger>
            <TabsTrigger value="attendance" className="px-4 py-2 text-xs font-bold uppercase">Absensi</TabsTrigger>
            <TabsTrigger value="billing" className="px-4 py-2 text-xs font-bold uppercase">Penagihan</TabsTrigger>
            <TabsTrigger value="logs" className="px-4 py-2 text-xs font-bold uppercase">Log</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <TenantStatsOverview
              metrics={metrics} userStats={userStats} academicData={academicData} attendanceData={attendanceData}
              metricsLoading={metricsLoading} attendanceLoading={attendanceLoading} formatLastUpdated={formatLastUpdated} lastUpdatedMetrics={lastUpdated.metrics}
            />
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader /></div>}>
              <TenantOverviewCharts userStats={userStats} metrics={metrics} tenantId={tenantId!} />
            </React.Suspense>
            <SectionCard title="Recent Activities" icon={Activity} fullWidth>
              <div className="space-y-3 w-full">
                {activities?.slice(0, 5)?.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Activity className="h-4 w-4 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-500">oleh {activity.user_name} • {formatDateTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'users' && (
          <TenantUsersTab
            usersDisplay={usersDisplay} usersFilters={usersFilters} setUsersFilters={setUsersFilters}
            usersLoading={usersLoading} onAddUser={handleAddUser} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'academic' && (
          <TenantAcademicTab
            academicData={academicData} academicLoading={academicLoading}
            onExport={(format) => handleExportData(['academic'], format)} isExporting={isExporting}
          />
        )}

        {activeTab === 'attendance' && (
          <TenantAttendanceTab
            attendanceData={attendanceData} attendanceLoading={attendanceLoading}
            onRefresh={() => loadAttendanceData({ period: 'weekly' })}
            tenantId={tenantId || ''}
          />
        )}

        {activeTab === 'billing' && (
          <TenantBillingTab billingData={billingData} billingLoading={billingLoading} />
        )}

        {activeTab === 'logs' && (
          <TenantLogsTab
            logsData={logsData} logsLoading={logsLoading} logsStats={logsStats} logsFilters={logsFilters} setLogsFilters={setLogsFilters}
            loadTenantLogs={loadTenantLogs} users={users} logsPagination={logsPagination} formatLastUpdated={formatLastUpdated} lastUpdatedLogs={lastUpdated.logs}
          />
        )}
      </div>

      <TenantUserModal
        isOpen={showUserModal} onClose={() => setShowUserModal(false)} selectedUser={selectedUser}
        userFormData={userFormData} setUserFormData={setUserFormData} onSubmit={handleUserFormSubmit}
        loading={userFormLoading} roles={roles} rolesLoading={rolesLoading}
      />
    </SuperAdminPageLayout>
  );
}
