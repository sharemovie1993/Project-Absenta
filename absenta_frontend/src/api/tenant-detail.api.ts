import { requestWithFallback } from "./apiUtils";

// Types untuk tenant detail
export interface TenantDetail {
  id: string;
  name: string;
  domain: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  subscription_status: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  created_at: string;
  updated_at: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export interface TenantMetrics {
  users: {
    total: number;
    siswa: number;
    guru: number;
  };
  academic: {
    kelas: number;
    jurusan: number;
    mapel: number;
  };
  subscription: {
    id: string;
    status: string;
    Plan: {
      name: string;
      price: number;
    };
  } | null;
  activities: {
    last24Hours: number;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  user_name: string;
  created_at: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: Array<{
    roleName: string;
    count: number;
  }>;
  activeUserPercentage: number;
}

export interface TenantUser {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  last_login?: string;
}

// Activity Log interfaces
export interface ActivityLogItem {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  timestamp: string;
  metadata: any;
  ip_address?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface TenantLogsResponse {
  success: boolean;
  message: string;
  data: {
    logs: ActivityLogItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      user_id?: string;
      action?: string;
      entity?: string;
      date_from?: string;
      date_to?: string;
    };
    summary: {
      totalLogs: number;
      uniqueUsers: number;
      uniqueActions: number;
      dateRange: {
        earliest: string;
        latest: string;
      };
    };
  };
}

export interface GetTenantLogsParams {
  page?: number;
  limit?: number;
  user_id?: string;
  action?: string;
  entity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CreateTenantUserRequest {
  name: string;
  email: string;
  password?: string;
  role: string;
  status?: 'ACTIVE' | 'INACTIVE';
  full_name?: string;
}

export interface UpdateTenantUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  full_name?: string;
}

// Response types
export interface TenantDetailResponse {
  success: boolean;
  message: string;
  data: TenantDetail;
}

export interface TenantMetricsResponse {
  success: boolean;
  message: string;
  data: TenantMetrics;
}

export interface RecentActivitiesResponse {
  success: boolean;
  message: string;
  data: RecentActivity[];
}

export interface UserStatisticsResponse {
  success: boolean;
  message: string;
  data: UserStatistics;
}

export interface TenantUsersResponse {
  success: boolean;
  message: string;
  data: {
    users: TenantUser[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface TenantUserResponse {
  success: boolean;
  message: string;
  data: TenantUser;
}

export interface DeleteTenantUserResponse {
  success: boolean;
  message: string;
}

// API Functions
export async function getTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
  try {
    return requestWithFallback<TenantDetailResponse>('get', `/superadmin/tenants/${tenantId}`);
  } catch (error) {
    throw error;
  }
}

export async function getTenantMetrics(tenantId: string): Promise<TenantMetricsResponse> {
  try {
    return requestWithFallback<TenantMetricsResponse>('get', `/superadmin/tenants/${tenantId}/metrics`);
  } catch (error) {
    throw error;
  }
}

export async function getRecentActivities(tenantId: string): Promise<RecentActivitiesResponse> {
  try {
    return requestWithFallback<RecentActivitiesResponse>('get', `/superadmin/tenants/${tenantId}/activities`);
  } catch (error) {
    throw error;
  }
}

export async function getUserStatistics(tenantId: string): Promise<UserStatisticsResponse> {
  try {
    return requestWithFallback<UserStatisticsResponse>('get', `/superadmin/tenants/${tenantId}/user-statistics`);
  } catch (error) {
    throw error;
  }
}

export async function getTenantUsers(
  tenantId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }
): Promise<TenantUsersResponse> {
  try {
    return requestWithFallback<TenantUsersResponse>('get', `/superadmin/tenants/${tenantId}/users`, { params });
  } catch (error) {
    throw error;
  }
}

export async function createTenantUser(
  tenantId: string,
  userData: CreateTenantUserRequest
): Promise<TenantUserResponse> {
  try {
    return requestWithFallback<TenantUserResponse>('post', `/superadmin/tenants/${tenantId}/users`, { data: userData, headers: { 'X-Skip-Tenant': 'true' } });
  } catch (error) {
    throw error;
  }
}

export async function updateTenantUser(
  tenantId: string,
  userId: string,
  userData: UpdateTenantUserRequest
): Promise<TenantUserResponse> {
  try {
    return requestWithFallback<TenantUserResponse>('put', `/superadmin/tenants/${tenantId}/users/${userId}`, { data: userData, headers: { 'X-Skip-Tenant': 'true' } });
  } catch (error) {
    throw error;
  }
}

export async function deleteTenantUser(
  tenantId: string,
  userId: string
): Promise<DeleteTenantUserResponse> {
  try {
    return requestWithFallback<DeleteTenantUserResponse>('delete', `/superadmin/tenants/${tenantId}/users/${userId}`, { headers: { 'X-Skip-Tenant': 'true' } });
  } catch (error) {
    throw error;
  }
}

// Tenant Actions
export async function suspendTenant(tenantId: string): Promise<{ success: boolean; message: string }> {
  try {
    return requestWithFallback<{ success: boolean; message: string }>('patch', `/superadmin/tenants/${tenantId}/suspend`);
  } catch (error) {
    throw error;
  }
}

export async function activateTenant(tenantId: string): Promise<{ success: boolean; message: string }> {
  try {
    return requestWithFallback<{ success: boolean; message: string }>('patch', `/superadmin/tenants/${tenantId}/activate`);
  } catch (error) {
    throw error;
  }
}

export async function deleteTenant(tenantId: string): Promise<{ success: boolean; message: string }> {
  try {
    return requestWithFallback<{ success: boolean; message: string }>('delete', `/superadmin/tenants/${tenantId}`);
  } catch (error) {
    throw error;
  }
}

// Academic Data Types
export interface AcademicStatistics {
  totalJurusan: number;
  totalKelas: number;
  totalGuru: number;
  totalSiswa: number;
  totalMapel: number;
  guruAktif: number;
  siswaAktif: number;
  rasioGuruSiswa: string;
  persentaseGuruAktif: number;
  persentaseSiswaAktif: number;
}

export interface Jurusan {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string;
  totalKelas: number;
  totalSiswa: number;
  status: string;
  created_at: string;
}

export interface Kelas {
  id: string;
  nama: string;
  tingkat: number;
  jurusan: {
    id: string;
    nama: string;
    kode: string;
  } | null;
  waliKelas: {
    id: string;
    nama: string;
    nip: string;
  } | null;
  totalSiswa: number;
  kapasitas: number;
  status: string;
  created_at: string;
  _count?: {
    Siswa: number;
  };
}

export interface Guru {
  id: string;
  nama: string;
  nip: string;
  email?: string;
  status: string;
  totalKelas: number;
  totalMapel: number;
  created_at: string;
}

export interface Siswa {
  id: string;
  nama: string;
  nis: string;
  email?: string;
  kelas: {
    id: string;
    nama: string;
    tingkat: number;
    jurusan: {
      nama: string;
      kode: string;
    } | null;
  } | null;
  status: string;
  created_at: string;
}

export interface Mapel {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string;
  sks?: number;
  guru: {
    id: string;
    nama: string;
    nip: string;
  }[];
  totalGuru: number;
  status: string;
  created_at: string;
}

export interface AcademicData {
  statistics: AcademicStatistics;
  jurusan: Jurusan[];
  kelas: Kelas[];
  guru: Guru[];
  siswa: Siswa[];
  mapel: Mapel[];
}

// Attendance Data Types
export interface AttendanceOverview {
  summary: {
    total_sessions: number;
    total_attendance_records: number;
    average_attendance_rate: number;
    best_performing_class: {
      kelas_nama: string;
      attendance_rate: number;
    } | null;
    lowest_performing_class: {
      kelas_nama: string;
      attendance_rate: number;
    } | null;
  };
  by_class: Array<{
    kelas_id: string;
    kelas_nama: string;
    jurusan_nama: string;
    total_siswa: number;
    attendance_rate: number;
    total_sessions: number;
  }>;
  daily_stats?: Array<{
    date: string;
    present_count: number;
    total_students: number;
    attendance_rate: number;
  }>;
}

export interface AttendanceSession {
  id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  kelas_nama: string;
  jurusan_nama: string;
  mapel_nama: string;
  guru_nama: string;
  jenis_kegiatan: string;
  status: string;
  total_siswa: number;
  total_hadir: number;
  attendance_rate: number;
}

export interface AttendanceTrend {
  period: string;
  attendance_rate: number;
  total_sessions: number;
  total_students: number;
}

export interface AttendanceAlert {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  related_entity: string;
}

export interface AttendanceAnalytics {
  trends: AttendanceTrend[];
  performance_by_subject: Array<{
    mapel_nama: string;
    attendance_rate: number;
    total_sessions: number;
  }>;
  alerts: AttendanceAlert[];
}

export interface AttendanceData {
  overview: AttendanceOverview;
  sessions: AttendanceSession[];
  analytics: AttendanceAnalytics;
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly';
  };
}

// Academic Data API Functions
export async function getAcademicData(tenantId: string): Promise<{ success: boolean; message: string; data: AcademicData }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: AcademicData }>('get', `/superadmin/tenants/${tenantId}/academic`);
  } catch (error) {
    throw error;
  }
}

