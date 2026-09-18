import fs from 'fs';
import path from 'path';
import { 
  S3Client, 
  HeadBucketCommand, 
  CreateBucketCommand, 
  ListObjectsV2Command, 
  GetObjectCommand, 
  PutObjectCommand 
} from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';

export interface ReplicationConfig {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
  lastSyncedAt?: string | null;
}

export interface ReplicationStatusSummary {
  primary: {
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE';
    totalObjects: number;
    totalBytes: number;
  };
  replica: {
    enabled: boolean;
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
    totalObjects: number;
    totalBytes: number;
    lastSyncedAt?: string | null;
  };
}

class BackupReplicationService {
  private configPath: string;

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'storage', 'configs', 'backup-replication.json');
  }

  public getPrimaryConfig() {
    return {
      endpoint: process.env.S3_BACKUP_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BACKUP_BUCKET || 'absenta-platform-backups',
      forcePathStyle: true,
    };
  }

  public getRawConfig(): ReplicationConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          enabled: Boolean(parsed.enabled),
          endpoint: parsed.endpoint || '',
          bucket: parsed.bucket || 'absenta-platform-backups',
          accessKeyId: parsed.accessKeyId || '',
          secretAccessKey: parsed.secretAccessKey || '',
          region: parsed.region || 'us-east-1',
          forcePathStyle: parsed.forcePathStyle !== false,
          lastSyncedAt: parsed.lastSyncedAt || null,
        };
      }
    } catch (err) {
      console.error('[BackupReplicationService] Error reading config:', err);
    }

    return {
      enabled: false,
      endpoint: '',
      bucket: 'absenta-platform-backups',
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      forcePathStyle: true,
      lastSyncedAt: null,
    };
  }

  public getConfig(maskSecret = true): ReplicationConfig {
    const cfg = this.getRawConfig();
    if (maskSecret && cfg.secretAccessKey) {
      cfg.secretAccessKey = '********';
    }
    return cfg;
  }

  public saveConfig(payload: Partial<ReplicationConfig>): ReplicationConfig {
    const existing = this.getRawConfig();
    
    // If secretAccessKey is masked or omitted, preserve existing secret
    let secretKey = payload.secretAccessKey;
    if (!secretKey || secretKey === '********' || secretKey.trim() === '') {
      secretKey = existing.secretAccessKey;
    }

    const updated: ReplicationConfig = {
      enabled: payload.enabled ?? existing.enabled,
      endpoint: (payload.endpoint !== undefined ? payload.endpoint : existing.endpoint).trim(),
      bucket: (payload.bucket !== undefined ? payload.bucket : existing.bucket).trim(),
      accessKeyId: (payload.accessKeyId !== undefined ? payload.accessKeyId : existing.accessKeyId).trim(),
      secretAccessKey: secretKey.trim(),
      region: (payload.region || existing.region || 'us-east-1').trim(),
      forcePathStyle: payload.forcePathStyle !== undefined ? payload.forcePathStyle : existing.forcePathStyle,
      lastSyncedAt: payload.lastSyncedAt !== undefined ? payload.lastSyncedAt : existing.lastSyncedAt,
    };

    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8');
    return this.getConfig(true);
  }

  private createClient(cfg: {
    endpoint: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
  }) {
    return new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region || 'us-east-1',
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: cfg.forcePathStyle !== false,
      maxAttempts: 1,
    });
  }

  public async testConnection(cfg?: Partial<ReplicationConfig>): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
  }> {
    const raw = this.getRawConfig();
    const targetEndpoint = (cfg?.endpoint || raw.endpoint || '').trim();
    const targetBucket = (cfg?.bucket || raw.bucket || 'absenta-platform-backups').trim();
    const targetAccessKey = (cfg?.accessKeyId || raw.accessKeyId || '').trim();
    let targetSecretKey = (cfg?.secretAccessKey || '').trim();
    
    if (!targetSecretKey || targetSecretKey === '********') {
      targetSecretKey = raw.secretAccessKey;
    }

    if (!targetEndpoint) {
      return { success: false, latencyMs: 0, message: 'Endpoint URL target belum diisi' };
    }
    if (!targetAccessKey || !targetSecretKey) {
      return { success: false, latencyMs: 0, message: 'Kredensial Access Key & Secret Key wajib diisi' };
    }

    const client = this.createClient({
      endpoint: targetEndpoint,
      region: cfg?.region || raw.region || 'us-east-1',
      accessKeyId: targetAccessKey,
      secretAccessKey: targetSecretKey,
      forcePathStyle: cfg?.forcePathStyle !== undefined ? cfg.forcePathStyle : raw.forcePathStyle,
    });

    const start = Date.now();
    try {
      // Test HeadBucket with fast timeout (3s)
      try {
        await client.send(new HeadBucketCommand({ Bucket: targetBucket }), {
          abortSignal: AbortSignal.timeout(3000),
        });
      } catch (headErr: any) {
        // If bucket does not exist (404 / NotFound), try creating it automatically
        if (headErr?.name === 'NotFound' || headErr?.$metadata?.httpStatusCode === 404) {
          await client.send(new CreateBucketCommand({ Bucket: targetBucket }), {
            abortSignal: AbortSignal.timeout(3000),
          });
        } else {
          throw headErr;
        }
      }

      // Test ListObjects with fast timeout (3s)
      await client.send(new ListObjectsV2Command({ Bucket: targetBucket, MaxKeys: 1 }), {
        abortSignal: AbortSignal.timeout(3000),
      });
      const latencyMs = Date.now() - start;

      return {
        success: true,
        latencyMs,
        message: `Koneksi berhasil! Bucket "${targetBucket}" siap digunakan (Latensi: ${latencyMs}ms).`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const msg = err?.name === 'AbortError' 
        ? 'Koneksi timeout (target tidak merespons dalam 3 detik)' 
        : (err?.message || 'Gagal terhubung ke target MinIO');
      return {
        success: false,
        latencyMs,
        message: `Koneksi gagal: ${msg}`,
      };
    }
  }

  public async getStatusSummary(): Promise<ReplicationStatusSummary> {
    const primaryCfg = this.getPrimaryConfig();
    const replicaCfg = this.getRawConfig();

    let primaryStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
    let primaryObjects = 0;
    let primaryBytes = 0;

    let replicaStatus: 'ONLINE' | 'OFFLINE' | 'DISABLED' = replicaCfg.enabled ? 'OFFLINE' : 'DISABLED';
    let replicaObjects = 0;
    let replicaBytes = 0;

    // Parallel probes with fail-fast timeout (2.5s) to avoid hanging when a node is down
    const probePrimary = async () => {
      try {
        const primaryClient = this.createClient(primaryCfg);
        const res = await primaryClient.send(
          new ListObjectsV2Command({ Bucket: primaryCfg.bucket }),
          { abortSignal: AbortSignal.timeout(2500) }
        );
        primaryStatus = 'ONLINE';
        primaryObjects = res.KeyCount || 0;
        primaryBytes = (res.Contents || []).reduce((acc, item) => acc + (item.Size || 0), 0);
      } catch {
        primaryStatus = 'OFFLINE';
      }
    };

    const probeReplica = async () => {
      if (replicaCfg.enabled && replicaCfg.endpoint && replicaCfg.accessKeyId) {
        try {
          const replicaClient = this.createClient(replicaCfg);
          const res = await replicaClient.send(
            new ListObjectsV2Command({ Bucket: replicaCfg.bucket }),
            { abortSignal: AbortSignal.timeout(2500) }
          );
          replicaStatus = 'ONLINE';
          replicaObjects = res.KeyCount || 0;
          replicaBytes = (res.Contents || []).reduce((acc, item) => acc + (item.Size || 0), 0);
        } catch {
          replicaStatus = 'OFFLINE';
        }
      }
    };

    await Promise.allSettled([probePrimary(), probeReplica()]);

    return {
      primary: {
        endpoint: primaryCfg.endpoint,
        bucket: primaryCfg.bucket,
        status: primaryStatus,
        totalObjects: primaryObjects,
        totalBytes: primaryBytes,
      },
      replica: {
        enabled: replicaCfg.enabled,
        endpoint: replicaCfg.endpoint,
        bucket: replicaCfg.bucket,
        status: replicaStatus,
        totalObjects: replicaObjects,
        totalBytes: replicaBytes,
        lastSyncedAt: replicaCfg.lastSyncedAt,
      },
    };
  }

  public async syncAll(): Promise<{
    success: boolean;
    totalPrimary: number;
    alreadyInTarget: number;
    replicatedCount: number;
    replicatedKeys: string[];
    message: string;
  }> {
    const primaryCfg = this.getPrimaryConfig();
    const replicaCfg = this.getRawConfig();

    if (!replicaCfg.enabled) {
      throw new Error('Fitur replikasi cadangan saat ini sedang dinonaktifkan.');
    }
    if (!replicaCfg.endpoint || !replicaCfg.accessKeyId || !replicaCfg.secretAccessKey) {
      throw new Error('Konfigurasi target replikasi belum lengkap.');
    }

    const primaryClient = this.createClient(primaryCfg);
    const replicaClient = this.createClient(replicaCfg);

    // 1. Pastikan bucket target tersedia
    try {
      await replicaClient.send(new HeadBucketCommand({ Bucket: replicaCfg.bucket }));
    } catch {
      await replicaClient.send(new CreateBucketCommand({ Bucket: replicaCfg.bucket }));
    }

    // 2. Ambil daftar file di Primer
    const primaryRes = await primaryClient.send(new ListObjectsV2Command({ Bucket: primaryCfg.bucket }));
    const primaryItems = primaryRes.Contents || [];

    // 3. Ambil daftar file di Replika
    const replicaRes = await replicaClient.send(new ListObjectsV2Command({ Bucket: replicaCfg.bucket }));
    const replicaMap = new Map<string, number>();
    (replicaRes.Contents || []).forEach(item => {
      if (item.Key) replicaMap.set(item.Key, item.Size || 0);
    });

    const replicatedKeys: string[] = [];
    let alreadyInTarget = 0;

    for (const item of primaryItems) {
      if (!item.Key) continue;
      const targetSize = replicaMap.get(item.Key);

      // Jika berkas sudah ada dengan ukuran yang sama, lewati
      if (targetSize !== undefined && targetSize === item.Size) {
        alreadyInTarget++;
        continue;
      }

      // Ambil berkas dari Primer
      const getRes = await primaryClient.send(new GetObjectCommand({
        Bucket: primaryCfg.bucket,
        Key: item.Key,
      }));

      // Stream ke Target Replika
      if (getRes.Body) {
        const pass = new PassThrough();
        if (typeof (getRes.Body as any).pipe === 'function') {
          (getRes.Body as any).pipe(pass);
        } else if (typeof (getRes.Body as any).transformToByteArray === 'function') {
          const arr = await (getRes.Body as any).transformToByteArray();
          pass.write(Buffer.from(arr));
          pass.end();
        } else {
          pass.end();
        }

        await replicaClient.send(new PutObjectCommand({
          Bucket: replicaCfg.bucket,
          Key: item.Key,
          Body: pass,
          ContentType: getRes.ContentType || 'application/octet-stream',
          ContentLength: item.Size,
        }));

        replicatedKeys.push(item.Key);
      }
    }

    // Perbarui waktu sinkronisasi terakhir
    const nowIso = new Date().toISOString();
    this.saveConfig({ lastSyncedAt: nowIso });

    return {
      success: true,
      totalPrimary: primaryItems.length,
      alreadyInTarget,
      replicatedCount: replicatedKeys.length,
      replicatedKeys,
      message: `Sinkronisasi selesai! ${replicatedKeys.length} berkas baru berhasil diduplikasi ke MinIO replika.`,
    };
  }

  public async replicateFileIfEnabled(key: string): Promise<boolean> {
    const replicaCfg = this.getRawConfig();
    if (!replicaCfg.enabled || !replicaCfg.endpoint || !replicaCfg.accessKeyId) {
      return false;
    }

    try {
      const primaryCfg = this.getPrimaryConfig();
      const primaryClient = this.createClient(primaryCfg);
      const replicaClient = this.createClient(replicaCfg);

      const getRes = await primaryClient.send(new GetObjectCommand({
        Bucket: primaryCfg.bucket,
        Key: key,
      }));

      if (getRes.Body) {
        const pass = new PassThrough();
        if (typeof (getRes.Body as any).pipe === 'function') {
          (getRes.Body as any).pipe(pass);
        } else if (typeof (getRes.Body as any).transformToByteArray === 'function') {
          const arr = await (getRes.Body as any).transformToByteArray();
          pass.write(Buffer.from(arr));
          pass.end();
        } else {
          pass.end();
        }

        await replicaClient.send(new PutObjectCommand({
          Bucket: replicaCfg.bucket,
          Key: key,
          Body: pass,
          ContentType: getRes.ContentType || 'application/octet-stream',
          ContentLength: getRes.ContentLength,
        }));

        this.saveConfig({ lastSyncedAt: new Date().toISOString() });
        console.log(`[BackupReplicationService] Auto-replicated "${key}" to target MinIO successfully.`);
        return true;
      }
    } catch (err: any) {
      console.error(`[BackupReplicationService] Failed to auto-replicate "${key}":`, err?.message || err);
    }
    return false;
  }
}

export const backupReplicationService = new BackupReplicationService();
