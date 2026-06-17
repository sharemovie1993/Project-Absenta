import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Server, Activity, Cpu, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { 
  InfraCard, getNodeIcon, fmtAge, fmtClock 
} from './InfraSharedComponents';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

interface ServerNodeRow {
  nodeId: string;
  status: 'online' | 'offline';
  lastHeartbeat: number | null;
}

interface AutoscalerEventRow {
  ts?: number;
  action?: string;
  workerType?: string;
  nodeId?: string;
  from?: number;
  to?: number;
  queued?: number;
  raw?: string;
}

interface InfraServerPanelProps {
  nodesData: ServerNodeRow[];
  autoscalerEvents: AutoscalerEventRow[];
  isLoadingNodes: boolean;
  isLoadingEvents: boolean;
  runningWorkers: number;
  totalWorkers: number;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const InfraServerPanel: React.FC<InfraServerPanelProps> = React.memo(({
  nodesData,
  autoscalerEvents,
  isLoadingNodes,
  isLoadingEvents,
  runningWorkers,
  totalWorkers
}) => {
  // 1. Memoisasi Kolom Server Nodes
  const nodeColumns = useMemo(() => [
    {
      key: 'nodeId',
      label: 'Identitas Server',
      render: (_: unknown, row: ServerNodeRow) => {
        const IconComponent = getNodeIcon(row.nodeId);
        return (
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{row.nodeId}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Kondisi Server',
      render: (val: string) => {
        const variant = val === 'online' ? 'success' : 'destructive';
        const label = val === 'online' ? 'Aktif (Online)' : 'Mati (Offline)';
        return <Badge variant={variant as any} className="text-[10px] font-bold px-2 py-0.5">{label}</Badge>;
      },
    },
    {
      key: 'lastHeartbeat',
      label: 'Heartbeat Terakhir',
      render: (_: unknown, row: ServerNodeRow) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {fmtAge(row.lastHeartbeat)}
        </span>
      ),
    },
  ], [fmtAge]);

  // Hitung persentase efisiensi klaster
  const efficiencyPct = Math.round((runningWorkers / Math.max(1, totalWorkers)) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabel Distribusi Server */}
        <div className="lg:col-span-2">
          <InfraCard
            title="Distribusi Server (Cluster Nodes)"
            subtitle="Kesehatan fisik masing-masing server node virtual yang terdaftar dalam klaster backend platform."
            icon={<Server className="text-indigo-500 w-5 h-5 shrink-0" />}
          >
            <CardContent className="p-0">
              <Table
                columns={nodeColumns}
                data={nodesData}
                loading={isLoadingNodes}
                emptyMessage="Tidak ada server node terdaftar saat ini."
              />
            </CardContent>
          </InfraCard>
        </div>

        {/* Widget Ringkasan Kinerja (Global Pulse) */}
        <div>
          <Card className="rounded-xl border border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 relative overflow-hidden h-full flex flex-col justify-between">
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Activity size={180} />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
                  <Activity size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Global Pulse</div>
                  <div className="text-lg font-bold">Infrastruktur Sehat</div>
                </div>
              </div>
              
              <p className="text-xs text-white/80 leading-relaxed mb-6 font-medium">
                Sistem orkestrasi Absenta.id mendistribusikan beban presensi, billing, dan notifikasi secara otomatis di seluruh node klaster. 
                Jika terdeteksi lonjakan antrean tugas, Autoscaler akan meningkatkan instans worker secara real-time.
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                <span>Efisiensi Pemrosesan</span>
                <span className="font-mono text-sm">{efficiencyPct}%</span>
              </div>
              <Progress value={efficiencyPct} className="bg-white/20 h-2.5 rounded-full" />
              <div className="flex items-center gap-1 text-[10px] text-white/60 font-semibold mt-1">
                <CheckCircle2 size={12} className="shrink-0" /> Seluruh node melayani koneksi dengan prima
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Grid Log Autoscaler Terakhir */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu size={16} className="text-indigo-500" /> Log Aktivitas Autoscaler Terakhir
        </h3>
        
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : autoscalerEvents.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-400 text-xs font-medium">
            Tidak ada riwayat log penyesuaian instans autoscaler dalam 24 jam terakhir.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoscalerEvents.slice(0, 6).map((e, idx) => {
              const ts = e.ts || 0;
              const node = e.nodeId || '-';
              const wt = e.workerType || '-';
              const isScale = e.action === 'scale';
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  key={`${ts}_${idx}`} 
                  className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow"
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isScale ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}>
                    {isScale ? <Cpu size={16} /> : <Info size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {wt} {e.to != null ? `Scale → ${e.to} Instans` : e.action}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mt-1.5 flex items-center gap-1.5">
                      <span>{fmtClock(ts)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{node}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

InfraServerPanel.displayName = 'InfraServerPanel';
export default InfraServerPanel;
