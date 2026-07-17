// API Configuration Constants
if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not defined. Please configure it in your .env file.');
}

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    DETAIL: (id: string) => `/users/${id}`,
  },
  TENANTS: {
    LIST: '/tenants',
    CREATE: '/tenants',
    UPDATE: (id: string) => `/tenants/${id}`,
    DELETE: (id: string) => `/tenants/${id}`,
    DETAIL: (id: string) => `/tenants/${id}`,
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TENANT_ID: 'tenant_id',
  USER_DATA: 'user_data',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

// Application Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  PROFILE: '/profile',
} as const;

export const VALID_ROUTE_SET = new Set<string>([
  '/home',
  '/pricing',
  '/privacy',
  '/terms',
  '/dpa',
  '/dashboard',
  '/onboarding',
  '/suspended',
  '/cancelled',
  '/data-master',
  '/academic',
  '/academic/guru',
  '/kurikulum/guru-mapel',
  '/academic/siswa',
  '/academic/kelas',
  '/academic/mapel',
  '/academic/tahun-pelajaran',
  '/academic/semester',
  '/academic/jurusan',
  '/academic/jenis-kegiatan',
  '/kurikulum/wali-kelas',
  '/academic/kenaikan-kelas',
  '/academic/transition',
  '/academic/siswa-cards',
  '/academic/mutation',
  '/billing',
  '/billing/dashboard',
  '/billing/plans',
  '/billing/subscriptions',
  '/billing/billings',
  '/billing/approvals',
  '/billing/settings',
  '/billing/tripay-health',
  '/billing/payments',
  '/billing/reports',
  '/billing/monitoring',
  '/superadmin/infra/monitoring',
  '/superadmin/infra/tripay-health',
  '/superadmin/infra/tripay-simulator',
  '/invoice',
  '/invoice/dashboard',
  '/invoice/list',
  '/invoice/create',
  '/users',
  '/tenants',
  '/reports',
  '/notifications',
  '/notifications/trial-sequence',
  '/notifications/whatsapp-health',
  '/attendance',
  '/attendance/petugas-absensi',
  '/attendance/gerbang',
  '/attendance/sesi',
  '/attendance/kegiatan',
  '/attendance/manual',
  '/attendance/tracking-siswa',
  '/attendance/rekap',
  '/attendance/rekap/siswa-bulanan',
  '/attendance/rekap/kelas-bulanan',
  '/attendance/rekap/siswa-harian',
  '/attendance/jenis-kegiatan',
  '/attendance/guru-monitoring',
  '/attendance/rekam-wajah',
  '/settings',
  '/profile',
  '/components-demo',
  '/management/menus',
  '/management/roles'
]);
// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Terjadi kesalahan jaringan. Silakan coba lagi.',
  UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
  NOT_FOUND: 'Data yang dicari tidak ditemukan.',
  VALIDATION_ERROR: 'Data yang dimasukkan tidak valid.',
  SERVER_ERROR: 'Terjadi kesalahan server. Silakan coba lagi nanti.',
  LOGIN_FAILED: 'Email, password, atau tenant ID tidak valid.',
  REFRESH_TOKEN_FAILED: 'Sesi telah berakhir. Silakan login kembali.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login berhasil!',
  LOGOUT_SUCCESS: 'Logout berhasil!',
  DATA_SAVED: 'Data berhasil disimpan!',
  DATA_UPDATED: 'Data berhasil diperbarui!',
  DATA_DELETED: 'Data berhasil dihapus!',
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  TENANT_ID_MIN_LENGTH: 3,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DD HH:mm:ss',
} as const;
