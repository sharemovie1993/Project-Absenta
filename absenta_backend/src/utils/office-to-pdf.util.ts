import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { storageService } from '../infra/storage/storage.service';

const execFileAsync = promisify(execFile);

const CONVERTIBLE_EXTS = new Set(['.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx']);

export function getSiblingPdfRelativePath(relativePath: string): string | null {
  if (!relativePath) return null;
  const cleanRel = String(relativePath).replace(/^\/+/, '').replace(/\\/g, '/');
  const ext = path.extname(cleanRel).toLowerCase();
  if (!CONVERTIBLE_EXTS.has(ext)) return null;
  const withoutExt = cleanRel.slice(0, -ext.length);
  return `${withoutExt}.pdf`;
}

export async function resolveExistingSiblingPdf(relativePath: string): Promise<string | null> {
  const siblingRel = getSiblingPdfRelativePath(relativePath);
  if (!siblingRel) return null;
  try {
    const exists = await storageService.exists(siblingRel);
    return exists ? siblingRel : null;
  } catch {
    return null;
  }
}

/**
 * Mengonversi file Office (.ppt, .pptx, .doc, .docx) dari storageService (S3/MinIO maupun local)
 * menjadi PDF pendamping di path yang sama menggunakan LibreOffice headless.
 */
export async function convertOfficeToPdfSibling(relativePath: string): Promise<string | null> {
  const siblingRel = getSiblingPdfRelativePath(relativePath);
  if (!siblingRel) return null;

  const cleanRel = String(relativePath).replace(/^\/+/, '').replace(/\\/g, '/');
  let tmpDir: string | null = null;

  try {
    const sourceBuffer = await storageService.readFileBuffer(cleanRel);
    if (!sourceBuffer || sourceBuffer.length === 0) return null;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'absenta-office-'));
    const inputName = path.basename(cleanRel);
    const tmpInput = path.join(tmpDir, inputName);
    fs.writeFileSync(tmpInput, sourceBuffer);

    const args = [
      '--headless',
      '--norestore',
      '-env:UserInstallation=file://' + path.join(tmpDir, 'lo-profile'),
      '--convert-to',
      'pdf',
      '--outdir',
      tmpDir,
      tmpInput,
    ];

    const expectedPdfPath = path.join(
      tmpDir,
      `${inputName.slice(0, -path.extname(inputName).length)}.pdf`
    );

    for (const bin of ['libreoffice', 'soffice']) {
      try {
        await execFileAsync(bin, args, { timeout: 60000 });
        if (fs.existsSync(expectedPdfPath)) {
          const pdfBuffer = fs.readFileSync(expectedPdfPath);
          await storageService.uploadBuffer(siblingRel, pdfBuffer, {
            contentType: 'application/pdf',
          });
          return siblingRel;
        }
      } catch {
        // Coba binary berikutnya
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
