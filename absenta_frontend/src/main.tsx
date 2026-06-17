import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { LogService } from './utils/LogService';
import { toLocalDate } from './utils/attendance/time';

// Consolidated Development Diagnostics: Global runtime error listeners for blank page diagnostics
if (import.meta.env.DEV) {
  const w = window as any;
  w.__APP_ERROR_LOGS__ = Array.isArray(w.__APP_ERROR_LOGS__) ? w.__APP_ERROR_LOGS__ : [];

  const pushLog = (log: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      existing.push(log);
      localStorage.setItem('app_error_logs', JSON.stringify(existing));
    } catch {}
    w.__APP_ERROR_LOGS__.push(log);
    try { window.dispatchEvent(new CustomEvent('app:error-logged')); } catch {}
  };

  window.addEventListener('error', (event) => {
    const msg = event.error?.message || event.message || '';
    const isChunk = /ChunkLoadError|Loading chunk|dynamically imported/.test(msg);
    const log = {
      type: isChunk ? 'chunk.error' : 'window.error',
      message: msg,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      route: location.pathname,
      timestamp: new Date().toISOString(),
    };
    LogService.error('⚠️ Global error:', log);
    pushLog(log);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    const log = {
      type: 'unhandledrejection',
      message: reason.message || String(reason),
      stack: reason.stack,
      route: location.pathname,
      timestamp: new Date().toISOString(),
    };
    LogService.error('⚠️ Unhandled Promise rejection:', log);
    pushLog(log);
  });

  // Patch fetch to record network errors
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const res = await originalFetch(input, init);
      if (!res.ok) {
        const log = {
          type: 'fetch.error',
          message: `Fetch returned non-OK: ${res.status}`,
          status: res.status,
          url: res.url,
          route: location.pathname,
          timestamp: new Date().toISOString(),
        };
        LogService.warn('⚠️ Fetch non-OK response:', log);
        pushLog(log);
      }
      return res;
    } catch (error: any) {
      const log = {
        type: 'fetch.exception',
        message: error?.message || String(error),
        stack: error?.stack,
        route: location.pathname,
        timestamp: new Date().toISOString(),
      };
      LogService.error('⚠️ Fetch exception:', log);
      pushLog(log);
      throw error;
    }
  };

  console.info('🔧 Dev diagnostics initialized');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

try {
  const initDate = toLocalDate();
  const last = localStorage.getItem('app_last_date');
  if (last !== initDate) {
    localStorage.setItem('app_last_date', initDate);
    if (last) {
      window.dispatchEvent(new CustomEvent('app:day-rollover', { detail: { previous: last, current: initDate } }));
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = toLocalDate();
      const prev = localStorage.getItem('app_last_date');
      if (prev !== now) {
        localStorage.setItem('app_last_date', now);
        window.dispatchEvent(new CustomEvent('app:day-rollover', { detail: { previous: prev, current: now } }));
      }
    }
  });
} catch {}
