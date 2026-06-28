import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfOptions } from '../pdfAcademic';
import type { Kelas } from '../../../types/academic';

export const renderAcademicJournalPdf = (
  doc: jsPDF,
  options: GeneratePdfOptions,
  c: Kelas | null,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): void => {
  const { checklistData } = options;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BUKU JURNAL HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)', pageWidth / 2, headerEndY + 6, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

  const head = [[
    { content: 'NO', styles: { halign: 'center' } },
    { content: 'HARI / TANGGAL', styles: { halign: 'center' } },
    { content: 'JAM KE-', styles: { halign: 'center' } },
    { content: 'MATA PELAJARAN' },
    { content: 'URAIAN MATERI / KD YANG DIAJARKAN' },
    { content: 'SISWA TIDAK HADIR (NAMA & ALASAN)' },
    { content: 'PARAF GURU', styles: { halign: 'center' } }
  ]];
  const body = Array.from({ length: 8 }).map((_, idx) => [
    idx + 1, '', '', '', '', '', ''
  ]);
  
  autoTable(doc, {
    startY: headerEndY + 16,
    head: head as any,
    body: body as any,
    theme: 'grid',
    styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2, minCellHeight: 12 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0], minCellHeight: 6 },
    bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 35 },
      4: { cellWidth: 60 },
      5: { cellWidth: 25 },
      6: { cellWidth: 15 }
    }
  });
};
