/**
 * 🔑 Cache Keys Constants
 * Mengelola semua cache keys untuk konsistensi di seluruh aplikasi
 */

export const CACHE_KEYS = {
  // 🏢 Tenant related caches
  TENANT: {
    DETAIL: (tenantId: string) => `tenant:${tenantId}:detail`,
    METRICS: (tenantId: string) => `tenant:${tenantId}:metrics`,
    USERS: (tenantId: string, page: number = 1, limit: number = 10) => 
      `tenant:${tenantId}:users:${page}:${limit}`,
    USER_STATS: (tenantId: string) => `tenant:${tenantId}:user_stats`,
    ACTIVITIES: (tenantId: string, limit: number = 10) => 
      `tenant:${tenantId}:activities:${limit}`,
    ACADEMIC: (tenantId: string) => `tenant:${tenantId}:academic`,
    ATTENDANCE: (tenantId: string, period: string = 'weekly') => 
      `tenant:${tenantId}:attendance:${period}`,
    BILLING: (tenantId: string) => `tenant:${tenantId}:billing`,
    LOGS: (tenantId: string, page: number = 1, limit: number = 10) => 
      `tenant:${tenantId}:logs:${page}:${limit}`,
    ALL: (tenantId: string) => `tenant:${tenantId}:*`
  },

  // 🎨 Branding related caches
  BRANDING: {
    ACTIVE: (tenantId: string | null) => `branding:active:${tenantId || 'global'}`,
    LIST: (tenantId: string | null) => `branding:list:${tenantId || 'global'}`,
    ITEM: (id: string) => `branding:item:${id}`,
    ALL: (tenantId: string | null) => `branding:${tenantId || 'global'}:*`
  },

  // 📊 Dashboard related caches
  DASHBOARD: {
    OVERVIEW: (tenantId: string | null, date?: string) => 
      `dashboard:overview:${tenantId || 'global'}:${date || 'today'}`,
    STATS_KELAS_HARIAN: (tenantId: string | null, date: string) => 
      `dashboard:stats_kelas:${tenantId || 'global'}:${date}`,
    STATS_KELAS_BULANAN: (tenantId: string | null, kelasId: string, bulan: string) => 
      `dashboard:stats_kelas_bulanan:${tenantId || 'global'}:${kelasId}:${bulan}`,
    STATS_GURU_HARIAN: (tenantId: string | null, date: string) => 
      `dashboard:stats_guru:${tenantId || 'global'}:${date}`,
    GRAFIK_SISWA_BULANAN: (tenantId: string | null, bulan: string) => 
      `dashboard:grafik_siswa:${tenantId || 'global'}:${bulan}`,
    GRAFIK_GURU_BULANAN: (tenantId: string | null, bulan: string) => 
      `dashboard:grafik_guru:${tenantId || 'global'}:${bulan}`,
    ALL: (tenantId: string | null) => `dashboard:${tenantId || 'global'}:*`
  },

  // 👥 User related caches
  USER: {
    PROFILE: (userId: string) => `user:${userId}:profile`,
    PERMISSIONS: (userId: string) => `user:${userId}:permissions`,
    ROLES: () => `user:roles:all`,
    ALL: (userId: string) => `user:${userId}:*`
  },

  // 🎓 Academic related caches
  ACADEMIC: {
    JURUSAN: (tenantId: string) => `academic:${tenantId}:jurusan`,
    KELAS: (tenantId: string) => `academic:${tenantId}:kelas`,
    GURU: (tenantId: string) => `academic:${tenantId}:guru`,
    SISWA: (tenantId: string) => `academic:${tenantId}:siswa`,
    MAPEL: (tenantId: string) => `academic:${tenantId}:mapel`,
    BEBAN_GURU: (tenantId: string, yearId?: string, semId?: string) => `academic:${tenantId}:beban_guru:${yearId || 'default'}:${semId || 'default'}`,
    JADWAL_GRID: (tenantId: string, kelasId?: string, yearId?: string, semId?: string) => `academic:${tenantId}:jadwal_grid:${kelasId || 'all'}:${yearId || 'default'}:${semId || 'default'}`,
    JADWAL_GURU_TIMELINE: (tenantId: string, guruId: string, day?: string) => `academic:${tenantId}:jadwal_guru:${guruId}:${day || 'all'}`,
    REKAP_KELAS_BULANAN: (tenantId: string, kelasId: string, bulan: string, yearId?: string) => `academic:${tenantId}:rekap:kelas:${kelasId}:${bulan}:${yearId || 'default'}`,
    REKAP_MAPEL_BULANAN: (tenantId: string, kelasId: string, mapelId: string, bulan: string) => `academic:${tenantId}:rekap:mapel:${kelasId}:${mapelId}:${bulan}`,
    REKAP_HARIAN_KELAS: (tenantId: string, kelasId: string, tanggal: string) => `academic:${tenantId}:rekap:harian:${kelasId}:${tanggal}`,
    REKAP_SISWA_INDIVIDUAL: (tenantId: string, siswaId: string, bulan: string) => `academic:${tenantId}:rekap:siswa:${siswaId}:${bulan}`,
    TRACKING_HARIAN_SISWA: (tenantId: string, siswaId: string, tanggal: string) => `academic:${tenantId}:rekap:tracking:${siswaId}:${tanggal}`,
    MONITORING_PRESENSI_GURU: (tenantId: string, guruId: string, tanggal: string) => `academic:${tenantId}:rekap:guru_monitoring:${guruId}:${tanggal}`,
    REKAP_KBM_GURU: (tenantId: string, yearId?: string, semId?: string) => `academic:${tenantId}:rekap:kbm:${yearId || 'default'}:${semId || 'default'}`,
    STRUKTUR_TREE: (tenantId: string) => `academic:${tenantId}:struktur_tree`,
    WALI_KELAS_LIST: (tenantId: string, page?: number, limit?: number, search?: string, includeInactive?: boolean) => `academic:${tenantId}:wali_kelas:${page || 1}:${limit || 10}:${search || 'all'}:${includeInactive ? 'inc' : 'exc'}`,
    TAHUN_PELAJARAN: (tenantId: string) => `academic:${tenantId}:tahun_pelajaran`,
    SEMESTER: (tenantId: string) => `academic:${tenantId}:semester`,
    ALL: (tenantId: string) => `academic:${tenantId}:*`
  },

  // ✅ Attendance related caches
  ATTENDANCE: {
    SESSIONS: (tenantId: string, date: string) => `attendance:${tenantId}:sessions:${date}`,
    SUMMARY: (tenantId: string, period: string) => `attendance:${tenantId}:summary:${period}`,
    GATE_RULE_CONFIG: (tenantId: string) => `attendance:${tenantId}:gate_rule_config`,
    SESSION_SUMMARY: (tenantId: string, sesiId: string) => `attendance:${tenantId}:summary_sesi:${sesiId}`,
    ANALYTICS: (tenantId: string, startDate: string, endDate: string) => 
      `attendance:${tenantId}:analytics:${startDate}:${endDate}`,
    ALL: (tenantId: string) => `attendance:${tenantId}:*`
  },

  // 💰 Billing related caches
  BILLING: {
    SUBSCRIPTION: (tenantId: string) => `billing:${tenantId}:subscription`,
    INVOICES: (tenantId: string) => `billing:${tenantId}:invoices`,
    PAYMENTS: (tenantId: string) => `billing:${tenantId}:payments`,
    ALL: (tenantId: string) => `billing:${tenantId}:*`
  },

  // 🧾 Invoice related caches
  INVOICE: {
    PUBLIC_TOKEN: (token: string) => `invoice:public:token:${token}`,
    PUBLIC_BY_INVOICE: (invoiceId: string) => `invoice:public:by_invoice:${invoiceId}`,
    ALL: () => `invoice:*`
  },

  // 📄 Document Center related caches
  DOCUMENT: {
    SIGNED_TOKEN: (token: string) => `document:signed:token:${token}`,
    ALL: () => `document:*`
  },

  SYSTEM_CONFIG: {
    ACTIVE: (tenantId: string | null) => `system_config:${tenantId || 'global'}:active`
  }
} as const;

