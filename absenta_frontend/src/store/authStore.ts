import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login, getCurrentUser, refreshToken } from '../api/auth.api';
import { completeOnboarding } from '../api/user.api';
import { getMyTenant } from '../api/tenants.api';
import { getMySubscription } from '../api/subscription.api';
import { queryClient } from '../lib/queryClient';
import type { Subscription } from '../types/subscription';

// Interface untuk User berdasarkan AUTH_MODULE_API.md
interface User {
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
    absensi_mode?: any;
  } | null;
  has_completed_onboarding?: boolean;
  siswa_id?: string;
  guru_profile?: { id: string };
  capabilities?: string[];
  position_codes?: string[];
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
  
  // Actions
  loginAction: (email: string, password: string, tenantIdDev?: string) => Promise<void>;
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
}

// Zustand store dengan persist middleware
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: !!localStorage.getItem('access_token'),
      user: null,
      subscription: null,
      token: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
      tenantId: localStorage.getItem('tenant_id'),
      tenantMode: null,
      isLoading: false, // Don't block initial render if we have persisted state
      error: null,
      hasCompletedOnboarding: true,
      subscriptionIssueModalOpen: false,
      subscriptionIssueModalMessage: null,

      // Login action dengan integrasi API
      loginAction: async (email: string, password: string, tenantIdDev?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await login(email, password, tenantIdDev);
          if (response.success) {
            const { user, token, refreshToken: refToken } = response.data;
            localStorage.setItem('access_token', token);
            localStorage.setItem('refresh_token', refToken);
            if (user.tenant_id) {
              localStorage.setItem('tenant_id', user.tenant_id);
            } else {
              localStorage.removeItem('tenant_id');
            }

            // Fix: Immediately set user state to avoid 403 race condition
            // The backend sends capabilities in login response, so we should use them!
            set({
              user,
              isAuthenticated: true,
              token,
              refreshToken: refToken,
              tenantId: user.tenant_id || null,
              tenantMode: (user as any)?.tenant?.absensi_mode ?? null,
            });

            console.log('🚀 [AUTH-DEBUG] Login success, tenantMode:', (user as any)?.tenant?.absensi_mode);

            const actualRoleName = user.role?.name || (user as any).roleName || '';
            const isPlatform = user.tenant_id === 'system' || actualRoleName.startsWith('PLATFORM_') || actualRoleName === 'SUPERADMIN';
            
            if (!isPlatform) {
              try {
                const [tenantRes, subRes] = await Promise.allSettled([getMyTenant(), getMySubscription()]);
                if (tenantRes.status === 'fulfilled') {
                  const domain = (tenantRes.value?.data as any)?.domain;
                  if (typeof domain === 'string' && domain.trim().length > 0) {
                    localStorage.setItem('tenant_domain', domain.trim().toLowerCase());
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
          const currentLoading = (localStorage.getItem('access_token') ? false : get().isLoading);
          set({ isLoading: currentLoading });
        }
      },

      // Load user profile dari API
      loadUser: async () => {
        const token = get().token || localStorage.getItem('access_token');
        if (!token) return;
        
        set({ isLoading: true });
        
        try {
          const response = await getCurrentUser();
          
          if (response.success) {
            set({
              user: response.data,
              isAuthenticated: true,
              tenantId: response.data.tenant_id || null,
              tenantMode: (response.data as any)?.tenant?.absensi_mode ?? null,
              isLoading: false,
              hasCompletedOnboarding: response.data.has_completed_onboarding ?? false,
            });
            console.log('🚀 [AUTH-DEBUG] loadUser success, tenantMode:', (response.data as any)?.tenant?.absensi_mode);
            const actualRoleName = response.data.role?.name || (response.data as any).roleName || '';
            const isPlatform = response.data.tenant_id === 'system' || actualRoleName.startsWith('PLATFORM_') || actualRoleName === 'SUPERADMIN';
            
            if (!isPlatform) {
              try {
                const [tenantRes, subRes] = await Promise.allSettled([getMyTenant(), getMySubscription()]);
                if (tenantRes.status === 'fulfilled') {
                  const domain = (tenantRes.value?.data as any)?.domain;
                  if (typeof domain === 'string' && domain.trim().length > 0) {
                    localStorage.setItem('tenant_domain', domain.trim().toLowerCase());
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
        const refToken = get().refreshToken || localStorage.getItem('refresh_token');
        if (!refToken) return;
        
        try {
          const response = await refreshToken(refToken);
          
          if (response.success) {
            const newToken = response.data.token;
            localStorage.setItem('access_token', newToken);
            
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
        // Hapus dari localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('tenant_domain');
        
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
        });
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
      name: 'auth-storage', // localStorage key
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
