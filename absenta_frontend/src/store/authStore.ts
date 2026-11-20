import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { login, getCurrentUser, refreshToken, impersonateGuru, impersonateSiswa } from '../api/auth.api';
import { completeOnboarding } from '../api/user.api';
import { getMyTenant } from '../api/tenants.api';
import { getMySubscription } from '../api/subscription.api';
import { queryClient } from '../lib/queryClient';
import type { Subscription } from '../types/subscription';

// Interface untuk User berdasarkan AUTH_MODULE_API.md
export interface User {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  username?: string;
  role: {
    id: string;
    name: string;
    permissions?: string | null;
  };
  tenant_id: string;
  tenant?: {
    id: string;
    name: string;
    domain?: string;
    subdomain?: string;
    custom_domain?: string;
    absensi_mode?: any;
  } | null;
  has_completed_onboarding?: boolean;
  siswa_id?: string;
  guru_profile?: { 
    id: string;
    nama_guru?: string | null;
    nip?: string | null;
    nuptk?: string | null;
    nik?: string | null;
    no_hp?: string | null;
    wali_kelas_di?: {
      id: string;
      nama_kelas: string;
      tingkat?: number | null;
    } | null;
    jenis_ptk?: string | null;
    pangkat_golongan?: string | null;
    tmt_guru?: string | null;
    [key: string]: any;
  } | null;
  capabilities?: string[];
  position_codes?: string[];
  unit_ids?: string[];
  kelas_ids?: string[];
  kaprog_jurusan?: {
    id: string;
    nama: string;
    singkatan?: string | null;
    kode?: string | null;
    logo_url?: string | null;
  } | null;
  walikelas_kelas?: {
    id: string;
    nama_kelas: string;
    tingkat?: number | null;
  } | null;
  is_impersonated?: boolean;
  impersonator?: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
  };
  features?: string[]; // Tenant level features (CORE, ABSENSI, KOPERASI)
  created_at: string;
  updated_at: string;
}

// Interface untuk Auth State
interface AuthState {
  // State
  isAuthenticated: boolean;
  user: User | null;
  subscription: Subscription | null; // Tambahkan state untuk subscription
  token: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  tenantMode: 'SIMPLE' | 'MULTI_SESI' | null;
  isLoading: boolean;
  error: string | null;
  status?: string;
  hasCompletedOnboarding: boolean;
  subscriptionIssueModalOpen: boolean;
  subscriptionIssueModalMessage: string | null;
  isImpersonating: boolean;
  
  // Actions
  loginAction: (email: string, password: string, tenantIdDev?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  setSubscription: (subscription: Subscription | null) => void; // Tambahkan setter
  setToken: (token: string) => void;
  setTenantId: (tenantId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markOnboardingCompleted: () => void;
  openSubscriptionIssueModal: (message?: string) => void;
  closeSubscriptionIssueModal: () => void;
  refreshSubscription: () => Promise<void>;
  impersonateGuruAction: (guruId: string) => Promise<boolean>;
  impersonateSiswaAction: (siswaId: string) => Promise<boolean>;
  revertImpersonationAction: () => Promise<void>;
}

// Helper to safely access auth storage (localStorage for remembered, sessionStorage for non-remembered)
const getInitialToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
};

const getInitialRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
};

const getInitialTenantId = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id');
};

const authPersistStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name) || sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    const isRemember = localStorage.getItem('absenta_remember_me') !== 'false';
    if (isRemember) {
      localStorage.setItem(name, value);
      try { sessionStorage.removeItem(name); } catch {}
    } else {
      try { sessionStorage.setItem(name, value); } catch {}
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try { sessionStorage.removeItem(name); } catch {}
    localStorage.removeItem(name);
  }
};

