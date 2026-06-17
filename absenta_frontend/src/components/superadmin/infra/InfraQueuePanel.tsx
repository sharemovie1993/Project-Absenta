import React, { useMemo } from 'react';
import { CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Zap, Activity } from 'lucide-react';

import { InfraCard } from './InfraSharedComponents';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface QueueLoadRow {
  name: string;
  length: number;
  rate: number | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

interface QueuePressureRow {
  queue: string;
  pressure: number;
}

interface InfraQueuePanelProps {
  queueLoadData: QueueLoadRow[];
  queuePressureData: QueuePressureRow[];
  isLoadingLoad: boolean;
  isLoadingPressure: boolean;
  getWorkerIcon: (workerType: string) => React.ComponentType<any>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const InfraQueuePanel: React.FC<InfraQueuePanelProps> = React.memo(({
  queueLoadData,
  queuePressureData,
  isLoadingLoad,
  isLoadingPressure,
  getWorkerIcon
}) => {
  // 1. Memoisasi Kolom Queue Load
  const queueLoadColumns = useMemo(() => [
    { 
      key: 'name', 
      label: 'Kategori Tugas (Queue)',
      render: (val: string) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{val}</span>
      )
    },
    { 
      key: 'length', 
      label: 'Backlog (Antrean)',
      render: (val: number) => (
        <span className="font-bold font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">
          {val.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      key: 'rate',
      label: 'Laju Proses (Rate)',
      render: (_: unknown, row: QueueLoadRow) => {
        const n = row.rate;
        if (n == null) return <span className="text-slate-400 dark:text-slate-650">-</span>;
        const sign = n > 0 ? '+' : '';
        const color = n > 0 ? 'text-rose-500 font-bold' : n < 0 ? 'text-emerald-500 font-bold' : 'text-slate-550';
        return <span className={`font-mono text-xs ${color}`}>{sign}{Math.round(n)}/detik</span>;
      },
    },
    {
      key: 'status',
      label: 'Status Beban',
      render: (_: unknown, row: QueueLoadRow) => {
        const s = row.status;
        const labelMap = {
          CRITICAL: 'Kritis (Overload)',
          HIGH: 'Padat',
          NORMAL: 'Normal',
          LOW: 'Senggang'
        };
        const variant = s === 'CRITICAL' ? 'destructive' : s === 'HIGH' ? 'warning' : s === 'NORMAL' ? 'success' : 'secondary';
        return <Badge variant={variant as any} className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">{labelMap[s] || s}</Badge>;
      },
    },
  ], []);

  // 2. Memoisasi Kolom Queue Pressure
  const queuePressureColumns = useMemo(() => [
    {
      key: 'queue',
      label: 'Jenis Antrean',
      render: (_: unknown, row: QueuePressureRow) => {
        const name = row.queue.replace(/_queue$/, '');
        return (
          <div className="flex items-center gap-2">
            {React.createElement(getWorkerIcon(name), { className: "h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" })}
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{row.queue}</span>
          </div>
        );
      }
    },
    { 
      key: 'pressure', 
      label: 'Beban Indeks',
      render: (val: number) => <span className="font-bold font-mono text-sm">{Math.round(val)}</span>
    },
    {
      key: 'bar',
      label: 'Visualisasi Beban Kerja',
      render: (_: unknown, row: QueuePressureRow) => {
        const p = typeof row.pressure === 'number' ? row.pressure : 0;
        const pct = Math.min(100, (p / 500) * 100);
        return (
          <div className="w-full max-w-[180px] flex items-center gap-2">
            <Progress value={pct} color={p > 300 ? 'rose' : p > 100 ? 'amber' : 'emerald'} className="h-2 rounded-full w-full bg-slate-100 dark:bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-400 min-w-[28px] text-right">{Math.round(pct)}%</span>
          </div>
        );
      }
    }
  ], [getWorkerIcon]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel Queue Load */}
      <InfraCard
        title="Beban Antrean (Queue Load)"
        subtitle="Mengukur jumlah tumpukan tugas background job yang masuk pada setiap modul sistem."
        icon={<Zap className="text-blue-500 w-5 h-5" />}
        headerGradientFrom="from-blue-50/50"
      >
        <CardContent className="p-0">
          <Table
            columns={queueLoadColumns}
            data={queueLoadData}
            loading={isLoadingLoad}
            emptyMessage="Tidak ada antrean tugas aktif saat ini."
          />
        </CardContent>
      </InfraCard>

      {/* Panel Queue Pressure */}
      <InfraCard
        title="Tekanan Antrean (Queue Pressure)"
        subtitle="Estimasi rasio beban kerja antrean dibandingkan kapasitas instans worker aktif."
        icon={<Activity className="text-amber-500 w-5 h-5" />}
        headerGradientFrom="from-amber-50/50"
        headerGradientTo="to-orange-50/10 dark:to-slate-900/10"
      >
        <CardContent className="p-0">
          <Table
            columns={queuePressureColumns}
            data={queuePressureData}
            loading={isLoadingPressure}
            emptyMessage="Seluruh worker bekerja dengan sangat santai, tidak ada tekanan."
          />
        </CardContent>
      </InfraCard>
    </div>
  );
});

InfraQueuePanel.displayName = 'InfraQueuePanel';
