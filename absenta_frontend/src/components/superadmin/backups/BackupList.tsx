import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  RefreshCw, 
  Database, 
  Calendar, 
  HardDrive, 
  Clock, 
  Search, 
  Filter, 
  Sparkles, 
  RotateCcw
} from 'lucide-react';
import { 
  Button, 
  Table, 
  Badge 
} from '../../ui';
import { format } from 'date-fns';
import type { Backup } from '../../../api/superadmin-backups.api';

interface BackupListProps {
  items: Backup[];
  loading: boolean;
  onRefresh: () => void;
  onDownload: (backup: Backup) => void;
  onRestore: (backup: Backup) => void;
}

export const BackupList: React.FC<BackupListProps> = ({
  items,
  loading,
  onRefresh,
  onDownload,
  onRestore
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('ALL');
  const [onlyLatest, setOnlyLatest] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Daftar unik sekolah untuk opsi filter dropdown
  const uniqueTenants = useMemo(() => {
    const map = new Map<string, string>();
    items?.forEach(b => {
      const tenantId = b.tenant_id || 'system';
      const name = b.Tenant?.name || (tenantId === 'system' ? 'System Platform' : tenantId);
      if (!map.has(tenantId)) {
        map.set(tenantId, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Pemetaan ID snapshot paling mutakhir per tenant
  const latestBackupIdPerTenant = useMemo(() => {
    const map = new Map<string, string>();
    const latestTimeMap = new Map<string, number>();

    items?.forEach(b => {
      const tenantKey = b.tenant_id || 'system';
      const time = new Date(b.snapshot_date).getTime();
      const currentHighest = latestTimeMap.get(tenantKey) || 0;

      if (time > currentHighest) {
        latestTimeMap.set(tenantKey, time);
        map.set(tenantKey, b.id);
      }
    });

    return map;
  }, [items]);

  // Filter items berdasarkan pencarian, pilihan tenant, dan toggle "Hanya Terbaru"
  const filteredItems = useMemo(() => {
    return (items || []).filter(b => {
      // 1. Filter Tenant Dropdown
      if (selectedTenant !== 'ALL') {
        const tenantKey = b.tenant_id || 'system';
        if (tenantKey !== selectedTenant) return false;
      }

      // 2. Filter Hanya Terbaru
      if (onlyLatest) {
        const tenantKey = b.tenant_id || 'system';
        const latestId = latestBackupIdPerTenant.get(tenantKey);
        if (b.id !== latestId) return false;
      }

      // 3. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const schoolName = (b.Tenant?.name || '').toLowerCase();
        const tenantId = (b.tenant_id || '').toLowerCase();
        const backupId = (b.id || '').toLowerCase();
        const checksum = ((b as any).checksum_sha256 || '').toLowerCase();
        if (!schoolName.includes(q) && !tenantId.includes(q) && !backupId.includes(q) && !checksum.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedTenant, onlyLatest, searchQuery, latestBackupIdPerTenant]);

  // Reset ke halaman pertama saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTenant, onlyLatest]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const columns = [
    { 
      label: 'Tenant / Instansi Sekolah', 
      key: 'tenant', 
      render: (_: unknown, item: unknown) => {
        const b = item as Backup;
        const tenantKey = b.tenant_id || 'system';
        const isLatest = b.id === latestBackupIdPerTenant.get(tenantKey);

        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                {b.Tenant?.name || 'System Tenant'}
              </span>
              {isLatest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/80">
                  <Sparkles size={9} />
                  TERBARU
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono tracking-tight">
              <span>ID: {b.tenant_id ? `${b.tenant_id.substring(0, 16)}...` : 'system'}</span>
              {(b as any).file_path?.includes('.absenta') && (
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold">
                  .absenta
                </span>
              )}
            </div>
          </div>
        );
      } 
    },
    { 
      label: 'Waktu Snapshot', 
      key: 'snapshot_date', 
      render: (v: string) => {
        const dateObj = new Date(v);
        return (
          <div className="flex flex-col text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Calendar size={12} className="text-blue-500 shrink-0" />
              {format(dateObj, 'dd MMM yyyy')}
            </span>
            <span className="text-[10px] text-slate-400 font-normal pl-4">
              Pukul {format(dateObj, 'HH:mm')} WIB
            </span>
          </div>
        );
      } 
    },
    { 
      label: 'Ukuran Berkas', 
      key: 'file_size_bytes', 
      render: (v: string) => {
        const bytes = parseInt(v) || 0;
        const formatted = bytes > 1024 * 1024 
          ? `${(bytes / 1024 / 1024).toFixed(2)} MB` 
          : `${(bytes / 1024).toFixed(1)} KB`;

        return (
          <Badge variant="outline" className="font-mono text-xs bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            <HardDrive size={11} className="mr-1 text-slate-400" />
            {formatted}
          </Badge>
        );
      } 
    },
    { 
      label: 'Status Arsip', 
      key: 'status', 
      render: (v: unknown) => {
        const status = String(v);
        const variants: Record<string, 'success' | 'destructive' | 'secondary' | 'outline' | 'default' | 'info' | 'warning' | 'error'> = {
          'READY': 'success',
          'RESTORED': 'info',
          'FAILED': 'destructive',
          'PURGED': 'secondary'
        };
        const labels: Record<string, string> = {
          'READY': 'READY',
          'RESTORED': 'RESTORED',
          'FAILED': 'GAGAL',
          'PURGED': 'DIBERSIHKAN'
        };
        return (
          <Badge variant={variants[status] || 'secondary'} className="font-bold text-[10px]">
            {labels[status] || status}
          </Badge>
        );
      } 
    },
    { 
      label: 'Kedaluwarsa', 
      key: 'expires_at', 
      render: (v: string) => {
        if (!v) return <span className="text-slate-400 font-mono text-[11px]">-</span>;

        const expDate = new Date(v);
        if (isNaN(expDate.getTime())) return <span className="text-slate-400 font-mono text-[11px]">-</span>;

        const now = new Date();
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let remainingText = '';
        let badgeColor = 'text-slate-500 dark:text-slate-400';

        if (diffDays < 0) {
          remainingText = 'kedaluwarsa';
          badgeColor = 'text-rose-500 dark:text-rose-400 font-semibold';
        } else if (diffDays === 0) {
          remainingText = 'hari ini';
          badgeColor = 'text-amber-600 dark:text-amber-400 font-semibold';
        } else {
          remainingText = `${diffDays} hari`;
          if (diffDays <= 3) {
            badgeColor = 'text-amber-600 dark:text-amber-400 font-semibold';
          }
        }

        return (
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            <Clock size={11} className="text-slate-400 shrink-0" />
            <span>{format(expDate, 'dd/MM/yyyy')}</span>
            <span className={`text-[10px] ${badgeColor}`}>({remainingText})</span>
          </div>
        );
      }
    },
    { 
      label: 'Aksi Superadmin', 
      key: 'actions', 
      render: (_: unknown, item: unknown) => {
        const b = item as Backup;
        const isPurged = b.status === 'PURGED';
        return (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onDownload(b)}
              disabled={isPurged}
              className={`h-8 px-2.5 text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                isPurged 
                  ? 'opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800' 
                  : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer'
              }`}
              title={isPurged ? 'Berkas fisik sudah dibersihkan/kedaluwarsa' : 'Unduh Paket Arsip (.absenta)'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </Button>
            
            {b.status === 'READY' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onRestore(b)}
                className="h-8 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Pulihkan Snapshot ke Sekolah Ini atau Sekolah Lain"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </Button>
            )}
          </div>
        );
      } 
    }
  ];

  const renderMobileCard = (row: any) => {
    const b = row as Backup;
    const tenantKey = b.tenant_id || 'system';
    const isLatest = b.id === latestBackupIdPerTenant.get(tenantKey);
    const bytes = parseInt(b.file_size_bytes) || 0;
    const formattedSize = bytes > 1024 * 1024 
      ? `${(bytes / 1024 / 1024).toFixed(2)} MB` 
      : `${(bytes / 1024).toFixed(1)} KB`;
    const dateObj = new Date(b.snapshot_date);

    return (
      <div key={b.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {b.Tenant?.name || 'System Platform'}
            </span>
            {isLatest && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/80 shrink-0">
                <Sparkles size={8} />
                TERBARU
              </span>
            )}
          </div>
          <Badge 
            variant={b.status === 'READY' ? 'success' : b.status === 'RESTORED' ? 'info' : 'destructive'} 
            className="text-[9px] font-bold px-1.5 py-0.5 shrink-0"
          >
            {b.status}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-blue-500" />
              {format(dateObj, 'dd/MM/yy HH:mm')}
            </span>
            <span>•</span>
            <span>{formattedSize}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="xs"
              variant="outline"
              onClick={() => onDownload(b)}
              className="h-7 px-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
            >
              <Download size={11} className="mr-1" />
              Unduh
            </Button>
            {b.status === 'READY' && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onRestore(b)}
                className="h-7 px-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
              >
                <RotateCcw size={11} className="mr-1" />
                Pulih
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <Table
        columns={columns}
        data={paginatedItems}
        loading={loading}
        renderMobileCard={renderMobileCard}
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage,
          onPageChange: (page) => setCurrentPage(page),
          onLimitChange: (limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }
        }}
        emptyMessage={
          searchQuery || selectedTenant !== 'ALL' || onlyLatest
            ? "Tidak ada arsip cadangan yang cocok dengan kriteria filter."
            : "Belum ada riwayat snapshot cadangan di sistem."
        }
        compact={true}
        hoverable={true}
        toolbarLeft={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
            {/* Input Pencarian Nama Sekolah / ID */}
            <div className="relative w-full sm:max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sekolah atau ID..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Dropdown Filter Sekolah */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-none">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="text-xs bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none cursor-pointer pr-1 w-full"
                >
                  <option value="ALL">Semua Sekolah ({items?.length || 0})</option>
                  {uniqueTenants?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Sakelar "Hanya Tampilkan Snapshot Terbaru" */}
              <button
                type="button"
                onClick={() => setOnlyLatest(!onlyLatest)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  onlyLatest
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-500'
                }`}
                title="Hanya tampilkan snapshot terbaru per sekolah"
              >
                <Sparkles size={12} className={onlyLatest ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
                <span className="text-[11px]">Terbaru Saja</span>
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};
