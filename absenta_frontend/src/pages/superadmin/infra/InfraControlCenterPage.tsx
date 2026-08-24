const infraSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional()
});
import { z } from 'zod';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestWithFallback } from '@/api/apiUtils';
import { useSocket } from '@/hooks/useSocket';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { 
  Server, Activity, Zap, Network, Eye, EyeOff, CalendarCheck
} from 'lucide-react';
import { SectionCard } from '@/components/ui';

// Impor sub-komponen modular pendukung kita secara lazy untuk optimasi load bundle (Code Splitting)
const InfraQueuePanel = React.lazy(() => 
  import('@/components/superadmin/infra/InfraQueuePanel').then(m => ({ default: m.InfraQueuePanel }))
);
const InfraWorkerPanel = React.lazy(() => 
  import('@/components/superadmin/infra/InfraWorkerPanel').then(m => ({ default: m.InfraWorkerPanel }))
);
const InfraServerPanel = React.lazy(() => 
  import('@/components/superadmin/infra/InfraServerPanel').then(m => ({ default: m.InfraServerPanel }))
);
const InfraJobPanel = React.lazy(() => 
  import('@/components/superadmin/infra/InfraJobPanel').then(m => ({ default: m.InfraJobPanel }))
);

// Impor error boundary untuk proteksi cascading failure per-tab
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Impor shared helper utilities & skeleton loader terpusat
import { 
  getWorkerIcon, getServerTimeOffset, fmtAge, fmtClock,
  InfraPanelLoader, throttle, HardeningInspector
} from '@/components/superadmin/infra/InfraSharedComponents';

// Impor centralized hardening compliance registry
import { getHardeningConfig } from '@/config/hardeningRegistry';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

type ClusterNodeRow = {
  nodeId: string;
  lastHeartbeat: number | null;
  status: 'online' | 'offline';
};

type ClusterQueueRow = {
  name: string;
  length: number;
};

type ClusterWorkerRow = {
  workerType: string;
  nodeId: string;
  status: 'running' | 'offline';
  lastHeartbeat: number | null;
  instances?: number;
};

type ClusterJobRow = {
  name: string;
  type: 'CRON' | 'QUEUE';
  concurrency: number;
  schedule: string | null;
  lastRun: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
};

type WorkerUiStatus = 'running' | 'starting' | 'stalled' | 'offline';

type QueueLoadStatus = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

type QueuePressureRow = {
  queue: string;
  waiting: number;
  workers: number;
  pressure: number;
  status: 'NORMAL' | 'BUSY' | 'HIGH' | 'CRITICAL';
};

type AutoscalerEventRow = {
  ts?: number;
  action?: string;
  workerType?: string;
  nodeId?: string;
  from?: number;
  to?: number;
  queued?: number;
  raw?: string;
};

// ─── HTTP FETCHERS ────────────────────────────────────────────────────────────

const fetchClusterNodes = async (): Promise<ClusterNodeRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/cluster/nodes', { unwrapData: true });
  return res as ClusterNodeRow[];
};

const fetchClusterQueues = async (): Promise<ClusterQueueRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/cluster/queues', { unwrapData: true });
  return res as ClusterQueueRow[];
};

const fetchClusterWorkers = async (): Promise<ClusterWorkerRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/cluster/workers', { unwrapData: true });
  return res as ClusterWorkerRow[];
};

const fetchClusterJobs = async (): Promise<ClusterJobRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/jobs', { unwrapData: true });
  return res as ClusterJobRow[];
};

const fetchAutoscalerEvents = async (): Promise<AutoscalerEventRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/cluster/autoscaler-events', { unwrapData: true });
  return res as AutoscalerEventRow[];
};

const fetchQueuePressure = async (): Promise<QueuePressureRow[]> => {
  const res = await requestWithFallback('get', '/admin/infra/queue-pressure', { unwrapData: true });
  return res as QueuePressureRow[];
};

// ─── STATEFUL WIDGET ──────────────────────────────────────────────────────────

