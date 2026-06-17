/**
 * 🚀 JobEngine — Mesin Penjadwalan Terpusat
 *
 * Cara penggunaan:
 *   export default defineCronJob({
 *     name: 'myJob',
 *     schedule: '0 2 * * *',   // cron expression, atau null = manual only
 *     envFlag: 'MY_JOB_ENABLED', // env var feature flag (opsional)
 *     async run() {
 *       // logika bisnis saja — semua boilerplate ditangani engine
 *     },
 *   });
 *
 * Engine otomatis menangani:
 *   ✓ registerCronJob()            → daftar ke Redis registry
 *   ✓ acquireLock()                → distributed lock (aman multi-node)
 *   ✓ tryStartJob()                → cegah double-run
 *   ✓ markJobStart() / markJobEnd() → tracking UI
 *   ✓ observabilityService.logEvent → audit trail otomatis
 *   ✓ appLogger.error              → error logging otomatis
 *   ✓ setInterval()                → penjadwalan ulang otomatis
 *   ✓ MAINTENANCE_MODE check       → dihormati otomatis
 */

import { registerCronJob, markJobStart, markJobEnd, tryStartJob } from './jobRegistry';
import { acquireLock, releaseLock } from './locks/distributedLock';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CronJobConfig {
  /**
   * Nama unik job. Tampil di UI "Daftar Tugas Berkala".
   * Gunakan camelCase, misal: 'tenantRetention', 'failedJobCleanup'.
   */
  name: string;

  /**
   * Cron expression, misal: '0 0 * * *' (harian tengah malam).
   * null = hanya bisa dijalankan manual via UI atau API.
   */
  schedule: string | null;

  /**
   * Nama environment variable sebagai feature flag (opsional).
   * Jika tidak diset, job selalu aktif (kecuali MAINTENANCE_MODE=true).
   * Contoh: 'TENANT_RISK_CRON_ENABLED'
   */
  envFlag?: string;

  /**
   * Jumlah worker paralel. Default: 1.
   */
  concurrency?: number;

  /**
   * Job lain yang harus di-markStart/End bersamaan dengan job ini.
   * Gunakan untuk sub-job seperti 'cohort' yang dijalankan di dalam 'revenueForecast'.
   */
  subJobs?: string[];

  /**
   * TTL distributed lock dalam detik.
   * Default: 90% dari interval cron, minimum 60 detik, maksimum 3600 detik.
   */
  lockTtlSeconds?: number;

  /**
   * Fungsi logika bisnis. Hanya tulis kode bisnis di sini.
   * Semua boilerplate (lock, registry, logging) ditangani engine.
   */
  run(): Promise<void>;
}

// ─── Cron Parser ──────────────────────────────────────────────────────────────

/**
 * Parse cron expression ke estimasi interval dalam milliseconds.
 * Mendukung format 5-field standar dengan wildcard dan step (setiap-N).
 */
