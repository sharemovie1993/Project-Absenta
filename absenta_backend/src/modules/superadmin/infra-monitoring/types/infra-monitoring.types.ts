export type InfraJobSummary = {
  name: string;
  type: 'CRON' | 'QUEUE';
  concurrency: number;
  schedule: string | null;
  lastRun: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
  /** true jika belum pernah jalan atau tidak jalan > staleness threshold */
  isStale: boolean;
  /** estimasi interval run berikutnya (ms), null jika manual/triggered */
  expectedIntervalMs: number | null;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | null;
  lastError?: string | null;
};

export type InfraQueueSummary = {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  delayed?: number;
  waitingChildren?: number;
  paused: boolean;
  status?: 'OK' | 'WARNING' | 'CRITICAL';
};

export type InfraHealthSummary = {
  redis: {
    status: 'UP' | 'DOWN';
    latency: number | null;
  };
  db: {
    status: 'UP' | 'DOWN';
    latency: number | null;
  };
  workers: {
    email: {
      status: 'UP' | 'STARTING' | 'STOPPING' | 'STALLED' | 'DOWN';
      active: number;
      waiting: number;
      failed: number;
    };
    recurring: {
      status: 'UP' | 'STARTING' | 'STOPPING' | 'STALLED' | 'DOWN';
      active: number;
      waiting: number;
      failed: number;
    };
  };
};
