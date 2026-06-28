import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfOptions } from '../pdfAcademic';
import type { Kelas, Siswa } from '../../../types/academic';

export const renderAcademicRosterPdf = (
  doc: jsPDF,
  options: GeneratePdfOptions,
  c: Kelas | null,
  classStudents: Siswa[],
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): void => {
  const { checklistData } = options;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DAFTAR KELAS & DAFTAR FORMAT PENILAIAN GURU', pageWidth / 2, headerEndY + 6, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

  const head = [[
    { content: 'NO', styles: { halign: 'center' } },
    { content: 'NIS / NISN', styles: { halign: 'center' } },
    { content: 'NAMA LENGKAP SISWA' },
    { content: 'L/P', styles: { halign: 'center' } },
    ...Array.from({ length: 10 }).map((_, i) => ({ content: `COL ${i+1}`, styles: { halign: 'center' } }))
  ]];
  const body = classStudents.map((s, idx) => [
    idx + 1,
    s.nis || '-',
    s.nama_siswa?.toUpperCase() || '',
    String(s.jenis_kelamin).startsWith('L') ? 'L' : 'P',
    ...Array.from({ length: 10 }).map(() => '')
  ]);

  autoTable(doc, {
    startY: headerEndY + 16,
    head: head as any,
    body: body as any,
    theme: 'grid',
    styles: { fontSize: 7.5, font: 'Helvetica', cellPadding: 1.2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
    bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 48 },
      3: { cellWidth: 6, halign: 'center' },
    }
  });
};
