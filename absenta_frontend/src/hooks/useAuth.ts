import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { STORAGE_KEYS } from '../lib/constants';
import { LogService } from '../utils/LogService';
import { 
  isSystemSuperAdmin, 
  isPlatformFinance, 
  isPlatformSupport, 
  isPlatformInfrastructure 
} from '../utils/rbac';

/**
 * Custom hook untuk mengelola autentikasi
 * Menyediakan state dan actions untuk login, logout, dan manajemen user
 */
export const useAuth = () => {
  const {
    isAuthenticated,
    user,
    subscription,
    token,
    refreshToken,
    tenantId,
    tenantMode,
    isLoading,
    error,
    loginAction,
    logout,
    loadUser,
    refresh,
    refreshSubscription,
    setLoading,
    setError,
  } = useAuthStore();

  const initRef = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent double initialization
      if (initRef.current) return;

      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!storedToken) return;

      const roleName = user?.role?.name;
      // Check if we need to fetch capabilities (only if user exists but has no caps)
      const needsCapabilities =
        user && (roleName === 'GURU' || roleName === 'SISWA')
          ? !user?.capabilities || user.capabilities.length === 0
          : false;

      // Only load user if:
      // 1. User is null (but token exists)
      // 2. OR User exists but needs capabilities AND we haven't tried fetching yet
      if (!user || needsCapabilities) {
        initRef.current = true; // Mark as initialized/loading
        try {
          await loadUser();
        } catch (error) {
          LogService.error('Failed to load user on initialization:', error);
          // Don't logout immediately on load error, might be temporary network issue
          // logout(); 
        } finally {
             // Reset ref only if we want to allow retries later, but for now, 
             // let's keep it true to prevent loops in this session unless component unmounts?
             // Actually, if loadUser updates 'user', this effect might re-run.
             // But we put initRef.current check at start.
             // Wait, if user updates, 'needsCapabilities' becomes false, so we don't enter here.
             // If loadUser fails, user remains same, needsCapabilities remains true.
             // If we don't reset initRef, we won't retry. This stops the loop!
             setTimeout(() => { initRef.current = false }, 5000); // Allow retry after 5s
        }
      }
    };

    initializeAuth();
    // Remove 'user' from dependency to prevent loop when user updates?
    // No, we need to react when user is null.
    // The key is initRef to block immediate re-calls.
  }, [user, loadUser, logout]);

  /**
   * Login dengan email, password, dan tenant_id
   */
  const login = async (email: string, password: string) => {
    await loginAction(email, password);
  };

  /**
   * Logout dan bersihkan semua data autentikasi
   */
  const handleLogout = () => {
    logout();
  };

  /**
   * Refresh access token menggunakan refresh token
   */
  const refreshAccessToken = async () => {
    try {
      await refresh();
    } catch (error) {
      LogService.error('Failed to refresh token:', error);
      logout();
      throw error;
    }
  };

  /**
   * Cek apakah user adalah super admin
   */
  const isSuperAdmin = useCallback((): boolean => {
    return isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  }, [user]);

  /**
   * Cek apakah user memiliki capability tertentu
   */
  const can = useCallback((capability: string): boolean => {
    if (isSuperAdmin()) return true;
    if (user?.capabilities?.includes(capability)) return true;

    const raw = (user as any)?.permissions ?? user?.role?.permissions ?? null;
    if (!raw) return false;

    let list: string[] = [];
    try {
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) list = parsed.map((x) => String(x));
    } catch {
      list = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (list.length === 0) return false;
    return list.includes(capability);
  }, [user, isSuperAdmin]);

  /**
   * Cek apakah user memiliki salah satu dari beberapa capability
   */
  const canAny = useCallback((capabilities: string[]): boolean => {
    if (!Array.isArray(capabilities) || capabilities.length === 0) return false;
    return capabilities.some((cap) => can(cap));
  }, [can]);

  /**
   * Cek apakah user memiliki role tertentu
   */
  const hasRole = useCallback((role: string): boolean => {
    return user?.role?.name === role;
  }, [user]);

  /**
   * Cek apakah user adalah admin
   */
  const isAdmin = useCallback((): boolean => {
    return user?.role?.name === 'ADMIN' || isSuperAdmin();
  }, [user, isSuperAdmin]);

  /**
   * Cek apakah user adalah staf platform finansial
   */
  const isPlatformFinanceUser = (): boolean => {
    return isPlatformFinance(user?.role?.name, user?.tenant_id);
  };

  /**
   * Cek apakah user adalah staf platform support
   */
  const isPlatformSupportUser = (): boolean => {
    return isPlatformSupport(user?.role?.name, user?.tenant_id);
  };

  /**
   * Cek apakah user adalah staf platform infrastruktur
   */
  const isPlatformInfrastructureUser = (): boolean => {
    return isPlatformInfrastructure(user?.role?.name, user?.tenant_id);
  };

  /**
   * Cek apakah user adalah staf platform umum (Superadmin atau sub-role platform)
   */
  const isPlatformStaff = (): boolean => {
    return (
      isSuperAdmin() ||
      isPlatformFinanceUser() ||
      isPlatformSupportUser() ||
      isPlatformInfrastructureUser()
    );
  };

  /**
   * Cek apakah user memiliki permission untuk role tertentu
   */
  const hasPermission = (allowedRoles: string[]): boolean => {
    if (!user?.role?.name) return false;
    return allowedRoles.includes(user.role.name);
  };

  /**
   * Cek apakah user memiliki salah satu kode permission
   */
  const hasPermissionCode = (codes: string[]): boolean => {
    const raw = user?.role?.permissions || null;
    if (!raw) return false;
    let list: string[] = [];
    try {
      const parsed: unknown = JSON.parse(String(raw));
      if (Array.isArray(parsed)) list = parsed.map((x) => String(x));
    } catch {
      list = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (list.length === 0) return false;
    return codes.some((code) => list.includes(code));
  };

  /**
   * Get current tenant ID
   */
  const getCurrentTenantId = (): string | null => {
    return tenantId || localStorage.getItem(STORAGE_KEYS.TENANT_ID);
  };

  /**
   * Cek apakah token masih valid (belum expired)
   */
  const isTokenValid = useCallback((): boolean => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!storedToken) return false;

    try {
      // Decode JWT token untuk cek expiration
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      LogService.error('Error decoding token:', error);
      return false;
    }
  }, []);

  /**
   * Force reload user profile dari server
   */
  const reloadUser = async () => {
    try {
      await loadUser();
    } catch (error) {
      LogService.error('Failed to reload user:', error);
      throw error;
    }
  };

  return {
    // State
    isAuthenticated,
    user,
    subscription,
    token,
    refreshToken,
    tenantId,
    tenantMode,
    isLoading,
    error,

    // Actions
    login,
    logout: handleLogout,
    refreshAccessToken,
    reloadUser,
    syncSubscription: refreshSubscription,

    // Utility functions
    can,
    canAny,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isPlatformFinanceUser,
    isPlatformSupportUser,
    isPlatformInfrastructureUser,
    isPlatformStaff,
    hasPermission,
    hasPermissionCode,
    getCurrentTenantId,
    isTokenValid,

    // Store actions (untuk advanced usage)
    setLoading,
    setError,
  };
};

export default useAuth;
