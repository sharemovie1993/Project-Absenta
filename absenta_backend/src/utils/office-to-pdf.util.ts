import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CONVERTIBLE_EXTS = new Set(['.ppt', '.pptx', '.doc', '.docx']);

export function getSiblingPdfRelativePath(relativePath: string): string | null {
  if (!relativePath) return null;
  const ext = path.extname(relativePath).toLowerCase();
  if (!CONVERTIBLE_EXTS.has(ext)) return null;
  const withoutExt = relativePath.slice(0, -ext.length);
  return `${withoutExt}.pdf`.replace(/\\/g, '/');
}

export function resolveExistingSiblingPdf(relativePath: string): string | null {
  const siblingRel = getSiblingPdfRelativePath(relativePath);
  if (!siblingRel) return null;
  const absPdf = path.resolve(process.cwd(), siblingRel);
  return fs.existsSync(absPdf) ? siblingRel : null;
}

/**
 * Mengonversi file Office (.ppt, .pptx, .doc, .docx) menjadi PDF pendamping
 * di folder yang sama menggunakan LibreOffice headless.
 * Mengembalikan relative path PDF jika berhasil, atau null jika LibreOffice tidak tersedia/gagal.
 */
export async function convertOfficeToPdfSibling(relativePath: string): Promise<string | null> {
  const siblingRel = getSiblingPdfRelativePath(relativePath);
  if (!siblingRel) return null;

  const absInput = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(absInput)) return null;

  const outDir = path.dirname(absInput);
  const args = ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', outDir, absInput];

  for (const bin of ['libreoffice', 'soffice']) {
    try {
      await execFileAsync(bin, args, { timeout: 45000 });
      const absPdf = path.resolve(process.cwd(), siblingRel);
      if (fs.existsSync(absPdf)) {
        return siblingRel;
      }
    } catch {
      // Coba binary berikutnya atau lewati tanpa menggagalkan upload
    }
  }

  return null;
}
