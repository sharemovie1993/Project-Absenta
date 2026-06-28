import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';

export const renderHubinPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { filterData } = options;

  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('SURAT PENGANTAR PRAKTEK KERJA LAPANGAN (PKL)', pageWidth / 2, headerEndY + 6, { align: 'center' });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  let textY = headerEndY + 16;
  doc.text('Nomor : 800 / _____ / Hubin / ' + new Date().getFullYear(), 15, textY);
  doc.text('Hal   : Permohonan Tempat & Pengantar PKL', 15, textY + 5);
  
  doc.text('Kepada Yth.', 15, textY + 15);
  doc.setFont('Helvetica', 'bold');
  doc.text('Pimpinan / HRD DUDI / Industri Mitra', 15, textY + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text('Di tempat', 15, textY + 25);
  
  doc.text('Dengan hormat,', 15, textY + 34);
  doc.text('Dalam rangka membekali keterampilan siswa, kami mengajukan permohonan agar siswa berikut:', 15, textY + 39);
  
  const head = [['NIS', 'NAMA SISWA LENGKAP', 'JURUSAN / KONSENTRASI']];
  
  const penempatanList = filterData?.penempatanList || [];
  let body = [];
  
  if (penempatanList.length > 0) {
    body = penempatanList.map((p: any) => [
      p.Siswa?.nis || '-',
      p.Siswa?.nama_siswa || '-',
      p.Siswa?.Kelas?.nama_kelas || '-'
    ]);
  } else {
    body = [
      ['1023881', 'AHMAD SULAIMAN', 'Teknik Komputer Jaringan (TKJ)'],
      ['1023882', 'BUDI SETIAWAN', 'Teknik Komputer Jaringan (TKJ)']
    ];
  }

  autoTable(doc, {
    startY: textY + 44,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
  });
  
  let sigY = (doc as any).lastAutoTable?.finalY ?? (textY + 65);
  doc.text('Diperkenankan melaksanakan PKL di perusahaan Bapak/Ibu mulai bulan Juli s.d Desember.', 15, sigY + 8);
  
  return sigY + 12;
};
