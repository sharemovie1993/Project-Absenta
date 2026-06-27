import { BackupStorage } from './BackupStorage';
import { PassThrough, Readable, Transform } from 'stream';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { storageService } from './storage.service';

export class LocalDiskStorage implements BackupStorage {
  private baseDir: string;

  constructor(baseDir: string = 'backups') {
    const storageBase = process.env.STORAGE_LOCAL_DIR
      ? path.resolve(process.env.STORAGE_LOCAL_DIR)
      : process.cwd();
    this.baseDir = path.resolve(storageBase, baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(stream: Readable, filename: string): Promise<{ path: string, size: number, checksum: string }> {
    const safeFilename = filename.replace(/^(\.\.(\/|\\|$))+/, '');
    const storageBase = process.env.STORAGE_LOCAL_DIR
      ? path.resolve(process.env.STORAGE_LOCAL_DIR)
      : process.cwd();
    const baseRel = path.relative(storageBase, this.baseDir);
    const storageKey = path.join(baseRel, safeFilename).replace(/\\/g, '/');

    const gzip = zlib.createGzip({ level: 9 });
    const hash = crypto.createHash('sha256');
    let size = 0;

    const monitor = new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        size += chunk.length;
        this.push(chunk);
        callback();
      }
    });

    const dest = new PassThrough();
    const uploadPromise = storageService.uploadStream(storageKey, dest, { contentType: 'application/gzip' });
    await pipeline(stream, gzip, monitor, dest);
    await uploadPromise

    return {
      path: safeFilename,
      size,
      checksum: hash.digest('hex'),
    };
  }

  read(filePath: string): Readable {
      const storageBase = process.env.STORAGE_LOCAL_DIR
        ? path.resolve(process.env.STORAGE_LOCAL_DIR)
        : process.cwd();
      if (path.isAbsolute(filePath)) {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.toLowerCase().startsWith(this.baseDir.toLowerCase())) {
          throw new Error('Invalid path: Access denied');
        }
        const key = path.relative(storageBase, resolvedPath).replace(/\\/g, '/');
        return storageService.createReadStream(key);
      }
      const baseRel = path.relative(storageBase, this.baseDir);
      const key = path.join(baseRel, filePath).replace(/\\/g, '/');
      return storageService.createReadStream(key);
  }

  async delete(filePath: string): Promise<void> {
      const storageBase = process.env.STORAGE_LOCAL_DIR
        ? path.resolve(process.env.STORAGE_LOCAL_DIR)
        : process.cwd();
      if (path.isAbsolute(filePath)) {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.toLowerCase().startsWith(this.baseDir.toLowerCase())) {
          throw new Error('Invalid path: Access denied');
        }
        const key = path.relative(storageBase, resolvedPath).replace(/\\/g, '/');
        await storageService.delete(key);
        return;
      }
      const baseRel = path.relative(storageBase, this.baseDir);
      const key = path.join(baseRel, filePath).replace(/\\/g, '/');
      await storageService.delete(key);
  }
}
