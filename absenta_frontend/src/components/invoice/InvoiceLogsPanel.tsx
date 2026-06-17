import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { LogService } from '../../utils/LogService';
import type { LogEntry, LogLevel } from '../../utils/LogService';

interface DateRange {
  from?: string; // ISO
  to?: string;   // ISO
}

interface Props {
  defaultLevel?: LogLevel | 'all';
  defaultInvoiceId?: string;
  defaultActivity?: string;
  dateRange?: DateRange;
}

const levels: Array<LogLevel | 'all'> = ['all', 'debug', 'info', 'warn', 'error'];

export default function InvoiceLogsPanel({
  defaultLevel = 'all',
  defaultInvoiceId,
  defaultActivity,
  dateRange
}: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<LogLevel | 'all'>(defaultLevel);
  const [invoiceId, setInvoiceId] = useState<string>(defaultInvoiceId || '');
  const [activity, setActivity] = useState<string>(defaultActivity || '');
  const [from, setFrom] = useState<string>(dateRange?.from || '');
  const [to, setTo] = useState<string>(dateRange?.to || '');

  const refresh = () => {
    setLogs(LogService.getLogs());
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    try { window.addEventListener('app:error-logged', handler); } catch {}
    return () => {
      try { window.removeEventListener('app:error-logged', handler); } catch {}
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return LogService.filterLogs({
      level: level === 'all' ? undefined : level as LogLevel,
      invoiceId: invoiceId || undefined,
      activity: activity || undefined,
      from: from || undefined,
      to: to || undefined,
      source: undefined
    });
  }, [logs, level, invoiceId, activity, from, to]);

  const exportLogs = () => {
    const payload = LogService.exportLogs({
      level: level === 'all' ? undefined : level as LogLevel,
      invoiceId: invoiceId || undefined,
      activity: activity || undefined,
      from: from || undefined,
      to: to || undefined
    });
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importantLogs = useMemo(() => filteredLogs.filter(l => l.level === 'error' || l.level === 'warn'), [filteredLogs]);

  return (
    <div className="rounded border p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Invoice Logs</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={exportLogs}>Export JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
        <div>
          <label className="text-xs">Level</label>
          <SearchableSelect
            value={level}
            onValueChange={(val) => setLevel(val as any)}
            options={levels.map(l => ({ label: l, value: l }))}
            placeholder="Select Level"
            searchPlaceholder="Search level..."
            triggerClassName="w-full"
          />
        </div>
        <div>
          <label className="text-xs">Invoice ID</label>
          <input className="w-full border rounded p-1" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="e.g. inv_123" />
        </div>
        <div>
          <label className="text-xs">Aktivitas</label>
          <input className="w-full border rounded p-1" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="create/update/delete/view/fetch_invoice_by_id" />
        </div>
        <div>
          <label className="text-xs">Dari (ISO)</label>
          <input className="w-full border rounded p-1" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2025-01-01T00:00:00.000Z" />
        </div>
        <div>
          <label className="text-xs">Sampai (ISO)</label>
          <input className="w-full border rounded p-1" value={to} onChange={(e) => setTo(e.target.value)} placeholder="2025-12-31T23:59:59.999Z" />
        </div>
      </div>

      {/* Important logs section */}
      {importantLogs.length > 0 && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 dark:bg-red-900/20 dark:border-red-700">
          <div className="text-sm font-medium">Log Penting ({importantLogs.length})</div>
          <div className="text-xs text-red-700 dark:text-red-200">Menampilkan peringatan dan error terbaru terkait invoice</div>
        </div>
      )}

      <div className="max-h-96 overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Timestamp</th>
              <th className="p-2 text-left">Level</th>
              <th className="p-2 text-left">Sumber</th>
              <th className="p-2 text-left">Pesan</th>
              <th className="p-2 text-left">Context</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.slice().reverse().map((log, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2 whitespace-nowrap">{log.timestamp}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    log.level === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-200' :
                    log.level === 'warn' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                    log.level === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}>{log.level.toUpperCase()}</span>
                </td>
                <td className="p-2">{log.source || '-'}</td>
                <td className="p-2 break-words">{log.message}</td>
                <td className="p-2 text-xs">
                  {log.context && (
                    <div>
                      {log.context.invoiceId && <div>invoiceId: {log.context.invoiceId}</div>}
                      {log.context.activity && <div>activity: {log.context.activity}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

