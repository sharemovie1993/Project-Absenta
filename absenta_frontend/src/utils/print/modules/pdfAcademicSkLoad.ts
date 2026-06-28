import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratePdfOptions } from '../pdfAcademic';

export const renderAcademicSkLoadPdf = (
  doc: jsPDF,
  options: GeneratePdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): void => {
  const { sekolah, checklistData, guruMapelList } = options;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`LAMPIRAN SURAT KEPUTUSAN KEPALA ${sekolah?.nama?.toUpperCase() || 'SMK NEGERI CONTOH ABSENTA'}`, pageWidth / 2, headerEndY + 5, { align: 'center' });
  doc.text(`NOMOR: 421.3 / 088 / TU-CADISDIK / VI / ${new Date().getFullYear()}`, pageWidth / 2, headerEndY + 9, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DISTRIBUSI GURU PENGAMPU BEBAN TUGAS MENGAJAR', pageWidth / 2, headerEndY + 15, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 19, { align: 'center' });

  const head = [[
    { content: 'NO', styles: { halign: 'center' } },
    { content: 'NAMA GURU / NIP' },
    { content: 'MATA PELAJARAN YANG DIAMPU' },
    { content: 'KODE MAPEL', styles: { halign: 'center' } }
  ]];
  const body = guruMapelList.map((gm, idx) => [
    idx + 1,
    `${gm.Guru?.nama_guru || ''}\nNIP: ${gm.Guru?.nip || '---'}`,
    gm.Mapel?.nama_mapel?.toUpperCase() || '',
    gm.Mapel?.kode_mapel || '---'
  ]);
  autoTable(doc, {
    startY: headerEndY + 23,
    head: head as any,
    body: body as any,
    theme: 'grid',
    styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
    bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 70 },
      3: { cellWidth: 30, halign: 'center' }
    }
  });
};
