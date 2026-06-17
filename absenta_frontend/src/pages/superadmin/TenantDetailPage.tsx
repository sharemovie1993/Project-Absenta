import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useConfirm from '../../hooks/useConfirm';
import { useParams, useNavigate } from 'react-router-dom';
import { LogService } from '../../utils/LogService';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Activity, 
  BarChart3,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Pause,
  Play,
  GraduationCap,
  Clock,
  CreditCard,
  FileText,
  BookOpen,
  School,
  
  TrendingUp,
  Award,
  AlertTriangle,
  History,
  RefreshCw,
  
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { useAuthStore } from '../../store/authStore';
import axiosInstance from '../../lib/axiosInstance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Table,
  Loader,
  SearchableSelect,
  Input,
  SectionCard,
  Tabs,
  TabsList,
  TabsTrigger
} from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useExport } from '../../hooks/useExport';
import { useCache } from '../../hooks/useCache';
import { useErrorHandler, isRetryableError } from '../../hooks/useErrorHandler';
import { ExportButton } from '../../components/ExportButton';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';

const TenantOverviewCharts = React.lazy(() => import('../../components/charts/TenantOverviewCharts'));
const TenantAttendanceCharts = React.lazy(() => import('../../components/charts/TenantAttendanceCharts'));
// QuickActions dihapus sesuai permintaan
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
  const { showToast } = useToast();
  const { user } = useAuth();

  // State management
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  // Daftar semua pengguna untuk kebutuhan statistik (limit besar)
  const [usersAll, setUsersAll] = useState<TenantUser[]>([]);
  const [_usersAllLoading, setUsersAllLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'academic' | 'attendance' | 'billing' | 'logs'>('overview');
  const [usersLoading, setUsersLoading] = useState(false);
  const [_activitiesLoading, setActivitiesLoading] = useState(false);
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

  // Users pagination computed via useMemo
  const [usersFilters, setUsersFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    role: '',
    status: '',
    lastLogin: '',
    sortBy: 'name'
  });

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

  // Export hook
  const {
    isExporting,
    exportUsers: _exportUsers,
    exportActivities: _exportActivities,
    exportLogs: _exportLogs,
    exportAcademicData: _exportAcademicData,
    exportAttendanceData: _exportAttendanceData
  } = useExport({
    onExportStart: () => {
      LogService.info('Export started');
    },
    onExportComplete: () => {
      LogService.info('Export completed');
    },
    onExportError: (error) => {
      LogService.error('Export error:', error);
    }
  });

  // Cache hook for optimizing API calls
  const cache = useCache<unknown>({
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
    staleWhileRevalidate: true
  });

  // Error handler hook
  const { handleError: _handleError, withRetry, withErrorBoundary } = useErrorHandler();

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

  // Integrated export function for tenant data
  const handleExportData = async (
    entities: string[],
    format: 'JSON' | 'CSV' | 'EXCEL',
    dateFrom?: string,
    dateTo?: string
  ) => {
    if (!tenantId) return;

    try {
      const params: ExportTenantDataParams = {
        entities,
        format,
        date_from: dateFrom,
        date_to: dateTo
      };

      const response = await exportTenantData(tenantId, params);
      
      if (response.success) {
        if (format === 'JSON') {
          // For JSON format, download the data directly
          const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `tenant-${tenantDetail?.name || tenantId}-export.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else if (response.data.download_url) {
          // For CSV/EXCEL format, use the download URL
          const link = document.createElement('a');
          link.href = response.data.download_url;
          link.download = `tenant-${tenantDetail?.name || tenantId}-export.${format.toLowerCase()}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        showToast(`Data berhasil diekspor dalam format ${format}`, 'success');
      } else {
        showToast(response.message || 'Gagal mengekspor data', 'error');
      }
    } catch (error) {
      LogService.error('Export error:', error);
      showToast('Terjadi kesalahan saat mengekspor data', 'error');
    }
  };



  // Load tenant data moved below function declarations

  // Effects moved below function declarations for type safety

  // Moved below declarations to avoid temporal dead zone issues

  // loadTenantData dihapus (tidak digunakan)

  const loadTenantDetail = useCallback(async () => {
    const cacheKey = `tenant-detail-${tenantId}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached.exists && cached.data && !cached.isStale) {
      setTenantDetail(cached.data as TenantDetail);
      return;
    }

    const fetchWithRetry = withErrorBoundary(
      () => withRetry(
        () => getTenantDetail(tenantId!),
        {
          maxRetries: 3,
          retryDelay: 1000,
          retryCondition: (error) => isRetryableError(error)
        }
      ),
      {
        onError: (error) => {
        LogService.error('❌ Error loading tenant detail:', error);
      },
      context: { tenantId, action: 'loadTenantDetail' }
    }
  );

  try {
    LogService.debug('📋 Loading tenant detail for ID:', tenantId);
    const response = await fetchWithRetry();
    if (response?.data) {
      LogService.debug('✅ Tenant detail loaded:', response.data);
      setTenantDetail(response.data);
      cache.set(cacheKey, response.data);
    }
    } catch {
      // If we have stale cached data, use it
      if (cached.exists && cached.data) {
        setTenantDetail(cached.data as TenantDetail);
        showToast('Menggunakan data tersimpan karena koneksi bermasalah', 'warning');
      } else {
        showToast('Gagal memuat detail tenant', 'error');
      }
    }
  }, [tenantId, cache, withErrorBoundary, withRetry, showToast]);

  const loadTenantMetrics = useCallback(async () => {
    const cacheKey = `tenant-metrics-${tenantId}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached.exists && cached.data && !cached.isStale) {
      setMetrics(cached.data as TenantMetrics);
      return;
    }

    const fetchWithRetry = withErrorBoundary(
      () => withRetry(
        () => getTenantMetrics(tenantId!),
        {
          maxRetries: 3,
          retryDelay: 1000,
          retryCondition: (error) => isRetryableError(error)
        }
      ),
      {
        onError: (error) => {
        LogService.error('❌ Error loading tenant metrics:', error);
      },
      context: { tenantId, action: 'loadTenantMetrics' }
    }
  );

  try {
    LogService.debug('📊 Loading tenant metrics for ID:', tenantId);
    const response = await fetchWithRetry();
    if (response?.data) {
      LogService.debug('✅ Tenant metrics loaded:', response.data);
      setMetrics(response.data);
      cache.set(cacheKey, response.data);
    }
    } catch {
      // If we have stale cached data, use it
      if (cached.exists && cached.data) {
        setMetrics(cached.data as TenantMetrics);
        showToast('Menggunakan data metrics tersimpan', 'warning');
      } else {
        showToast('Gagal memuat metrics tenant', 'error');
      }
    }
  }, [tenantId, cache, withErrorBoundary, withRetry, showToast]);

  const loadRecentActivities = useCallback(async () => {
    try {
      const response = await getRecentActivities(tenantId!);
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      LogService.error('Error loading recent activities:', error);
      showToast('Gagal memuat aktivitas terbaru', 'error');
      setActivities([]);
    }
  }, [tenantId, showToast]);

  const loadUserStatistics = useCallback(async () => {
    try {
      const response = await getUserStatistics(tenantId!);
      setUserStats(response.data);
    } catch (error) {
      LogService.error('Error loading user statistics:', error);
      showToast('Gagal memuat statistik pengguna', 'error');
    }
  }, [tenantId, showToast]);

  const loadTenantUsers = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setUsersLoading(true);
      const response = await getTenantUsers(tenantId, usersFilters);
      // Ensure users is always an array
      setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
    } catch (error) {
      LogService.error('Error loading tenant users:', error);
      showToast('Gagal memuat daftar pengguna', 'error');
      setUsers([]); // Set empty array on error
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId, usersFilters, showToast]);

  // Muat semua pengguna (limit besar) khusus untuk statistik per-peran
  const loadAllTenantUsersForStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      setUsersAllLoading(true);
      const response = await getTenantUsers(tenantId, { page: 1, limit: 2000 });
      setUsersAll(Array.isArray(response.data?.users) ? response.data.users : []);
    } catch (error) {
      LogService.error('Error loading all tenant users for stats:', error);
      setUsersAll([]);
    } finally {
      setUsersAllLoading(false);
    }
  }, [tenantId]);

  // Helper untuk mendapatkan jumlah per-peran dari statistik API, fallback ke daftar lengkap
  const _getRoleTotal = (roleName: string): number => {
    const fromStats = userStats?.usersByRole?.find(r => r.roleName === roleName)?.count;
    if (typeof fromStats === 'number') return fromStats;
    return usersAll.filter(u => u.role_name === roleName).length;
  };

  // Helper: apply filters and sorting for Users table
  const applyUserTableFiltersAndSorting = useCallback((list: TenantUser[], filters: typeof usersFilters): TenantUser[] => {
    let result = [...list];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    // Role
    if (filters.role) {
      result = result.filter(u => u.role_name === filters.role);
    }

    // Status
    if (filters.status) {
      const map: Record<string, 'ACTIVE' | 'INACTIVE' | undefined> = {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      };
      const target = map[filters.status];
      if (target) {
        result = result.filter(u => u.status === target);
      } else if (filters.status === 'pending' || filters.status === 'suspended') {
        // Tidak ada status ini di data sekarang; hasil kosong agar konsisten
        result = [];
      }
    }

    // Last login filter
    if (filters.lastLogin) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      result = result.filter(u => {
        if (filters.lastLogin === 'never') return !u.last_login;
        if (!u.last_login) return false;
        const d = new Date(u.last_login);
        if (filters.lastLogin === 'today') return d >= startOfToday;
        if (filters.lastLogin === 'week') return d >= weekAgo;
        if (filters.lastLogin === 'month') return d >= monthAgo;
        return true;
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'name';
    result.sort((a, b) => {
      const safeStr = (s?: string) => (s || '').toLowerCase();
      const safeDate = (s?: string) => (s ? new Date(s).getTime() : 0);

      switch (sortBy) {
        case 'name_desc':
          return safeStr(b.full_name).localeCompare(safeStr(a.full_name));
        case 'created_at':
          return safeDate(b.created_at) - safeDate(a.created_at); // terbaru
        case 'created_at_desc':
          return safeDate(a.created_at) - safeDate(b.created_at); // terlama
        case 'last_login': {
          // Nulls last
          const bl = safeDate(b.last_login);
          const al = safeDate(a.last_login);
          return bl - al;
        }
        case 'role':
          return safeStr(a.role_name).localeCompare(safeStr(b.role_name));
        case 'name':
        default:
          return safeStr(a.full_name).localeCompare(safeStr(b.full_name));
      }
    });

    return result;
  }, []);

  // Load users data when users tab is active or filters change
  useEffect(() => {
    if (activeTab === 'users' && tenantId) {
      loadTenantUsers();
      // Muat semua pengguna untuk kartu statistik per-peran (independen dari pagination)
      loadAllTenantUsersForStats();
    }
  }, [activeTab, tenantId, usersFilters, loadTenantUsers, loadAllTenantUsersForStats]);

  const usersDisplay = useMemo(() => {
    const page = usersFilters.page || 1;
    const limit = usersFilters.limit || 10;
    if (activeTab !== 'users') {
      const total = Array.isArray(users) ? users.length : 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return { list: users, pagination: { page, limit, total, totalPages } };
    }
    const source = usersAll.length > 0 ? usersAll : users;
    const filtered = applyUserTableFiltersAndSorting(source, usersFilters);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageSlice = filtered.slice(start, end);
    return { list: pageSlice, pagination: { page, limit, total, totalPages } };
  }, [activeTab, usersAll, usersFilters, users, applyUserTableFiltersAndSorting]);

  const loadRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const response = await getRoles();
      setRoles(response.data);
    } catch (error) {
      LogService.error('Error loading roles:', error);
      showToast('Gagal memuat daftar role', 'error');
    } finally {
      setRolesLoading(false);
    }
  }, [showToast]);

  // Load tenant data (after function declarations)
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (!tenantId) return;
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    const loadAllData = async () => {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      LogService.debug('🔑 Access token exists:', !!token);
      LogService.debug('🏢 Tenant ID:', tenantId);
      if (!token) {
        LogService.error('❌ No access token found in localStorage');
        showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
        navigate('/login');
        return;
      }
      try {
        await Promise.all([
          loadTenantDetail(),
          loadTenantMetrics(),
          loadRecentActivities(),
          loadUserStatistics(),
          loadRoles(),
        ]);
      } catch (error) {
        LogService.error('❌ Error loading tenant data:', error);
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
      console.error('Error loading academic data:', error);
      showToast('Gagal memuat data akademik', 'error');
    } finally {
      setAcademicLoading(false);
    }
  }, [tenantId, showToast]);

  const loadAttendanceData = useCallback(async (options: {
    date_from?: string;
    date_to?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  } = {}) => {
    if (!tenantId) return;
    
    try {
      setAttendanceLoading(true);
      const response = await getAttendanceData(tenantId, options);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      showToast('Gagal memuat data absensi', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  }, [tenantId, showToast]);

  const loadBillingData = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setBillingLoading(true);
      const response = await getTenantBilling(tenantId);
      setBillingData(response.data);
    } catch (error) {
      console.error('Error loading billing data:', error);
      showToast('Gagal memuat data billing', 'error');
    } finally {
      setBillingLoading(false);
    }
  }, [tenantId, showToast]);

  const loadTenantLogs = useCallback(async (filters?: Partial<GetTenantLogsParams>) => {
    if (!tenantId) return;
    
    try {
      setLogsLoading(true);
      const params = { ...logsFilters, ...filters };
      const response = await getTenantLogs(tenantId, params);
      
      const rawLogs = Array.isArray(response.data?.logs) ? response.data.logs : [];
      const sanitized = (rawLogs as unknown[]).filter((l) => l && typeof l === 'object');
      const normalized = sanitized.map((l, idx) => normalizeLogItem(l, idx));
      setLogsData(normalized as ActivityLogItem[]);
      setLogsPagination(response.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setLogsStats({
        totalLogs: response.data?.summary?.totalLogs || 0,
        uniqueUsers: response.data?.summary?.uniqueUsers || 0,
        uniqueActions: response.data?.summary?.uniqueActions || 0,
        dateRange: {
          from: response.data?.summary?.dateRange?.earliest || new Date().toISOString(),
          to: response.data?.summary?.dateRange?.latest || new Date().toISOString()
        }
      });
      
      // Update filters state
      if (filters) {
        setLogsFilters(prev => ({ ...prev, ...filters }));
      }
    } catch (error) {
      console.error('Error loading logs data:', error);
      showToast('Gagal memuat data log aktivitas', 'error');
      // Set empty data on error
      setLogsData([]);
      setLogsPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      setLogsStats({
        totalLogs: 0,
        uniqueUsers: 0,
        uniqueActions: 0,
        dateRange: {
          from: new Date().toISOString(),
          to: new Date().toISOString()
        }
      });
    } finally {
      setLogsLoading(false);
    }
  }, [tenantId, logsFilters, showToast]);


  // Load academic data when academic tab is active
  useEffect(() => {
    if (activeTab === 'academic' && tenantId && !academicData) {
      loadAcademicData();
    }
  }, [activeTab, tenantId, academicData, loadAcademicData]);

  // Ensure academic data is available in Overview
  useEffect(() => {
    if (activeTab === 'overview' && tenantId && !academicData) {
      loadAcademicData();
    }
  }, [activeTab, tenantId, academicData, loadAcademicData]);

  // Load attendance data when attendance tab is active
  useEffect(() => {
    if (activeTab === 'attendance' && tenantId && !attendanceData) {
      loadAttendanceData({ period: 'weekly' });
    }
  }, [activeTab, tenantId, attendanceData, loadAttendanceData]);

  // Ensure attendance data is available in Overview
  useEffect(() => {
    if (activeTab === 'overview' && tenantId && !attendanceData) {
      loadAttendanceData({ period: 'weekly' });
    }
  }, [activeTab, tenantId, attendanceData, loadAttendanceData]);

  // Load billing data when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing' && tenantId && !billingData) {
      loadBillingData().then(() => updateTimestamp('billing'));
    }
  }, [activeTab, tenantId, billingData, loadBillingData]);

  // Ensure billing data is available in Overview
  useEffect(() => {
    if (activeTab === 'overview' && tenantId && !billingData) {
      loadBillingData();
    }
  }, [activeTab, tenantId, billingData, loadBillingData]);

  // Load logs data when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs' && tenantId) {
      loadTenantLogs().then(() => updateTimestamp('logs'));
    }
  }, [activeTab, tenantId, loadTenantLogs]);

  const handleBack = () => {
    navigate('/tenants');
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserFormData({
      full_name: '',
      email: '',
      password: '',
      role_id: '',
      status: 'ACTIVE'
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: TenantUser) => {
    setSelectedUser(user);
    
    // Find role_id based on role_name
    const selectedRole = roles.find(role => role.name === user.role_name);
    
    setUserFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role_id: selectedRole?.id || '',
      status: user.status
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({
      title: 'Konfirmasi Hapus Pengguna',
      description: 'Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    if (!tenantId) {
      showToast('Tenant ID tidak ditemukan', 'error');
      return;
    }

    try {
      const response = await deleteTenantUser(tenantId, userId);
      if (response.success) {
        showToast('Pengguna berhasil dihapus', 'success');
        await loadTenantUsers(); // Reload users list
      } else {
        showToast(response.message || 'Gagal menghapus pengguna', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Gagal menghapus pengguna', 'error');
    }
  };

  const handleUserFormSubmit = async () => {
    if (!userFormData.full_name || !userFormData.email || (!selectedUser && !userFormData.password)) {
      showToast('Mohon lengkapi semua field yang diperlukan', 'error');
      return;
    }

    if (!tenantId) {
      showToast('Tenant ID tidak ditemukan', 'error');
      return;
    }

    setUserFormLoading(true);
    try {
      let response;
      
      if (selectedUser) {
        // Update existing user (SUPERADMIN route expects role name and supports name/full_name)
        const selectedRoleName = roles.find(r => r.id === userFormData.role_id)?.name;
        const updateData: UpdateTenantUserRequest = {
          name: userFormData.full_name,
          full_name: userFormData.full_name,
          email: userFormData.email,
          status: userFormData.status
        };
        
        if (userFormData.password) {
          updateData.password = userFormData.password;
        }
        
        if (selectedRoleName) {
          updateData.role = selectedRoleName;
        }
        
        response = await updateTenantUser(tenantId, selectedUser.id, updateData);
      } else {
        // Create new user (SUPERADMIN route expects name and role name)
        const selectedRoleName = roles.find(r => r.id === userFormData.role_id)?.name;
        const createData: CreateTenantUserRequest = {
          name: userFormData.full_name,
          full_name: userFormData.full_name,
          email: userFormData.email,
          status: userFormData.status,
          role: String(selectedRoleName || '')
        };
        if (userFormData.password) {
          createData.password = userFormData.password;
        }
        response = await createTenantUser(tenantId, createData);
      }
      
      if (response.success) {
        showToast(`Pengguna berhasil ${selectedUser ? 'diperbarui' : 'ditambahkan'}`, 'success');
        setShowUserModal(false);
        await loadTenantUsers(); // Reload users list
      } else {
        showToast(response.message || 'Terjadi kesalahan', 'error');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(`Gagal ${selectedUser ? 'memperbarui' : 'menambahkan'} pengguna`, 'error');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleAssistLogin = async () => {
    if (!tenantDetail) return;
    const ok = await confirm({
      title: 'Assist Login',
      description: `Apakah Anda yakin ingin masuk ke sistem atas nama Administrator Sekolah dari "${tenantDetail.name}"?`,
      confirmText: 'Ya, Assist Login',
      cancelText: 'Batal',
      style: 'info'
    });

    if (!ok) return;

    const toastId = showToast('Menyiapkan sesi bantuan...', 'loading' as any);
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

        showToast(`Berhasil assist login sebagai Admin "${tenantDetail.name}"`, 'success');
        
        // 5. Alihkan ke dasbor sekolah target secara instan untuk menghindari background race condition
        window.location.href = '/';
      } else {
        showToast(response.data?.message || 'Gagal menyiapkan sesi bantuan', 'error');
      }
    } catch (err: any) {
      console.error('Assist login error:', err);
      const msg = err.response?.data?.message || err.message || 'Gagal terhubung ke server';
      showToast(msg, 'error');
    }
  };

  const handleTenantAction = async (action: 'suspend' | 'activate' | 'delete') => {
    if (!tenantId) {
      showToast('ID tenant tidak ditemukan', 'error');
      return;
    }

    const confirmMessages = {
      suspend: 'Apakah Anda yakin ingin menangguhkan tenant ini?',
      activate: 'Apakah Anda yakin ingin mengaktifkan tenant ini?',
      delete: 'Apakah Anda yakin ingin menghapus tenant ini? Tindakan ini tidak dapat dibatalkan.'
    };
    const actionLabels = {
      suspend: 'Tangguhkan',
      activate: 'Aktifkan',
      delete: 'Hapus',
    } as const;
    const styleMap = {
      suspend: 'warning',
      activate: 'info',
      delete: 'danger',
    } as const;
    const ok = await confirm({
      title: 'Konfirmasi Tindakan Tenant',
      description: confirmMessages[action],
      confirmText: actionLabels[action],
      cancelText: 'Batal',
      style: styleMap[action],
    });
    if (!ok) return;

    try {
      let response;
      
      switch (action) {
        case 'suspend':
          response = await suspendTenant(tenantId);
          break;
        case 'activate':
          response = await activateTenant(tenantId);
          break;
        case 'delete':
          response = await deleteTenant(tenantId);
          break;
      }
      
      if (response.success) {
        if (action === 'delete') {
          navigate('/tenants');
          showToast('Tenant berhasil dihapus', 'success');
        } else {
          // Reload tenant data to reflect status changes
          await loadTenantDetail();
          showToast(`Tenant berhasil ${action === 'suspend' ? 'ditangguhkan' : 'diaktifkan'}`, 'success');
        }
      } else {
        showToast(response.message || 'Terjadi kesalahan', 'error');
      }
    } catch (error) {
      console.error(`Error ${action} tenant:`, error);
      showToast(`Gagal ${action === 'suspend' ? 'menangguhkan' : action === 'activate' ? 'mengaktifkan' : 'menghapus'} tenant`, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const module: 'users' | 'subscription' = (status === 'ACTIVE' || status === 'INACTIVE') ? 'users' : 'subscription';
    const cls = getStatusBadgeClass(status, module);
    const label = getStatusLabel(status, module);
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} detik yang lalu`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} menit yang lalu`;
    } else {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const normalizeLogItem = (log: unknown, idx: number): ActivityLogItem => {
    const obj = (typeof log === 'object' && log !== null) ? (log as Record<string, unknown>) : {};
    const tsCandidates = [obj['timestamp'], obj['created_at'], obj['time'], obj['datetime'], obj['createdAt']];
    const tsRaw = tsCandidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    let tsIso = '';
    if (typeof tsRaw === 'string' && tsRaw.trim() !== '') {
      const d = new Date(tsRaw);
      tsIso = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else if (typeof tsRaw === 'number') {
      tsIso = new Date(tsRaw).toISOString();
    }
    if (!tsIso || tsIso.trim() === '') {
      tsIso = new Date().toISOString();
    }

    const metaRaw = obj['metadata'] ?? obj['details'] ?? obj['data'] ?? null;
    let metaObj: unknown = metaRaw;
    if (typeof metaRaw === 'string') {
      try {
        const maybeObj = JSON.parse(metaRaw);
        if (maybeObj && typeof maybeObj === 'object') metaObj = maybeObj;
      } catch {}
    }

    const metaRec = (typeof metaObj === 'object' && metaObj !== null) ? (metaObj as Record<string, unknown>) : undefined;
    const actionCandidates = [obj['action'], obj['type'], obj['event'], obj['operation'], obj['level'], metaRec?.['action'], metaRec?.['event']];
    const actionRaw = actionCandidates.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '-';
    const entityCandidates = [obj['entity'], obj['module'], obj['resource'], obj['service'], obj['context'], metaRec?.['entity'], metaRec?.['resource'], metaRec?.['module']];
    const entityRaw = entityCandidates.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '-';

    const ipCandidates = [obj['ip_address'], obj['ipAddress'], obj['ip'], obj['client_ip'], obj['source_ip'], obj['remote_addr']];
    const ipRaw = ipCandidates.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? undefined;

    const userObj = obj['user'] ?? (obj['user_id'] || obj['user_name'] || obj['user_email']
      ? {
          id: String(obj['user_id'] ?? ''),
          full_name: (String(obj['user_name'] ?? '').trim() || 'System'),
          email: String(obj['user_email'] ?? '')
        }
      : null);

    return {
      id: String(obj['id'] ?? `log-${idx}`),
      action: String(actionRaw),
      entity: String(entityRaw),
      entity_id: obj['entity_id'] ?? obj['entityId'] ?? obj['resource_id'] ?? null,
      timestamp: tsIso,
      metadata: metaObj ?? metaRaw,
      ip_address: ipRaw,
      user: userObj
    } as ActivityLogItem;
  };

  // Handler refresh manual: muat semua segmen data tanpa WebSocket
  const handleManualRefresh = async () => {
    try {
      setMetricsLoading(true);
      setActivitiesLoading(true);
      setLogsLoading(true);
      setAttendanceLoading(true);
      setBillingLoading(true);
      setUsersLoading(true);
      await Promise.allSettled([
        loadTenantMetrics().then(() => updateTimestamp('metrics')),
        loadRecentActivities().then(() => updateTimestamp('activities')),
        loadTenantLogs(logsFilters).then(() => updateTimestamp('logs')),
        loadAttendanceData().then(() => updateTimestamp('attendance')),
        loadBillingData().then(() => updateTimestamp('billing')),
        loadTenantUsers().then(() => updateTimestamp('users')),
      ]);
    } finally {
      // Flags ditangani di masing-masing loader
    }
  };

  if (loading || !tenantDetail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat detail tenant...</p>
        </div>
      </div>
    );
  }



  const toolbarActions = (
    <div className="flex items-center space-x-2">
      {getStatusBadge(tenantDetail.status)}
      {getStatusBadge(tenantDetail.subscription_status)}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        className="flex items-center text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
        title="Refresh semua data"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={handleAssistLogin}
        className="flex items-center bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-600 border-none font-bold"
        title="Bantu Login ke Dashboard Sekolah"
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        Assist Login
      </Button>
      
      {tenantDetail.status === 'ACTIVE' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTenantAction('suspend')}
          className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
        >
          <Pause className="mr-2 h-4 w-4" />
          Suspend
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTenantAction('activate')}
          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
        >
          <Play className="mr-2 h-4 w-4" />
          Aktifkan
        </Button>
      )}
      
      {isSystemSuperAdmin(user?.role?.name || user?.role, user?.tenant_id) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTenantAction('delete')}
          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </Button>
      )}
    </div>
  );

  return (
    <SuperAdminPageLayout
      title={tenantDetail.name}
      description="Detail profil, metrik performa, dan manajemen data operasional tenant sekolah."
      breadcrumbs={[
        { label: 'Manajemen Tenant', path: '/tenants' },
        { label: tenantDetail.name }
      ]}
      stats={headerStats}
      isLoadingStats={loading}
      toolbar={toolbarActions}
    >

        {/* Tenant Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Informasi Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="mr-2 h-4 w-4" />
                  Domain
                </div>
                <p className="font-medium">{tenantDetail.domain}</p>
              </div>
              
              {tenantDetail.contact_email && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Kontak
                  </div>
                  <p className="font-medium">{tenantDetail.contact_email}</p>
                </div>
              )}
              
              {tenantDetail.contact_phone && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="mr-2 h-4 w-4" />
                    Telepon
                  </div>
                  <p className="font-medium">{tenantDetail.contact_phone}</p>
                </div>
              )}
              
              {tenantDetail.address && (
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="mr-2 h-4 w-4" />
                    Alamat
                  </div>
                  <p className="font-medium">{tenantDetail.address}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="mr-2 h-4 w-4" />
                  Dibuat
                </div>
                <p className="font-medium">{formatDate(tenantDetail.created_at)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="mr-2 h-4 w-4" />
                  Diperbarui
                </div>
                <p className="font-medium">{formatDate(tenantDetail.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        

        

        {/* Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
              <TabsTrigger value="overview" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Overview</span>
                {lastUpdated.metrics && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    {formatLastUpdated(lastUpdated.metrics)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pengguna</span>
                {lastUpdated.users && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    {formatLastUpdated(lastUpdated.users)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Akademik</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Absensi</span>
                {lastUpdated.attendance && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    {formatLastUpdated(lastUpdated.attendance)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Penagihan</span>
                {lastUpdated.billing && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    {formatLastUpdated(lastUpdated.billing)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider">Log</span>
                {lastUpdated.logs && (
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    {formatLastUpdated(lastUpdated.logs)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && userStats && metrics && (
            <div className="space-y-6">
              {/* Tab Header with Force Update */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Overview Dashboard
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ringkasan metrik dan statistik tenant
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => { await loadTenantMetrics(); updateTimestamp('metrics'); }}
                    disabled={metricsLoading}
                    className="flex items-center"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                  <ExportButton
                    onExport={(format) => handleExportData(['users', 'academic', 'attendance'], format)}
                    isLoading={isExporting}
                    disabled={!tenantDetail}
                    label="Export Overview"
                    size="sm"
                  />
                </div>
              </div>

              {/* Statistik Tenant */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Statistik Tenant
                </h3>
                {lastUpdated.metrics && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="mr-1 h-4 w-4" />
                    Diperbarui: {formatLastUpdated(lastUpdated.metrics)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <AnalyticsCard
                  title="Total Pengguna"
                  value={(userStats?.totalUsers ?? metrics?.users?.total) || 0}
                  isLoading={metricsLoading}
                  icon={<Users size={20} className="text-white" />}
                  gradient="from-blue-500 to-cyan-600"
                />
                <AnalyticsCard
                  title="Pengguna Aktif"
                  value={userStats?.activeUsers ?? 0}
                  isLoading={metricsLoading}
                  icon={<Activity size={20} className="text-white" />}
                  gradient="from-green-500 to-emerald-600"
                />
                <AnalyticsCard
                  title="Total Siswa"
                  value={(metrics?.users?.siswa ?? academicData?.statistics?.totalSiswa) || 0}
                  isLoading={metricsLoading}
                  icon={<Users size={20} className="text-white" />}
                  gradient="from-purple-500 to-pink-600"
                />
                <AnalyticsCard
                  title="Total Guru"
                  value={(metrics?.users?.guru ?? academicData?.statistics?.totalGuru) || 0}
                  isLoading={metricsLoading}
                  icon={<Users size={20} className="text-white" />}
                  gradient="from-orange-500 to-red-600"
                />
                <AnalyticsCard
                  title="Total Kelas"
                  value={(metrics?.academic?.kelas ?? academicData?.statistics?.totalKelas) || 0}
                  isLoading={metricsLoading}
                  icon={<Building2 size={20} className="text-white" />}
                  gradient="from-indigo-500 to-purple-600"
                />
                <AnalyticsCard
                  title="Tingkat Kehadiran"
                  value={attendanceData?.overview?.summary?.average_attendance_rate !== undefined
                    ? `${Math.round(attendanceData?.overview?.summary?.average_attendance_rate || 0)}%`
                    : attendanceLoading ? '...' : '0%'}
                  isLoading={attendanceLoading}
                  icon={<BarChart3 size={20} className="text-white" />}
                  gradient="from-teal-500 to-cyan-600"
                />
              </div>

              {/* Advanced Charts */}
              <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader /></div>}>
                <TenantOverviewCharts userStats={userStats} metrics={metrics} tenantId={tenantId!} />
              </React.Suspense>

              {/* Statistik Overview Absensi dihapus */}

              {/* Recent Activities Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-green-600" />
                    📋 Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(activities) && activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            oleh {activity.user_name} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!activities || activities.length === 0) && (
                      <p className="text-center text-gray-500 py-4 text-sm">
                        Belum ada aktivitas terbaru
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Billing Status Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5 text-purple-600" />
                    💰 Billing Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                       <div>
                         <span className="font-medium text-gray-600">Current Plan:</span>
                         <p className="font-semibold text-blue-600">
                           {billingData?.activeSubscription?.plan_name ?? '-'}
                         </p>
                       </div>
                       <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        {(() => {
                          const statusRaw = billingData?.activeSubscription?.status;
                          const statusKey = String(statusRaw || '').toUpperCase();
                          const statusColorMap: Record<string, string> = {
                            ACTIVE: 'text-green-600',
                            TRIAL: 'text-blue-600',
                            PENDING_PAYMENT: 'text-yellow-600',
                            SUSPENDED: 'text-gray-500',
                            CANCELLED: 'text-gray-500',
                            EXPIRED: 'text-red-600',
                          };
                          return (
                            <p className={`font-semibold ${statusColorMap[statusKey] ?? 'text-gray-400'}`}>
                              {statusRaw ?? '-'}
                            </p>
                          );
                        })()}
                      </div>
                       <div>
                         <span className="font-medium text-gray-600">Next Billing:</span>
                         <p className="font-semibold text-gray-800">
                           {billingData?.activeSubscription?.next_billing_date
                             ? formatDateShort(billingData.activeSubscription.next_billing_date)
                             : '-'}
                         </p>
                       </div>
                       <div>
                         <span className="font-medium text-gray-600">Monthly Fee:</span>
                         <p className="font-semibold text-purple-600">
                           {billingData?.activeSubscription?.plan?.price_monthly !== undefined
                             ? formatCurrency(billingData.activeSubscription.plan.price_monthly)
                             : '-'}
                         </p>
                       </div>
                     </div>
                     <div className="mt-3 pt-3 border-t border-gray-200">
                       <span className="font-medium text-gray-600">Total Revenue:</span>
                       <span className="ml-2 font-semibold text-green-600">
                         Rp {billingData?.analytics?.totalRevenue?.toLocaleString('id-ID') || '0'}
                       </span>
                       <span className="ml-4 font-medium text-gray-600">Monthly:</span>
                       <span className="ml-2 font-semibold text-blue-600">
                         Rp {billingData?.analytics?.monthlyRevenue?.toLocaleString('id-ID') || '0'}
                       </span>
                     </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">

              {/* User Management Table */}
              <SectionCard
                title="Daftar Pengguna"
                icon={Users}
                fullWidth
                noPadding
                actions={
                  <div className="flex items-center gap-2">
                    <ExportButton
                      onExport={(format) => handleExportData(['users'], format)}
                      isLoading={isExporting}
                      disabled={usersDisplay.list && usersDisplay.list.length === 0}
                      label="Export Users"
                      size="sm"
                    />
                    <Button onClick={handleAddUser} className="flex items-center text-xs h-7 py-1 px-2.5">
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Tambah Pengguna
                    </Button>
                  </div>
                }
              >
                <div className="p-4 flex-1 flex flex-col">
                {/* Enhanced Filter Section */}
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search Box */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔍 Cari Pengguna
                      </label>
                      <Input
                        type="text"
                        placeholder="Cari berdasarkan nama, email, atau NIP/NIS..."
                        value={usersFilters.search}
                        onChange={(e) => setUsersFilters({ ...usersFilters, search: e.target.value, page: 1 })}
                      />
                    </div>
                    
                    {/* Role Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        👤 Peran
                      </label>
                      <SearchableSelect
                        value={usersFilters.role}
                        onValueChange={(val) => setUsersFilters({ ...usersFilters, role: val, page: 1 })}
                        options={[
                          { value: "", label: "Semua Peran" },
                          { value: "ADMIN", label: "👑 Admin" },
                          { value: "GURU", label: "👨‍🏫 Guru" },
                          { value: "SISWA", label: "🎓 Siswa" },
                          { value: "ORANGTUA", label: "👨‍👩‍👧‍👦 Wali/Orang Tua" }
                        ]}
                        placeholder="Semua Peran"
                        searchPlaceholder="Cari peran..."
                      />
                    </div>
                    
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📊 Status
                      </label>
                      <SearchableSelect
                        value={usersFilters.status}
                        onValueChange={(val) => setUsersFilters({ ...usersFilters, status: val, page: 1 })}
                        options={[
                          { value: "", label: "Semua Status" },
                          { value: "active", label: "✅ Aktif" },
                          { value: "inactive", label: "❌ Tidak Aktif" },
                          { value: "suspended", label: "⏸️ Ditangguhkan" },
                          { value: "pending", label: "⏳ Menunggu Verifikasi" }
                        ]}
                        placeholder="Semua Status"
                        searchPlaceholder="Cari status..."
                      />
                    </div>
                  </div>
                  
                  {/* Additional Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Last Login Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🕒 Login Terakhir
                      </label>
                      <SearchableSelect
                        value={usersFilters.lastLogin || ''}
                        onValueChange={(val) => setUsersFilters({ ...usersFilters, lastLogin: val, page: 1 })}
                        options={[
                          { value: "", label: "Semua Waktu" },
                          { value: "today", label: "Hari ini" },
                          { value: "week", label: "7 hari terakhir" },
                          { value: "month", label: "30 hari terakhir" },
                          { value: "never", label: "Belum pernah login" }
                        ]}
                        placeholder="Semua Waktu"
                        searchPlaceholder="Cari waktu..."
                      />
                    </div>
                    
                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        📋 Urutkan
                      </label>
                      <SearchableSelect
                        value={usersFilters.sortBy || 'name'}
                        onValueChange={(val) => setUsersFilters({ ...usersFilters, sortBy: val, page: 1 })}
                        options={[
                          { value: "name", label: "Nama A-Z" },
                          { value: "name_desc", label: "Nama Z-A" },
                          { value: "created_at", label: "Terbaru" },
                          { value: "created_at_desc", label: "Terlama" },
                          { value: "last_login", label: "Login Terbaru" },
                          { value: "role", label: "Berdasarkan Peran" }
                        ]}
                        placeholder="Urutkan..."
                        searchPlaceholder="Cari urutan..."
                      />
                    </div>
                    
                    {/* Reset Filters */}
                    <div className="flex items-end">
                      <Button
                         variant="outline"
                         onClick={() => setUsersFilters({ 
                           search: '', 
                           role: '', 
                           status: '', 
                           lastLogin: '', 
                           sortBy: 'name', 
                           page: 1, 
                           limit: 10 
                         })}
                         className="w-full"
                       >
                         🔄 Reset Filter
                       </Button>
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      {
                        key: 'full_name',
                        label: 'Nama Lengkap',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return (
                            <div>
                              <p className="font-medium">{user?.full_name || '-'}</p>
                              <p className="text-sm text-gray-500">{user?.email || '-'}</p>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'role_name',
                        label: 'Peran',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return (<Badge variant="outline">{user?.role_name || '-'}</Badge>);
                        }
                      },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return getStatusBadge(user?.status || 'INACTIVE');
                        }
                      },
                      {
                        key: 'created_at',
                        label: 'Terdaftar',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return (user?.created_at ? formatDate(user.created_at) : '-');
                        }
                      },
                      {
                        key: 'last_login',
                        label: 'Login Terakhir',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return user?.last_login ? formatDate(user.last_login) : 'Belum pernah';
                        }
                      },
                      {
                        key: 'actions',
                        label: 'Aksi',
                        render: (_: unknown, row: unknown) => {
                          const user = row as TenantUser;
                          return (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => user && handleEditUser(user)}
                              disabled={!user}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => user?.id && handleDeleteUser(user.id)}
                              disabled={!user?.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          );
                        }
                      }
                    ]}
                    data={usersDisplay.list as unknown[]}
                    loading={usersLoading}
                    emptyMessage="Tidak ada pengguna ditemukan"
                    className="w-full"
                    striped
                    hoverable
                  />
                </div>

                {/* Pagination */}
                {usersDisplay.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Halaman {usersDisplay.pagination.page} dari {usersDisplay.pagination.totalPages} 
                      ({usersDisplay.pagination.total} total pengguna)
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFilters = { ...usersFilters, page: usersDisplay.pagination.page - 1 };
                          setUsersFilters(newFilters);
                        }}
                        disabled={usersDisplay.pagination.page <= 1}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFilters = { ...usersFilters, page: usersDisplay.pagination.page + 1 };
                          setUsersFilters(newFilters);
                        }}
                        disabled={usersDisplay.pagination.page >= usersDisplay.pagination.totalPages}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              </SectionCard>
            </div>
          )}



          {/* Academic Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              {/* Academic Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Data Akademik
                </h3>
                <ExportButton
                  onExport={(format) => handleExportData(['academic'], format)}
                  isLoading={isExporting}
                  disabled={!academicData}
                  label="Export Academic Data"
                  size="sm"
                />
              </div>
              
              {/* Academic Statistics */}
              <SectionCard
                title="Statistik Akademik"
                icon={GraduationCap}
                fullWidth
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {academicLoading ? '...' : academicData?.statistics?.totalJurusan || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Jurusan</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {academicLoading ? '...' : academicData?.statistics?.totalKelas || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Kelas</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {academicLoading ? '...' : academicData?.statistics?.totalMapel || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Mapel</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {academicLoading ? '...' : academicData?.statistics?.totalGuru || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Guru</p>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {academicLoading ? '...' : academicData?.statistics?.totalSiswa || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Siswa</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {academicLoading ? '...' : `1:${academicData?.statistics?.rasioGuruSiswa || 0}`}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Rasio G:S</p>
                  </div>
                </div>
              </SectionCard>

              {/* Quick Actions */}
              <SectionCard
                title="Aksi Cepat"
                icon={Settings}
                fullWidth
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                    <UserPlus className="h-6 w-6 mb-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tambah Guru</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                    <GraduationCap className="h-6 w-6 mb-2 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tambah Siswa</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                    <School className="h-6 w-6 mb-2 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Buat Kelas</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                    <BookOpen className="h-6 w-6 mb-2 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tambah Mapel</span>
                  </Button>
                </div>
              </SectionCard>

              {/* Academic Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Jurusan List */}
                <SectionCard
                  title="Daftar Jurusan"
                  icon={Building2}
                  fullWidth
                  noPadding
                  actions={
                    <Button size="sm" variant="outline" className="text-xs h-7 py-1 px-2.5">
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Kelola Jurusan
                    </Button>
                  }
                >
                  <div className="p-4 space-y-3 w-full">
                    {academicLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {academicData?.jurusan && academicData.jurusan.length > 0 ? (
                          academicData.jurusan.map((jurusan) => (
                            <div key={jurusan.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{jurusan.nama}</p>
                                <p className="text-sm text-gray-500">{jurusan.kode}</p>
                              </div>
                              <Badge variant={jurusan.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                                {jurusan.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            <p className="text-sm">Belum ada data jurusan</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </SectionCard>

                {/* Kelas List */}
                <SectionCard
                  title="Daftar Kelas"
                  icon={School}
                  fullWidth
                  noPadding
                  actions={
                    <Button size="sm" variant="outline" className="text-xs h-7 py-1 px-2.5">
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Kelola Kelas
                    </Button>
                  }
                >
                  <div className="p-4 space-y-3 w-full">
                    {academicLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {academicData?.kelas && academicData.kelas.length > 0 ? (
                          academicData.kelas.map((kelas) => (
                            <div key={kelas.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{kelas.nama}</p>
                                <p className="text-sm text-gray-500">
                                  {kelas.jurusan?.nama} • {kelas._count?.Siswa || 0} siswa
                                </p>
                              </div>
                              <Badge variant={kelas.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                                {kelas.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            <p className="text-sm">Belum ada data kelas</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Mata Pelajaran */}
              <SectionCard
                title="Mata Pelajaran"
                icon={BookOpen}
                fullWidth
                noPadding
                actions={
                  <Button size="sm" variant="outline" className="text-xs h-7 py-1 px-2.5">
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Kelola Mata Pelajaran
                  </Button>
                }
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {academicLoading ? (
                    <div className="col-span-full flex justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {academicData?.mapel && academicData.mapel.length > 0 ? (
                        academicData.mapel.map((mapel) => (
                          <div key={mapel.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{mapel.nama}</h4>
                              <Badge variant={mapel.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                                {mapel.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">Kode: {mapel.kode}</p>
                            <p className="text-sm text-gray-500">SKS: {mapel.sks}</p>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center text-gray-500 py-4">
                          <p className="text-sm">Belum ada data mata pelajaran</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Attendance Tab */}
          {(() => { const showAttendanceTab = false; return showAttendanceTab ? (
            <div className="space-y-6">
              {/* Attendance Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ✅ Monitoring Kehadiran
                </h3>
                <ExportButton
                  onExport={(format) => handleExportData(['attendance'], format)}
                  isLoading={isExporting}
                  disabled={!attendanceData}
                  label="Export Attendance Data"
                  size="sm"
                />
              </div>

              {/* Date Range Selector & Mode Toggle */}
              <SectionCard
                title="Date Range Selector & Mode Toggle"
                icon={Calendar}
                fullWidth
              >
                <div className="flex flex-wrap items-center gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Dari:</label>
                    <Input
                      type="date"
                      className="w-40 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      defaultValue={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Sampai:</label>
                    <Input
                      type="date"
                      className="w-40 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Mode:</label>
                    <SearchableSelect
                      value="SIMPLE" // TODO: Connect to state
                      onValueChange={(val) => {}} // TODO: Connect to state
                      options={[
                        { value: "SIMPLE", label: "SIMPLE" },
                        { value: "MULTI_SESI", label: "MULTI-SESI" }
                      ]}
                      placeholder="Pilih Mode"
                      searchPlaceholder="Cari mode..."
                      triggerClassName="w-40 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-9">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </SectionCard>

              {/* Attendance Trends Chart Section */}
              <div className="mb-8">
                <SectionCard
                  title="Attendance Trends"
                  icon={TrendingUp}
                  fullWidth
                >
                  {attendanceLoading ? (
                    <div className="flex justify-center py-8 w-full">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      <div className="h-64 w-full">
                        {attendanceData ? (
                          <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                            <TenantAttendanceCharts 
                              data={attendanceData!} 
                              tenantId={tenantId!}
                            />
                          </React.Suspense>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Loader className="w-8 h-8 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm w-full">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Daily attendance rate</p>
                          <p className="font-semibold text-blue-600">
                            {attendanceData?.analytics?.trends?.[0]?.attendance_rate || 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Weekly comparison</p>
                          <p className="font-semibold text-green-600">+2.5%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Performance Metrics Section */}
              <div className="mb-8">
                <SectionCard
                  title="Performance Metrics"
                  icon={Award}
                  fullWidth
                >
                  {attendanceLoading ? (
                    <div className="flex justify-center py-8 w-full">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Average Attendance</h4>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {attendanceData?.analytics?.trends && (attendanceData?.analytics?.trends?.length || 0) > 0 
                            ? Math.round((attendanceData?.analytics?.trends?.reduce((sum, trend) => sum + (trend.attendance_rate || 0), 0) || 0) / (attendanceData?.analytics?.trends?.length || 1))
                            : 0}%
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Best Class</h4>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          XII-A (95%)
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                        <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Total Sessions</h4>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {attendanceData?.analytics?.trends?.reduce((sum, trend) => sum + (trend.total_sessions || 0), 0) || 0}
                        </p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                        <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Active Students</h4>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {attendanceData?.analytics?.trends?.[0]?.total_students || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Recent Attendance Sessions Section */}
              <div className="mb-8">
                <SectionCard
                  title="Recent Attendance Sessions"
                  icon={Clock}
                  fullWidth
                  noPadding
                  actions={
                    <Button size="sm" variant="outline" className="h-8">
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Semua
                    </Button>
                  }
                >
                  <div className="p-4 w-full">
                    {attendanceLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {attendanceData?.sessions && (attendanceData?.sessions?.length || 0) > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Tanggal</th>
                                  <th className="text-left py-2">Waktu</th>
                                  <th className="text-left py-2">Kelas</th>
                                  <th className="text-left py-2">Mata Pelajaran</th>
                                  <th className="text-left py-2">Guru</th>
                                  <th className="text-left py-2">Kehadiran</th>
                                  <th className="text-left py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(attendanceData?.sessions ?? []).slice(0, 10).map((session, index) => (
                                  <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="py-3">{new Date(session.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="py-3">
                                      {session.waktu_mulai} - {session.waktu_selesai || 'Berlangsung'}
                                    </td>
                                    <td className="py-3">
                                      <div>
                                        <p className="font-medium text-slate-800 dark:text-slate-200">{session.kelas_nama}</p>
                                        <p className="text-xs text-gray-500">{session.jurusan_nama}</p>
                                      </div>
                                    </td>
                                    <td className="py-3">{session.mapel_nama || session.jenis_kegiatan}</td>
                                    <td className="py-3">{session.guru_nama}</td>
                                    <td className="py-3">
                                      <div className="text-center">
                                        <p className="font-semibold">{session.total_hadir}/{session.total_siswa}</p>
                                        <p className="text-xs text-gray-500">
                                          {Math.round(session.attendance_rate)}%
                                        </p>
                                      </div>
                                    </td>
                                    <td className="py-3">
                                      <Badge variant={
                                        session.status === 'SELESAI' ? 'outline' :
                                        session.status === 'BERLANGSUNG' ? 'default' : 'secondary'
                                      }>
                                        {session.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Belum ada sesi kehadiran</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Peringatan Kehadiran Section */}
              {(attendanceData?.analytics?.alerts?.length || 0) > 0 && (
                <div className="mb-8">
                  <SectionCard
                    title="Peringatan Kehadiran"
                    icon={AlertTriangle}
                    fullWidth
                  >
                    <div className="space-y-3 w-full">
                      {attendanceData?.analytics?.alerts?.map((alert, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 w-full ${
                          alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                          alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                          'bg-blue-50 border-blue-400'
                        }`}>
                          <div className="flex w-full">
                            <div className="flex-shrink-0">
                              <AlertTriangle className={`h-5 w-5 ${
                                alert.severity === 'high' ? 'text-red-400' :
                                alert.severity === 'medium' ? 'text-yellow-400' :
                                'text-blue-400'
                              }`} />
                            </div>
                            <div className="ml-3 w-full">
                              <p className={`text-sm font-medium ${
                                alert.severity === 'high' ? 'text-red-800' :
                                alert.severity === 'medium' ? 'text-yellow-800' :
                                'text-blue-800'
                              }`}>
                                {alert.message}
                              </p>
                              <p className={`text-xs mt-1 ${
                                alert.severity === 'high' ? 'text-red-600' :
                                alert.severity === 'medium' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                Terkait: {alert.related_entity}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          ) : null; })()}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Billing Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Data Billing & Pembayaran
                </h3>
                <ExportButton
                  onExport={(format) => handleExportData(['billing'], format)}
                  isLoading={isExporting}
                  disabled={!billingData}
                  label="Export Billing Data"
                  size="sm"
                />
              </div>
              
              {billingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Memuat data billing...</span>
                </div>
              ) : billingData ? (
                <>
                  {/* Active Subscription */}
                  <SectionCard
                    title="Langganan Aktif"
                    icon={CreditCard}
                    fullWidth
                  >
                    {billingData.activeSubscription ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">Paket</h4>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {billingData.activeSubscription.plan_name || billingData.activeSubscription.plan?.name || '-'}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <h4 className="font-medium text-green-900 dark:text-green-100">Status</h4>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {billingData.activeSubscription.status || '-'}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <h4 className="font-medium text-purple-900 dark:text-purple-100">Harga</h4>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            Rp {billingData.activeSubscription.plan?.price_monthly?.toLocaleString('id-ID') || '0'}
                          </p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                          <h4 className="font-medium text-orange-900 dark:text-orange-100">Berakhir</h4>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {billingData.activeSubscription.end_date ? formatDate(billingData.activeSubscription.end_date) : '-'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 w-full">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Tidak ada langganan aktif</p>
                      </div>
                    )}
                  </SectionCard>

                  {/* Payment History */}
                  <SectionCard
                    title="Riwayat Pembayaran (20 Terakhir)"
                    icon={History}
                    fullWidth
                    noPadding
                  >
                    <div className="p-4 w-full">
                      {billingData.paymentHistory && billingData.paymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Tanggal</th>
                                <th className="text-left py-2">Jumlah</th>
                                <th className="text-left py-2">Status</th>
                                <th className="text-left py-2">Metode</th>
                                <th className="text-left py-2">Referensi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {billingData.paymentHistory
                                .slice()
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((payment, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="py-2">{payment.created_at ? formatDate(payment.created_at) : '-'}</td>
                                  <td className="py-2 font-medium">
                                    Rp {(payment.amount ?? 0).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2">
                                    <Badge 
                                      variant={
                                        payment.status === 'SUCCESS' ? 'success' : 
                                        payment.status === 'PENDING' ? 'warning' : 'destructive'
                                      }
                                    >
                                      {payment.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2">{payment.payment_method || '-'}</td>
                                  <td className="py-2 text-xs text-gray-500">{payment.external_id || payment.gateway_transaction_id || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>Belum ada riwayat pembayaran</p>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {/* Subscription History */}
                  <SectionCard
                    title="Riwayat Langganan"
                    icon={Calendar}
                    fullWidth
                  >
                    <div className="w-full space-y-4">
                      {billingData.subscriptionHistory && billingData.subscriptionHistory.length > 0 ? (
                        <div className="space-y-4 w-full">
                          {billingData.subscriptionHistory
                            .slice()
                            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                            .map((subscription, index) => (
                            <div key={index} className="border rounded-lg p-4 w-full">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium">{subscription.plan_name}</h4>
                                  <p className="text-sm text-gray-500 font-sans">
                                    {subscription.start_date ? formatDate(subscription.start_date) : '-'} - {subscription.end_date ? formatDate(subscription.end_date) : '-'}
                                  </p>
                                </div>
                                <Badge 
                                  variant={
                                    subscription.status === 'ACTIVE' ? 'success' : 
                                    subscription.status === 'EXPIRED' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {subscription.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <p>Harga: Rp {(subscription.plan?.price_monthly ?? 0).toLocaleString('id-ID')}/bulan</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 w-full">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>Belum ada riwayat langganan</p>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Data Billing Tidak Tersedia</p>
                      <p className="text-sm">Gagal memuat data billing untuk tenant ini</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* Logs Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Log Aktivitas
                </h3>
                <ExportButton
                  onExport={(format) => handleExportData(['logs'], format)}
                  isLoading={isExporting}
                  disabled={logsData.length === 0}
                  label="Export Activity Logs"
                  size="sm"
                />
              </div>
              
              {/* Logs Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnalyticsCard
                  title="Total Log"
                  value={logsStats.totalLogs.toLocaleString('id-ID')}
                  icon={<FileText size={20} className="text-white" />}
                  gradient="from-blue-500 to-cyan-600"
                />

                <AnalyticsCard
                  title="Pengguna Aktif"
                  value={logsStats.uniqueUsers}
                  icon={<Users size={20} className="text-white" />}
                  gradient="from-green-500 to-emerald-600"
                />

                <AnalyticsCard
                  title="Jenis Aktivitas"
                  value={logsStats.uniqueActions}
                  icon={<Activity size={20} className="text-white" />}
                  gradient="from-purple-500 to-pink-600"
                />

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rentang Waktu</p>
                        <p className="text-sm font-bold">
                          {logsStats.dateRange.from && logsStats.dateRange.to 
                            ? `${new Date(logsStats.dateRange.from).toLocaleDateString('id-ID')} - ${new Date(logsStats.dateRange.to).toLocaleDateString('id-ID')}`
                            : 'Semua waktu'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <SectionCard
                title="Filter Log Aktivitas"
                icon={History}
                fullWidth
              >
                <div className="w-full">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Filter cepat:
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const preset = {
                          page: 1,
                          limit: logsFilters.limit ?? 10,
                          search: 'ADMIN_',
                          user_id: undefined,
                          action: undefined,
                          entity: undefined,
                          date_from: undefined,
                          date_to: undefined,
                        };
                        setLogsFilters(preset);
                        loadTenantLogs(preset);
                      }}
                    >
                      Policy Changes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const preset = {
                          page: 1,
                          limit: logsFilters.limit ?? 10,
                        };
                        setLogsFilters(preset);
                        loadTenantLogs(preset);
                      }}
                    >
                      Semua Aktivitas
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Pencarian</label>
                      <Input
                        type="text"
                        placeholder="Cari detail aktivitas..."
                        className="w-full bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={logsFilters.search || ''}
                        onChange={(e) => {
                          const newFilters = { ...logsFilters, search: e.target.value || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pengguna</label>
                      <SearchableSelect
                        value={logsFilters.user_id || ''}
                        onValueChange={(val) => {
                          const newFilters = { ...logsFilters, user_id: val || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                        options={[
                          { value: "", label: "Semua Pengguna" },
                          ...users.map(user => ({ value: user.id, label: user.full_name }))
                        ]}
                        placeholder="Semua Pengguna"
                        searchPlaceholder="Cari pengguna..."
                        triggerClassName="w-full bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Aksi</label>
                      <SearchableSelect
                        value={logsFilters.action || ''}
                        onValueChange={(val) => {
                          const newFilters = { ...logsFilters, action: val || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                        options={[
                          { value: "", label: "Semua Aksi" },
                          { value: "CREATE", label: "Create" },
                          { value: "UPDATE", label: "Update" },
                          { value: "DELETE", label: "Delete" },
                          { value: "LOGIN", label: "Login" },
                          { value: "LOGOUT", label: "Logout" },
                          { value: "VIEW", label: "View" }
                        ]}
                        placeholder="Semua Aksi"
                        searchPlaceholder="Cari aksi..."
                        triggerClassName="w-full bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Entitas</label>
                      <SearchableSelect
                        value={logsFilters.entity || ''}
                        onValueChange={(val) => {
                          const newFilters = { ...logsFilters, entity: val || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                        options={[
                          { value: "", label: "Semua Entitas" },
                          { value: "USER", label: "User" },
                          { value: "STUDENT", label: "Student" },
                          { value: "TEACHER", label: "Teacher" },
                          { value: "CLASS", label: "Class" },
                          { value: "ATTENDANCE", label: "Attendance" },
                          { value: "ACADEMIC", label: "Academic" }
                        ]}
                        placeholder="Semua Entitas"
                        searchPlaceholder="Cari entitas..."
                        triggerClassName="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Dari Tanggal</label>
                      <Input
                        type="date"
                        value={logsFilters.date_from || ''}
                        onChange={(e) => {
                          const newFilters = { ...logsFilters, date_from: e.target.value || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Sampai Tanggal</label>
                      <Input
                        type="date"
                        value={logsFilters.date_to || ''}
                        onChange={(e) => {
                          const newFilters = { ...logsFilters, date_to: e.target.value || undefined, page: 1 };
                          setLogsFilters(newFilters);
                          loadTenantLogs(newFilters);
                        }}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          const resetFilters = { page: 1, limit: 10 };
                          setLogsFilters(resetFilters);
                          loadTenantLogs(resetFilters);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Reset Filter
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Logs Table */}
              <SectionCard
                title="Log Aktivitas"
                icon={FileText}
                fullWidth
                noPadding
                actions={
                  <div className="flex items-center gap-4">
                    {lastUpdated.logs && (
                      <div className="flex items-center text-xs text-gray-500 font-sans">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Diperbarui {formatLastUpdated(lastUpdated.logs)}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 font-semibold font-sans">
                      Menampilkan {((logsPagination.page - 1) * logsPagination.limit) + 1} - {Math.min(logsPagination.page * logsPagination.limit, logsPagination.total)} dari {logsPagination.total} log
                    </div>
                  </div>
                }
              >
                <div className="p-4 flex-1 flex flex-col">
                  {logsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader className="h-8 w-8 animate-spin" />
                    </div>
                  ) : logsData.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <Table
                          columns={[
                            {
                              key: 'timestamp',
                              label: 'Waktu',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  <div className="text-sm">
                                    <div className="font-medium">
                                      {log?.timestamp ? new Date(log.timestamp).toLocaleDateString('id-ID') : '-'}
                                    </div>
                                    <div className="text-gray-500">
                                      {log?.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID') : ''}
                                    </div>
                                  </div>
                                );
                              }
                            },
                            {
                              key: 'user',
                              label: 'Pengguna',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  <div className="text-sm">
                                    <div className="font-medium">{log?.user?.full_name || 'System'}</div>
                                    <div className="text-gray-500">{log?.user?.email || ''}</div>
                                  </div>
                                );
                              }
                            },
                            {
                              key: 'action',
                              label: 'Aksi',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  <Badge 
                                    variant={
                                      log?.action === 'CREATE' ? 'success' :
                                      log?.action === 'UPDATE' ? 'default' :
                                      log?.action === 'DELETE' ? 'destructive' :
                                      log?.action === 'LOGIN' ? 'success' :
                                      log?.action === 'LOGOUT' ? 'secondary' :
                                      'default'
                                    }
                                  >
                                    {log?.action ?? '-'}
                                  </Badge>
                                );
                              }
                            },
                            {
                              key: 'entity',
                              label: 'Entitas',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  <div>
                                    <span className="text-sm font-medium">{log?.entity || '-'}</span>
                                    {log?.entity_id && (
                                      <div className="text-xs text-gray-500">ID: {log.entity_id}</div>
                                    )}
                                  </div>
                                );
                              }
                            },
                            {
                              key: 'ip_address',
                              label: 'IP Address',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                    {log?.ip_address || '-'}
                                  </div>
                                );
                              }
                            },
                            {
                              key: 'metadata',
                              label: 'Detail',
                              render: (_: unknown, row: unknown) => {
                                const log = row as ActivityLogItem;
                                return (
                                  log?.metadata ? (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                      {typeof log.metadata === 'string' 
                                        ? log.metadata 
                                        : JSON.stringify(log.metadata)
                                      }
                                    </div>
                                  ) : null
                                );
                              }
                            }
                          ]}
                          data={logsData}
                          loading={logsLoading}
                          emptyMessage="Tidak ada log aktivitas ditemukan"
                          className="w-full"
                          striped
                          hoverable
                        />
                      </div>

                      {/* Pagination */}
                      {logsPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Halaman {logsPagination.page} dari {logsPagination.totalPages}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newFilters = { ...logsFilters, page: logsPagination.page - 1 };
                                setLogsFilters(newFilters);
                                loadTenantLogs(newFilters);
                              }}
                              disabled={logsPagination.page <= 1}
                            >
                              Sebelumnya
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newFilters = { ...logsFilters, page: logsPagination.page + 1 };
                                setLogsFilters(newFilters);
                                loadTenantLogs(newFilters);
                              }}
                              disabled={logsPagination.page >= logsPagination.totalPages}
                            >
                              Selanjutnya
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Tidak Ada Log</p>
                      <p className="text-sm">Belum ada aktivitas yang tercatat untuk tenant ini</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* System Notifications */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Notifikasi dari Log Terbaru
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {logsData.slice(0, 5).map((log, index) => (
                        <div key={log?.id || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{log?.user?.full_name || 'System'} • {log?.action || '-'}</div>
                            <div className="text-xs text-gray-500">{log?.entity || '-'}{log?.entity_id ? ` • ID: ${log.entity_id}` : ''}</div>
                          </div>
                          <div className="text-xs text-gray-500">{log?.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : ''}</div>
                        </div>
                      ))}
                      {logsData.length === 0 && (
                        <div className="text-sm text-gray-500">Belum ada notifikasi dari log</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      System Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logsData.filter((l) => l?.metadata && typeof l.metadata === 'object' && (l.metadata as Record<string, unknown>)['severity']).slice(0, 3).length > 0 ? (
                      <div className="space-y-4">
                        {logsData.filter((l) => l?.metadata && typeof l.metadata === 'object' && (l.metadata as Record<string, unknown>)['severity']).slice(0, 3).map((log, index) => (
                          <div
                            key={log?.id || `alert-${index}`}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                              ((log?.metadata as Record<string, unknown>)['severity'] as string | undefined) === 'high'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : ((log?.metadata as Record<string, unknown>)['severity'] as string | undefined) === 'medium'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              }`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-3 ${
                                  ((log?.metadata as Record<string, unknown>)['severity'] as string | undefined) === 'high'
                                    ? 'bg-red-500'
                                    : ((log?.metadata as Record<string, unknown>)['severity'] as string | undefined) === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-blue-500'
                                  }`}
                              ></div>
                              <div>
                                <div className="font-medium text-sm">{log?.entity || 'SYSTEM'} • {log?.action || '-'}</div>
                                <div className="text-xs text-gray-500">{log?.metadata && typeof log.metadata === 'object' ? String(((log.metadata as Record<string, unknown>)['message'] as string | undefined) || '') : ''}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">{log?.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : ''}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Tidak ada alert sistem</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* User Modal */}
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title={selectedUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
        >
          <div className="p-6">
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Masukkan email"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password {!selectedUser && '*'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={selectedUser ? "Kosongkan jika tidak ingin mengubah password" : "Masukkan password"}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <SearchableSelect
                  value={userFormData.role_id}
                  onValueChange={(val) => setUserFormData({ ...userFormData, role_id: val })}
                  options={[
                    { value: "", label: "Pilih Role" },
                    ...roles.map((role) => ({ value: role.id, label: role.name }))
                  ]}
                  placeholder="Pilih Role"
                  searchPlaceholder="Cari role..."
                  disabled={rolesLoading}
                  triggerClassName="w-full"
                />
                {rolesLoading && (
                  <p className="text-sm text-gray-500 mt-1">Memuat daftar role...</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <SearchableSelect
                  value={userFormData.status}
                  onValueChange={(val) => setUserFormData({ ...userFormData, status: val as 'ACTIVE' | 'INACTIVE' })}
                  options={[
                    { value: "ACTIVE", label: "Aktif" },
                    { value: "INACTIVE", label: "Tidak Aktif" }
                  ]}
                  placeholder="Pilih Status"
                  searchPlaceholder="Cari status..."
                  triggerClassName="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowUserModal(false)}
                disabled={userFormLoading}
              >
                Batal
              </Button>
              <Button 
                onClick={handleUserFormSubmit}
                disabled={userFormLoading}
              >
                {userFormLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    {selectedUser ? 'Menyimpan...' : 'Menambahkan...'}
                  </>
                ) : (
                  selectedUser ? 'Simpan' : 'Tambah'
                )}
              </Button>
            </div>
          </div>
        </Modal>
    </SuperAdminPageLayout>
  );
}
