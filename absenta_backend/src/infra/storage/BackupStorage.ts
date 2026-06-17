import { Readable } from 'stream';

export interface BackupStorage {
  save(stream: Readable, filename: string): Promise<{ path: string, size: number, checksum: string }>;
  read(path: string): Readable;
  delete(path: string): Promise<void>;
}
