import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { 
  Play, RotateCw, AlertTriangle, Clock, Calendar, Search, 
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

import { 
  InfraCard, HealthBadge, StatusPill, fmtDuration, fmtAge
} from './InfraSharedComponents';
import type { JobHealth } from './InfraSharedComponents';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

export interface JobRow {
  name: string;
  type: 'CRON' | 'QUEUE';
  concurrency: number;
  schedule: string | null;
  lastRun: string | null;
  lastDurationMs: number | null | undefined;
  isRunning: boolean;
  isStale?: boolean;
  expectedIntervalMs?: number | null;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | null;
  lastError?: string | null;
}

interface InfraJobPanelProps {
  jobsData: JobRow[];
  isLoading: boolean;
  onRunJob: (name: string) => Promise<void>;
  isPendingAction: boolean;
}

// ─── STUCK DETECTOR UTILITY ───────────────────────────────────────────────────

function getJobHealth(row: JobRow): JobHealth {
  if (row.isRunning) {
    if (row.lastRun) {
      const runningMs = Date.now() - new Date(row.lastRun).getTime();
      if (runningMs > 10 * 60_000) return 'stuck';
    }
    return 'ok';
  }
  if (!row.lastRun) return 'never';
  if (row.isStale) return 'stale';
  return 'ok';
}

// ─── SMART TRIGGER BUTTON ─────────────────────────────────────────────────────

const SmartRunButton: React.FC<{
  jobName: string;
  onRun: (name: string) => Promise<void>;
  disabled: boolean;
}> = ({ jobName, onRun, disabled }) => {
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
      onRun(jobName);
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
        Jalankan?
      </Button>
    );
  }

  return (
    <Button
      size="xs"
      variant="outline"
      className="rounded-lg font-bold text-[10px] tracking-wide flex items-center gap-1.5 h-7 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/30 shadow-sm"
      disabled={disabled}
      onClick={handleClick}
    >
      <Play className="h-3 w-3 shrink-0" />
      Jalankan Sekarang
    </Button>
  );
};

// ─── STATS SUMMARY SUB-COMPONENT ──────────────────────────────────────────────

const JobStats: React.FC<{ jobs: JobRow[] }> = ({ jobs }) => {
  const running = jobs.filter((j) => j.isRunning && getJobHealth(j) !== 'stuck').length;
  const stuck = jobs.filter((j) => getJobHealth(j) === 'stuck').length;
  const never = jobs.filter((j) => getJobHealth(j) === 'never').length;
  const stale = jobs.filter((j) => getJobHealth(j) === 'stale').length;
  const ok = jobs.length - running - stuck - never - stale;
  const hasAlert = stuck > 0 || never > 0 || stale > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Ringkasan:</span>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {ok} Normal
      </span>
      {running > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          <RotateCw className="h-3 w-3 animate-spin" />
          {running} Berjalan
        </span>
      )}
      {stale > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          {stale} Terlambat
        </span>
      )}
      {never > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
          <AlertCircle className="h-3 w-3" />
          {never} Belum Pernah Jalan
        </span>
      )}
      {stuck > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          {stuck} Macet!
        </span>
      )}
      {hasAlert && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-2.5 w-2.5" />
          Perlu Perhatian
        </span>
      )}
    </div>
  );
};

// ─── TRANSLATION METADATA ─────────────────────────────────────────────────────

