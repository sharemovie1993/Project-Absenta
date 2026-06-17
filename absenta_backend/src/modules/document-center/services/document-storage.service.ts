import path from 'path';
import crypto from 'crypto';
import { MultipartFile } from '@fastify/multipart';
import { storageService } from '../../../infra/storage/storage.service';

function toPosixPath(filePath: string) {
  return filePath.replace(/\\/g, '/');
}

function sanitizeFileName(fileName: string) {
  const base = path.basename(fileName);
  return base.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
}

export class DocumentStorageService {
  constructor() {}

  async saveFile(params: {
    tenantId: string | null | undefined;
    category: string;
    file: MultipartFile;
  }) {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const tenantSegment = params.tenantId || 'global';
    const categorySegment = String(params.category || 'OTHER').toUpperCase();

    const safeOriginalName = sanitizeFileName(params.file.filename);
    const randomPrefix = crypto.randomBytes(16).toString('hex');
    const finalName = `${randomPrefix}_${safeOriginalName}`;

    const relativeDir = path.join('storage', 'documents', tenantSegment, categorySegment, year, month);
    const relativePath = toPosixPath(path.join(relativeDir, finalName));
    const result = await storageService.uploadStream(relativePath, params.file.file, {
      contentType: params.file.mimetype,
    });

    return {
      relativePath,
      sizeBytes: result.sizeBytes,
      originalName: safeOriginalName,
      mimeType: params.file.mimetype,
    };
  }

  async saveBuffer(params: {
    tenantId: string | null | undefined;
    category: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const tenantSegment = params.tenantId || 'global';
    const categorySegment = String(params.category || 'OTHER').toUpperCase();

    const safeOriginalName = sanitizeFileName(params.originalName);
    const randomPrefix = crypto.randomBytes(16).toString('hex');
    const finalName = `${randomPrefix}_${safeOriginalName}`;

    const relativeDir = path.join('storage', 'documents', tenantSegment, categorySegment, year, month);
    const relativePath = toPosixPath(path.join(relativeDir, finalName));
    await storageService.uploadBuffer(relativePath, params.buffer, { contentType: params.mimeType });

    return {
      relativePath,
      sizeBytes: params.buffer.length,
      originalName: safeOriginalName,
      mimeType: params.mimeType,
    };
  }

  createReadStream(storagePath: string) {
    return storageService.createReadStream(storagePath);
  }
}