// Zustand store dengan persist middleware
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: !!getInitialToken(),
      user: null,
      subscription: null,
      token: getInitialToken(),
      refreshToken: getInitialRefreshToken(),
      tenantId: getInitialTenantId(),
      tenantMode: null,
      isLoading: false, // Don't block initial render if we have persisted state
      error: null,
      hasCompletedOnboarding: true,
      subscriptionIssueModalOpen: false,
      subscriptionIssueModalMessage: null,
      isImpersonating: typeof window !== 'undefined' ? !!localStorage.getItem('absenta_original_admin_session') : false,

      // Login action dengan integrasi API
      loginAction: async (email: string, password: string, tenantIdDev?: string, rememberMe: boolean = true) => {
        set({ isLoading: true, error: null });
        try {
          const response = await login(email, password, tenantIdDev, rememberMe);
          if (response.success) {
            const { user, token, refreshToken: refToken } = response.data;
            if (rememberMe) {
              localStorage.setItem('absenta_remember_me', 'true');
              localStorage.setItem('access_token', token);
              localStorage.setItem('refresh_token', refToken);
              if (user.tenant_id) {
                localStorage.setItem('tenant_id', user.tenant_id);
              } else {
                localStorage.removeItem('tenant_id');
              }
              try {
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('refresh_token');
                sessionStorage.removeItem('tenant_id');
                sessionStorage.removeItem('auth-storage');
              } catch {}
            } else {
              localStorage.setItem('absenta_remember_me', 'false');
              try {
                sessionStorage.setItem('access_token', token);
                sessionStorage.setItem('refresh_token', refToken);
                if (user.tenant_id) {
                  sessionStorage.setItem('tenant_id', user.tenant_id);
                } else {
                  sessionStorage.removeItem('tenant_id');
                }
              } catch {}
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('tenant_id');
              localStorage.removeItem('auth-storage');
            }

            // Fix: Immediately set user state to avoid 403 race condition
            // The backend sends capabilities in login response, so we should use them!
            const localOnboarded = user.tenant_id ? localStorage.getItem(`onboarding_completed_${user.tenant_id}`) === 'true' : false;
            set({
              user,
              isAuthenticated: true,
              token,
              refreshToken: refToken,
              tenantId: user.tenant_id || null,
              tenantMode: (user as any)?.tenant?.absensi_mode ?? null,
              hasCompletedOnboarding: (user as any).has_completed_onboarding ?? localOnboarded ?? false,
            });

            console.log('🚀 [AUTH-DEBUG] Login success, tenantMode:', (user as any)?.tenant?.absensi_mode);

            const actualRoleName = (user.role?.name || (user as any).roleName || '').toUpperCase();
            const isPlatform = user.tenant_id === 'system' || actualRoleName.startsWith('PLATFORM_') || actualRoleName === 'SUPERADMIN';
            const isStudent = actualRoleName === 'SISWA' || actualRoleName === 'STUDENT';

            // Extract tenant domain directly from login response payload (prioritize custom_domain)
            const loginTenantDomain = (user.tenant as any)?.custom_domain || user.tenant?.subdomain || (user.tenant as any)?.domain;
            if (typeof loginTenantDomain === 'string' && loginTenantDomain.trim().length > 0) {
              const normDomain = loginTenantDomain.trim().toLowerCase();
              let fullDomain = normDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
              if (!fullDomain.includes('.') && fullDomain.length > 0) fullDomain = `${fullDomain}.absenta.id`;
              localStorage.setItem('absenta_custom_server_domain', fullDomain);

              if (rememberMe) {
                localStorage.setItem('tenant_domain', normDomain);
              } else {
                try { sessionStorage.setItem('tenant_domain', normDomain); } catch {}
              }
            }
            
            // High-concurrency optimization: 2,000 students do NOT need to query SaaS tenant billing/subscription
            if (!isPlatform && !isStudent) {
              try {
                const [tenantRes, subRes] = await Promise.allSettled([getMyTenant(), getMySubscription()]);
                if (tenantRes.status === 'fulfilled') {
                  const domain = (tenantRes.value?.data as any)?.subdomain || (tenantRes.value?.data as any)?.domain;
                  if (typeof domain === 'string' && domain.trim().length > 0) {
                    const normDomain = domain.trim().toLowerCase();
                    if (rememberMe) {
                      localStorage.setItem('tenant_domain', normDomain);
                    } else {
                      try { sessionStorage.setItem('tenant_domain', normDomain); } catch {}
                    }
                  }
                }
                if (subRes.status === 'fulfilled') {
                  if (subRes.value?.success) set({ subscription: subRes.value.data as any });
                }
              } catch {}
            }
          } else {
            const msg = response.message || 'Login failed';
            set({ isLoading: false, error: msg, isAuthenticated: false });
            throw new Error(msg);
          }
        } catch (error) {
          console.error('Login error:', error);
          const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : 'Login failed');
          set({ isLoading: false, error: errorMessage, isAuthenticated: false });
          throw error;
        } finally {
          const currentLoading = (getInitialToken() ? false : get().isLoading);
          set({ isLoading: currentLoading });
        }
      },

      // Load user profile dari API
      loadUser: async () => {
        const token = get().token || getInitialToken();
        if (!token) return;
        
        set({ isLoading: true });
        
        try {
          const response = await getCurrentUser();
          
          if (response.success) {
            // ── Domain-Tenant Mismatch Guard ──────────────────────────────────
            // When the app is accessed via a real subdomain (e.g. smp4.absenta.id)
            // but the stored token belongs to a DIFFERENT tenant (e.g. SMKN1PLERED),
            // all protected API calls will get 403 "tenant-domain mismatch".
            // We detect this early and force a clean logout + redirect to login.
            if (typeof window !== 'undefined') {
              const hostname = window.location.hostname;
              const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
              if (!isLocalhost) {
                // Extract subdomain from current hostname (e.g. 'smp4' from 'smp4.absenta.id')
                const hostParts = hostname.split('.');
                const currentSub = hostParts.length >= 3 ? hostParts[0].toLowerCase() : '';

                // Tenant info from /auth/me response
                const jwtTenantId = response.data.tenant_id;
                const jwtTenantDomain: string = ((response.data.tenant as any)?.custom_domain ?? '').toLowerCase().trim();
                const jwtTenantSub: string = ((response.data.tenant as any)?.subdomain ?? '').toLowerCase().trim();

                // Derive the subdomain the JWT tenant would live under
                const jwtSub = jwtTenantSub || (jwtTenantDomain.includes('.') ? jwtTenantDomain.split('.')[0] : jwtTenantDomain);

                // Temporary bypass: During domain/subdomain migration, we disable this guard
                // to prevent accidental logouts when accessing via fallback domains (like t.absenta.id)
                /*
                if (currentSub && jwtTenantId && jwtTenantId !== 'system' && jwtSub && currentSub !== jwtSub) {
                  console.warn(`[AUTH] Tenant mismatch: JWT tenant "${jwtSub}" does not match domain subdomain "${currentSub}". Forcing logout.`);
                  // Clear stale auth data AND cached UI branding
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('tenant_id');
                  localStorage.removeItem('tenant_domain');
                  localStorage.removeItem('active_system_config');
                  set({
                    user: null,
                    isAuthenticated: false,
                    token: null,
                    refreshToken: null,
                    tenantId: null,
                    tenantMode: null,
                    isLoading: false,
                  });
                  // Redirect to login page for the correct domain
                  window.location.href = '/login';
                  return;
                }
                */
              }
            }
            // ─────────────────────────────────────────────────────────────────

            const activeToken = token || getInitialToken();
            if (response.data.tenant_id) {
              const isRemember = typeof localStorage !== 'undefined' && localStorage.getItem('absenta_remember_me') !== 'false';
              if (isRemember) {
                localStorage.setItem('tenant_id', response.data.tenant_id);
              } else {
                try { sessionStorage.setItem('tenant_id', response.data.tenant_id); } catch {}
              }
            }

            set({
              user: response.data,
              token: activeToken,
              isAuthenticated: true,
              tenantId: response.data.tenant_id || null,
              tenantMode: (response.data as any)?.tenant?.absensi_mode ?? null,
              isLoading: false,
              hasCompletedOnboarding: response.data.has_completed_onboarding ?? false,
              isImpersonating: typeof window !== 'undefined' ? !!localStorage.getItem('absenta_original_admin_session') : false,
            });
            console.log('🚀 [AUTH-DEBUG] loadUser success, tenantMode:', (response.data as any)?.tenant?.absensi_mode);
            const actualRoleName = response.data.role?.name || (response.data as any).roleName || '';
            const isPlatform = response.data.tenant_id === 'system' || actualRoleName.startsWith('PLATFORM_') || actualRoleName === 'SUPERADMIN';
            
            if (!isPlatform) {
              try {
                // Optimasi Performa: Ambil subdomain/domain langsung dari payload auth/me jika tersedia
                const directTenant = (response.data as any)?.tenant;
                const directDomain = directTenant?.custom_domain || directTenant?.subdomain || directTenant?.domain;
                if (typeof directDomain === 'string' && directDomain.trim().length > 0) {
                  const normDomain = directDomain.trim().toLowerCase();
                  let fullDomain = normDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
                  if (!fullDomain.includes('.') && fullDomain.length > 0) fullDomain = `${fullDomain}.absenta.id`;
                  localStorage.setItem('absenta_custom_server_domain', fullDomain);

                  const isRemember = typeof localStorage !== 'undefined' && localStorage.getItem('absenta_remember_me') !== 'false';
                  if (isRemember) {
                    localStorage.setItem('tenant_domain', normDomain);
                  } else {
                    try { sessionStorage.setItem('tenant_domain', normDomain); } catch {}
                  }
                }

                // Hanya fetch getMyTenant jika data tenant belum disertakan oleh backend
                const tenantPromise = directDomain ? Promise.resolve(null) : getMyTenant();
                const [tenantRes, subRes] = await Promise.allSettled([tenantPromise, getMySubscription()]);
                if (tenantRes.status === 'fulfilled' && tenantRes.value) {
                  const domain = (tenantRes.value?.data as any)?.subdomain || (tenantRes.value?.data as any)?.domain;
                  if (typeof domain === 'string' && domain.trim().length > 0) {
                    const normDomain = domain.trim().toLowerCase();
                    const isRemember = typeof localStorage !== 'undefined' && localStorage.getItem('absenta_remember_me') !== 'false';
                    if (isRemember) {
                      localStorage.setItem('tenant_domain', normDomain);
                    } else {
                      try { sessionStorage.setItem('tenant_domain', normDomain); } catch {}
                    }
                  }
                }
                if (subRes.status === 'fulfilled') {
                  if (subRes.value?.success) {
                    set({ subscription: subRes.value.data as any });
                  } else {
                    set({ subscription: null });
                  }
                } else {
                  set({ subscription: null });
                }
              } catch {
                set({ subscription: null });
              }
            }
          }
        } catch (error: any) {
          console.error('Load user error:', error);
          
          // Only logout on 401 Unauthorized or 403 Forbidden
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            get().logout();
          } else {
             // For network errors (500, timeout, connection reset, HTTP2 errors), 
             // keep the user in "authenticated" state but stop loading.
             // This prevents auto-redirect to home on temporary glitches.
             set({ isLoading: false, error: 'Connection to server failed. Please refresh.' });
          }
        }
      },

      // Refresh token
      refresh: async () => {
        const refToken = get().refreshToken || getInitialRefreshToken();
        if (!refToken) return;
        
        try {
          const response = await refreshToken(refToken);
          
          if (response.success) {
            const newToken = response.data.token;
            const isRemember = typeof localStorage !== 'undefined' && localStorage.getItem('absenta_remember_me') !== 'false';
            if (isRemember) {
              localStorage.setItem('access_token', newToken);
            } else {
              try { sessionStorage.setItem('access_token', newToken); } catch {}
            }
            
            set({
              token: newToken,
            });
          }
        } catch (error) {
          console.error('Refresh token error:', error);
          // Jika refresh gagal, logout
          get().logout();
        }
      },

      // Logout action
      logout: () => {
        // Hapus seluruh token & session state dari localStorage (tetap simpan absenta_remembered_email & absenta_remember_me)
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('tenant_domain');
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('active_system_config');
        localStorage.removeItem('selected_tenant');
        localStorage.removeItem('portal_active_ws');
        localStorage.removeItem('absenta_nav_state');
        localStorage.removeItem('absenta_original_admin_session');

        // Bersihkan seluruh token & demo session state dari sessionStorage
        try {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('tenant_id');
          sessionStorage.removeItem('tenant_domain');
          sessionStorage.removeItem('auth-storage');
          sessionStorage.removeItem('is_demo_session');
          sessionStorage.removeItem('demo_active_role');
          sessionStorage.removeItem('demo_active_name');
        } catch (_) {}
        
        // Clear React Query cache to prevent multitenant data leak
        queryClient.clear();
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
          tenantId: null,
          subscription: null, // Reset subscription saat logout
          isLoading: false,
          error: null,
          hasCompletedOnboarding: true,
          isImpersonating: false,
        });
      },

      // Impersonate Guru Action (Login Sebagai Guru)
      impersonateGuruAction: async (guruId: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentToken = get().token || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const currentRefreshToken = get().refreshToken || localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
          const currentUser = get().user;
          const currentTenantId = get().tenantId;

          if (!currentToken || !currentUser) {
            throw new Error('Sesi Administrator tidak ditemukan. Silakan login kembali.');
          }

          const response = await impersonateGuru(guruId);
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Gagal login sebagai guru');
          }

          const { user: teacherUser, token: teacherToken, refreshToken: teacherRefreshToken, impersonator } = response.data;

          // Cadangkan sesi Admin asli ke localStorage
          const adminSessionBackup = {
            token: currentToken,
            refreshToken: currentRefreshToken,
            user: currentUser,
            tenantId: currentTenantId,
            impersonator: impersonator || {
              id: currentUser.id,
              name: currentUser.full_name || currentUser.name,
              email: currentUser.email,
              role: currentUser.role?.name
            },
            impersonatedType: 'guru',
            returnUrl: '/dashboard?tab=admin&subtab=guru',
            impersonatedAt: new Date().toISOString()
          };
          localStorage.setItem('absenta_original_admin_session', JSON.stringify(adminSessionBackup));

          // Pasang kredensial guru baru
          localStorage.setItem('access_token', teacherToken);
          if (teacherRefreshToken) {
            localStorage.setItem('refresh_token', teacherRefreshToken);
          }
          if (teacherUser.tenant_id) {
            localStorage.setItem('tenant_id', teacherUser.tenant_id);
          }

          set({
            user: teacherUser,
            token: teacherToken,
            refreshToken: teacherRefreshToken || null,
            tenantId: teacherUser.tenant_id || null,
            tenantMode: (teacherUser as any)?.tenant?.absensi_mode ?? null,
            hasCompletedOnboarding: (teacherUser as any).has_completed_onboarding ?? true,
            isAuthenticated: true,
            isImpersonating: true,
            isLoading: false
          });

          // 🧹 Dual-Layer Cache Clearance:
          // 1. Batalkan semua query yang sedang berjalan di latar belakang (in-flight network requests)
          // 2. Bersihkan seluruh memori cache TanStack React Query
          // 3. Bersihkan sisa state workspace / navigasi sementara di sessionStorage
          try {
            await queryClient.cancelQueries();
          } catch {}
          queryClient.clear();
          try {
            sessionStorage.removeItem('portal_active_ws');
            sessionStorage.removeItem('absenta_nav_state');
            sessionStorage.removeItem('active_dashboard_tab');
            localStorage.removeItem('absenta_nav_state');
          } catch {}

          return true;
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Gagal login sebagai guru' });
          throw err;
        }
      },

      // Impersonate Siswa Action (Login Sebagai Siswa)
      impersonateSiswaAction: async (siswaId: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentToken = get().token || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const currentRefreshToken = get().refreshToken || localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
          const currentUser = get().user;
          const currentTenantId = get().tenantId;

          if (!currentToken || !currentUser) {
            throw new Error('Sesi Administrator tidak ditemukan. Silakan login kembali.');
          }

          const response = await impersonateSiswa(siswaId);
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Gagal login sebagai siswa');
          }

          const { user: studentUser, token: studentToken, refreshToken: studentRefreshToken, impersonator } = response.data;

          // Cadangkan sesi Admin asli ke localStorage jika belum ada
          const existingBackup = localStorage.getItem('absenta_original_admin_session');
          if (!existingBackup) {
            const adminSessionBackup = {
              token: currentToken,
              refreshToken: currentRefreshToken,
              user: currentUser,
              tenantId: currentTenantId,
              impersonator: impersonator || {
                id: currentUser.id,
                name: currentUser.full_name || currentUser.name,
                email: currentUser.email,
                role: currentUser.role?.name
              },
              impersonatedType: 'siswa',
              returnUrl: '/dashboard?tab=admin&subtab=siswa',
              impersonatedAt: new Date().toISOString()
            };
            localStorage.setItem('absenta_original_admin_session', JSON.stringify(adminSessionBackup));
          }

          // Pasang kredensial siswa baru
          localStorage.setItem('access_token', studentToken);
          if (studentRefreshToken) {
            localStorage.setItem('refresh_token', studentRefreshToken);
          }
          if (studentUser.tenant_id) {
            localStorage.setItem('tenant_id', studentUser.tenant_id);
          }

          set({
            user: studentUser,
            token: studentToken,
            refreshToken: studentRefreshToken || null,
            tenantId: studentUser.tenant_id || null,
            tenantMode: (studentUser as any)?.tenant?.absensi_mode ?? null,
            hasCompletedOnboarding: (studentUser as any).has_completed_onboarding ?? true,
            isAuthenticated: true,
            isImpersonating: true,
            isLoading: false
          });

          // 🧹 Dual-Layer Cache Clearance
          try {
            await queryClient.cancelQueries();
          } catch {}
          queryClient.clear();
          try {
            sessionStorage.removeItem('portal_active_ws');
            sessionStorage.removeItem('absenta_nav_state');
            sessionStorage.removeItem('active_dashboard_tab');
            localStorage.removeItem('absenta_nav_state');
          } catch {}

          return true;
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Gagal login sebagai siswa' });
          throw err;
        }
      },

      // Revert Impersonation Action (Kembali ke Akun Admin)
      revertImpersonationAction: async () => {
        set({ isLoading: true });
        try {
          const rawBackup = localStorage.getItem('absenta_original_admin_session');
          if (!rawBackup) {
            get().logout();
            window.location.href = '/login';
            return;
          }

          const backup = JSON.parse(rawBackup);
          const { token, refreshToken: refToken, user: adminUser, tenantId } = backup;

          // Deteksi tipe impersonasi untuk rute pengembalian ke dashboard admin
          // Prioritas:
          // 1. backup.returnUrl jika tersedia
          // 2. backup.impersonatedType ('siswa' => /dashboard?tab=admin&subtab=siswa, 'guru' => /dashboard?tab=admin&subtab=guru)
          // 3. Fallback deteksi state user saat ini (role SISWA / profil siswa)
          const currentUserState = get().user;
          const currentRoleName = String(currentUserState?.role?.name || (currentUserState as any)?.roleName || '').toUpperCase();
          const isCurrentSiswa =
            currentRoleName === 'SISWA' ||
            currentRoleName === 'STUDENT' ||
            Boolean((currentUserState as any)?.siswa_id) ||
            Boolean((currentUserState as any)?.siswa_profile);

          let targetUrl = '/dashboard?tab=admin&subtab=guru';
          if (backup.returnUrl) {
            targetUrl = backup.returnUrl;
          } else if (backup.impersonatedType === 'siswa' || isCurrentSiswa) {
            targetUrl = '/dashboard?tab=admin&subtab=siswa';
          } else if (backup.impersonatedType === 'guru') {
            targetUrl = '/dashboard?tab=admin&subtab=guru';
          }

          localStorage.removeItem('absenta_original_admin_session');

          if (token) {
            localStorage.setItem('access_token', token);
          }
          if (refToken) {
            localStorage.setItem('refresh_token', refToken);
          }
          if (tenantId) {
            localStorage.setItem('tenant_id', tenantId);
          }

          set({
            user: adminUser,
            token: token,
            refreshToken: refToken || null,
            tenantId: tenantId || null,
            tenantMode: (adminUser as any)?.tenant?.absensi_mode ?? null,
            hasCompletedOnboarding: (adminUser as any)?.has_completed_onboarding ?? true,
            isAuthenticated: true,
            isImpersonating: false,
            isLoading: false
          });

          // 🧹 Dual-Layer Cache Clearance saat kembali ke Admin
          try {
            await queryClient.cancelQueries();
          } catch {}
          queryClient.clear();
          try {
            sessionStorage.removeItem('portal_active_ws');
            sessionStorage.removeItem('absenta_nav_state');
            sessionStorage.removeItem('active_dashboard_tab');
            localStorage.removeItem('absenta_nav_state');
          } catch {}

          // Muat ulang data user admin dari server untuk sinkronisasi profil terbaru
          try {
            await get().loadUser();
          } catch (e) {
            console.warn('Failed to loadUser after reverting impersonation:', e);
          }

          window.location.href = targetUrl;
        } catch (err) {
          console.error('Error reverting impersonation:', err);
          localStorage.removeItem('absenta_original_admin_session');
          get().logout();
          window.location.href = '/login';
        }
      },

      // Setter actions
      setUser: (user) => set({ user }),
      setSubscription: (subscription) => set({ subscription }), // Implementasi setter
      setToken: (token) => set({ token }),
      setTenantId: (tenantId) => set({ tenantId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      markOnboardingCompleted: () => {
        const tenantId = get().tenantId;
        if (tenantId) {
          localStorage.setItem(`onboarding_completed_${tenantId}`, 'true');
        }
        set({ hasCompletedOnboarding: true });
      },
      openSubscriptionIssueModal: (message) => {
        set({
          subscriptionIssueModalOpen: true,
          subscriptionIssueModalMessage: message || null
        });
      },
      closeSubscriptionIssueModal: () => {
        set({
          subscriptionIssueModalOpen: false
        });
      },
      refreshSubscription: async () => {
        try {
          const [userRes, subRes] = await Promise.allSettled([
            getCurrentUser(),
            getMySubscription()
          ]);
          
          if (userRes.status === 'fulfilled' && userRes.value.success) {
            set({ 
              user: userRes.value.data,
              tenantId: userRes.value.data.tenant_id || null,
              tenantMode: (userRes.value.data as any)?.tenant?.absensi_mode ?? null
            });
          }
          
          if (subRes.status === 'fulfilled' && subRes.value.success) {
            set({ subscription: subRes.value.data as any });
          }
        } catch (error) {
          console.error('Failed to refresh subscription data:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => authPersistStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        subscription: state.subscription, // Persist subscription state
        token: state.token,
        tenantId: state.tenantId,
        tenantMode: state.tenantMode,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
