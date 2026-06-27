import fs from 'fs';
import path from 'path';
import { Readable, PassThrough, Transform } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageDriverName = 'local' | 's3';

type UploadOptions = {
  contentType?: string;
  cacheControl?: string;
};

type UploadResult = {
  key: string;
  sizeBytes: number;
};

type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
  presignExpiresSeconds: number;
};

function toPosixKey(v: string): string {
  return String(v || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function ensureSafeRelativeKey(key: string): string {
  const k = toPosixKey(key);
  if (!k || k.includes('..') || k.startsWith('/')) throw new Error('Invalid storage key');
  return k;
}

function resolveLocalPath(key: string): { absolutePath: string; absoluteDir: string } {
  const safeKey = ensureSafeRelativeKey(key);
  const baseDir = process.env.STORAGE_LOCAL_DIR
    ? path.resolve(process.env.STORAGE_LOCAL_DIR)
    : path.resolve(process.cwd());
  const abs = path.resolve(baseDir, safeKey);
  if (!abs.toLowerCase().startsWith(baseDir.toLowerCase() + path.sep) && abs.toLowerCase() !== baseDir.toLowerCase()) {
    throw new Error('Invalid storage key');
  }
  return { absolutePath: abs, absoluteDir: path.dirname(abs) };
}

function buildS3Config(): S3Config | null {
  const driver = String(process.env.STORAGE_DRIVER || '').trim().toLowerCase();
  const invoicePdfStorage = String(process.env.INVOICE_PDF_STORAGE || '').trim().toLowerCase();
  const enabled = driver === 's3' || invoicePdfStorage === 's3';
  if (!enabled) return null;

  const bucket = String(process.env.S3_BUCKET || '').trim();
  const region = String(process.env.S3_REGION || '').trim() || 'us-east-1';
  const endpoint = String(process.env.S3_ENDPOINT || '').trim() || undefined;
  const accessKeyId =
    String(process.env.S3_ACCESS_KEY || '').trim() ||
    String(process.env.S3_ACCESS_KEY_ID || '').trim();
  const secretAccessKey =
    String(process.env.S3_SECRET_KEY || '').trim() ||
    String(process.env.S3_SECRET_ACCESS_KEY || '').trim();
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || '').trim().toLowerCase() === 'true';
  const publicBaseUrl = String(process.env.S3_PUBLIC_BASE_URL || '').trim() || undefined;
  const presignExpiresSeconds = (() => {
    const raw = parseInt(String(process.env.S3_PRESIGN_EXPIRES_SECONDS || '').trim() || '');
    return Number.isFinite(raw) && raw > 0 ? raw : 3600;
  })();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      `Storage driver is set to S3, but configuration is incomplete. Missing: ${
        !bucket ? 'S3_BUCKET ' : ''
      }${!accessKeyId ? 'S3_ACCESS_KEY/S3_ACCESS_KEY_ID ' : ''}${
        !secretAccessKey ? 'S3_SECRET_KEY/S3_SECRET_ACCESS_KEY' : ''
      }`
    );
  }
  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    publicBaseUrl,
    presignExpiresSeconds,
  };
}

