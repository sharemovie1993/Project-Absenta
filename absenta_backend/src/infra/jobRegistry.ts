import { getRedisConnection } from '../queue/redis';

export type JobType = 'CRON' | 'QUEUE';

export type JobRegistryEntry = {
  name: string;
  type: JobType;
  concurrency: number;
  schedule: string | null;
  lastRun: Date | null;
  lastDurationMs: number | null;
  isRunning: boolean;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | null;
  lastError?: string | null;
};

/**
 * 🛰️ Job Registry (Distributed Version)
 * Menggunakan Redis untuk menyimpan status job agar konsisten di seluruh cluster container.
 * Sangat penting untuk horizontal scaling pada arsitektur SaaS.
 */
class JobRegistry {
  private static instance: JobRegistry | null = null;
  private readonly REDIS_KEY = 'infra:job_registry';

  static getInstance(): JobRegistry {
    if (!JobRegistry.instance) {
      JobRegistry.instance = new JobRegistry();
    }
    return JobRegistry.instance;
  }

  private async getJobsMap(): Promise<Record<string, JobRegistryEntry>> {
    try {
      const redis = getRedisConnection();
      const data = await redis.get(this.REDIS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private async saveJobsMap(jobs: Record<string, JobRegistryEntry>): Promise<void> {
    try {
      const redis = getRedisConnection();
      await redis.set(this.REDIS_KEY, JSON.stringify(jobs), 'EX', 86400 * 7); // Simpan selama 7 hari
    } catch (error) {
      console.error('❌ Failed to save JobRegistry to Redis:', error);
    }
  }

  async registerCronJob(name: string, schedule: string, concurrency = 1): Promise<void> {
    const jobs = await this.getJobsMap();
    jobs[name] = {
      ...(jobs[name] || {}),
      name,
      type: 'CRON',
      concurrency,
      schedule,
      isRunning: jobs[name]?.isRunning || false,
      lastRun: jobs[name]?.lastRun || null,
      lastDurationMs: jobs[name]?.lastDurationMs || null,
      lastStatus: jobs[name]?.lastStatus || null,
      lastError: jobs[name]?.lastError || null,
    };
    await this.saveJobsMap(jobs);
  }

  async registerQueue(name: string, concurrency: number): Promise<void> {
    const jobs = await this.getJobsMap();
    jobs[name] = {
      ...(jobs[name] || {}),
      name,
      type: 'QUEUE',
      concurrency,
      schedule: null,
      isRunning: jobs[name]?.isRunning || false,
      lastRun: jobs[name]?.lastRun || null,
      lastDurationMs: jobs[name]?.lastDurationMs || null,
      lastStatus: jobs[name]?.lastStatus || null,
      lastError: jobs[name]?.lastError || null,
    };
    await this.saveJobsMap(jobs);
  }

  async tryStartJob(name: string): Promise<boolean> {
    const jobs = await this.getJobsMap();
    if (jobs[name]?.isRunning) return false;

    jobs[name] = {
      ...(jobs[name] || { name, type: 'CRON', concurrency: 1, schedule: null }),
      isRunning: true,
      lastRun: new Date(),
      lastStatus: 'RUNNING',
      lastError: null,
    };
    await this.saveJobsMap(jobs);
    return true;
  }

  async markJobStart(name: string): Promise<void> {
    const jobs = await this.getJobsMap();
    jobs[name] = {
      ...(jobs[name] || { name, type: 'CRON', concurrency: 1, schedule: null }),
      isRunning: true,
      lastRun: new Date(),
      lastStatus: 'RUNNING',
      lastError: null,
    };
    await this.saveJobsMap(jobs);
  }

  async markJobEnd(
    name: string, 
    durationMs: number | null, 
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS', 
    error: string | null = null
  ): Promise<void> {
    const jobs = await this.getJobsMap();
    if (!jobs[name]) return;

    jobs[name] = {
      ...jobs[name],
      isRunning: false,
      lastDurationMs: durationMs,
      lastStatus: status,
      lastError: error,
    };
    await this.saveJobsMap(jobs);
  }

  async isJobRunning(name: string): Promise<boolean> {
    const jobs = await this.getJobsMap();
    return !!jobs[name]?.isRunning;
  }

  async getJob(name: string): Promise<JobRegistryEntry | null> {
    const jobs = await this.getJobsMap();
    return jobs[name] || null;
  }

  async getJobs(): Promise<JobRegistryEntry[]> {
    const jobs = await this.getJobsMap();
    return Object.values(jobs);
  }
}

// Helper functions (Async)
export const registerCronJob = (name: string, schedule: string, concurrency = 1) =>
  JobRegistry.getInstance().registerCronJob(name, schedule, concurrency);

export const registerQueue = (name: string, concurrency: number) =>
  JobRegistry.getInstance().registerQueue(name, concurrency);

export const tryStartJob = (name: string) => JobRegistry.getInstance().tryStartJob(name);

export const markJobStart = (name: string) => JobRegistry.getInstance().markJobStart(name);

export const markJobEnd = (
  name: string, 
  durationMs: number | null, 
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS', 
  error: string | null = null
) => JobRegistry.getInstance().markJobEnd(name, durationMs, status, error);

export const isJobRunning = (name: string) => JobRegistry.getInstance().isJobRunning(name);

export const getJob = (name: string) => JobRegistry.getInstance().getJob(name);

export const getJobs = () => JobRegistry.getInstance().getJobs();

