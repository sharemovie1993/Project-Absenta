import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UkkBeritaAcaraItem {
  id: string;
  jadwal_id?: string;
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
  ttd_penguji_internal?: string | null;
  ttd_penguji_eksternal?: string | null;
  ttd_panitia?: string | null;
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
    telepon?: string;
    email?: string;
    website?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
    print_header_lines?: any[];
  };
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
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

  // 1. Kop Surat Resmi Terpusat (Sesuai Standar Komponen PrintHeader.tsx)
  const rawLines =
    data.sekolah?.print_header_lines && data.sekolah.print_header_lines.length > 0
      ? data.sekolah.print_header_lines
      : [
          data.sekolah?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          data.sekolah?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          data.sekolah?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
          data.sekolah?.nama || 'SEKOLAH MENENGAH KEJURUAN',
        ];

  const parsedHeaderLines = rawLines.map((line: any, idx: number) => {
    let textStr = '';
    let bold = true;
    let fontSize = 9.5;
    if (typeof line === 'object' && line !== null) {
      textStr = line.text || '';
      bold = line.bold !== false;
      fontSize = line.fontSize ? line.fontSize * 0.85 : (idx === rawLines.length - 1 ? 12 : 9.5);
    } else {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          textStr = parsed.text || '';
          bold = parsed.bold !== false;
          fontSize = parsed.fontSize ? parsed.fontSize * 0.85 : (idx === rawLines.length - 1 ? 12 : 9.5);
        } else {
          textStr = String(line);
        }
      } catch {
        textStr = String(line);
      }
      if (idx === rawLines.length - 1) {
        fontSize = textStr.length > 32 ? 11 : 12.5;
      }
    }
    return { text: textStr, bold, fontSize };
  });

  let curKopY = 14;

  // Logos on Left and Right (matching PrintHeader.tsx)
  if (data.options?.logoDaerahBase64) {
    try {
      doc.addImage(data.options.logoDaerahBase64, 'PNG', margin, 11, 19, 19);
    } catch {}
  }
  if (data.options?.logoSekolahBase64) {
    try {
      doc.addImage(data.options.logoSekolahBase64, 'PNG', pageWidth - margin - 19, 11, 19, 19);
    } catch {}
  }

  parsedHeaderLines.forEach((item: { text: string; bold: boolean; fontSize: number }) => {
    doc.setFont('times', item.bold ? 'bold' : 'normal');
    doc.setFontSize(item.fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(item.text.toUpperCase(), pageWidth / 2, curKopY, { align: 'center' });
    curKopY += item.fontSize > 11 ? 5 : 4;
  });

  // Alamat & Kontak
  if (data.sekolah.alamat) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const alamatText = `${data.sekolah.alamat}${data.sekolah.telepon ? ' | Telp: ' + data.sekolah.telepon : ''}`;
    doc.text(alamatText, pageWidth / 2, curKopY, { align: 'center' });
    curKopY += 3.5;
  }
  if (data.sekolah.website || data.sekolah.email) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const contactText = `${data.sekolah.website ? 'Website: ' + data.sekolah.website : ''}${data.sekolah.email ? ' | Email: ' + data.sekolah.email : ''}`;
    doc.text(contactText, pageWidth / 2, curKopY, { align: 'center' });
    curKopY += 3.5;
  }

  // Double rule (matching PrintHeader 3.5px double)
  curKopY += 1;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, curKopY, pageWidth - margin, curKopY);
  doc.setLineWidth(0.3);
  doc.line(margin, curKopY + 0.8, pageWidth - margin, curKopY + 0.8);

  // Title
  let titleY = curKopY + 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('BERITA ACARA PELAKSANAAN', pageWidth / 2, titleY, { align: 'center' });
  doc.text('UJI KOMPETENSI KEAHLIAN (UKK)', pageWidth / 2, titleY + 5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Tahun Pelajaran ${data.tahunPelajaran || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)}`, pageWidth / 2, titleY + 10, {
    align: 'center',
  });

  // Body Paragraph
  let currentY = titleY + 18;
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

  // Stempel TTD Digital Pen (jika tersedia)
  if (ba.ttd_penguji_internal) {
    try {
      doc.addImage(ba.ttd_penguji_internal, 'PNG', margin + 8, currentY + 1.5, 30, 16);
    } catch {}
  }
  if (ba.ttd_penguji_eksternal) {
    try {
      doc.addImage(ba.ttd_penguji_eksternal, 'PNG', margin + colWidth + 8, currentY + 1.5, 30, 16);
    } catch {}
  }

  currentY += 19;
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

  if (ba.ttd_panitia) {
    try {
      doc.addImage(ba.ttd_panitia, 'PNG', margin + 8, currentY + 1.5, 30, 16);
    } catch {}
  }

  currentY += 19;
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