function createS3Client(cfg: S3Config): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function buildPublicObjectUrl(publicBaseUrl: string, key: string): string {
  const base = String(publicBaseUrl || '').replace(/\/+$/, '');
  const encoded = toPosixKey(key)
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${base}/${encoded}`;
}

function withByteCounter(input: Readable, onBytes: (n: number) => void): Readable {
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      try {
        const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
        onBytes(len);
      } catch {}
      this.push(chunk);
      cb();
    },
  });
  input.pipe(counter);
  return counter;
}

export class StorageService {
  private cachedS3: { cfg: S3Config; client: S3Client } | null = null;

  getDriverName(): StorageDriverName {
    return buildS3Config() ? 's3' : 'local';
  }

  private getS3(): { cfg: S3Config; client: S3Client } | null {
    const cfg = buildS3Config();
    if (!cfg) return null;
    if (this.cachedS3 && this.cachedS3.cfg.bucket === cfg.bucket) return this.cachedS3;
    const client = createS3Client(cfg);
    this.cachedS3 = { cfg, client };
    return this.cachedS3;
  }

  async uploadBuffer(key: string, buffer: Buffer, opts?: UploadOptions): Promise<UploadResult> {
    const safeKey = ensureSafeRelativeKey(key);
    const sizeBytes = buffer.length;
    const s3 = this.getS3();
    if (s3) {
      await s3.client.send(
        new PutObjectCommand({
          Bucket: s3.cfg.bucket,
          Key: safeKey,
          Body: buffer,
          ...(opts?.contentType ? { ContentType: opts.contentType } : {}),
          ...(opts?.cacheControl ? { CacheControl: opts.cacheControl } : {}),
        })
      );
      return { key: safeKey, sizeBytes };
    }

    const { absolutePath, absoluteDir } = resolveLocalPath(safeKey);
    await fs.promises.mkdir(absoluteDir, { recursive: true });
    await fs.promises.writeFile(absolutePath, buffer);
    return { key: safeKey, sizeBytes };
  }

  async uploadStream(key: string, stream: Readable, opts?: UploadOptions): Promise<UploadResult> {
    const safeKey = ensureSafeRelativeKey(key);
    let sizeBytes = 0;
    const tracked = withByteCounter(stream, (n) => {
      sizeBytes += n;
    });

    const s3 = this.getS3();
    if (s3) {
      const pass = new PassThrough();
      const upload = s3.client.send(
        new PutObjectCommand({
          Bucket: s3.cfg.bucket,
          Key: safeKey,
          Body: pass,
          ...(opts?.contentType ? { ContentType: opts.contentType } : {}),
          ...(opts?.cacheControl ? { CacheControl: opts.cacheControl } : {}),
        })
      );
      const done = new Promise<void>((resolve, reject) => {
        tracked.on('error', reject);
        pass.on('error', reject);
        pass.on('finish', () => resolve());
      });
      tracked.pipe(pass);
      await Promise.all([upload, done]);
      return { key: safeKey, sizeBytes };
    }

    const { absolutePath, absoluteDir } = resolveLocalPath(safeKey);
    await fs.promises.mkdir(absoluteDir, { recursive: true });
    const write = fs.createWriteStream(absolutePath);
    await new Promise<void>((resolve, reject) => {
      tracked.on('error', reject);
      write.on('error', reject);
      write.on('finish', () => resolve());
      tracked.pipe(write);
    });
    return { key: safeKey, sizeBytes };
  }

  createReadStream(key: string): Readable {
    const safeKey = ensureSafeRelativeKey(key);
    const s3 = this.getS3();
    if (s3) {
      const pass = new PassThrough();
      s3.client
        .send(new GetObjectCommand({ Bucket: s3.cfg.bucket, Key: safeKey }))
        .then((res: any) => {
          const body = res?.Body;
          if (body && typeof body.pipe === 'function') {
            body.pipe(pass);
            return;
          }
          pass.end();
        })
        .catch(() => {
          pass.destroy(new Error('Storage read failed'));
        });
      return pass;
    }
    const { absolutePath } = resolveLocalPath(safeKey);
    return fs.createReadStream(absolutePath);
  }

  async delete(key: string): Promise<void> {
    const safeKey = ensureSafeRelativeKey(key);
    const s3 = this.getS3();
    if (s3) {
      await s3.client.send(new DeleteObjectCommand({ Bucket: s3.cfg.bucket, Key: safeKey }));
      return;
    }
    const { absolutePath } = resolveLocalPath(safeKey);
    try {
      await fs.promises.unlink(absolutePath);
    } catch {}
  }

  async exists(key: string): Promise<boolean> {
    if (!key) return false;
    const safeKey = ensureSafeRelativeKey(key);
    const s3 = this.getS3();
    if (s3) {
      try {
        await s3.client.send(new HeadObjectCommand({ Bucket: s3.cfg.bucket, Key: safeKey }));
        return true;
      } catch {
        return false;
      }
    }
    const { absolutePath } = resolveLocalPath(safeKey);
    try {
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string | null {
    const safeKey = ensureSafeRelativeKey(key);
    const s3 = this.getS3();
    if (!s3?.cfg.publicBaseUrl) return null;
    return buildPublicObjectUrl(s3.cfg.publicBaseUrl, safeKey);
  }

  async getSignedDownloadUrl(key: string, expiresSeconds?: number): Promise<string | null> {
    const safeKey = ensureSafeRelativeKey(key);
    const s3 = this.getS3();
    if (!s3) return null;
    const exp = Number.isFinite(Number(expiresSeconds)) && Number(expiresSeconds) > 0 ? Number(expiresSeconds) : s3.cfg.presignExpiresSeconds;
    return await getSignedUrl(s3.client, new GetObjectCommand({ Bucket: s3.cfg.bucket, Key: safeKey }), { expiresIn: exp });
  }
}

export const storageService = new StorageService();