/**
 * ⏰ Cache TTL (Time To Live) Constants
 * Dalam detik
 */
export const CACHE_TTL = {
  // Data yang jarang berubah - cache lebih lama
  STATIC: 3600,        // 1 jam - untuk data master seperti roles, jurusan
  SEMI_STATIC: 1800,   // 30 menit - untuk data yang jarang berubah seperti user profile
  
  // Data yang sering berubah - cache lebih pendek
  DYNAMIC: 300,        // 5 menit - untuk metrics, statistics
  REAL_TIME: 60,       // 1 menit - untuk data real-time seperti attendance
  
  // Data khusus
  DASHBOARD: 300,      // 5 menit - untuk dashboard data
  TENANT_DETAIL: 600,  // 10 menit - untuk tenant detail
  USER_SESSION: 1800,  // 30 menit - untuk user session data
  
  // Data spesifik yang hilang
  METRICS: 300,        // 5 menit - untuk tenant metrics
  USER_STATS: 600,     // 10 menit - untuk user statistics
  ACADEMIC: 1800,      // 30 menit - untuk data akademik
  ATTENDANCE: 300,     // 5 menit - untuk data kehadiran
  BILLING: 600,        // 10 menit - untuk data billing
  BRANDING: 600,       // 10 menit - untuk data branding aktif
  
  // Default
  DEFAULT: 300         // 5 menit
} as const;

/**
 * 🏷️ Cache Tags untuk invalidation
 */
export const CACHE_TAGS = {
  TENANT: 'tenant',
  USER: 'user',
  ACADEMIC: 'academic',
  ATTENDANCE: 'attendance',
  BILLING: 'billing',
  DASHBOARD: 'dashboard',
  BRANDING: 'branding'
} as const;