export function parseCronIntervalMs(schedule: string | null): number | null {
  if (!schedule) return null;
  try {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const [minute, hour, dom, month, dow] = parts;

    // Setiap menit: * * * * *
    if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
      return 60_000;
    }

    // Setiap N menit: */N * * * *
    const minuteStep = minute.match(/^\*\/(\d+)$/);
    if (minuteStep && hour === '*') {
      return parseInt(minuteStep[1], 10) * 60_000;
    }

    // Setiap N detik (non-standard, 6-field): */N * * * * *  — abaikan jika < 5 field

    // Setiap jam: angka_menit * * * *
    if (/^\d+$/.test(minute) && hour === '*') {
      return 60 * 60_000; // 1 jam
    }

    // Setiap N jam: angka_menit */N * * *
    const hourStep = hour.match(/^\*\/(\d+)$/);
    if (hourStep) {
      return parseInt(hourStep[1], 10) * 60 * 60_000;
    }

    // Harian: angka_menit angka_jam * * *
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      return 24 * 60 * 60_000;
    }

    // Fallback: anggap harian
    return 24 * 60 * 60_000;
  } catch {
    return null;
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class JobEngine {
  private static instance: JobEngine | null = null;
  private jobs = new Map<string, CronJobConfig>();

  static getInstance(): JobEngine {
    if (!JobEngine.instance) {
      JobEngine.instance = new JobEngine();
    }
    return JobEngine.instance;
  }

  /** Daftarkan job ke engine. Dipanggil otomatis oleh defineCronJob(). */
  register(config: CronJobConfig): void {
    if (this.jobs.has(config.name)) {
      appLogger.warn({ job: config.name }, '[JobEngine] Job already registered, skipping duplicate');
      return;
    }
    this.jobs.set(config.name, config);
  }

  /**
   * Mulai semua job yang sudah terdaftar.
   * Dipanggil sekali dari initSchedulers() saat server boot.
   */
  async startAll(): Promise<void> {
    const names = [...this.jobs.keys()];
    appLogger.info({ count: names.length, jobs: names }, '[JobEngine] Starting all registered jobs');

    for (const config of this.jobs.values()) {
      try {
        await this.startJob(config);
      } catch (err: any) {
        appLogger.error({ job: config.name, error: err?.message }, '[JobEngine] Failed to start job');
      }
    }

    appLogger.info('[JobEngine] All jobs started.');
  }

  /**
   * Trigger satu job secara manual (dari UI atau API).
   * Melewati check feature flag, tapi tetap menghormati distributed lock.
   */
  async triggerJob(name: string): Promise<void> {
    const config = this.jobs.get(name);
    if (!config) throw new Error(`[JobEngine] Job '${name}' tidak ditemukan. Pastikan sudah di-import di _registry.ts.`);
    appLogger.info({ job: name }, '[JobEngine] Manual trigger requested');
    await this.executeRun(config, { forceRun: true });
  }

  /** Daftar semua nama job yang terdaftar. */
  getJobNames(): string[] {
    return [...this.jobs.keys()];
  }

  /** Cek apakah job dengan nama tertentu sudah terdaftar. */
  hasJob(name: string): boolean {
    return this.jobs.has(name);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async startJob(config: CronJobConfig): Promise<void> {
    // Daftarkan ke Redis registry
    if (config.schedule) {
      await registerCronJob(config.name, config.schedule, config.concurrency ?? 1);
    }

    // Daftarkan sub-jobs ke Redis registry juga
    for (const sub of config.subJobs ?? []) {
      if (config.schedule) {
        await registerCronJob(sub, config.schedule, 1);
      }
    }

    // Runner dengan semua boilerplate
    const runner = () => this.executeRun(config);

    // Jalankan langsung saat startup
    void runner();

    // Jadwalkan interval berdasarkan cron schedule
    const intervalMs = parseCronIntervalMs(config.schedule);
    if (intervalMs) {
      setInterval(() => void runner(), intervalMs);
    }

    appLogger.info(
      { job: config.name, schedule: config.schedule ?? 'manual', intervalMs },
      '[JobEngine] Job registered & scheduled'
    );
  }

  private async executeRun(
    config: CronJobConfig,
    opts: { forceRun?: boolean } = {}
  ): Promise<void> {
    const { forceRun = false } = opts;

    // ── Feature flag check (dilewati jika forceRun/manual trigger) ──
    if (!forceRun) {
      const maintenanceMode =
        (process.env.MAINTENANCE_MODE || 'false').toLowerCase() === 'true';
      if (maintenanceMode) return;

      if (config.envFlag) {
        const enabled =
          (process.env[config.envFlag] || 'true').toLowerCase() === 'true';
        if (!enabled) return;
      }
    }

    // ── Distributed lock ──
    const intervalMs = parseCronIntervalMs(config.schedule);
    const defaultLockTtl = intervalMs
      ? Math.min(3600, Math.max(60, Math.floor(intervalMs / 1000 * 0.9)))
      : 600;
    const lockTtl = config.lockTtlSeconds ?? defaultLockTtl;

    const lock = await acquireLock(`scheduler:${config.name}`, lockTtl);
    if (!lock) {
      appLogger.debug({ job: config.name }, '[JobEngine] Lock held by another node, skipping');
      return;
    }

    // ── tryStartJob guard — cegah double-run ──
    const canStart = await tryStartJob(config.name);
    if (!canStart) {
      await releaseLock(lock);
      appLogger.debug({ job: config.name }, '[JobEngine] Job already running, skipping');
      return;
    }

    // ── Mark start untuk sub-jobs ──
    for (const sub of config.subJobs ?? []) {
      await markJobStart(sub);
    }

    const correlationId = `cron-${config.name}-${new Date().toISOString().slice(0, 10)}`;
    const startedAt = Date.now();

    observabilityService.logEvent({
      event_type: 'CRON_EXECUTED',
      domain: 'CRON',
      severity: 'INFO',
      entity_type: 'JOB',
      entity_id: config.name,
      tenant_id: 'system',
      correlation_id: correlationId,
      metadata: { job: config.name, phase: 'started', force: forceRun },
    });

    // ── Eksekusi logika bisnis ──
    try {
      await config.run();

      const durationMs = Date.now() - startedAt;
      await markJobEnd(config.name, durationMs, 'SUCCESS');
      for (const sub of config.subJobs ?? []) {
        await markJobEnd(sub, durationMs, 'SUCCESS');
      }

      appLogger.info(
        { job: config.name, durationMs },
        '[JobEngine] Job completed successfully'
      );
      observabilityService.logEvent({
        event_type: 'CRON_EXECUTED',
        domain: 'CRON',
        severity: 'INFO',
        entity_type: 'JOB',
        entity_id: config.name,
        tenant_id: 'system',
        correlation_id: correlationId,
        metadata: { job: config.name, phase: 'completed', duration_ms: durationMs },
      });
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      const errMsg = err?.message || String(err);
      await markJobEnd(config.name, durationMs, 'FAILED', errMsg);
      for (const sub of config.subJobs ?? []) {
        await markJobEnd(sub, durationMs, 'FAILED', errMsg);
      }

      appLogger.error(
        { job: config.name, durationMs, error: err?.message, stack: err?.stack },
        '[JobEngine] Job failed'
      );
      observabilityService.logEvent({
        event_type: 'CRON_EXECUTED',
        domain: 'CRON',
        severity: 'ERROR',
        entity_type: 'JOB',
        entity_id: config.name,
        tenant_id: 'system',
        correlation_id: correlationId,
        metadata: {
          job: config.name,
          phase: 'failed',
          duration_ms: durationMs,
          error: err?.message,
        },
      });
    } finally {
      await releaseLock(lock);
    }
  }
}

// ─── Singleton & Public API ───────────────────────────────────────────────────

export const jobEngine = JobEngine.getInstance();

/**
 * Definisikan dan daftarkan cron job ke engine secara otomatis.
 *
 * @example
 * export default defineCronJob({
 *   name: 'myJob',
 *   schedule: '0 3 * * *',      // jam 3 pagi setiap hari
 *   envFlag: 'MY_JOB_ENABLED',  // opsional
 *   async run() {
 *     await myService.doWork();
 *   },
 * });
 */
export function defineCronJob(config: CronJobConfig): CronJobConfig {
  jobEngine.register(config);
  return config;
}
