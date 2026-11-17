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

import { getActiveServerOrigin } from '../services/serverConfig';

export function resolveProfilePhotoUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  let targetPath = url.trim();

  // If already absolute with http/https
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    try {
      const u = new URL(targetPath);
      const isLocalhostHost = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.startsWith('10.0.2.2');
      if (isLocalhostHost) {
        // Strip localhost origin on mobile container
        targetPath = u.pathname + u.search;
      } else {
        return url;
      }
    } catch {
      return url;
    }
  }

  // Prepend active server origin protocol + domain (supports custom domains seamlessly)
  const host = getActiveServerOrigin();

  // If static public assets bundled with frontend app (e.g. /logo.png, /favicon.png, /assets/...)
  if (targetPath === '/logo.png' || targetPath === 'logo.png' || targetPath.startsWith('/assets/') || targetPath.startsWith('assets/') || targetPath.endsWith('.svg')) {
    return targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  }

  // Case 1: MinIO S3 object storage path (/absenta-storage/...)
  if (targetPath.includes('/absenta-storage/') || targetPath.startsWith('absenta-storage/')) {
    const cleanStoragePath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    return `${host}${cleanStoragePath}`;
  }

  // Case 2: Academic document download route (/academic/... or /api/academic/...)
  if (targetPath.includes('/academic/') || targetPath.startsWith('academic/')) {
    let cleanAcademic = targetPath.replace(/^\/+/, '');
    if (cleanAcademic.startsWith('api/')) {
      cleanAcademic = cleanAcademic.substring(4);
    }
    const cleanUrl = `/api/${cleanAcademic}`;
    return `${host}${cleanUrl}`;
  }

  // Case 3: Already an /api/... route
  if (targetPath.startsWith('/api/') || targetPath.startsWith('api/')) {
    const cleanApi = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    return `${host}${cleanApi}`;
  }

  // Case 4: Standard uploads (/uploads/... or uploads/...)
  let relativePath = targetPath.replace(/^\/+/, '');
  if (!relativePath.startsWith('uploads/')) {
    relativePath = `uploads/${relativePath}`;
  }

  const cleanUrl = `/api/${relativePath}`;
  return `${host}${cleanUrl}`;
}

export const resolveMediaUrl = resolveProfilePhotoUrl;
