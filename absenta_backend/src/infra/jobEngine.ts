/**
 * 🚀 JobEngine — Mesin Penjadwalan Terpusat (Timezone-Aware & Multi-Tenant Resilient)
 *
 * Cara penggunaan:
 *   export default defineCronJob({
 *     name: 'myJob',
 *     schedule: '0 2 * * *',      // cron expression, atau null = manual only
 *     timezone: 'Asia/Jakarta',   // opsional (default: process.env.DEFAULT_TIMEZONE || 'Asia/Jakarta')
 *     envFlag: 'MY_JOB_ENABLED',  // env var feature flag (opsional)
 *     async run() {
 *       // logika bisnis saja — semua boilerplate ditangani engine
 *     },
 *   });
 *
 * Engine otomatis menangani:
 *   ✓ Timezone-Aware Scheduling   → kebal perbedaan timezone server (UTC / SG / ID)
 *   ✓ Exact Next-Occurrence Timer → kebal boot-drift (tidak bergeser saat server restart)
 *   ✓ registerCronJob()           → daftar ke Redis registry
 *   ✓ acquireLock()               → distributed lock (aman multi-node)
 *   ✓ tryStartJob()               → cegah double-run
 *   ✓ markJobStart() / markJobEnd() → tracking UI
 *   ✓ observabilityService.logEvent → audit trail otomatis
 *   ✓ appLogger.error             → error logging otomatis
 *   ✓ MAINTENANCE_MODE check      → dihormati otomatis
 */

import { registerCronJob, markJobStart, markJobEnd, tryStartJob } from './jobRegistry';
import { acquireLock, releaseLock } from './locks/distributedLock';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';

// ─── Global Platform Timezone (Strict Required Configuration) ────────────────
function resolvePlatformTimezone(): string {
  const tz = process.env.DEFAULT_TIMEZONE || process.env.APP_TIMEZONE;
  if (!tz || !tz.trim()) {
    throw new Error(
      "❌ [FATAL CONFIG ERROR] Variabel 'DEFAULT_TIMEZONE' wajib didefinisikan di file .env (Contoh: DEFAULT_TIMEZONE=Asia/Jakarta, Asia/Makassar, Asia/Jayapura, Asia/Singapore, atau UTC)!"
    );
  }

  // Validasi apakah format zona waktu IANA valid menurut runtime V8
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
  } catch (err: any) {
    throw new Error(
      `❌ [FATAL CONFIG ERROR] Nilai DEFAULT_TIMEZONE '${tz}' di file .env tidak valid sebagai zona waktu IANA standar!`
    );
  }

  return tz.trim();
}

export const PLATFORM_TIMEZONE = resolvePlatformTimezone();

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
   * Zona waktu target IANA, misal: 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore'.
   * Jika tidak diisi, otomatis menggunakan DEFAULT_TIMEZONE dari file .env.
   */
  timezone?: string;

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

// ─── Exact Next-Occurrence Calculator ─────────────────────────────────────────

/**
 * Hitung selisih waktu (milidetik) menuju eksekusi jadwal berikutnya berdasarkan timezone target.
 */
