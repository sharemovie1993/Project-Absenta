// API Utilities for Standardized Error Handling
// Digunakan untuk konsistensi error handling di semua modul API

import axiosInstance from '../lib/axiosInstance';
import { LogService } from '../utils/LogService';

/**
 * Standard API response wrapper dengan error handling
 * @param apiCall - Function yang mengembalikan Promise dari axios call
 * @param errorContext - Context untuk logging error (nama function/module)
 * @returns Promise dengan data response atau throw error
 */
export const standardApiCall = async <T>(
  apiCall: () => Promise<{ data: T }>,
  errorContext: string,
  context?: { invoiceId?: string; activity?: string; meta?: Record<string, unknown> }
): Promise<T> => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error: unknown) {
    // Enhanced, structured logging using LogService
    const source = 'standardApiCall';
    LogService.error(`[API Error - ${errorContext}]:`, error, source, {
      invoiceId: context?.invoiceId,
      activity: context?.activity,
      ...context?.meta
    });

    // Enhanced error information & user-facing messaging
    const e = error as { response?: { status?: number; data?: { message?: string } }; request?: unknown; message?: string };
    if (e.response) {
      // Server responded with error status
      LogService.error(`Status: ${e.response.status}`, undefined, source, {
        invoiceId: context?.invoiceId,
        activity: context?.activity
      });
      LogService.error(`Data:`, e.response.data, source, {
        invoiceId: context?.invoiceId,
        activity: context?.activity
      });
      const raw = e.response.data?.message || `API Error: ${e.response.status}`;
      throw new Error(formatErrorMessage(raw));
    } else if (e.request) {
      // Request was made but no response received
      LogService.error('No response received:', e.request, source, {
        invoiceId: context?.invoiceId,
        activity: context?.activity
      });
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    } else {
      // Something else happened
      LogService.error('Request setup error:', (e?.message ?? ''), source, {
        invoiceId: context?.invoiceId,
        activity: context?.activity
      });
      throw new Error(`Gagal membuat permintaan ke server: ${e?.message ?? ''}`);
    }
  }
};

/**
 * Standard API response type untuk konsistensi
 */
export interface StandardApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Standard pagination response type
 */
export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Standard error response type
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Type guard untuk mengecek apakah response adalah error
 */
export const isApiError = (response: unknown): response is ApiErrorResponse => {
  return typeof response === 'object' && response !== null && (response as { success?: boolean }).success === false;
};

/**
 * Helper function untuk format error message yang user-friendly
 */
export const formatErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  const raw = e?.response?.data?.message || e?.message;
  if (raw) {
    if (/your subscription is not active/i.test(raw) || /subscription is not active/i.test(raw) || /subscription inactive/i.test(raw)) {
      return 'Langganan Anda tidak aktif. Silakan cek halaman langganan untuk mengaktifkan kembali atau hubungi support.';
    }
    if (/access denied/i.test(raw)) {
      return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.';
    }
    return raw;
  }
  return 'Terjadi kesalahan yang tidak diketahui';
};

export const handleApiError = (
  error: unknown,
  errorContext: string = 'API',
  context?: { invoiceId?: string; activity?: string; meta?: Record<string, unknown> }
): string => {
  LogService.error(`[API Error - ${errorContext}]:`, error, 'handleApiError', {
    invoiceId: context?.invoiceId,
    activity: context?.activity,
    ...context?.meta
  });
  
  let errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
  
  const e = error as { response?: { status?: number; data?: { message?: string } }; request?: unknown; message?: string };
  if (e.response) {
    // Server responded with error
    LogService.error(`Status: ${e.response.status}`, undefined, 'handleApiError', {
      invoiceId: context?.invoiceId,
      activity: context?.activity
    });
    LogService.error(`Data:`, e.response.data, 'handleApiError', {
      invoiceId: context?.invoiceId,
      activity: context?.activity
    });
    
    errorMessage = e.response.data?.message || errorMessage;
  } else if (e.request) {
    // Request made but no response
    LogService.error('No response received:', e.request, 'handleApiError', {
      invoiceId: context?.invoiceId,
      activity: context?.activity
    });
    errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  } else {
    // Error setting up request
    LogService.error('Request setup error:', (e?.message ?? ''), 'handleApiError', {
      invoiceId: context?.invoiceId,
      activity: context?.activity
    });
    errorMessage = 'Gagal membuat permintaan ke server.';
  }
  
  return errorMessage;
};

export async function requestWithFallback<T>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  options?: { params?: Record<string, unknown> | URLSearchParams; data?: unknown; headers?: Record<string, string>; responseType?: 'json' | 'blob' | 'arraybuffer' | 'text'; onUploadProgress?: (e: unknown) => void; unwrapData?: boolean; timeout?: number }
): Promise<T> {
  const url = path;
  const config: any = { 
    params: options?.params, 
    headers: options?.headers ? { ...options.headers } : {}, 
    responseType: options?.responseType, 
    timeout: options?.timeout,
    onUploadProgress: options?.onUploadProgress
  };

  if (options?.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  let res;
  if (method === 'get') {
    res = await axiosInstance.get(url, config);
  } else if (method === 'post') {
    res = await axiosInstance.post(url, options?.data, config);
  } else if (method === 'put') {
    res = await axiosInstance.put(url, options?.data, config);
  } else if (method === 'patch') {
    res = await axiosInstance.patch(url, options?.data, config);
  } else {
    res = await axiosInstance.delete(url, { ...config, data: options?.data as any });
  }

  const d: any = res.data;
  return (options?.unwrapData ? (d?.data ?? d) : d) as T;
}

/**
 * Dedicated function for downloading binary files (Blobs)
 * Bypasses standardApiCall and requestWithFallback complex logic
 */
export async function downloadBlob(
  path: string,
  options?: { params?: Record<string, unknown> | URLSearchParams; headers?: Record<string, string>; timeout?: number }
): Promise<Blob> {
  const token = localStorage.getItem('access_token');
  const tenantId = localStorage.getItem('tenant_id');
  const tenantDomain = localStorage.getItem('tenant_domain');
  
  // Same-Origin URL (relative) to ensure browser respects 'download' attribute
  const baseUrl = axiosInstance.defaults.baseURL || '';
  const normalizedPath = baseUrl.endsWith('/') && path.startsWith('/') ? path.substring(1) : path;
  let url = baseUrl + normalizedPath;
  if (options?.params) {
    const params = new URLSearchParams(options.params as any).toString();
    url += (url.includes('?') ? '&' : '?') + params;
  }

  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (tenantId) headers.set('X-Tenant-ID', tenantId);
  if (tenantDomain) headers.set('X-Tenant-Domain', tenantDomain);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Gagal mengunduh file (${response.status})`);
  }

  const contentType = response.headers.get('Content-Type') || '';
  const isBinary = 
    contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/vnd.ms-excel') ||
    contentType.includes('application/pdf') ||
    contentType.includes('text/csv');

  if (!isBinary) {
     const text = await response.text().catch(() => '');
     if (contentType.includes('text/html')) {
       throw new Error('Server mengembalikan halaman HTML. Kemungkinan masalah koneksi backend.');
     }
     try {
       const json = JSON.parse(text);
       throw new Error(json.message || 'Server mengembalikan JSON padahal mengharapkan biner.');
     } catch {
       throw new Error(`Tipe konten tidak valid: ${contentType}`);
     }
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Blob([arrayBuffer], { type: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
