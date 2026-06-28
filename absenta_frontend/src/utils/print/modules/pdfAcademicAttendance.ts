import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfOptions } from '../pdfAcademic';
import type { Kelas, Siswa } from '../../../types/academic';

export const renderAcademicAttendancePdf = (
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
  doc.setFontSize(11);
  doc.text('DAFTAR HADIR HARIAN SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`TAHUN PELAJARAN ${checklistData?.current_year?.tahun || '2025/2026'}`, pageWidth / 2, headerEndY + 10, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Program Keahlian`, 15, headerEndY + 16);
  doc.text(`Tingkat/Konsentrasi Keahlian`, 15, headerEndY + 20);
  doc.text(`: ${(c?.Jurusan as any)?.nama || (c?.Jurusan as any)?.nama_jurusan || 'Teknik Elektronika'}`, 58, headerEndY + 16);
  doc.text(`: ${c?.nama_kelas || 'X TE 1'}`, 58, headerEndY + 20);

  const head = [
    [
      { content: 'NO', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NIS', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NISN', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NAMA SISWA', rowSpan: 3, styles: { valign: 'middle' } },
      { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } },
      { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } }
    ],
    [
      ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } })),
      ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } }))
    ]
  ];
  const body = classStudents.map((s, idx) => [
    idx + 1,
    s.nis || '-',
    s.nisn || '-',
    s.nama_siswa?.toUpperCase() || '',
    ...Array.from({ length: 24 }).map(() => '')
  ]);
  body.push([
    '',
    '',
    '',
    { content: '+++', styles: { halign: 'center' } } as any,
    ...Array.from({ length: 24 }).map(() => '')
  ]);

  autoTable(doc, {
    startY: headerEndY + 24,
    head: head as any,
    body: body as any,
    theme: 'grid',
    styles: { fontSize: 5.5, font: 'Helvetica', cellPadding: 0.8 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] },
    bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 38 },
    }
  });
};
