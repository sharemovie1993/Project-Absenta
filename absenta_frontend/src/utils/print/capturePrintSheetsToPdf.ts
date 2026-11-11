/**
 * capturePrintSheetsToPdf.ts
 * Utilitas bersama Universal Document Printing Engine untuk mengonversi lembar dokumen
 * (.print-sheet di dalam PrintDeskCanvas) menjadi berkas PDF Blob + Base64 True WYSIWYG.
 * Digunakan oleh fitur "Kirim ke WA" universal pada UniversalDocumentModal & UniversalDocumentTab.
 */

export interface CapturedPdfResult {
  blob: Blob;
  base64: string;
  sizeBytes: number;
  pageCount: number;
  fileName: string;
}

/**
 * Mengonversi Blob menjadi string base64 murni (tanpa prefix data URI).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Gagal membaca data binary dokumen PDF.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Membersihkan judul / string menjadi nama file PDF yang aman & rapi.
 */
export function sanitizePdfFileName(rawTitle?: string): string {
  const cleaned = (rawTitle || 'Dokumen_Resmi')
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
  return `${cleaned || 'Dokumen_Resmi'}.pdf`;
}

/**
 * Meng-capture elemen `.print-sheet` di dalam container `PrintDeskCanvas` (via deskRef)
 * menjadi satu dokumen PDF True WYSIWYG (A4 Portrait / Landscape) untuk dikirim atau diunduh.
 */
export async function capturePrintSheetsToPdfBlob(
  containerEl: HTMLElement | null,
  options?: {
    orientation?: 'portrait' | 'landscape';
    fileName?: string;
    scale?: number;
  },
): Promise<CapturedPdfResult> {
  if (!containerEl) {
    throw new Error('Area kanvas dokumen tidak ditemukan untuk dikonversi ke PDF.');
  }

  const orientation = options?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const fileName = sanitizePdfFileName(options?.fileName);
  const scale = options?.scale ?? 2;

  const zoomWrapper =
    (containerEl.querySelector('#print-desk-canvas-area') as HTMLElement | null) ||
    (containerEl.firstElementChild as HTMLElement | null);

  const prevZoom = zoomWrapper ? zoomWrapper.style.zoom : '';

  try {
    // Wajib reset CSS zoom ke '1' sebelum render html2canvas agar tidak terdistorsi saat mode "Pas Layar"
    if (zoomWrapper) {
      zoomWrapper.style.zoom = '1';
      void zoomWrapper.offsetHeight;
    }

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));

    let sheetElements = Array.from(
      containerEl.querySelectorAll('.print-sheet'),
    ) as HTMLElement[];

    if (sheetElements.length === 0) {
      sheetElements = Array.from(
        containerEl.querySelectorAll('.page-card'),
      ) as HTMLElement[];
    }
    if (sheetElements.length === 0) {
      sheetElements = Array.from(
        containerEl.querySelectorAll('[data-print-sheet="true"]'),
      ) as HTMLElement[];
    }
    if (sheetElements.length === 0 && zoomWrapper) {
      sheetElements = [zoomWrapper];
    }
    if (sheetElements.length === 0) {
      throw new Error('Lembar dokumen cetak (.print-sheet) tidak ditemukan.');
    }

    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    for (let i = 0; i < sheetElements.length; i++) {
      if (i > 0) pdf.addPage('a4', orientation);
      const sheet = sheetElements[i];
      const canvas = await html2canvas(sheet, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const renderedHeight = Math.min(pdfHeight, (canvas.height * pdfWidth) / canvas.width);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderedHeight || pdfHeight, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    const base64 = await blobToBase64(blob);

    return {
      blob,
      base64,
      sizeBytes: blob.size,
      pageCount: sheetElements.length,
      fileName,
    };
  } finally {
    if (zoomWrapper) {
      zoomWrapper.style.zoom = prevZoom;
    }
  }
}
