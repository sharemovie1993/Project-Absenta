import axios from 'axios';
import { LogService } from '../utils/LogService';
import { useAuthStore } from '../store/authStore';
import { MAIN_DOMAIN } from '../config/env-config';

// 1. Startup Guard & Configuration
const getEnvBaseUrl = () => {
  const definedBaseUrl = (globalThis as any).__VITE_API_BASE_URL__ as string | undefined;
  if (definedBaseUrl) return definedBaseUrl;

  // Process env fallback (for tests/scripts)
  if ((globalThis as any).process?.env?.VITE_API_BASE_URL) {
    return (globalThis as any).process.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return undefined;
};

const BASE_URL = getEnvBaseUrl();

// STARTUP GUARD: Validasi Base URL
if (!BASE_URL) {
  throw new Error('FATAL: VITE_API_BASE_URL is missing in environment variables. Application cannot start.');
}

if (!BASE_URL.endsWith('/api')) {
  throw new Error(`FATAL: VITE_API_BASE_URL must end with "/api". Current value: ${BASE_URL}`);
}

// 2. Create Instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true, // MANDATORY per directive
  headers: {
    'Content-Type': 'application/json',
  },
});

export const resolvePublicApiBaseUrl = (): string => {
  // Highest priority: explicitly provided public API base
  const injected = (globalThis as any).__VITE_PUBLIC_API_BASE_URL__ as string | undefined;
  if (injected && injected.trim().length > 0) return injected.replace(/\/+$/, '');
  if ((globalThis as any).process?.env?.VITE_PUBLIC_API_BASE_URL) {
    return String((globalThis as any).process.env.VITE_PUBLIC_API_BASE_URL).replace(/\/+$/, '');
  }

  const fallbackOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
  const u = new URL(BASE_URL, fallbackOrigin);
  const host = u.hostname.toLowerCase();
  const protocol = u.protocol;

  // Prefer explicit public API base if provided; otherwise use origin derived from BASE_URL

  // Local/dev heuristic: if UI runs on :5173 or other non-API ports, prefer :3001 on same host
  const hasExplicitPort = typeof window !== 'undefined' && window.location?.port;
  const winHost = typeof window !== 'undefined' ? window.location.hostname : u.hostname;
  const winProto = typeof window !== 'undefined' ? window.location.protocol : protocol;
  const winPort = typeof window !== 'undefined' ? window.location.port : '';

  if (winPort === '5173' || (!hasExplicitPort && BASE_URL.includes('5173'))) {
    // Force http for local/private dev unless explicitly on a production domain
    const isPrivateIp = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(winHost);
    const finalProto = isPrivateIp ? 'http:' : winProto;
    return `${finalProto}//${winHost}:3001/api`;
  }

  // Default: use same origin as protected API (drop /api suffix)
  return u.origin;
};

