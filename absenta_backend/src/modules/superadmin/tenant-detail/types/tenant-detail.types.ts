/**
 * Types dan interfaces untuk modul tenant detail
 */

// Interface untuk response API standar
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Interface untuk metrics tenant
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
    plan: {
      name: string;
      price: number;
    };
  } | null;
  activities: {
    last24Hours: number;
  };
}

// Interface untuk aktivitas terbaru
export interface RecentActivity {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Interface untuk statistik pengguna
export interface UserStatistics {
  totalUsers: number;
  usersByRole: {
    [roleName: string]: number;
  };
  activeUsers: number;
  inactiveUsers: number;
}

// Interface untuk detail tenant lengkap
export interface TenantDetailData {
  id: string;
  name: string;
  domain: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relasi
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: {
      name: string;
    };
  }>;
  
  subscription: {
    id: string;
    status: string;
    plan: {
      name: string;
      price: number;
    };
  } | null;
  
  sekolah: {
    id: string;
    nama: string;
    alamat: string;
  } | null;
  
  // Data akademik
  jurusan: Array<any>;
  kelas: Array<any>;
  guru: Array<any>;
  siswa: Array<any>;
  mapel: Array<any>;
  tahunPelajaran: Array<any>;
  semester: Array<any>;
  
  // Data absensi
  sesiAbsensi: Array<any>;
  
  // Billing dan payment
  billing: Array<any>;
  payment: Array<any>;
  
  // Logs dan aktivitas
  activityLog: Array<RecentActivity>;
  
  // Konfigurasi
  config: Array<any>;
}

// Interface untuk parameter request
export interface GetTenantDetailParams {
  tenantId: string;
}

export interface GetRecentActivitiesQuery {
  limit?: number;
}

// Interface untuk logs filtering
export interface GetTenantLogsQuery {
  page: number;
  limit: number;
  user_id?: string;
  action?: string;
  entity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ActivityLogItem {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  timestamp: Date;
  metadata: string | null;
  User: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface TenantLogsResponse {
  logs: ActivityLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    user_id?: string;
    action?: string;
    entity?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  };
  summary: {
    totalLogs: number;
    uniqueUsers: number;
    uniqueActions: number;
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
  };
}

// Interface untuk error handling
export interface TenantDetailError {
  code: string;
  message: string;
  details?: any;
}
