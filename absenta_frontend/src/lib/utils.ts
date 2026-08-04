import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolvePublicApiBaseUrl } from "./axiosInstance";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function resolveProfilePhotoUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  let targetPath = url;
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    try {
      const u = new URL(targetPath);
      // If it points to an upload asset or api endpoint, extract relative pathname
      if (u.pathname.includes('/uploads/') || u.pathname.includes('/academic/') || u.pathname.includes('/api/')) {
        targetPath = u.pathname;
      } else {
        return url;
      }
    } catch {
      return url;
    }
  }
  
  // Ensure it has /api prefix
  const cleanUrl = targetPath.startsWith('/api') ? targetPath : `/api${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
  
  // Prepend backend base host URL (removing trailing /api if necessary to avoid double /api)
  const apiBase = resolvePublicApiBaseUrl() || '';
  const host = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) : apiBase;
  
  let resolvedUrl = `${host}${cleanUrl}`;
  
  const token = localStorage.getItem('access_token');
  if (token) {
    const separator = resolvedUrl.includes('?') ? '&' : '?';
    return `${resolvedUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return resolvedUrl;
}
