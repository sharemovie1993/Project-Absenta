import fs from 'fs';
import crypto from 'crypto';
import { getRedisConnection } from '@/queue/redis';
import { storageService } from '@/infra/storage/storage.service';
import { migrationBundleService, ExportBundleOptions, RestoreBundleOptions, ExportProgressUpdate, RestoreProgressUpdate } from './migration-bundle.service';

export type JobType = 'EXPORT' | 'RESTORE';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BackupJob {
  id: string;
  type: JobType;
  tenantId?: string;
  status: JobStatus;
  progress: number;
  stage: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  result?: {
    filepath?: string;
    storageKey?: string;
    filename?: string;
    size?: number;
    checksum_sha256?: string;
    manifest?: any;
    restoredTables?: Record<string, number>;
    targetSubdomain?: string;
    targetTenantId?: string;
    isCloned?: boolean;
  };
}

export class BackupJobService {
  private inMemoryJobs = new Map<string, BackupJob>();

  private getRedis() {
    try {
      return getRedisConnection();
    } catch (_) {
      return null;
    }
  }

  private getKey(jobId: string): string {
    return `backup:job:${jobId}`;
  }

  private getChannel(jobId: string): string {
    return `backup:job:stream:${jobId}`;
  }

  async saveJob(job: BackupJob): Promise<void> {
    job.updatedAt = new Date().toISOString();
    this.inMemoryJobs.set(job.id, job);

    const redis: any = this.getRedis();
    if (redis) {
      try {
        const payload = JSON.stringify(job);
        // Simpan state di Redis dengan TTL 24 jam
        await redis.set(this.getKey(job.id), payload, 'EX', 86400);
        // Pancarkan update ke subscriber SSE realtime
        await redis.publish(this.getChannel(job.id), payload);
      } catch (err: any) {
        console.warn(`[BackupJobService] Gagal sync ke Redis untuk job ${job.id}:`, err.message);
      }
    }
  }

  async getJob(jobId: string): Promise<BackupJob | null> {
    const redis: any = this.getRedis();
    if (redis) {
      try {
        const data = await redis.get(this.getKey(jobId));
        if (data) {
          const parsed = JSON.parse(data);
          this.inMemoryJobs.set(jobId, parsed);
          return parsed;
        }
      } catch (err: any) {
        console.warn(`[BackupJobService] Gagal membaca dari Redis untuk job ${jobId}:`, err.message);
      }
    }
    return this.inMemoryJobs.get(jobId) || null;
  }

