import React, { useEffect, useMemo, useState } from 'react';
import { LogService } from '../utils/LogService';

type ErrorLog = {
  type: string;
  message: string;
  stack?: string;
  route?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  status?: number;
  url?: string;
  timestamp: string;
};

function loadStoredLogs(): ErrorLog[] {
  try {
    const raw = localStorage.getItem('app_error_logs') || '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch (e) {
    LogService.warn('Failed to copy to clipboard:', e);
  }
}

export default function DevErrorLogsPanel() {
  const [logs, setLogs] = useState<ErrorLog[]>(() => {
    const mem = (window as any).__APP_ERROR_LOGS__ || [];
    return [...loadStoredLogs(), ...mem];
  });
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const handler = () => {
      const mem = (window as any).__APP_ERROR_LOGS__ || [];
      setLogs([...loadStoredLogs(), ...mem]);
    };
    window.addEventListener('app:error-logged', handler);
    const interval = setInterval(handler, 2000);
    return () => {
      window.removeEventListener('app:error-logged', handler);
      clearInterval(interval);
    };
  }, []);

  const latest = useMemo(() => logs.slice(-20).reverse(), [logs]);

  const clearLogs = () => {
    try {
      localStorage.removeItem('app_error_logs');
    } catch {}
    (window as any).__APP_ERROR_LOGS__ = [];
    setLogs([]);
  };

  const exportLogs = () => {
    const payload = JSON.stringify(logs, null, 2);
    copyToClipboard(payload);
    LogService.info('DevErrorLogsPanel: logs copied to clipboard');
  };

  const time = (ts?: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString();
    } catch { return ts; }
  };

  return (
    <div style={{
      position: 'fixed',
      right: 16,
      bottom: 16,
      zIndex: 10000,
      maxWidth: 480
    }}>
      <div style={{
        background: '#0f172a', // slate-900
        color: '#e2e8f0', // slate-200
        border: '1px solid #334155',
        borderRadius: 8,
        boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
          <div style={{ fontWeight: 600 }}>Dev Error Logs ({latest.length})</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setExpanded((v) => !v)} style={{ padding: '6px 10px', background: '#334155', color: '#e2e8f0', borderRadius: 6 }}> {expanded ? 'Tutup' : 'Lihat'} </button>
            <button onClick={exportLogs} style={{ padding: '6px 10px', background: '#3b82f6', color: 'white', borderRadius: 6 }}>Export</button>
            <button onClick={clearLogs} style={{ padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: 6 }}>Clear</button>
          </div>
        </div>
        {expanded && (
          <div style={{ maxHeight: 300, overflowY: 'auto', padding: 10, borderTop: '1px solid #334155' }}>
            {latest.length === 0 && <div style={{ opacity: 0.8 }}>Tidak ada error tercatat.</div>}
            {latest.map((log, idx) => (
              <div key={idx} style={{ padding: '8px 10px', marginBottom: 8, background: '#1f2937', borderRadius: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{time(log.timestamp)} · {log.type}</div>
                <div style={{ fontWeight: 600 }}>{log.message}</div>
                {log.route && <div style={{ fontSize: 12, opacity: 0.8 }}>route: {log.route}</div>}
                {log.url && <div style={{ fontSize: 12, opacity: 0.8 }}>url: {log.url} (status {log.status})</div>}
                {log.stack && (
                  <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                    {log.stack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