// Attendance Data API Functions
export async function getAttendanceData(
  tenantId: string, 
  options: {
    date_from?: string;
    date_to?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  } = {}
): Promise<{ success: boolean; message: string; data: AttendanceData }> {
  try {
    return requestWithFallback<{ success: boolean; message: string; data: AttendanceData }>('get', `/superadmin/tenants/${tenantId}/attendance`, { params: options });
  } catch (error) {
    throw error;
  }
}

// Billing Types
export interface BillingData {
  activeSubscription: ActiveSubscription | null;
  subscriptionHistory: SubscriptionHistory[];
  paymentHistory: PaymentHistory[];
  analytics: BillingAnalytics;
}

export interface ActiveSubscription {
  id: string;
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    features: any;
  };
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  next_billing_date: string | null;
  created_at: string;
}

export interface SubscriptionHistory {
  id: string;
  plan: {
    name: string;
    price_monthly: number;
  };
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  gateway_transaction_id: string | null;
  external_id: string | null;
  plan_name: string;
  created_at: string;
  paid_at: string | null;
}

export interface BillingAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentStats: Record<string, number>;
  totalPayments: number;
  averagePayment: number;
}

// Get tenant billing data
export async function getTenantBilling(tenantId: string): Promise<{ success: boolean; data: BillingData; message: string }> {
  try {
    return requestWithFallback<{ success: boolean; data: BillingData; message: string }>('get', `/superadmin/tenants/${tenantId}/billing`);
  } catch (error) {
    throw error;
  }
}