// 3. Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // If request data is FormData, remove Content-Type to let browser set boundary
    if (config.data instanceof FormData && config.headers) {
      delete (config.headers as any)['Content-Type'];
    }

    // DEFENSIVE FIX: Remove /api prefix if present in the call
    if (config.url && config.url.startsWith('/api/')) {
       LogService.warn(`Detected double /api prefix in request to ${config.url}. Auto-fixing.`);
       config.url = config.url.substring(4); // Remove /api
    }

    // NEW FIX: Ensure leading slash doesn't bypass /api prefix in baseURL
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('http')) {
       config.url = config.url.substring(1);
    }

    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    // Add Tenant Context Headers
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = host.toLowerCase().split('.');
    
    // Logic: If host is school1.absenta.id and MAIN_DOMAIN is absenta.id
    // then sub is 'school1'
    const isMainDomainMatched = host.endsWith(MAIN_DOMAIN) && host !== MAIN_DOMAIN;
    const sub = isMainDomainMatched ? host.replace(`.${MAIN_DOMAIN}`, '') : '';
    
    if (config.headers) {
        (config.headers as any)['X-Tenant-Host'] = host;
        if (sub) (config.headers as any)['X-Tenant-Sub'] = sub;
        
        const tenantDomain = localStorage.getItem('tenant_domain');
        if (tenantDomain) (config.headers as any)['X-Tenant-Domain'] = tenantDomain;
    }

    // Determine Public Endpoints (No Token)
    const url = config.url || '';
    const method = String(config.method || 'GET').toUpperCase();
    
    // Normalize url by prepending a leading slash if missing for robust matching
    const urlToCheck = url.startsWith('/') ? url : '/' + url;
    
    // Updated isPublic list based on audit directives
    const isPublic = 
        urlToCheck.startsWith('/auth/login') ||
        urlToCheck.startsWith('/auth/register') ||
        urlToCheck.startsWith('/auth/tenant-info') ||
        urlToCheck.startsWith('/auth/dev/tenants') ||
        urlToCheck.startsWith('/auth/check-domain') ||
        urlToCheck.startsWith('/auth/check-email') ||
        urlToCheck.startsWith('/auth/refresh') ||
        urlToCheck.startsWith('/auth/verify-email') ||
        urlToCheck.startsWith('/auth/resend-verification') ||
        urlToCheck.startsWith('/auth/request-password-reset') ||
        urlToCheck.startsWith('/auth/confirm-password-reset') ||
        urlToCheck.startsWith('/sekolah/lookup-npsn') ||
        urlToCheck.startsWith('/invoice/public') ||
        urlToCheck.startsWith('/payment/public') ||
        (urlToCheck.startsWith('/billing/plans/public') && method === 'GET') ||
        (urlToCheck.startsWith('/system/config') && method === 'GET');

    // Add Token
    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if ((config.headers as any).Authorization) {
        delete (config.headers as any).Authorization;
      }
    }

    // Inject X-Support-Token if assist login/impersonation session is active
    const supportAuthStateRaw = localStorage.getItem('support_auth_state');
    if (supportAuthStateRaw) {
      try {
        const supportAuthState = JSON.parse(supportAuthStateRaw);
        const supportToken = supportAuthState?.state?.token;
        if (supportToken) {
          (config.headers as any)['X-Support-Token'] = `Bearer ${supportToken}`;
        }
      } catch (err) {
        LogService.error('Failed to parse support_auth_state for X-Support-Token injection:', err);
      }
    }

    // Decode token payload to determine role and tenant for SUPERADMIN logic
    let roleName: string | undefined;
    let tokenTenantId: string | undefined;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        roleName = payload?.roleName ?? payload?.role?.name;
        tokenTenantId = payload?.tenantId ?? payload?.tenant_id;
      } catch (e) {
        LogService.error('Failed to decode JWT payload for role/tenant detection:', e);
      }
    }
    
    // Determine if this request should operate without tenant scope
    const normalizedLocalTenant = (tenantId ?? '').trim().toLowerCase();
    const normalizedTokenTenant = (tokenTenantId ?? '').trim().toLowerCase();
    const isSystemLevel = normalizedLocalTenant === '' || normalizedLocalTenant === 'system' || normalizedTokenTenant === '' || normalizedTokenTenant === 'system';
    const isSystemSuperAdmin = roleName === 'SUPERADMIN' && isSystemLevel;
    
    // Helper: validate UUID format (matches backend regex)
    const isValidUUID = (value: string | undefined): boolean => {
      if (!value) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };
    // Choose tenant context: prefer JWT tenant, fallback to localStorage
    const selectedTenantId = isValidUUID(tokenTenantId) ? tokenTenantId : (isValidUUID(tenantId ?? undefined) ? tenantId : undefined);

    // Header behavior hardening:
    const explicitTenantId = (config.headers as any)['X-Tenant-ID'] as string | undefined;
    if (isPublic) {
      if ((config.headers as any)['X-Tenant-ID']) delete (config.headers as any)['X-Tenant-ID'];
      if ((config.headers as any)['X-Skip-Tenant']) delete (config.headers as any)['X-Skip-Tenant'];
    } else if (isSystemSuperAdmin) {
      (config.headers as any)['X-Skip-Tenant'] = 'true';
      if ((config.headers as any)['X-Tenant-ID']) delete (config.headers as any)['X-Tenant-ID'];
    } else {
      if (explicitTenantId) delete (config.headers as any)['X-Tenant-ID'];
      if ((config.headers as any)['X-Skip-Tenant']) delete (config.headers as any)['X-Skip-Tenant'];
    }

    LogService.debug('📡 Axios Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let refreshingTokenPromise: Promise<{ token: string; refreshToken?: string } | null> | null = null;

// Response interceptor untuk handle identitas node dan auto-refresh token
axiosInstance.interceptors.response.use(
  (response) => {
    try {
      const headers = response.headers || {};
      const backendNodeHeader =
        (headers as any)['x-backend-node'] ??
        (headers as any)['X-Backend-Node'];
      if (backendNodeHeader && typeof window !== 'undefined') {
        (window as any).__BACKEND_NODE_ID__ = String(backendNodeHeader);
      }

      // Hitung perbedaan waktu antara Client dan Server untuk mencegah bug deteksi offline akibat clock drift
      const serverDateHeader = headers.date || (headers as any)['Date'];
      if (serverDateHeader && typeof window !== 'undefined') {
        const serverTime = new Date(serverDateHeader).getTime();
        if (!isNaN(serverTime)) {
          (window as any).__SERVER_TIME_OFFSET__ = Date.now() - serverTime;
        }
      }
    } catch {
      void 0;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const method = String(originalRequest?.method || 'GET').toUpperCase();

    const errorMessage = String(error?.response?.data?.message || error?.message || '');
    const isSubscriptionInactive =
      /your subscription is not active/i.test(errorMessage) ||
      /subscription is not active/i.test(errorMessage) ||
      /subscription inactive/i.test(errorMessage) ||
      /subscription.*is required or not active/i.test(errorMessage) ||
      /active subscription is required/i.test(errorMessage);

    if (isSubscriptionInactive) {
      const localized = 'Langganan Anda tidak aktif. Silakan cek halaman langganan untuk mengaktifkan kembali atau hubungi support.';
      if (error?.response?.data && typeof error.response.data === 'object') {
        (error.response.data as any).message = localized;
      }
      if (typeof error?.message === 'string') {
        error.message = localized;
      }

      // DO NOT show modal if user is already on a billing/checkout/payment related page
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isBillingPath = 
        currentPath.startsWith('/billing') || 
        currentPath.startsWith('/invoice') || 
        currentPath.startsWith('/payment') ||
        currentPath.includes('checkout');

      if (!isBillingPath) {
        const state = useAuthStore.getState();
        if (!state.subscriptionIssueModalOpen) {
          state.openSubscriptionIssueModal(localized);
        }
      }
    }
    
    const urlToCheck = url.startsWith('/') ? url : '/' + url;

    const isPublic = 
        urlToCheck.startsWith('/auth/login') ||
        urlToCheck.startsWith('/auth/register') ||
        urlToCheck.startsWith('/auth/tenant-info') ||
        urlToCheck.startsWith('/auth/dev/tenants') ||
        urlToCheck.startsWith('/auth/check-domain') ||
        urlToCheck.startsWith('/auth/check-email') ||
        urlToCheck.startsWith('/auth/refresh') ||
        urlToCheck.startsWith('/auth/verify-email') ||
        urlToCheck.startsWith('/auth/resend-verification') ||
        urlToCheck.startsWith('/auth/request-password-reset') ||
        urlToCheck.startsWith('/auth/confirm-password-reset') ||
        urlToCheck.startsWith('/sekolah/lookup-npsn') ||
        urlToCheck.startsWith('/invoice/public') ||
        urlToCheck.startsWith('/payment/public') ||
        (urlToCheck.startsWith('/billing/plans/public') && method === 'GET') ||
        (urlToCheck.startsWith('/system/config') && method === 'GET');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublic) {
      originalRequest._retry = true;

      try {
        if (!refreshingTokenPromise) {
          refreshingTokenPromise = (async () => {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) return null;

            const refreshResponse = await axiosInstance.post('/auth/refresh', { refreshToken });
            if (!refreshResponse?.data?.success) return null;
            const { token, refreshToken: newRefreshToken } = refreshResponse.data.data || {};
            if (!token) return null;
            return { token: String(token), refreshToken: newRefreshToken ? String(newRefreshToken) : undefined };
          })().finally(() => {
            refreshingTokenPromise = null;
          });
        }

        const refreshed = await refreshingTokenPromise;
        if (!refreshed?.token) throw new Error('Refresh token failed');

        localStorage.setItem('access_token', refreshed.token);
        if (refreshed.refreshToken) {
          localStorage.setItem('refresh_token', refreshed.refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const headersObj: Record<string, unknown> = (() => {
        const h: any = originalRequest.headers;
        if (!h) return {};
        if (typeof h.toJSON === 'function') return h.toJSON();
        return h;
      })();

      const skipRedirect = Object.entries(headersObj).some(([k, v]) => {
        if (k.toLowerCase() !== 'x-skip-403-redirect') return false;
        if (v === true) return true;
        return String(v).toLowerCase() === 'true';
      });

      // If it's a GET request (loading page data), redirect to Forbidden page unless skipped
      // Otherwise (actions), just reject so UI can show toast
      if (method === 'GET' && !skipRedirect && !isSubscriptionInactive) {
        const message = errorMessage || 'Access Denied';
        const source = url || 'Unknown URL';
        window.location.href = `/403?source=${encodeURIComponent(source)}&reason=${encodeURIComponent(message)}`;
      }
    }

    // Handle 5xx Server Errors (Optional: could redirect to 500 page for critical GETs)
    if (error.response?.status >= 500) {
       LogService.error('Server Error (5xx)', { url, status: error.response.status });
       // We don't auto-redirect to /500 to avoid disrupting user workflow for minor failures.
       // The UI (React Query / ErrorBoundary) should handle the display.
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
