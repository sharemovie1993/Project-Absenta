import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bpbkApi, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Table, type Column } from '../../../components/ui/Table';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Search, Calendar, User, Tag, FileJson, ChevronDown, ChevronUp } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

interface BkAuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  metadata: string | null;
  created_at: string;
  User?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface DiffMetadata {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  [key: string]: unknown;
}

type BadgeVariant = 'error' | 'warning' | 'success' | 'outline' | 'default' | 'info';

export const AuditSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Expanded row ID for showing diffs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // ── useQuery: BK Audit Logs ───────────────────────────────────────────────
  const { data: auditLogsRes, isLoading: loading } = useQuery({
    queryKey: bpbkQueryKeys.auditLogs({ page, limit, search: debouncedSearch }),
    queryFn: () => bpbkApi.getBkAuditLogs({ page, limit, search: debouncedSearch }),
    staleTime: 5 * 60 * 1000,
  });

  const logs = useMemo(() => (auditLogsRes?.data?.list || []) as BkAuditLog[], [auditLogsRes]);
  const totalPages = auditLogsRes?.data?.pagination?.totalPages || 1;
  const totalItems = auditLogsRes?.data?.pagination?.total || 0;

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const toggleExpand = useCallback((logId: string) => {
    setExpandedLogId(prev => (prev === logId ? null : logId));
  }, []);

  const getActionBadgeColor = useCallback((action: string): BadgeVariant => {
    if (action.includes('CREATE') || action.includes('OPEN')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('DELETE')) return 'error';
    if (action.includes('RESTORE')) return 'info';
    return 'default';
  }, []);

  const parseMetadata = useCallback((metadataStr: string | null): DiffMetadata | string | null => {
    if (!metadataStr) return null;
    try {
      return JSON.parse(metadataStr) as DiffMetadata;
    } catch {
      return metadataStr;
    }
  }, []);

  // Helper to format values for display
  const formatVal = useCallback((val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '[Object]';
      }
    }
    return String(val);
  }, []);

  const renderDiff = useCallback((metadata: DiffMetadata | string | null) => {
    if (!metadata || typeof metadata !== 'object') {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono whitespace-pre-wrap break-all text-slate-600 dark:text-slate-400">
          {typeof metadata === 'string' ? metadata : JSON.stringify(metadata, null, 2)}
        </div>
      );
    }

    const { oldValue, newValue } = metadata;
    const ignoreKeys = ['tenant_id', 'created_at', 'updated_at', 'deleted_at', 'closed_at', 'deleted_by', 'closed_by'];

    // If both old and new exist -> show changes
    if (oldValue && newValue) {
      const allKeys = Array.from(
        new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
      ).filter(k => !ignoreKeys.includes(k));

      const changes = allKeys.filter(k => JSON.stringify(oldValue[k]) !== JSON.stringify(newValue[k]));

      if (changes.length === 0) {
        return <p className="text-xs text-slate-400 font-bold px-2 uppercase tracking-wider">Tidak ada perubahan properti data utama.</p>;
      }

      return (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">Kolom / Field</th>
                <th className="px-4 py-2 bg-rose-50/20 text-rose-600 dark:text-rose-400">Nilai Lama</th>
                <th className="px-4 py-2 bg-emerald-50/20 text-emerald-600 dark:text-emerald-400">Nilai Baru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium">
              {changes?.map(key => (
                <tr key={key} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                  <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-350 font-mono text-[11px]">{key}</td>
                  <td className="px-4 py-2.5 bg-rose-50/10 text-rose-500 dark:text-rose-450 line-through break-all">{formatVal(oldValue[key])}</td>
                  <td className="px-4 py-2.5 bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 font-bold break-all">{formatVal(newValue[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Only newValue exists -> Creation log
    if (newValue) {
      const keys = Object.keys(newValue).filter(k => !ignoreKeys.includes(k));
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">Kolom / Field</th>
                <th className="px-4 py-2 bg-emerald-50/20 text-emerald-600 dark:text-emerald-400">Nilai Data Baru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium">
              {keys?.map(key => (
                <tr key={key} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                  <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-350 font-mono text-[11px]">{key}</td>
                  <td className="px-4 py-2.5 bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 font-bold break-all">{formatVal(newValue[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Only oldValue exists -> Deletion log
    if (oldValue) {
      const keys = Object.keys(oldValue).filter(k => !ignoreKeys.includes(k));
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2">Kolom / Field</th>
                <th className="px-4 py-2 bg-rose-50/20 text-rose-600 dark:text-rose-455">Nilai Terhapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium">
              {keys?.map(key => (
                <tr key={key} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                  <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-350 font-mono text-[11px]">{key}</td>
                  <td className="px-4 py-2.5 bg-rose-50/10 text-rose-500 dark:text-rose-450 line-through break-all">{formatVal(oldValue[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Fallback display
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-650 dark:text-slate-400">
        {JSON.stringify(metadata, null, 2)}
      </div>
    );
  }, [formatVal]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'actor',
      label: 'Aktor / Operator',
      render: (_, item: BkAuditLog) => (
        <div className="flex items-center gap-2.5">
          <div className="w-6.5 h-6.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-850 dark:text-white text-xs">{item.User?.full_name || 'System / Auto'}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{item.User?.email || '-'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Tindakan',
      render: (_, item: BkAuditLog) => (
        <Badge variant={getActionBadgeColor(item.action)} className="text-[9px] font-black uppercase tracking-wider">
          {item.action}
        </Badge>
      )
    },
    {
      key: 'entity',
      label: 'Entitas Modul',
      render: (_, item: BkAuditLog) => (
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-650 dark:text-slate-355">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          {item.entity}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Waktu Log',
      render: (_, item: BkAuditLog) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {new Date(item.created_at).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'State Diff',
      className: 'text-right',
      render: (_, item: BkAuditLog) => {
        const isExpanded = expandedLogId === item.id;
        return (
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(item.id);
            }}
            className="text-[10px] font-black h-8 px-2.5 transition-all duration-200"
          >
            <FileJson className="w-3.5 h-3.5 mr-1" />
            {isExpanded ? 'Tutup Perubahan' : 'Lihat Perubahan'}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </Button>
        );
      }
    }
  ], [expandedLogId, toggleExpand, getActionBadgeColor]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Log Audit Bimbingan Konseling</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Riwayat lengkap aktivitas modifikasi data sensitif bimbingan konseling siswa</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari berdasarkan tindakan, entitas modul, atau nama operator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
        />
      </div>

      {/* Logs Table / Timeline */}
      {loading && logs.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Audit Trail...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full overflow-hidden rounded-xl border border-gray-150 dark:border-gray-800/60 shadow-sm bg-white dark:bg-slate-900">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-950/60 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  {columns?.map((column) => (
                    <th
                       key={column.key}
                       scope="col"
                       className={`px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${column.className || ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-gray-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[11px]">
                      Tidak ada log audit yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  logs?.map((log, logIndex) => {
                    const isExpanded = expandedLogId === log.id;
                    const metadata = parseMetadata(log.metadata);
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          {columns?.map((column) => (
                            <td key={column.key} className={`px-6 py-4 text-xs ${column.className || ''}`}>
                              {column.render ? column.render(null, log, logIndex) : '-'}
                            </td>
                          ))}
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={columns.length} className="px-8 py-5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-b border-slate-100 dark:border-slate-800/50">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Perbandingan Nilai (State Diff)</span>
                                  {log.entity_id && (
                                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100/50 dark:bg-slate-800 px-2 py-0.5 rounded">
                                      ID Target: {log.entity_id}
                                    </span>
                                  )}
                                </div>
                                <div className="transition-all duration-300">
                                  {renderDiff(metadata)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/20 dark:bg-slate-950/20">
                <div className="text-[11px] text-slate-500 font-medium">
                  Menampilkan <span className="font-bold text-slate-700 dark:text-slate-350">{((page - 1) * limit) + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-350">{Math.min(page * limit, totalItems)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-350">{totalItems}</span>
                </div>
                
                <div className="flex items-center space-x-1 border border-gray-200/60 dark:border-gray-800/80 rounded-lg p-0.5 bg-white dark:bg-slate-900 shadow-sm">
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-wider"
                  >
                    Prev
                  </Button>
                  <div className="px-2 text-[9px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 py-0.5 rounded-md border border-indigo-100/30">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-wider"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};


