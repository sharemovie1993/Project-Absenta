import path from 'path';
import { MultipartFile } from '@fastify/multipart';
import crypto from 'crypto';
import { storageService } from '../../../infra/storage/storage.service';
import { getSmartApiBaseUrl } from '@/utils/url-helper';

export class UploadService {
  constructor() {}

  async saveFile(file: MultipartFile): Promise<string> {
    const fileExtension = path.extname(file.filename);
    const randomName = crypto.randomBytes(16).toString('hex');
    const fileName = `${randomName}${fileExtension}`;
    const storageKey = `uploads/${fileName}`;

    await storageService.uploadStream(storageKey, file.file, { contentType: file.mimetype });

    const appUrl = getSmartApiBaseUrl();
    const baseUrl = appUrl.replace(/\/+$/, '');
    return `${baseUrl}/uploads/${fileName}`;
  }
}