const JOB_METADATA: Record<string, { humanName: string; category: string; color: string }> = {
  alertEngine: {
    humanName: 'Mesin Deteksi Peringatan',
    category: 'Pemeliharaan & Monitor',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  },
  failedJobCleanup: {
    humanName: 'Pembersihan Tugas Gagal',
    category: 'Pemeliharaan & Monitor',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  },
  logRetention: {
    humanName: 'Manajemen Masa Retensi Log',
    category: 'Pemeliharaan & Monitor',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  },
  metricAggregation: {
    humanName: 'Akumulasi Metrik Performa',
    category: 'Pemeliharaan & Monitor',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  },
  tenantBackupPurge: {
    humanName: 'Pembersihan Cadangan Usang',
    category: 'Pemeliharaan & Monitor',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  },
  tenantRisk: {
    humanName: 'Analisis Tingkat Risiko Tenant',
    category: 'Analitis & Risiko',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30'
  },
  revenueAggregation: {
    humanName: 'Konsolidasi Pendapatan Platform',
    category: 'Analitis & Risiko',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30'
  },
  revenueForecast: {
    humanName: 'Prediksi Pendapatan & Proyeksi',
    category: 'Analitis & Risiko',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30'
  },
  cohort: {
    humanName: 'Analisis Kohort Retensi Pengguna',
    category: 'Analitis & Risiko',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30'
  },
  upgradeIntelligence: {
    humanName: 'Analisis Intelijen Upgrades',
    category: 'Analitis & Risiko',
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30'
  },
  recurringBilling: {
    humanName: 'Eksekusi Siklus Tagihan Berkala',
    category: 'Billing & Langganan',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
  },
  subscriptionAutoRenew: {
    humanName: 'Pembaruan Otomatis Langganan',
    category: 'Billing & Langganan',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
  },
  billingHealthScan: {
    humanName: 'Pemindaian Kesehatan Tagihan',
    category: 'Billing & Langganan',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
  },
  paymentReconciliation: {
    humanName: 'Rekonsiliasi Status Pembayaran',
    category: 'Billing & Langganan',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
  },
  tenantRetention: {
    humanName: 'Pelacakan Loyalitas & Churn',
    category: 'Billing & Langganan',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
  },
  'trial-reminder-job': {
    humanName: 'Pengingat Masa Percobaan Selesai',
    category: 'Uji Coba & Notifikasi',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30'
  },
  trialExpiration: {
    humanName: 'Pemeriksaan Kedaluwarsa Percobaan',
    category: 'Uji Coba & Notifikasi',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30'
  },
  trialNotification: {
    humanName: 'Kirim Notifikasi Masa Uji Coba',
    category: 'Uji Coba & Notifikasi',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30'
  },
  attendanceAutoClose: {
    humanName: 'Penutupan Otomatis Sesi Absen',
    category: 'Absensi & Kehadiran',
    color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/30'
  },
  attendanceAutoSession: {
    humanName: 'Pembuatan Otomatis Sesi Absen',
    category: 'Absensi & Kehadiran',
    color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/30'
  },
  attendanceDigest: {
    humanName: 'Rekap & Digest Kehadiran Tenant',
    category: 'Absensi & Kehadiran',
    color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/30'
  }
};