export function calculateNextCronDelayMs(
  schedule: string | null,
  timezone: string = PLATFORM_TIMEZONE
): { delayMs: number; nextRunIso: string } {
  if (!schedule) {
    return { delayMs: 24 * 60 * 60 * 1000, nextRunIso: 'manual' };
  }

  try {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) {
      return { delayMs: 24 * 60 * 60 * 1000, nextRunIso: 'fallback' };
    }

    const [minStr, hourStr] = parts;
    const now = new Date();

    // 1. Minute Step: */N * * * *
    const minStepMatch = minStr.match(/^\*\/(\d+)$/);
    if (minStepMatch && hourStr === '*') {
      const step = parseInt(minStepMatch[1], 10);
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      const min = now.getMinutes();
      const nextMin = (Math.floor(min / step) + 1) * step;
      const diffSec = (nextMin - min) * 60 - sec;
      const delayMs = Math.max(1000, diffSec * 1000 - ms);
      return { delayMs, nextRunIso: new Date(now.getTime() + delayMs).toISOString() };
    }

    // 2. Fixed Minute Every Hour: M * * * * (e.g. 0 * * * *)
    if (/^\d+$/.test(minStr) && hourStr === '*') {
      const targetMin = parseInt(minStr, 10);
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      const min = now.getMinutes();
      let diffMin = targetMin - min;
      if (diffMin <= 0) diffMin += 60;
      const diffSec = diffMin * 60 - sec;
      const delayMs = Math.max(1000, diffSec * 1000 - ms);
      return { delayMs, nextRunIso: new Date(now.getTime() + delayMs).toISOString() };
    }

    // 3. Daily Specific Time: M H * * * (e.g. 0 1 * * *) in Target Timezone
    if (/^\d+$/.test(minStr) && /^\d+$/.test(hourStr)) {
      const targetMin = parseInt(minStr, 10);
      const targetHour = parseInt(hourStr, 10);

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const dateParts = formatter.formatToParts(now);
      const getPart = (type: string) => dateParts.find((p) => p.type === type)?.value || '0';

      const curYear = parseInt(getPart('year'), 10);
      const curMonth = parseInt(getPart('month'), 10);
      const curDay = parseInt(getPart('day'), 10);
      const curHour = parseInt(getPart('hour'), 10);
      const curMin = parseInt(getPart('minute'), 10);
      const curSec = parseInt(getPart('second'), 10);

      let targetYear = curYear;
      let targetMonth = curMonth;
      let targetDay = curDay;

      const isPassedToday =
        curHour > targetHour ||
        (curHour === targetHour && curMin > targetMin) ||
        (curHour === targetHour && curMin === targetMin && curSec >= 0);

      if (isPassedToday) {
        const nextDate = new Date(Date.UTC(curYear, curMonth - 1, curDay + 1));
        targetYear = nextDate.getUTCFullYear();
        targetMonth = nextDate.getUTCMonth() + 1;
        targetDay = nextDate.getUTCDate();
      }

      // Hitung offset zona waktu target
      const probeDate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMin, 0));
      const offsetFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      });
      const tzPart = offsetFmt.formatToParts(probeDate).find((p) => p.type === 'timeZoneName')?.value || 'GMT+7';

      let offsetHours = 7;
      const match = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) / 60 : 0;
        offsetHours = h >= 0 ? h + m : h - m;
      }

      const targetUtcTimestamp = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour - offsetHours, targetMin, 0);
      const delayMs = Math.max(1000, targetUtcTimestamp - now.getTime());

      return { delayMs, nextRunIso: new Date(targetUtcTimestamp).toISOString() };
    }

    // Fallback: 24 jam
    return { delayMs: 24 * 60 * 60 * 1000, nextRunIso: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() };
  } catch (err: any) {
    appLogger.warn({ error: err?.message, schedule, timezone }, '[JobEngine] Error calculating cron delay, using 24h fallback');
    return { delayMs: 24 * 60 * 60 * 1000, nextRunIso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
  }
}

/**
 * Estimasi durasi interval untuk perhitungan distributed lock TTL.
 */
export function parseCronIntervalMs(schedule: string | null): number | null {
  if (!schedule) return null;
  try {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const [minute, hour] = parts;

    if (minute === '*' && hour === '*') return 60_000;

    const minuteStep = minute.match(/^\*\/(\d+)$/);
    if (minuteStep && hour === '*') return parseInt(minuteStep[1], 10) * 60_000;

    if (/^\d+$/.test(minute) && hour === '*') return 60 * 60_000;

    const hourStep = hour.match(/^\*\/(\d+)$/);
    if (hourStep) return parseInt(hourStep[1], 10) * 60 * 60_000;

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
    appLogger.info({ count: names.length, jobs: names, defaultTimezone: PLATFORM_TIMEZONE }, '[JobEngine] Starting all registered jobs');

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
    const tz = config.timezone || PLATFORM_TIMEZONE;

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

    if (!config.schedule) {
      appLogger.info({ job: config.name, schedule: 'manual' }, '[JobEngine] Job registered (manual only)');
      return;
    }

    // Penjadwalan berulang yang presisi (Exact Next-Occurrence Timer)
    const scheduleNext = () => {
      const { delayMs, nextRunIso } = calculateNextCronDelayMs(config.schedule, tz);

      appLogger.info(
        {
          job: config.name,
          schedule: config.schedule,
          timezone: tz,
          nextRunUtc: nextRunIso,
          delaySeconds: Math.round(delayMs / 1000),
        },
        '[JobEngine] Scheduled next run'
      );

      setTimeout(async () => {
        try {
          await this.executeRun(config);
        } catch (err: any) {
          appLogger.error({ job: config.name, error: err?.message }, '[JobEngine] Error executing scheduled job');
        } finally {
          scheduleNext(); // Jadwalkan siklus berikutnya
        }
      }, delayMs);
    };

    // Mulai jadwal presisi pertama kali
    scheduleNext();
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
      ? Math.min(3600, Math.max(60, Math.floor((intervalMs / 1000) * 0.9)))
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
 *   name: 'attendanceAutoSession',
 *   schedule: '0 1 * * *',        // Jam 01:00 subuh
 *   timezone: 'Asia/Jakarta',     // Opsional
 *   async run() {
 *     await doWork();
 *   },
 * });
 */
export function defineCronJob(config: CronJobConfig): CronJobConfig {
  jobEngine.register(config);
  return config;
}
