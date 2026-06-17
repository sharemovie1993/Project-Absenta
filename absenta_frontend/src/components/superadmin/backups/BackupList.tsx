import React from 'react';
import { 
  Download, 
  RefreshCw, 
  Database, 
  Calendar,
  HardDrive,
  Clock,
  ExternalLink,
  ChevronRight
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
  const columns = [
    { 
      label: 'Tenant / Source', 
      key: 'tenant', 
      render: (_: any, item: Backup) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-900 dark:text-slate-100">{item.Tenant?.name || 'Unknown'}</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">{item.tenant_id}</span>
        </div>
      ) 
    },
    { 
      label: 'Snapshot Info', 
      key: 'snapshot_date', 
      render: (v: string) => (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Calendar size={12} className="text-blue-500" />
          {format(new Date(v), 'dd MMM yyyy, HH:mm')}
        </div>
      ) 
    },
    { 
      label: 'File Size', 
      key: 'file_size_bytes', 
      render: (v: string) => (
        <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <HardDrive size={10} className="mr-1" />
          {(parseInt(v) / 1024 / 1024).toFixed(2)} MB
        </Badge>
      ) 
    },
    { 
      label: 'Status Archive', 
      key: 'status', 
      render: (v: string) => {
        const variants: Record<string, any> = {
          'READY': 'success',
          'RESTORED': 'primary',
          'FAILED': 'destructive'
        };
        return (
          <Badge variant={variants[v] || 'secondary'}>
            {v}
          </Badge>
        );
      } 
    },
    { 
      label: 'Expiry', 
      key: 'expires_at', 
      render: (v: string) => (
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
          <Clock size={12} />
          {format(new Date(v), 'dd/MM/yyyy')}
        </div>
      ) 
    },
    { 
      label: 'Aksi', 
      key: 'actions', 
      render: (_: any, item: Backup) => (
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onDownload(item)}
            className="w-8 h-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Download Archive"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          {item.status === 'READY' && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onRestore(item)}
              className="w-8 h-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              title="Restore to Empty Tenant"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="w-8 h-8 p-0 text-slate-300 hover:text-slate-900"
            title="View Raw Metadata"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) 
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <Table
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="Tidak ada arsip cadangan (cold archive) ditemukan."
        compact={true}
        hoverable={true}
        toolbarLeft={
          <div className="flex items-center gap-2">
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={onRefresh}
              disabled={loading}
              className="shadow-sm hover:shadow-blue-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin text-blue-100' : ''}`} />
              Refresh Archive
            </Button>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
               <Database size={12} className="text-blue-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cold Storage Mode</span>
            </div>
          </div>
        }
      />
    </div>
  );
};