const getJobMeta = (name: string) => {
  return JOB_METADATA[name] || {
    humanName: name.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
    category: 'Sistem Lainnya',
    color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  };
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const InfraJobPanel: React.FC<InfraJobPanelProps> = React.memo(({
  jobsData,
  isLoading,
  onRunJob,
  isPendingAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 1. Memproses data job untuk menyertakan properti ter-denormalisasi agar mendukung client-side sorting
  const processedJobsData = useMemo(() => {
    return jobsData.map((j) => {
      const health = getJobHealth(j);
      const meta = getJobMeta(j.name);
      return {
        ...j,
        humanName: meta.humanName,
        category: meta.category,
        healthOrder: j.isRunning 
          ? '0_running' 
          : health === 'stuck' 
            ? '1_stuck' 
            : health === 'stale' 
              ? '2_stale' 
              : health === 'never' 
                ? '3_never' 
                : '4_ok'
      };
    });
  }, [jobsData]);

  // 2. Menyaring data job berdasarkan search term, kategori, dan status
  const filteredJobsData = useMemo(() => {
    return processedJobsData.filter((j) => {
      const matchesSearch = 
        j.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        j.humanName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === '' || j.category === filterCategory;
      
      const health = getJobHealth(j);
      let matchesStatus = true;
      if (filterStatus !== '') {
        if (filterStatus === 'running') {
          matchesStatus = j.isRunning && health !== 'stuck';
        } else if (filterStatus === 'failed') {
          matchesStatus = j.lastStatus === 'FAILED';
        } else {
          matchesStatus = health === filterStatus;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [processedJobsData, searchTerm, filterCategory, filterStatus]);

  // 3. Memoisasi Kolom Tabel (Performance Critical!)
  const jobColumns = useMemo(() => [
    {
      key: 'humanName',
      label: 'Nama Tugas (Job Name)',
      sortable: true,
      render: (val: string, row: any) => {
        const health = getJobHealth(row);
        const isAlert = health === 'stuck' || health === 'never' || health === 'stale';
        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-1.5">
              {isAlert && (
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${
                  health === 'stuck' ? 'text-red-500 animate-bounce' :
                  health === 'never' ? 'text-orange-500' : 'text-yellow-500'
                }`} />
              )}
              <span className={`text-xs font-bold tracking-wide ${
                isAlert
                  ? health === 'stuck' ? 'text-red-700 dark:text-red-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-950 dark:text-slate-100'
              }`}>
                {val}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                ({row.name})
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Kategori',
      sortable: true,
      render: (val: string, row: any) => {
        const meta = getJobMeta(row.name);
        return (
          <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border ${meta.color} shrink-0 tracking-wider uppercase font-mono`}>
            {val}
          </span>
        );
      }
    },
    {
      key: 'lastRun',
      label: 'Jadwal & Eksekusi Terakhir',
      sortable: true,
      render: (val: string | null, row: any) => {
        const scheduleVal = row.schedule;
        const ts = val ? new Date(val).getTime() : null;
        const isStale = row.isStale;

        return (
          <div className="flex flex-col gap-1 py-0.5 font-sans">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {scheduleVal || 'Manual / Triggered'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
              {!val ? (
                <span className="text-[10px] text-orange-500 dark:text-orange-400 font-mono font-bold">
                  Belum pernah jalan
                </span>
              ) : (
                <span className={`text-[10px] font-mono ${
                  isStale
                    ? 'text-yellow-700 dark:text-yellow-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  Eksekusi: {fmtAge(ts)} {isStale && ' ⚠'}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'lastDurationMs',
      label: 'Durasi Terakhir',
      sortable: true,
      render: (val: number | null | undefined) => {
        const str = fmtDuration(val);
        if (!str) return <span className="text-xs text-slate-400 font-mono">-</span>;
        const n = Number(val);
        const isLong = n > 5 * 60_000;
        return (
          <div className={`flex items-center gap-1 font-mono text-xs ${
            isLong ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <Clock className="h-3 w-3 shrink-0" />
            <span>{str}</span>
            {isLong && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
          </div>
        );
      }
    },
    {
      key: 'healthOrder',
      label: 'Status Proses',
      sortable: true,
      render: (_: any, row: any) => {
        const health = getJobHealth(row);
        return (
          <div className="flex flex-col gap-1 py-0.5 font-sans">
            <HealthBadge health={health} isRunning={row.isRunning} />
            <StatusPill status={row.lastStatus} error={row.lastError} />
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi Manual',
      render: (_: any, row: any) => (
        <SmartRunButton
          jobName={row.name}
          onRun={onRunJob}
          disabled={row.isRunning || isPendingAction}
        />
      )
    }
  ], [onRunJob, isPendingAction, fmtAge]);

  return (
    <InfraCard
      title="Daftar Tugas Berkala (Scheduled Background Jobs)"
      subtitle="Pantau status eksekusi tugas otomatis: jadwal cron, durasi pemrosesan, serta pemicu manual untuk tugas latar belakang."
      headerRight={!isLoading && jobsData.length > 0 && <JobStats jobs={jobsData} />}
    >
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 items-center justify-between">
        <div className="w-full md:flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari tugas (Nama atau kode job)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2.5 w-full md:w-auto items-center">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm w-full sm:min-w-[170px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <option value="">Semua Kategori</option>
              <option value="Pemeliharaan & Monitor">Pemeliharaan & Monitor</option>
              <option value="Analitis & Risiko">Analitis & Risiko</option>
              <option value="Billing & Langganan">Billing & Langganan</option>
              <option value="Uji Coba & Notifikasi">Uji Coba & Notifikasi</option>
              <option value="Absensi & Kehadiran">Absensi & Kehadiran</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm w-full sm:min-w-[160px] appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <option value="">Semua Status</option>
              <option value="running">Sedang Berjalan</option>
              <option value="failed">Eksekusi Terakhir Gagal</option>
              <option value="stuck">Macet (Stuck)</option>
              <option value="stale">Terlambat / Stale</option>
              <option value="never">Belum Pernah Jalan</option>
              <option value="ok">Siap (Idle)</option>
            </select>
          </div>

          {(searchTerm || filterCategory || filterStatus) && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterStatus('');
              }}
              className="text-rose-500 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-xs h-10 px-3.5 rounded-xl border border-rose-100 dark:border-rose-950/30 shadow-sm w-full sm:w-auto"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        <Table
          columns={jobColumns}
          data={filteredJobsData}
          loading={isLoading}
          emptyMessage="Tidak ada tugas berkala terdaftar di sistem."
          rowClassName={(row: any) => {
            const health = getJobHealth(row as JobRow);
            if (health === 'stuck') return 'bg-red-50/60 dark:bg-red-950/20 !border-l-4 border-l-red-400';
            if (health === 'never') return 'bg-orange-50/40 dark:bg-orange-950/10 !border-l-4 border-l-orange-400';
            if (health === 'stale') return 'bg-yellow-50/40 dark:bg-yellow-950/10 !border-l-4 border-l-yellow-400';
            return '';
          }}
        />
      </CardContent>
    </InfraCard>
  );
});

InfraJobPanel.displayName = 'InfraJobPanel';
export default InfraJobPanel;