  /**
   * Memulai ekspor bundle di latar belakang (asinkron).
   * Klien langsung menerima jobId tanpa perlu menunggu proses selesai.
   */
  async startExportJob(tenantId: string, options: ExportBundleOptions = {}): Promise<BackupJob> {
    const jobId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const initialJob: BackupJob = {
      id: jobId,
      type: 'EXPORT',
      tenantId,
      status: 'PROCESSING',
      progress: 5,
      stage: 'init',
      message: 'Pekerjaan pencadangan diterima, memulai pengemasan data...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveJob(initialJob);

    // Jalankan ekspor di background worker secara detached
    (async () => {
      try {
        console.log(`[BackupJobService] 🚀 Memulai background export job ${jobId} untuk tenant ${tenantId}...`);
        
        const result = await migrationBundleService.createExportBundleFile(
          tenantId,
          options,
          async (p: ExportProgressUpdate) => {
            const current = (await this.getJob(jobId)) || initialJob;
            current.progress = p.percentage;
            current.stage = p.stage;
            current.message = p.message;
            await this.saveJob(current);
          }
        );

        const completedJob = (await this.getJob(jobId)) || initialJob;
        let storageKey: string | undefined;

        // Multi-Node Readiness: Unggah berkas hasil export ke Shared Storage (MinIO S3 / StorageService)
        // agar jika request download masuk ke Worker Node lain di belakang Load Balancer, berkas tetap tersedia.
        try {
          storageKey = `temp-jobs/${jobId}/${result.filename}`;
          await storageService.uploadStream(storageKey, fs.createReadStream(result.filepath), {
            contentType: 'application/octet-stream',
          });
          if (storageService.getDriverName() === 's3') {
            await fs.promises.unlink(result.filepath).catch(() => {});
          }
        } catch (stageErr: any) {
          console.warn(`[BackupJobService] Gagal staging export job ${jobId} ke shared storage, menggunakan fallback disk lokal:`, stageErr?.message);
          storageKey = undefined;
        }

        completedJob.status = 'COMPLETED';
        completedJob.progress = 100;
        completedJob.stage = 'finalizing';
        completedJob.message = 'Paket cadangan berhasil dibuat dan siap diunduh!';
        completedJob.completedAt = new Date().toISOString();
        completedJob.result = {
          filepath: result.filepath,
          storageKey,
          filename: result.filename,
          size: result.size,
          checksum_sha256: result.manifest.checksum_sha256,
          manifest: result.manifest
        };

        await this.saveJob(completedJob);
        console.log(`[BackupJobService] ✅ Background export job ${jobId} sukses (${(result.size / 1024 / 1024).toFixed(2)} MB, storageKey=${storageKey || 'local'}).`);
      } catch (err: any) {
        console.error(`[BackupJobService] ❌ Background export job ${jobId} gagal:`, err);
        const failedJob = (await this.getJob(jobId)) || initialJob;
        failedJob.status = 'FAILED';
        failedJob.error = err.message || 'Gagal mengekspor paket cadangan';
        failedJob.message = `Gagal: ${failedJob.error}`;
        await this.saveJob(failedJob);
      }
    })();

    return initialJob;
  }

  /**
   * Memulai pemulihan bundle di latar belakang (asinkron).
   * Berkas sementara di disk dibaca dan dipulihkan tanpa menahan koneksi HTTP klien.
   */
  async startRestoreJob(tempFilePath: string, options: RestoreBundleOptions = {}): Promise<BackupJob> {
    const jobId = `rst_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tempStorageKey = `temp-jobs/${jobId}/restore_upload.absenta`;
    const initialJob: BackupJob = {
      id: jobId,
      type: 'RESTORE',
      tenantId: options.targetTenantId,
      status: 'PROCESSING',
      progress: 5,
      stage: 'init',
      message: 'Berkas cadangan diterima di server, memulai proses pemulihan...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveJob(initialJob);

    // Jalankan restorasi di background worker secara detached
    (async () => {
      try {
        console.log(`[BackupJobService] 🚀 Memulai background restore job ${jobId}...`);

        // Stage ke shared storage jika menggunakan S3 agar multi-node worker dapat mengaksesnya
        let buffer: Buffer;
        if (fs.existsSync(tempFilePath)) {
          buffer = await fs.promises.readFile(tempFilePath);
          if (storageService.getDriverName() === 's3') {
            await storageService.uploadBuffer(tempStorageKey, buffer, { contentType: 'application/octet-stream' }).catch(() => {});
          }
        } else {
          buffer = await storageService.readFileBuffer(tempStorageKey);
        }

        const result = await migrationBundleService.restoreBundle(
          buffer,
          options,
          async (p: RestoreProgressUpdate) => {
            const current = (await this.getJob(jobId)) || initialJob;
            current.progress = p.percentage;
            current.stage = p.stage;
            current.message = p.message;
            await this.saveJob(current);
          }
        );

        // Bersihkan berkas sementara di disk lokal maupun shared storage
        await fs.promises.unlink(tempFilePath).catch(() => {});
        await storageService.delete(tempStorageKey).catch(() => {});

        const completedJob = (await this.getJob(jobId)) || initialJob;
        completedJob.status = 'COMPLETED';
        completedJob.progress = 100;
        completedJob.stage = 'finalizing';
        completedJob.message = result.message || 'Pemulihan data dan berkas media berhasil diselesaikan!';
        completedJob.completedAt = new Date().toISOString();
        completedJob.result = {
          manifest: result.manifest,
          restoredTables: result.restoredTables,
          targetSubdomain: result.targetSubdomain,
          targetTenantId: result.targetTenantId,
          isCloned: result.isCloned
        };

        await this.saveJob(completedJob);
        console.log(`[BackupJobService] ✅ Background restore job ${jobId} sukses:`, result.message);
      } catch (err: any) {
        console.error(`[BackupJobService] ❌ Background restore job ${jobId} gagal:`, err);
        await fs.promises.unlink(tempFilePath).catch(() => {});
        await storageService.delete(tempStorageKey).catch(() => {});

        const failedJob = (await this.getJob(jobId)) || initialJob;
        failedJob.status = 'FAILED';
        failedJob.error = err.message || 'Gagal memulihkan paket cadangan';
        failedJob.message = `Gagal: ${failedJob.error}`;
        await this.saveJob(failedJob);
      }
    })();

    return initialJob;
  }
}

export const backupJobService = new BackupJobService();
