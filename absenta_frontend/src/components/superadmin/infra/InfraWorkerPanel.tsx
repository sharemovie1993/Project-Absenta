import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RotateCw, AlertTriangle, Play, HelpCircle } from 'lucide-react';

import { 
  InfraCard, getNodeIcon, getWorkerIcon, fmtAge 
} from './InfraSharedComponents';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

interface WorkerRow {
  nodeId: string;
  workerType: string;
  instances?: number;
  uiStatus: 'running' | 'starting' | 'stalled' | 'offline';
  lastHeartbeat: number | null;
}

interface InfraWorkerPanelProps {
  workersData: WorkerRow[];
  isLoading: boolean;
  onRestartWorker: (params: { workerType: string; nodeId: string }) => Promise<void>;
  isPendingAction: boolean;
}

// ─── SMART RESTART BUTTON ─────────────────────────────────────────────────────

const SmartRestartButton: React.FC<{
  nodeId: string;
  workerType: string;
  onRestart: (params: { workerType: string; nodeId: string }) => Promise<void>;
  disabled: boolean;
}> = ({ nodeId, workerType, onRestart, disabled }) => {
  const [stage, setStage] = useState<'idle' | 'confirming'>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stage === 'idle') {
      setStage('confirming');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStage('idle');
      }, 4000);
    } else {
      setStage('idle');
      if (timerRef.current) clearTimeout(timerRef.current);
      onRestart({ workerType, nodeId });
    }
  };

  if (stage === 'confirming') {
    return (
      <Button
        size="xs"
        variant="warning"
        className="rounded-lg font-bold text-[10px] tracking-wide animate-pulse flex items-center gap-1.5 h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm"
        disabled={disabled}
        onClick={handleClick}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Yakin?
      </Button>
    );
  }

  return (
    <Button
      size="xs"
      variant="ghost"
      className="rounded-lg font-bold text-[10px] tracking-wide flex items-center gap-1.5 h-7 px-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-100 dark:border-slate-800 shadow-sm"
      disabled={disabled}
      onClick={handleClick}
    >
      <RotateCw className="h-3 w-3 shrink-0" />
      Restart
    </Button>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const InfraWorkerPanel: React.FC<InfraWorkerPanelProps> = React.memo(({
  workersData,
  isLoading,
  onRestartWorker,
  isPendingAction
}) => {
  // 1. Memoisasi Kolom Tabel Worker
  const workerColumns = useMemo(() => [
    {
      key: 'nodeId',
      label: 'Server/Node',
      render: (_: any, row: WorkerRow) => {
        const IconComponent = getNodeIcon(row.nodeId);
        return (
          <div className="flex items-center gap-2">
            <IconComponent className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.nodeId}</span>
          </div>
        );
      }
    },
    {
      key: 'workerType',
      label: 'Tipe Worker',
      render: (_: any, row: WorkerRow) => {
        const IconComponent = getWorkerIcon(row.workerType);
        return (
          <div className="flex items-center gap-2 font-semibold">
            <IconComponent className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-slate-800 dark:text-slate-200">{row.workerType}</span>
          </div>
        );
      }
    },
    { 
      key: 'instances', 
      label: 'Instans Aktif',
      render: (val: number) => (
        <span className="font-bold font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {val ?? 1}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status Proses',
      render: (_: any, row: WorkerRow) => {
        const s = row.uiStatus;
        const statusMap = {
          running: { label: 'Aktif', variant: 'success', icon: Play },
          starting: { label: 'Inisialisasi...', variant: 'warning', icon: RotateCw },
          stalled: { label: 'Tersendat', variant: 'warning', icon: AlertTriangle },
          offline: { label: 'Mati', variant: 'destructive', icon: HelpCircle }
        };
        const item = statusMap[s] || { label: s, variant: 'secondary', icon: HelpCircle };
        return (
          <Badge variant={item.variant as any} className="capitalize text-[10px] font-bold tracking-wide flex items-center gap-1 w-max px-2 py-0.5">
            {React.createElement(item.icon, { className: "h-2.5 w-2.5 animate-pulse shrink-0" })}
            {item.label}
          </Badge>
        );
      }
    },
    {
      key: 'lastHeartbeat',
      label: 'Detak Jantung Terakhir',
      render: (_: any, row: WorkerRow) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">
          {fmtAge(row.lastHeartbeat)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Kontrol Aksi',
      render: (_: any, row: WorkerRow) => (
        <SmartRestartButton
          nodeId={row.nodeId}
          workerType={row.workerType}
          onRestart={onRestartWorker}
          disabled={isPendingAction}
        />
      )
    }
  ], [onRestartWorker, isPendingAction, fmtAge]);

  return (
    <InfraCard
      title="Daftar Instans Worker Aktif"
      subtitle="Memantau kesehatan operasional dan siklus hidup instans pemroses tugas background secara real-time."
    >
      <CardContent className="p-0">
        <Table 
          columns={workerColumns}
          data={workersData}
          loading={isLoading}
          emptyMessage="Tidak ada worker aktif yang sesuai dengan kriteria filter."
        />
      </CardContent>
    </InfraCard>
  );
});

InfraWorkerPanel.displayName = 'InfraWorkerPanel';
export default InfraWorkerPanel;
