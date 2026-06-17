import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import axios from 'axios';

const prisma = new PrismaClient();

export class GoogleDriveService {
  /**
   * Extracts folder ID from a standard Google Drive folder URL
   */
  extractFolderId(url: string): string | null {
    if (!url) return null;
    // Format: https://drive.google.com/drive/folders/1A2B3C4D5E...
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Return direct string if it looks like an ID
    if (/^[a-zA-Z0-9-_]{15,}$/.test(url)) {
      return url;
    }
    return null;
  }

  /**
   * Extracts file ID from a Google Drive view URL
   */
  extractFileId(url: string): string | null {
    if (!url) return null;
    
    // Pattern 1: /file/d/[ID]/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileMatch && fileMatch[1]) return fileMatch[1];
    
    // Pattern 2: ?id=[ID] or &id=[ID]
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    // Pattern 3: /d/[ID]/
    const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (dMatch && dMatch[1]) return dMatch[1];

    return null;
  }

  /**
   * Relays upload to Google Drive.
   */
  async uploadToDrive(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    subFolderName?: string
  ): Promise<string> {
    // 1. Get Config from Database
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_FOLDER_URL' }
    });

    const folderUrl = (config?.value || '').trim();

    // METHOD A: Google Apps Script Web App Relay
    if (folderUrl.startsWith('https://script.google.com/macros/')) {
      try {
        console.log(`[GoogleDriveService] Uploading via Google Apps Script Web App relay...`);
        const base64 = fileBuffer.toString('base64');
        
        const response = await axios.post(folderUrl, {
          filename: fileName,
          mimetype: mimeType,
          base64: base64,
          subfolder: subFolderName // Pastikan field ini bernama 'subfolder' sesuai kode GAS
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000
        });

        if (response.data && response.data.success === true && response.data.url) {
          console.log(`[GoogleDriveService] Successfully uploaded via Apps Script. URL: ${response.data.url}`);
          return response.data.url;
        } else {
          const errorDetail = response.data?.error || 'Apps Script returned failure status';
          // Jika error mengandung kata "Akses ditolak" namun ada URL, kita toleransi
          if (response.data?.url) {
            console.warn(`[GoogleDriveService] Apps Script reported error but returned URL. Proceeding: ${errorDetail}`);
            return response.data.url;
          }
          console.error(`[GoogleDriveService] Apps Script Error: ${errorDetail}`);
          throw new Error(`Google Drive Error: ${errorDetail}`);
        }
      } catch (error: any) {
        const msg = error.response?.data?.error || error.message;
        console.error(`[GoogleDriveService] Connection Error to Apps Script: ${msg}`);
        throw new Error(`Gagal menghubungi Google Drive Relay: ${msg}`);
      }
    } 
    // METHOD B: Service Account Upload
    else {
      const parentFolderId = this.extractFolderId(folderUrl);
      const envKeyPath = process.env.GOOGLE_DRIVE_KEY_PATH || 'credentials/google-drive-key.json';
      const keyPath = path.resolve(process.cwd(), envKeyPath);

      if (fs.existsSync(keyPath)) {
        try {
          const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
          });

          const drive = google.drive({ version: 'v3', auth });

          let finalFolderId = parentFolderId;
          if (subFolderName && parentFolderId) {
            try {
              const searchResponse = await drive.files.list({
                q: `name = '${subFolderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name)',
                spaces: 'drive',
              });

              if (searchResponse.data.files && searchResponse.data.files.length > 0) {
                finalFolderId = searchResponse.data.files[0].id!;
              } else {
                const createFolderResponse = await drive.files.create({
                  requestBody: {
                    name: subFolderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentFolderId],
                  },
                  fields: 'id',
                });
                finalFolderId = createFolderResponse.data.id!;
              }
            } catch (folderError: any) {
              console.warn(`[GoogleDriveService] Error resolving subfolder: ${folderError.message}`);
            }
          }

          const bufferStream = new Readable();
          bufferStream.push(fileBuffer);
          bufferStream.push(null);

          const response = await drive.files.create({
            requestBody: {
              name: fileName,
              mimeType: mimeType,
              parents: finalFolderId ? [finalFolderId] : undefined,
            },
            media: {
              mimeType: mimeType,
              body: bufferStream,
            },
            fields: 'id, webViewLink',
          });

          const fileId = response.data.id;
          const webViewLink = response.data.webViewLink;

          if (fileId && webViewLink) {
            try {
              await drive.permissions.create({
                fileId: fileId,
                requestBody: { role: 'reader', type: 'anyone' },
              });
            } catch (pErr) {}
            return webViewLink;
          }
        } catch (error: any) {
          console.error(`[GoogleDriveService] Drive API Upload Error: ${error.message}`);
        }
      }
    }

    // FALLBACK - Hanya jika semua metode gagal
    console.error(`[GoogleDriveService] All upload methods failed. Returning fallback URL.`);
    throw new Error('Gagal mengunggah file ke Google Drive. Silakan periksa konfigurasi Apps Script Anda.');
  }

  /**
   * Permanently deletes a file from Google Drive
   */
  async deleteFromDrive(tenantId: string, fileUrl: string): Promise<boolean> {
    const fileId = this.extractFileId(fileUrl);
    if (!fileId) return false;

    if (fileId.startsWith('1_gdrive_')) return true;

    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_FOLDER_URL' }
    });
    const folderUrl = (config?.value || '').trim();

    if (folderUrl.startsWith('https://script.google.com/macros/')) {
      try {
        const response = await axios.post(folderUrl, {
          action: 'delete',
          fileId: fileId
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
        
        // Memastikan Apps Script membalas dengan success: true
        return response.data && response.data.success === true;
      } catch (error: any) {
        console.error(`[GoogleDriveService] Apps Script Delete Error: ${error.message}`);
        return false;
      }
    }

    const envKeyPath = process.env.GOOGLE_DRIVE_KEY_PATH || 'credentials/google-drive-key.json';
    const keyPath = path.resolve(process.cwd(), envKeyPath);

    if (fs.existsSync(keyPath)) {
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: keyPath,
          scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });
        const drive = google.drive({ version: 'v3', auth });
        await drive.files.delete({ fileId });
        return true;
      } catch (error: any) {
        return false;
      }
    }

    return false;
  }
}

export const googleDriveService = new GoogleDriveService();
