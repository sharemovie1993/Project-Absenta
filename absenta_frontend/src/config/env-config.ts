/**
 * Unified environment configuration helper for the frontend.
 * Provides safe defaults and centralizes access to import.meta.env.
 */

// Suffix domains and core identifiers
export const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN || 'localhost';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Absenta';
export const DEFAULT_SUPPORT_EMAIL = 'support@' + MAIN_DOMAIN;

// API & Realtime URLs
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Resolves the absolute API URL if needed (e.g. for uploads or external links)
 */
export const getAbsoluteApiUrl = (path: string = ''): string => {
  const base = API_BASE_URL.startsWith('/') 
    ? window.location.origin + API_BASE_URL 
    : API_BASE_URL;
  return base.replace(/\/+$/, '') + (path ? '/' + path.replace(/^\/+/, '') : '');
};

/**
 * Resolves the WebSocket URL dynamically based on current protocol and host
 */
export const getSocketUrl = (): string => {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket) return envSocket;

  // Dynamic resolution: same host as current page
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes port
  
  // If in dev and api is proxied, socket should also point to the same host
  return `${protocol}//${host}`;
};

/**
 * Identify current tenant from hostname
 */
export const resolveTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  
  // If it's localhost or an IP, we might not be in a multi-tenant URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const parts = hostname.toLowerCase().split('.');
  
  // Example: smk1.absenta.id -> mainDomain is absenta.id
  // parts will be ['smk1', 'absenta', 'id']
  // mainParts will be ['absenta', 'id']
  const mainParts = MAIN_DOMAIN.split('.');
  
  // If hostname is exactly the main domain, there is no tenant (likely landing page/admin)
  if (hostname === MAIN_DOMAIN) return null;

  // Basic tenant logic: first part is the tenant
  if (hostname.endsWith(MAIN_DOMAIN)) {
    return parts[0];
  }

  return null;
};
