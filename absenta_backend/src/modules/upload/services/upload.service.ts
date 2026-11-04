import path from 'path';
import { MultipartFile } from '@fastify/multipart';
import crypto from 'crypto';
import { storageService } from '../../../infra/storage/storage.service';

export interface SaveUploadOptions {
  tenantId?: string | null;
}

export class UploadService {
  constructor() {}

  async saveFile(file: MultipartFile, opts?: SaveUploadOptions): Promise<{ url: string; deduplicated: boolean; sizeBytes: number }> {
    const rawExt = path.extname(file.filename || '').toLowerCase();
    const fallbackExt =
      file.mimetype === 'image/webp'
        ? '.webp'
        : file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/jpeg'
            ? '.jpg'
            : file.mimetype === 'image/gif'
              ? '.gif'
              : file.mimetype === 'image/svg+xml'
                ? '.svg'
                : '.bin';
    const fileExtension = rawExt || fallbackExt;

    // Baca stream ke buffer untuk menghitung SHA-256 Content Hash (Deduplikasi per Tenant)
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 28);
    const safeTenant = String(opts?.tenantId || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    const fileName = `${contentHash}${fileExtension}`;
    const relativeSubPath = safeTenant ? `${safeTenant}/${fileName}` : fileName;
    const storageKey = `uploads/${relativeSubPath}`;

    // Deduplikasi: jika file dengan hash identik sudah ada di tenant ini, tidak perlu tulis ulang ke disk/S3
    const alreadyExists = await storageService.exists(storageKey);
    if (!alreadyExists) {
      await storageService.uploadBuffer(storageKey, buffer, {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000, immutable',
      });
    }

    return {
      url: `/api/uploads/${relativeSubPath}`,
      deduplicated: alreadyExists,
      sizeBytes: buffer.length,
    };
  }
}
