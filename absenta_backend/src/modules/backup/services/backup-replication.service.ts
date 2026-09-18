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

export interface NodeConfig {
  enabled: boolean;
  name?: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
  lastSyncedAt?: string | null;
}

export interface MultiTierReplicationConfig {
  tier2: NodeConfig; // LAN Mirror (e.g. Mesin 20)
  tier3: NodeConfig; // Cloud Mirror (e.g. Cloudflare R2 / AWS S3)
}

// Backward-compatible alias
export type ReplicationConfig = MultiTierReplicationConfig;

export interface NodeStatus {
  enabled: boolean;
  name: string;
  endpoint: string;
  bucket: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
  totalObjects: number;
  totalBytes: number;
  keys?: string[];
  lastSyncedAt?: string | null;
}

export interface ReplicationStatusSummary {
  primary: {
    name: string;
    endpoint: string;
    bucket: string;
    status: 'ONLINE' | 'OFFLINE';
    totalObjects: number;
    totalBytes: number;
  };
  tier2: NodeStatus;
  tier3: NodeStatus;
  // Backward compatibility alias for legacy single replica readers
  replica: NodeStatus;
}

class BackupReplicationService {
  private configPath: string;

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'storage', 'configs', 'backup-replication.json');
  }

  public getPrimaryConfig() {
    return {
      name: 'Server Primer (Lokal)',
      endpoint: process.env.S3_BACKUP_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BACKUP_BUCKET || 'absenta-platform-backups',
      forcePathStyle: true,
    };
  }

  public getRawConfig(): MultiTierReplicationConfig {
    const defaultTier2: NodeConfig = {
      enabled: false,
      name: 'LAN Mirror (Mesin 2)',
      endpoint: '',
      bucket: 'absenta-platform-backups',
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      forcePathStyle: true,
      lastSyncedAt: null,
    };

    const defaultTier3: NodeConfig = {
      enabled: false,
      name: 'Cloud Mirror (Cloudflare R2)',
      endpoint: '',
      bucket: 'absenta-platform-backups',
      accessKeyId: '',
      secretAccessKey: '',
      region: 'auto',
      forcePathStyle: true,
      lastSyncedAt: null,
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);

        // Multi-tier format
        if (parsed.tier2 || parsed.tier3) {
          return {
            tier2: {
              ...defaultTier2,
              ...(parsed.tier2 || {}),
              forcePathStyle: parsed.tier2?.forcePathStyle !== false,
            },
            tier3: {
              ...defaultTier3,
              ...(parsed.tier3 || {}),
              forcePathStyle: parsed.tier3?.forcePathStyle !== false,
            },
          };
        }

        // Backward compatibility: root object is legacy single tier2
        return {
          tier2: {
            enabled: Boolean(parsed.enabled),
            name: 'LAN Mirror (Mesin 2)',
            endpoint: parsed.endpoint || '',
            bucket: parsed.bucket || 'absenta-platform-backups',
            accessKeyId: parsed.accessKeyId || '',
            secretAccessKey: parsed.secretAccessKey || '',
            region: parsed.region || 'us-east-1',
            forcePathStyle: parsed.forcePathStyle !== false,
            lastSyncedAt: parsed.lastSyncedAt || null,
          },
          tier3: defaultTier3,
        };
      }
    } catch (err) {
      console.error('[BackupReplicationService] Error reading config:', err);
    }

    return {
      tier2: defaultTier2,
      tier3: defaultTier3,
    };
  }

  public getConfig(maskSecret = true): MultiTierReplicationConfig {
    const cfg = this.getRawConfig();
    if (maskSecret) {
      if (cfg.tier2.secretAccessKey) {
        cfg.tier2.secretAccessKey = '********';
      }
      if (cfg.tier3.secretAccessKey) {
        cfg.tier3.secretAccessKey = '********';
      }
    }
    return cfg;
  }

  public saveConfig(payload: any): MultiTierReplicationConfig {
    const existing = this.getRawConfig();

    // Check if payload contains tier2 or tier3
    const tier2Payload: Partial<NodeConfig> = payload.tier2 || (payload.endpoint !== undefined ? payload : {});
    const tier3Payload: Partial<NodeConfig> = payload.tier3 || {};

    let secretKey2 = tier2Payload.secretAccessKey;
    if (!secretKey2 || secretKey2 === '********' || secretKey2.trim() === '') {
      secretKey2 = existing.tier2.secretAccessKey;
    }

    let secretKey3 = tier3Payload.secretAccessKey;
    if (!secretKey3 || secretKey3 === '********' || secretKey3.trim() === '') {
      secretKey3 = existing.tier3.secretAccessKey;
    }

    const updated: MultiTierReplicationConfig = {
      tier2: {
        enabled: tier2Payload.enabled ?? existing.tier2.enabled,
        name: (tier2Payload.name || existing.tier2.name || 'LAN Mirror (Mesin 2)').trim(),
        endpoint: (tier2Payload.endpoint !== undefined ? tier2Payload.endpoint : existing.tier2.endpoint).trim(),
        bucket: (tier2Payload.bucket !== undefined ? tier2Payload.bucket : existing.tier2.bucket).trim(),
        accessKeyId: (tier2Payload.accessKeyId !== undefined ? tier2Payload.accessKeyId : existing.tier2.accessKeyId).trim(),
        secretAccessKey: secretKey2.trim(),
        region: (tier2Payload.region || existing.tier2.region || 'us-east-1').trim(),
        forcePathStyle: tier2Payload.forcePathStyle !== undefined ? tier2Payload.forcePathStyle : existing.tier2.forcePathStyle,
        lastSyncedAt: tier2Payload.lastSyncedAt !== undefined ? tier2Payload.lastSyncedAt : existing.tier2.lastSyncedAt,
      },
      tier3: {
        enabled: tier3Payload.enabled ?? existing.tier3.enabled,
        name: (tier3Payload.name || existing.tier3.name || 'Cloud Mirror (Cloudflare R2)').trim(),
        endpoint: (tier3Payload.endpoint !== undefined ? tier3Payload.endpoint : existing.tier3.endpoint).trim(),
        bucket: (tier3Payload.bucket !== undefined ? tier3Payload.bucket : existing.tier3.bucket).trim(),
        accessKeyId: (tier3Payload.accessKeyId !== undefined ? tier3Payload.accessKeyId : existing.tier3.accessKeyId).trim(),
        secretAccessKey: secretKey3.trim(),
        region: (tier3Payload.region || existing.tier3.region || 'auto').trim(),
        forcePathStyle: tier3Payload.forcePathStyle !== undefined ? tier3Payload.forcePathStyle : existing.tier3.forcePathStyle,
        lastSyncedAt: tier3Payload.lastSyncedAt !== undefined ? tier3Payload.lastSyncedAt : existing.tier3.lastSyncedAt,
      },
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

  public async testConnection(payload?: any): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
  }> {
    const raw = this.getRawConfig();
    const cfg: Partial<NodeConfig> = payload?.config || payload || {};
    const tier: 'tier2' | 'tier3' = payload?.tier === 'tier3' ? 'tier3' : 'tier2';
    const fallbackNode = raw[tier];

    const targetEndpoint = (cfg.endpoint || fallbackNode.endpoint || '').trim();
    const targetBucket = (cfg.bucket || fallbackNode.bucket || 'absenta-platform-backups').trim();
    const targetAccessKey = (cfg.accessKeyId || fallbackNode.accessKeyId || '').trim();
    let targetSecretKey = (cfg.secretAccessKey || '').trim();
    
    if (!targetSecretKey || targetSecretKey === '********') {
      targetSecretKey = fallbackNode.secretAccessKey;
    }

    if (!targetEndpoint) {
      return { success: false, latencyMs: 0, message: 'Endpoint URL target belum diisi' };
    }
    if (!targetAccessKey || !targetSecretKey) {
      return { success: false, latencyMs: 0, message: 'Kredensial Access Key & Secret Key wajib diisi' };
    }

    const client = this.createClient({
      endpoint: targetEndpoint,
      region: cfg.region || fallbackNode.region || (tier === 'tier3' ? 'auto' : 'us-east-1'),
      accessKeyId: targetAccessKey,
      secretAccessKey: targetSecretKey,
      forcePathStyle: cfg.forcePathStyle !== undefined ? cfg.forcePathStyle : fallbackNode.forcePathStyle,
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
        : (err?.message || 'Gagal terhubung ke target MinIO/Cloud');
      return {
        success: false,
        latencyMs,
        message: `Koneksi gagal: ${msg}`,
      };
    }
  }

  public async getStatusSummary(): Promise<ReplicationStatusSummary> {
    const primaryCfg = this.getPrimaryConfig();
    const raw = this.getRawConfig();
    const tier2Cfg = raw.tier2;
    const tier3Cfg = raw.tier3;

    let primaryStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
    let primaryObjects = 0;
    let primaryBytes = 0;

    let tier2Status: 'ONLINE' | 'OFFLINE' | 'DISABLED' = tier2Cfg.enabled ? 'OFFLINE' : 'DISABLED';
    let tier2Objects = 0;
    let tier2Bytes = 0;
    let tier2Keys: string[] = [];

    let tier3Status: 'ONLINE' | 'OFFLINE' | 'DISABLED' = tier3Cfg.enabled ? 'OFFLINE' : 'DISABLED';
    let tier3Objects = 0;
    let tier3Bytes = 0;
    let tier3Keys: string[] = [];

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

    const probeTier2 = async () => {
      if (tier2Cfg.enabled && tier2Cfg.endpoint && tier2Cfg.accessKeyId) {
        try {
          const client = this.createClient(tier2Cfg);
          const res = await client.send(
            new ListObjectsV2Command({ Bucket: tier2Cfg.bucket }),
            { abortSignal: AbortSignal.timeout(2500) }
          );
          tier2Status = 'ONLINE';
          tier2Objects = res.KeyCount || 0;
          tier2Bytes = (res.Contents || []).reduce((acc, item) => acc + (item.Size || 0), 0);
          tier2Keys = (res.Contents || [])
            .map(item => item.Key)
            .filter((k): k is string => Boolean(k));
        } catch {
          tier2Status = 'OFFLINE';
        }
      }
    };

    const probeTier3 = async () => {
      if (tier3Cfg.enabled && tier3Cfg.endpoint && tier3Cfg.accessKeyId) {
        try {
          const client = this.createClient(tier3Cfg);
          const res = await client.send(
            new ListObjectsV2Command({ Bucket: tier3Cfg.bucket }),
            { abortSignal: AbortSignal.timeout(2500) }
          );
          tier3Status = 'ONLINE';
          tier3Objects = res.KeyCount || 0;
          tier3Bytes = (res.Contents || []).reduce((acc, item) => acc + (item.Size || 0), 0);
          tier3Keys = (res.Contents || [])
            .map(item => item.Key)
            .filter((k): k is string => Boolean(k));
        } catch {
          tier3Status = 'OFFLINE';
        }
      }
    };

    await Promise.allSettled([probePrimary(), probeTier2(), probeTier3()]);

    const tier2NodeStatus: NodeStatus = {
      enabled: tier2Cfg.enabled,
      name: tier2Cfg.name || 'LAN Mirror (Mesin 2)',
      endpoint: tier2Cfg.endpoint,
      bucket: tier2Cfg.bucket,
      status: tier2Status,
      totalObjects: tier2Objects,
      totalBytes: tier2Bytes,
      keys: tier2Keys,
      lastSyncedAt: tier2Cfg.lastSyncedAt,
    };

    const tier3NodeStatus: NodeStatus = {
      enabled: tier3Cfg.enabled,
      name: tier3Cfg.name || 'Cloud Mirror (Cloudflare R2)',
      endpoint: tier3Cfg.endpoint,
      bucket: tier3Cfg.bucket,
      status: tier3Status,
      totalObjects: tier3Objects,
      totalBytes: tier3Bytes,
      keys: tier3Keys,
      lastSyncedAt: tier3Cfg.lastSyncedAt,
    };

    return {
      primary: {
        name: primaryCfg.name,
        endpoint: primaryCfg.endpoint,
        bucket: primaryCfg.bucket,
        status: primaryStatus,
        totalObjects: primaryObjects,
        totalBytes: primaryBytes,
      },
      tier2: tier2NodeStatus,
      tier3: tier3NodeStatus,
      replica: tier2NodeStatus, // backward compatible
    };
  }

  private async syncToNode(primaryClient: S3Client, primaryBucket: string, targetNode: NodeConfig): Promise<{
    replicatedCount: number;
    replicatedKeys: string[];
    alreadyInTarget: number;
  }> {
    const targetClient = this.createClient(targetNode);

    // 1. Ensure target bucket exists
    try {
      await targetClient.send(new HeadBucketCommand({ Bucket: targetNode.bucket }));
    } catch {
      await targetClient.send(new CreateBucketCommand({ Bucket: targetNode.bucket }));
    }

    // 2. List primary
    const primaryRes = await primaryClient.send(new ListObjectsV2Command({ Bucket: primaryBucket }));
    const primaryItems = primaryRes.Contents || [];

    // 3. List target
    const targetRes = await targetClient.send(new ListObjectsV2Command({ Bucket: targetNode.bucket }));
    const targetMap = new Map<string, number>();
    (targetRes.Contents || []).forEach(item => {
      if (item.Key) targetMap.set(item.Key, item.Size || 0);
    });

    const replicatedKeys: string[] = [];
    let alreadyInTarget = 0;

    for (const item of primaryItems) {
      if (!item.Key) continue;
      const targetSize = targetMap.get(item.Key);

      if (targetSize !== undefined && targetSize === item.Size) {
        alreadyInTarget++;
        continue;
      }

      const getRes = await primaryClient.send(new GetObjectCommand({
        Bucket: primaryBucket,
        Key: item.Key,
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

        await targetClient.send(new PutObjectCommand({
          Bucket: targetNode.bucket,
          Key: item.Key,
          Body: pass,
          ContentType: getRes.ContentType || 'application/octet-stream',
          ContentLength: item.Size,
        }));

        replicatedKeys.push(item.Key);
      }
    }

    return {
      replicatedCount: replicatedKeys.length,
      replicatedKeys,
      alreadyInTarget,
    };
  }

  public async syncAll(targetTier?: 'all' | 'tier2' | 'tier3'): Promise<{
    success: boolean;
    totalPrimary: number;
    tier2Result?: { replicatedCount: number; alreadyInTarget: number };
    tier3Result?: { replicatedCount: number; alreadyInTarget: number };
    replicatedCount: number;
    replicatedKeys: string[];
    message: string;
  }> {
    const primaryCfg = this.getPrimaryConfig();
    const raw = this.getRawConfig();

    const doTier2 = (targetTier === undefined || targetTier === 'all' || targetTier === 'tier2') && raw.tier2.enabled;
    const doTier3 = (targetTier === undefined || targetTier === 'all' || targetTier === 'tier3') && raw.tier3.enabled;

    if (!doTier2 && !doTier3) {
      throw new Error('Tidak ada target replikasi yang aktif untuk disinkronkan.');
    }

    const primaryClient = this.createClient(primaryCfg);
    let totalReplicated = 0;
    const allReplicatedKeys: string[] = [];
    const nowIso = new Date().toISOString();

    let tier2Result;
    if (doTier2) {
      if (!raw.tier2.endpoint || !raw.tier2.accessKeyId || !raw.tier2.secretAccessKey) {
        throw new Error('Konfigurasi target Tier 2 (LAN) belum lengkap.');
      }
      tier2Result = await this.syncToNode(primaryClient, primaryCfg.bucket, raw.tier2);
      totalReplicated += tier2Result.replicatedCount;
      allReplicatedKeys.push(...tier2Result.replicatedKeys);
      raw.tier2.lastSyncedAt = nowIso;
    }

    let tier3Result;
    if (doTier3) {
      if (!raw.tier3.endpoint || !raw.tier3.accessKeyId || !raw.tier3.secretAccessKey) {
        throw new Error('Konfigurasi target Tier 3 (Cloud) belum lengkap.');
      }
      tier3Result = await this.syncToNode(primaryClient, primaryCfg.bucket, raw.tier3);
      totalReplicated += tier3Result.replicatedCount;
      allReplicatedKeys.push(...tier3Result.replicatedKeys);
      raw.tier3.lastSyncedAt = nowIso;
    }

    // Save updated lastSyncedAt
    this.saveConfig(raw);

    const primaryRes = await primaryClient.send(new ListObjectsV2Command({ Bucket: primaryCfg.bucket }));
    const totalPrimary = (primaryRes.Contents || []).length;

    const summaryMsg = [
      doTier2 ? `Tier 2 LAN (${tier2Result?.replicatedCount || 0} baru)` : null,
      doTier3 ? `Tier 3 Cloud (${tier3Result?.replicatedCount || 0} baru)` : null,
    ].filter(Boolean).join(' & ');

    return {
      success: true,
      totalPrimary,
      tier2Result,
      tier3Result,
      replicatedCount: totalReplicated,
      replicatedKeys: allReplicatedKeys,
      message: `Sinkronisasi selesai! Berhasil menyinkronkan snapshot ke ${summaryMsg}.`,
    };
  }

  public async replicateFileIfEnabled(key: string): Promise<boolean> {
    const raw = this.getRawConfig();
    const primaryCfg = this.getPrimaryConfig();
    let replicatedAny = false;

    const replicateToSingleNode = async (node: NodeConfig) => {
      if (!node.enabled || !node.endpoint || !node.accessKeyId || !node.secretAccessKey) {
        return;
      }
      try {
        const primaryClient = this.createClient(primaryCfg);
        const targetClient = this.createClient(node);

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

          await targetClient.send(new PutObjectCommand({
            Bucket: node.bucket,
            Key: key,
            Body: pass,
            ContentType: getRes.ContentType || 'application/octet-stream',
            ContentLength: getRes.ContentLength,
          }));

          replicatedAny = true;
          node.lastSyncedAt = new Date().toISOString();
          console.log(`[BackupReplicationService] Auto-replicated "${key}" to ${node.name || node.endpoint}`);
        }
      } catch (err: any) {
        console.error(`[BackupReplicationService] Failed to auto-replicate "${key}" to ${node.name || node.endpoint}:`, err?.message || err);
      }
    };

    await Promise.allSettled([
      replicateToSingleNode(raw.tier2),
      replicateToSingleNode(raw.tier3),
    ]);

    if (replicatedAny) {
      this.saveConfig(raw);
    }
    return replicatedAny;
  }
}

export const backupReplicationService = new BackupReplicationService();
