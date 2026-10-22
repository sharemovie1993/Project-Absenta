import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UkkBeritaAcaraItem {
  id: string;
  nama_sesi: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  ruang: string;
  jumlah_peserta: number;
  jumlah_hadir: number;
  jumlah_tidak_hadir: number;
  catatan_pelaksanaan?: string;
  kendala?: string;
  penguji_internal: string;
  penguji_eksternal: string;
  mitra_nama?: string;
  panitia?: string;
  status: 'DRAFT' | 'SELESAI';
  foto_dokumentasi?: string[]; // Base64 or URLs
}

export interface UkkBeritaAcaraPrintData {
  jurusanNama: string;
  tahunPelajaran?: string;
  judulPenugasan?: string;
  sekolah: {
    nama: string;
    alamat?: string;
    kota?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
  };
  beritaAcara: UkkBeritaAcaraItem;
}

export const generatePdfUkkBeritaAcara = (
  data: UkkBeritaAcaraPrintData
): { doc: jsPDF; blobUrl: string } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const ba = data.beritaAcara;

  // Header / Kop
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text((data.sekolah.nama || 'SEKOLAH MENENGAH KEJURUAN').toUpperCase(), pageWidth / 2, 20, {
    align: 'center',
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  if (data.sekolah.alamat) {
    doc.text(data.sekolah.alamat, pageWidth / 2, 25, { align: 'center' });
  }

  doc.setLineWidth(0.8);
  doc.line(margin, 29, pageWidth - margin, 29);
  doc.setLineWidth(0.3);
  doc.line(margin, 30, pageWidth - margin, 30);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('BERITA ACARA PELAKSANAAN', pageWidth / 2, 38, { align: 'center' });
  doc.text('UJI KOMPETENSI KEAHLIAN (UKK)', pageWidth / 2, 43, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Tahun Pelajaran ${data.tahunPelajaran || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}`, pageWidth / 2, 48, {
    align: 'center',
  });

  // Body Paragraph
  let currentY = 56;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const introText = `Pada hari ini, tanggal ${ba.tanggal || '-'}, bertempat di Ruang/Laboratorium ${ba.ruang || '-'} ${data.sekolah.nama || 'Sekolah'}, telah diselenggarakan Ujian Kompetensi Keahlian (UKK) untuk Program Keahlian ${data.jurusanNama || '-'} dengan rincian pelaksanaan sebagai berikut:`;
  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, margin, currentY);
  currentY += splitIntro.length * 5 + 3;

  // Details Table / Key-Values
  const detailRows = [
    ['1.', 'Sesi Pelaksanaan', `: ${ba.nama_sesi} (Pukul ${ba.jam_mulai} s.d ${ba.jam_selesai} WIB)`],
    ['2.', 'Program Keahlian', `: ${data.jurusanNama}`],
    ['3.', 'Judul Penugasan / Soal', `: ${data.judulPenugasan || 'Ujian Praktik Kejuruan Mandiri'}`],
    ['4.', 'Jumlah Peserta Terdaftar', `: ${ba.jumlah_peserta} Orang`],
    ['5.', 'Jumlah Peserta Hadir', `: ${ba.jumlah_hadir} Orang`],
    ['6.', 'Jumlah Tidak Hadir', `: ${ba.jumlah_tidak_hadir} Orang`],
    ['7.', 'Penguji Internal', `: ${ba.penguji_internal || '-'}`],
    ['8.', 'Penguji Eksternal (DU/DI)', `: ${ba.penguji_eksternal || '-'}${ba.mitra_nama ? ' (' + ba.mitra_nama + ')' : ''}`],
  ];

  autoTable(doc, {
    startY: currentY,
    body: detailRows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: {
      font: 'times',
      fontSize: 9.5,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: contentWidth - 58 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Catatan & Evaluasi Box
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Catatan Pelaksanaan & Jalannya Ujian:', margin, currentY);
  currentY += 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  const catatanText = ba.catatan_pelaksanaan || 'Ujian UKK berjalan dengan tertib, aman, dan mematuhi seluruh standar SOP keselamatan kerja dan instrumen penilaian kejuruan.';
  const splitCatatan = doc.splitTextToSize(catatanText, contentWidth);
  doc.text(splitCatatan, margin, currentY);
  currentY += splitCatatan.length * 4.5 + 4;

  if (ba.kendala) {
    doc.setFont('times', 'bold');
    doc.text('Kendala yang Dihadapi & Solusi:', margin, currentY);
    currentY += 4;

    doc.setFont('times', 'normal');
    const splitKendala = doc.splitTextToSize(ba.kendala, contentWidth);
    doc.text(splitKendala, margin, currentY);
    currentY += splitKendala.length * 4.5 + 4;
  }

  // Closing Paragraph
  const closingText = 'Demikian Berita Acara ini dibuat dengan sebenarnya sesuai dengan kondisi pelaksanaan di lapangan untuk dapat dipergunakan sebagaimana mestinya.';
  const splitClosing = doc.splitTextToSize(closingText, contentWidth);
  doc.text(splitClosing, margin, currentY);
  currentY += splitClosing.length * 4.5 + 8;

  // Signatures Section (Dual assessor + Kaprog/Panitia + Kepala Sekolah)
  if (currentY > 210) {
    doc.addPage();
    currentY = 25;
  }

  const signDate = `${data.sekolah.kota || 'Purwakarta'}, ${ba.tanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(signDate, pageWidth - margin - 60, currentY);
  currentY += 5;

  // Line 1 Assessors
  const colWidth = contentWidth / 2;
  doc.text('Penguji Internal,', margin + 5, currentY);
  doc.text('Penguji Eksternal (DU/DI),', margin + colWidth + 5, currentY);

  currentY += 20;
  doc.setFont('times', 'bold');
  doc.text(ba.penguji_internal || 'Penguji Internal', margin + 5, currentY);
  doc.text(ba.penguji_eksternal || 'Penguji Eksternal', margin + colWidth + 5, currentY);

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  if (ba.mitra_nama) {
    doc.text(ba.mitra_nama, margin + colWidth + 5, currentY + 4);
  }

  currentY += 12;

  // Line 2 Kaprog & Kepala Sekolah
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('Ketua Panitia / Kaprog,', margin + 5, currentY);
  doc.text('Mengetahui,\nKepala Sekolah,', margin + colWidth + 5, currentY);

  currentY += 20;
  doc.setFont('times', 'bold');
  doc.text(ba.panitia || 'Panitia UKK', margin + 5, currentY);
  doc.text(data.sekolah.kepala_sekolah || 'Kepala Sekolah', margin + colWidth + 5, currentY);

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${data.sekolah.nip_kepala || '-'}`, margin + colWidth + 5, currentY + 4);

  // If photos exist, add Page 2 for Photo Documentation
  if (ba.foto_dokumentasi && ba.foto_dokumentasi.length > 0) {
    doc.addPage();

    // Kop Lampiran
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('LAMPIRAN DOKUMENTASI VISUAL PELAKSANAAN UKK', pageWidth / 2, 20, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Sesi: ${ba.nama_sesi} — Ruang: ${ba.ruang} (${ba.tanggal})`, pageWidth / 2, 25, {
      align: 'center',
    });

    doc.setLineWidth(0.4);
    doc.line(margin, 28, pageWidth - margin, 28);

    let photoY = 35;
    const photoWidth = 78;
    const photoHeight = 52;
    const gap = 8;

    ba.foto_dokumentasi.slice(0, 6).forEach((photo, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = margin + col * (photoWidth + gap);
      const y = photoY + row * (photoHeight + gap + 8);

      try {
        if (photo.startsWith('data:image')) {
          doc.addImage(photo, 'JPEG', x, y, photoWidth, photoHeight);
        } else {
          // Placeholder box if not valid base64
          doc.setFillColor(243, 244, 246);
          doc.rect(x, y, photoWidth, photoHeight, 'F');
          doc.rect(x, y, photoWidth, photoHeight, 'S');
          doc.text(`Foto Dokumentasi #${idx + 1}`, x + 15, y + 25);
        }
      } catch {
        doc.setFillColor(243, 244, 246);
        doc.rect(x, y, photoWidth, photoHeight, 'F');
        doc.rect(x, y, photoWidth, photoHeight, 'S');
        doc.text(`Dokumentasi #${idx + 1}`, x + 20, y + 25);
      }

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text(`Dokumentasi Pelaksanaan Sesi ${idx + 1}`, x + 2, y + photoHeight + 4);
    });
  }

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
};
