/**
 * True WYSIWYG Multi-Page PDF Exporter for `.print-sheet` elements.
 * Renders each `.print-sheet` at 2.5x DPI without vertical squashing and
 * automatically slices tall sheets across A4 pages at exact 1:1 physical scale.
 */
export async function exportPrintSheetsToPdf(
  container: HTMLElement,
  fileName: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
  if (sheets.length === 0) {
    throw new Error('Tidak ada lembar dokumen (.print-sheet) untuk diekspor');
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

  let isFirstPage = true;

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const canvas = await html2canvas(sheet, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll<HTMLElement>('.print-sheet').forEach((s) => {
          s.style.border = 'none';
          s.style.boxShadow = 'none';
          s.style.outline = 'none';
          s.style.borderRadius = '0';
        });
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let positionY = 0;

    if (!isFirstPage) {
      pdf.addPage('a4', orientation);
    }
    isFirstPage = false;

    pdf.addImage(imgData, 'JPEG', 0, positionY, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Slice tall sheets cleanly across subsequent A4 pages without squashing
    while (heightLeft > 2) {
      positionY = -(imgHeight - heightLeft);
      pdf.addPage('a4', orientation);
      pdf.addImage(imgData, 'JPEG', 0, positionY, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
  }

  pdf.save(fileName);
}