// Export Types
export interface ExportTenantDataParams {
  entities: string[]; // ['users', 'academic', 'attendance', 'billing', 'logs']
  format: 'JSON' | 'CSV' | 'EXCEL';
  date_from?: string;
  date_to?: string;
}

export interface ExportTenantDataResponse {
  success: boolean;
  message: string;
  data: {
    format: string;
    data?: any; // For JSON format
    download_url?: string; // For CSV/EXCEL format
    file_size: number;
    expires_at: string;
    message?: string;
  };
}

// Export tenant data
export async function exportTenantData(
  tenantId: string,
  params: ExportTenantDataParams
): Promise<ExportTenantDataResponse> {
  try {
    return requestWithFallback<ExportTenantDataResponse>('get', `/superadmin/tenants/${tenantId}/export`, {
      params: {
        entities: params.entities,
        format: params.format,
        date_from: params.date_from,
        date_to: params.date_to
      }
    });
  } catch (error) {
    throw error;
  }
}

// Get tenant logs with filtering and pagination
export async function getTenantLogs(
  tenantId: string,
  params?: GetTenantLogsParams
): Promise<TenantLogsResponse> {
  try {
    const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
    return requestWithFallback<TenantLogsResponse>('get', `/superadmin/tenants/${tenantId}/logs`, { params: q });
  } catch (error) {
    throw error;
  }
}