const InfraControlCenterContent: React.FC = () => {
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe, emit, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<string>('queues');
  const [workerSearch, setWorkerSearch] = useState<string>('');
  const [hideOfflineWorkers, setHideOfflineWorkers] = useState<boolean>(true);

  // Ambil parameter audit sertifikasi Ultra Hardening secara dinamis & cerdas dari registry terpusat
  const hardeningConfig = useMemo(() => getHardeningConfig('infra_control_center'), []);

  // Gunakan interval 5 detik hanya jika WebSocket tidak terhubung (fallback)
  const pollInterval = isConnected ? false : 5000;

  // Stabilitas referensi queryClient untuk menghindari stale closures dalam throttle callback
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  // Throttled update handler untuk mencegah UI freeze saat lonjakan pembaruan WebSocket ekstrim (1.5 detik limit)
  const throttledUpdateRef = useRef(
    throttle((payload: Record<string, any>) => {
      if (!payload) return;

      // Update server time offset dari paket WebSocket untuk mengatasi drift jam lokal
      if (payload.timestamp && typeof window !== 'undefined') {
        (window as Record<string, unknown>).__SERVER_TIME_OFFSET__ = Date.now() - Number(payload.timestamp);
      }

      // Update cache React Query secara langsung untuk performa instan dan DRY
      const client = queryClientRef.current;
      if (payload.nodes) client.setQueryData(['infra-cluster-nodes'], payload.nodes);
      if (payload.queues) client.setQueryData(['infra-cluster-queues'], payload.queues);
      if (payload.workers) client.setQueryData(['infra-cluster-workers'], payload.workers);
      if (payload.pressure) client.setQueryData(['infra-queue-pressure'], payload.pressure);
      if (payload.events) client.setQueryData(['infra-autoscaler-events'], payload.events);
      if (payload.jobs) client.setQueryData(['infra-cluster-jobs'], payload.jobs);
    }, 1500)
  );

  // Queries React Query terpadu dengan polling interval dinamis
  const clusterNodesQuery = useQuery<ClusterNodeRow[]>({
    queryKey: ['infra-cluster-nodes'],
    queryFn: fetchClusterNodes,
    refetchInterval: pollInterval,
  });

  const clusterQueuesQuery = useQuery<ClusterQueueRow[]>({
    queryKey: ['infra-cluster-queues'],
    queryFn: fetchClusterQueues,
    refetchInterval: pollInterval,
  });

  const clusterWorkersQuery = useQuery<ClusterWorkerRow[]>({
    queryKey: ['infra-cluster-workers'],
    queryFn: fetchClusterWorkers,
    refetchInterval: pollInterval,
  });

  const clusterJobsQuery = useQuery<ClusterJobRow[]>({
    queryKey: ['infra-cluster-jobs'],
    queryFn: fetchClusterJobs,
    refetchInterval: isConnected ? false : 10000,
  });

  const autoscalerEventsQuery = useQuery<AutoscalerEventRow[]>({
    queryKey: ['infra-autoscaler-events'],
    queryFn: fetchAutoscalerEvents,
    refetchInterval: pollInterval,
  });

  const queuePressureQuery = useQuery<QueuePressureRow[]>({
    queryKey: ['infra-queue-pressure'],
    queryFn: fetchQueuePressure,
    refetchInterval: pollInterval,
  });

  // Hubungkan ke WebSocket untuk mendengarkan perubahan secara real-time
  useEffect(() => {
    if (!isConnected) return;

    // Registrasi langganan ke room infra monitoring
    emit('infra_monitoring_subscribe', {});

    const handleUpdate = (payload: Record<string, any>) => {
      throttledUpdateRef.current(payload);
    };

    subscribe('infra_metrics_update', handleUpdate);

    return () => {
      emit('infra_monitoring_unsubscribe', {});
      unsubscribe('infra_metrics_update', handleUpdate);
    };
  }, [isConnected, subscribe, unsubscribe, emit]);

  // Pelacakan Laju Antrean Dinamis (Queue Rates)
  const [queueRates, setQueueRates] = useState<Record<string, number | null>>({});
  const lastQueueSnapshotRef = useRef<{ ts: number; lengths: Record<string, number> } | null>(null);

  useEffect(() => {
    const rows = clusterQueuesQuery.data || [];
    const now = Date.now();
    const current: Record<string, number> = {};
    for (const r of rows) {
      current[r.name] = typeof r.length === 'number' ? r.length : 0;
    }
    const prev = lastQueueSnapshotRef.current;
    if (prev && prev.ts > 0) {
      const dtSec = Math.max(1, (now - prev.ts) / 1000);
      const nextRates: Record<string, number | null> = {};
      for (const name of Object.keys(current)) {
        const prevLen = prev.lengths[name];
        if (typeof prevLen === 'number') nextRates[name] = (current[name] - prevLen) / dtSec;
        else nextRates[name] = null;
      }
      setQueueRates((old) => ({ ...old, ...nextRates }));
    }
    lastQueueSnapshotRef.current = { ts: now, lengths: current };
  }, [clusterQueuesQuery.data]);

  // UI Status Resolver untuk Worker
  const toWorkerUiStatus = useCallback((w: ClusterWorkerRow): WorkerUiStatus => {
    const hb = typeof w.lastHeartbeat === 'number' ? w.lastHeartbeat : null;
    if (!hb) return 'offline';
    const offset = getServerTimeOffset();
    const ageMs = (Date.now() - offset) - hb;
    if (ageMs < 20000) return 'running';
    if (ageMs < 30000) return 'starting';
    if (ageMs < 60000) return 'stalled';
    return 'offline';
  }, []);

  // ─── MUTATIONS & HANDLERS (Memoized with useCallback) ──────────────────────────

  const workerActionMutation = useMutation({
    mutationFn: async (params: { action: 'start' | 'stop' | 'restart'; workerType: string; nodeId: string }) => {
      await requestWithFallback('post', `/admin/infra/workers/action`, { data: params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infra-cluster-workers'] });
      queryClient.invalidateQueries({ queryKey: ['infra-cluster-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['infra-autoscaler-events'] });
      queryClient.invalidateQueries({ queryKey: ['infra-cluster-queues'] });
    },
  });

  const handleRestartWorker = useCallback(async (params: { workerType: string; nodeId: string }) => {
    await workerActionMutation.mutateAsync({ action: 'restart', ...params });
  }, [workerActionMutation]);

  const runJobMutation = useMutation({
    mutationFn: async (name: string) => {
      await requestWithFallback('post', `/admin/infra/jobs/${name}/run`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infra-cluster-jobs'] });
    },
  });

  const handleRunJob = useCallback(async (name: string) => {
    await runJobMutation.mutateAsync(name);
  }, [runJobMutation]);

  // Pemetaan ringkasan kinerja dan stats utama (Memoized)
  const summary = useMemo(() => {
    const nodes = clusterNodesQuery.data || [];
    const queues = clusterQueuesQuery.data || [];
    const workers = (clusterWorkersQuery.data || [])?.map(w => ({ ...w, uiStatus: toWorkerUiStatus(w) }));
    
    const totalNodes = nodes.length;
    const onlineNodes = nodes.filter((n) => n.status === 'online').length;
    const totalQueues = queues.length;
    const backlog = queues.reduce((acc, q) => acc + (typeof q.length === 'number' ? q.length : 0), 0);
    
    const totalWorkers = workers.reduce((acc: number, w: ClusterWorkerRow) => {
      const inst = typeof w.instances === 'number' && Number.isFinite(w.instances) ? Math.max(0, Math.floor(w.instances)) : 1;
      return acc + Math.max(1, inst);
    }, 0);
    
    const runningWorkers = workers.reduce((acc: number, w: ClusterWorkerRow & { uiStatus: WorkerUiStatus }) => {
      if (w.uiStatus !== 'running') return acc;
      const inst = typeof w.instances === 'number' && Number.isFinite(w.instances) ? Math.max(0, Math.floor(w.instances)) : 1;
      return acc + Math.max(1, inst);
    }, 0);

    return { 
      totalNodes, onlineNodes, totalQueues, backlog, 
      totalWorkers, runningWorkers
    };
  }, [clusterNodesQuery.data, clusterQueuesQuery.data, clusterWorkersQuery.data, toWorkerUiStatus]);

  // Statistik premium terstandardisasi untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    return [
      {
        title: "Server / Nodes Aktif",
        value: `${summary.onlineNodes}/${summary.totalNodes}`,
        icon: <Server className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Node server online dalam klaster"
      },
      {
        title: "Kapasitas Worker",
        value: `${summary.runningWorkers}/${summary.totalWorkers}`,
        icon: <Activity className="h-4 w-4 text-white" />,
        gradient: "from-indigo-500 to-violet-600",
        subtitle: "Instans worker aktif memproses tugas"
      },
      {
        title: "Backlog Antrean",
        value: summary.backlog.toLocaleString('id-ID'),
        icon: <Zap className="h-4 w-4 text-white" />,
        gradient: summary.backlog > 500 ? "from-rose-500 to-pink-600" : "from-emerald-500 to-teal-600",
        subtitle: "Tugas mengantre dalam background"
      },
      {
        title: "Total Jenis Antrean",
        value: summary.totalQueues,
        icon: <Network className="h-4 w-4 text-white" />,
        gradient: "from-purple-500 to-fuchsia-600",
        subtitle: "Kategori antrean aktif terdaftar"
      }
    ];
  }, [summary]);

  // Data Queue Load olahan (Memoized)
  const queueLoadDataList = useMemo(() => {
    const list = clusterQueuesQuery.data || [];
    return list?.map(r => ({
      name: r.name,
      length: r.length,
      rate: queueRates[r.name] ?? null,
      status: (r.length > 1000 ? 'CRITICAL' : r.length > 200 ? 'HIGH' : r.length >= 50 ? 'NORMAL' : 'LOW') as QueueLoadStatus
    }));
  }, [clusterQueuesQuery.data, queueRates]);

  // Data Queue Pressure olahan (Memoized)
  const queuePressureList = useMemo(() => {
    const list = queuePressureQuery.data || [];
    return list?.map(r => ({
      queue: r.queue,
      pressure: r.pressure
    }));
  }, [queuePressureQuery.data]);

  // Data Worker terfilter (Memoized)
  const filteredWorkersList = useMemo(() => {
    const rawList = clusterWorkersQuery.data || [];
    return rawList
      ?.map(w => ({ ...w, uiStatus: toWorkerUiStatus(w) }))
      .filter(w => !hideOfflineWorkers || w.uiStatus !== 'offline')
      .filter(w => !workerSearch || `${w.nodeId} ${w.workerType}`.toLowerCase().includes(workerSearch.toLowerCase()));
  }, [clusterWorkersQuery.data, hideOfflineWorkers, workerSearch, toWorkerUiStatus]);

  // Server nodes list (Memoized)
  const serverNodesList = useMemo(() => {
    return clusterNodesQuery.data || [];
  }, [clusterNodesQuery.data]);

  // Slot Toolbar premium dan kompak (Hanya dirender pada tab 'workers')
  const toolbarSlot = useMemo(() => {
    if (activeTab !== 'workers') return null;
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm w-full">
        <div className="relative flex-grow">
          <Input aria-label="Input konfigurasi infra" 
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            placeholder="Cari worker berdasarkan tipe atau server node..."
            className="w-full h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-10 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl shrink-0 h-10 px-4 font-bold text-xs tracking-wider flex items-center gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950"
          onClick={() => setHideOfflineWorkers((v) => !v)}
        >
          {hideOfflineWorkers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideOfflineWorkers ? 'Lihat Offline' : 'Sembunyikan Offline'}
        </Button>
      </div>
    );
  }, [activeTab, workerSearch, hideOfflineWorkers]);

  const anyLoading = clusterNodesQuery.isLoading && !clusterNodesQuery.data;

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities', path: '/menu/system' },
    { label: 'Pusat Kontrol Infra' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pusat Kontrol Infra',
    description: 'Monitor dan kelola infrastruktur backend, antrean tugas, dan performa worker secara real-time.',
    items: [
      { text: 'Tab "Antrean & Beban" menampilkan tumpukan tugas background yang sedang diproses.' },
      { text: 'Tab "Daftar Worker" memungkinkan Anda memantau kesehatan dan merestart instance worker.' },
      { text: 'Tab "Status Server Node" memberikan informasi tentang kapasitas klaster server fisik/virtual.' },
      { text: 'Gunakan fitur pencarian dan filter untuk menemukan worker spesifik dalam klaster besar.' }
    ]
  }), []);

  return (
    <SuperAdminPageLayout
      hardeningModuleKey="superadmin_infra_control"
      instruction={instruction}
      title="Pusat Kontrol Infrastruktur (Cluster)"
      description="Kelola daur hidup antrean tugas, autoscaling cluster backend, monitoring beban kerja server node, serta performa background job Absenta.id."
      breadcrumbs={breadcrumbs}
      stats={statsList}
      isLoading={anyLoading}
    >
      <div className="space-y-6">
        <HardeningInspector 
          pageName={hardeningConfig.displayName}
          standards={hardeningConfig.standards}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 flex w-max max-w-full overflow-x-auto scrollbar-none">
            <TabsTrigger value="queues" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <Zap size={14} /> Antrean & Beban
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <Activity size={14} /> Daftar Worker
            </TabsTrigger>
            <TabsTrigger value="nodes" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <Server size={14} /> Status Server Node
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2 rounded-xl text-xs font-bold px-4 py-2 uppercase tracking-wider">
              <CalendarCheck size={14} /> Tugas Berkala
            </TabsTrigger>
          </TabsList>

          {/* TAB CONTENT 1: Antrean & Beban */}
          <TabsContent value="queues" className="outline-none">
            <InfraErrorBoundary 
              fallbackTitle="Gagal memuat Antrean & Beban"
              queryKeyToInvalidate={['infra-cluster-queues', 'infra-queue-pressure']}
            >
              <React.Suspense fallback={<InfraPanelLoader />}>
                <SectionCard title="Monitoring Antrean Real-time" icon={Zap} fullWidth>
                  <InfraQueuePanel
                    queueLoadData={queueLoadDataList}
                    queuePressureData={queuePressureList}
                    isLoadingLoad={clusterQueuesQuery.isLoading}
                    isLoadingPressure={queuePressureQuery.isLoading}
                    getWorkerIcon={getWorkerIcon}
                  />
                </SectionCard>
              </React.Suspense>
            </InfraErrorBoundary>
          </TabsContent>

          {/* TAB CONTENT 2: Daftar Worker */}
          <TabsContent value="workers" className="outline-none">
            <InfraErrorBoundary 
              fallbackTitle="Gagal memuat Daftar Worker"
              queryKeyToInvalidate={['infra-cluster-workers']}
            >
              <React.Suspense fallback={<InfraPanelLoader />}>
                <SectionCard 
                  title="Manajemen Cluster Worker" 
                  icon={Activity} 
                  fullWidth
                  actions={toolbarSlot}
                >
                  <InfraWorkerPanel
                    workersData={filteredWorkersList}
                    isLoading={clusterWorkersQuery.isLoading}
                    onRestartWorker={handleRestartWorker}
                    isPendingAction={workerActionMutation.isPending}
                  />
                </SectionCard>
              </React.Suspense>
            </InfraErrorBoundary>
          </TabsContent>

          {/* TAB CONTENT 3: Status Server & Log Autoscaler */}
          <TabsContent value="nodes" className="outline-none">
            <InfraErrorBoundary 
              fallbackTitle="Gagal memuat Status Server Node"
              queryKeyToInvalidate={['infra-cluster-nodes', 'infra-autoscaler-events']}
            >
              <React.Suspense fallback={<InfraPanelLoader />}>
                <div className="space-y-6">
                  <SectionCard title="Status Klaster Server (Nodes)" icon={Server} fullWidth>
                    <InfraServerPanel
                      nodesData={serverNodesList}
                      autoscalerEvents={autoscalerEventsQuery.data || []}
                      isLoadingNodes={clusterNodesQuery.isLoading}
                      isLoadingEvents={autoscalerEventsQuery.isLoading}
                      runningWorkers={summary.runningWorkers}
                      totalWorkers={summary.totalWorkers}
                    />
                  </SectionCard>
                </div>
              </React.Suspense>
            </InfraErrorBoundary>
          </TabsContent>

          {/* TAB CONTENT 4: Tugas Berkala */}
          <TabsContent value="jobs" className="outline-none">
            <InfraErrorBoundary 
              fallbackTitle="Gagal memuat Tugas Berkala"
              queryKeyToInvalidate={['infra-cluster-jobs']}
            >
              <React.Suspense fallback={<InfraPanelLoader />}>
                <SectionCard title="Background Jobs & Scheduler" icon={CalendarCheck} fullWidth>
                  <InfraJobPanel
                    jobsData={clusterJobsQuery.data || []}
                    isLoading={clusterJobsQuery.isLoading}
                    onRunJob={handleRunJob}
                    isPendingAction={runJobMutation.isPending}
                  />
                </SectionCard>
              </React.Suspense>
            </InfraErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminPageLayout>
  );
};

export default function InfraControlCenterPage() {
  return (
    <InfraErrorBoundary fallbackTitle="Pusat Kontrol Infrastruktur Gagal Memuat">
      <InfraControlCenterContent />
    </InfraErrorBoundary>
  );
}
