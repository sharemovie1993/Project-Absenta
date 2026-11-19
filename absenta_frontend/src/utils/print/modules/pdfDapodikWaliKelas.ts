/**
 * pdfDapodikWaliKelas.ts
 * Engine 2 Fallback Programmatic Vector PDF Generator (jsPDF + autoTable)
 * untuk Lembar Verifikasi Selisih Data Dapodik & Ceklis Berkas Pendukung Siswa bagi Wali Kelas.
 * Mengikuti standar skill universal-document-printing-pdf (Landscape A4, Kop Ganda, 2-Tier Signature).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReconciledStudent } from '@/api/dapodik.api';
import type { SignerPerson } from '@/hooks/useDocumentSigners';

export interface PdfDapodikWaliKelasData {
  documentNumber?: string;
  titimangsaCity: string;
  titimangsaDate: string;
  activeFilterLabel?: string;
  activeRombel?: string;
  activeTingkat?: string;
  npsn: string;
  dapodikHost: string;
  sourceMode?: 'LIVE' | 'STAGING';
  students: ReconciledStudent[];
  sekolah: {
    nama: string;
    alamat?: string;
    kota?: string;
    telepon?: string;
    email?: string;
    website?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
    print_header_lines?: Array<{
      text: string;
      fontSize?: number;
      bold?: boolean;
      italic?: boolean;
      uppercase?: boolean;
    }>;
  };
  options: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  };
  signers: {
    operatorDapodik: SignerPerson;
    waliKelas: SignerPerson;
    kepsek: SignerPerson;
    includeKepsekTier?: boolean;
  };
}

function drawLandscapeKop(doc: jsPDF, data: PdfDapodikWaliKelasData): number {
  const pageWidth = 297;
  const margin = 14;

  const lines =
    data.sekolah.print_header_lines && data.sekolah.print_header_lines.length > 0
      ? data.sekolah.print_header_lines.map((l) => l.text).filter(Boolean)
      : [
          data.sekolah.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          data.sekolah.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          data.sekolah.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
          data.sekolah.nama || 'SMK NEGERI 1 PLERED',
        ];

  if (data.options.logoDaerahBase64) {
    try {
      doc.addImage(data.options.logoDaerahBase64, 'PNG', margin, 9, 16, 16);
    } catch {}
  }
  if (data.options.logoSekolahBase64) {
    try {
      doc.addImage(data.options.logoSekolahBase64, 'PNG', pageWidth - margin - 16, 9, 16, 16);
    } catch {}
  }

  let y = 12;
  lines.forEach((line, idx) => {
    const isMainName = idx === lines.length - 1;
    doc.setFont('times', isMainName ? 'bold' : 'normal');
    doc.setFontSize(isMainName ? 13 : idx === 0 ? 10 : 9);
    doc.text(line.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += isMainName ? 4.5 : 3.8;
  });

  const contactParts: string[] = [];
  if (data.sekolah.alamat) contactParts.push(data.sekolah.alamat);
  if (data.sekolah.telepon) contactParts.push(`Telp: ${data.sekolah.telepon}`);
  if (data.sekolah.email) contactParts.push(`Email: ${data.sekolah.email}`);
  if (data.sekolah.website) contactParts.push(`Web: ${data.sekolah.website}`);

  if (contactParts.length > 0) {
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text(contactParts.join(' | '), pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }

  // Double Line border kop surat dinas
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.1);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.8, pageWidth - margin, y + 0.8);

  return y + 3.5;
}

export function generatePdfDapodikWaliKelas(data: PdfDapodikWaliKelasData): { blobUrl: string } {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;

  let currentY = drawLandscapeKop(doc, data);

  // Judul Dokumen
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.text(
    'LEMBAR VERIFIKASI SELISIH DATA DAPODIK & CEKLIS BERKAS PENDUKUNG SISWA',
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 4.5;

  doc.setFontSize(9.5);
  doc.text(
    'UNTUK WALI KELAS & TIM OPERATOR PENDATAAN PENDIDIKAN',
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 4;

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text(
    `Nomor: ${data.documentNumber || `421.5/VERVAL-WALAS/${new Date().getFullYear()}/TU`}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 4.5;

  // Metadata Box
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  const filterText = `Kategori Selisih: ${data.activeFilterLabel || 'Semua Selisih Atribut'}`;
  const rombelText = `Rombel: ${data.activeRombel || 'Semua Rombel'}`;
  const tingkatText = `Tingkat: ${data.activeTingkat || 'Semua Tingkat'}`;
  const totalText = `Total Siswa Terfilter: ${data.students.length} Siswa`;
  const tanggalText = `Tanggal Penarikan/Cetak: ${data.titimangsaDate}`;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'S');

  doc.setTextColor(30, 41, 59);
  doc.text(`${filterText}   |   ${rombelText}   |   ${tingkatText}   |   ${totalText}   |   ${tanggalText}`, margin + 3, currentY + 4.5);
  currentY += 9;

  // Petunjuk Ringkas Wali Kelas
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Petunjuk Wali Kelas: Cocokkan data Dapodik vs Absenta dengan dokumen fisik asli. Berikan centang [✔] pada berkas pendukung yang telah dikumpulkan/diunggah (Ijazah, KK, KTP, NISN, Akta), tuliskan perbaikan valid pada kolom catatan, dan bubuhkan paraf.',
    margin,
    currentY
  );
  doc.setTextColor(0, 0, 0);
  currentY += 3.5;

  // Tabel Autotable Multi-Page
  const tableRows = data.students.map((s, idx) => {
    const diffsSummary =
      s.diffs.length > 0
        ? s.diffs.map((d) => `${d.label}: ${String(d.dapodikValue ?? '-')} vs ${String(d.absentaValue ?? '-')}`).join('\n')
        : s.status === 'DAPODIK_ONLY'
        ? 'Hanya di Dapodik'
        : s.status === 'ABSENTA_ONLY'
        ? 'Hanya di Absenta'
        : 'Selaras';

    return [
      idx + 1,
      `${s.nisn || '-'}\nNIK: ${s.nik || s.dapodikRaw?.nik || '-'}`,
      s.dapodikRaw?.nama || s.nama,
      s.absentaRaw?.nama_siswa || '-',
      s.dapodikRaw?.nama_rombel || '-',
      s.absentaRaw?.rombel || s.rombel || '-',
      diffsSummary,
      '[  ]', // Ijazah
      '[  ]', // KK
      '[  ]', // KTP
      '[  ]', // NISN
      '[  ]', // Akta
      '',     // Catatan Validasi
      '',     // Paraf
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 22 },
    head: [
      [
        { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NISN & NIK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nama Siswa', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Rombel', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Rincian Selisih Data', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Ceklis Berkas Pendukung Fisik / Upload', colSpan: 5, styles: { halign: 'center' } },
        { content: 'Catatan Validasi / Status', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Paraf', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: 'Dapodik (Port 5774)', styles: { halign: 'center' } },
        { content: 'Absenta (Sekolah)', styles: { halign: 'center' } },
        { content: 'Dapodik', styles: { halign: 'center' } },
        { content: 'Absenta', styles: { halign: 'center' } },
        { content: 'Ijazah', styles: { halign: 'center' } },
        { content: 'KK', styles: { halign: 'center' } },
        { content: 'KTP', styles: { halign: 'center' } },
        { content: 'NISN', styles: { halign: 'center' } },
        { content: 'Akta', styles: { halign: 'center' } },
      ],
    ],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      font: 'times',
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    bodyStyles: {
      font: 'times',
      textColor: [0, 0, 0],
      fontSize: 7,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26, font: 'courier' },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 35 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 36 },
      7: { cellWidth: 9, halign: 'center', font: 'courier' },
      8: { cellWidth: 9, halign: 'center', font: 'courier' },
      9: { cellWidth: 9, halign: 'center', font: 'courier' },
      10: { cellWidth: 9, halign: 'center', font: 'courier' },
      11: { cellWidth: 9, halign: 'center', font: 'courier' },
      12: { cellWidth: 38 },
      13: { cellWidth: 16, halign: 'center' },
    },
    didDrawPage: (_data) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFont('times', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Lembar Verifikasi Data Wali Kelas — ${data.sekolah.nama} (Halaman ${currentPage} dari ${pageCount})`,
        margin,
        pageHeight - 8
      );
      doc.setTextColor(0, 0, 0);
    },
  });

  // Tanda Tangan 2-Tier
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 20;
  const signatureHeight = 35;

  // Anti-Cutoff Guard: jika sisa ruang tidak cukup, buat halaman baru
  if (finalY + signatureHeight > pageHeight - 15) {
    doc.addPage('a4', 'landscape');
    currentY = 20;
  } else {
    currentY = finalY + 6;
  }

  const signWidth = 75;
  const leftX = margin + 15;
  const rightX = pageWidth - margin - signWidth - 15;
  const centerX = (pageWidth - signWidth) / 2;

  // Titimangsa di sisi kanan atas tanda tangan
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${data.titimangsaCity}, ${data.titimangsaDate}`,
    rightX + signWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 4.5;

  // Tier 1: Kiri (Operator Dapodik) & Kanan (Wali Kelas)
  doc.setFont('times', 'normal');
  const opLines = (data.signers.operatorDapodik.roleTitle || 'Petugas Pendataan / Operator Dapodik').split('\n');
  opLines.forEach((l, i) => {
    doc.text(l, leftX + signWidth / 2, currentY + i * 4, { align: 'center' });
  });

  const walasLines = (data.signers.waliKelas.roleTitle || 'Wali Kelas').split('\n');
  walasLines.forEach((l, i) => {
    doc.text(l, rightX + signWidth / 2, currentY + i * 4, { align: 'center' });
  });

  currentY += 18;

  // Nama & NIP Tier 1
  doc.setFont('times', 'bold');
  doc.text(`( ${data.signers.operatorDapodik.personName || '........................................'} )`, leftX + signWidth / 2, currentY, { align: 'center' });
  doc.text(`( ${data.signers.waliKelas.personName || '........................................'} )`, rightX + signWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  if (data.signers.operatorDapodik.nip) {
    doc.text(`NIP. ${data.signers.operatorDapodik.nip}`, leftX + signWidth / 2, currentY, { align: 'center' });
  }
  if (data.signers.waliKelas.nip) {
    doc.text(`NIP. ${data.signers.waliKelas.nip}`, rightX + signWidth / 2, currentY, { align: 'center' });
  }
  currentY += 4;

  // Tier 2: Kepala Sekolah (Tengah Bawah) jika includeKepsekTier !== false
  if (data.signers.includeKepsekTier !== false) {
    currentY += 2;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text('Mengetahui / Mengesahkan,', centerX + signWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text(data.signers.kepsek.roleTitle || `Kepala ${data.sekolah.nama}`, centerX + signWidth / 2, currentY, { align: 'center' });
    currentY += 16;

    doc.setFont('times', 'bold');
    doc.text(`( ${data.signers.kepsek.personName || '........................................'} )`, centerX + signWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    if (data.signers.kepsek.nip) {
      doc.text(`NIP. ${data.signers.kepsek.nip}`, centerX + signWidth / 2, currentY, { align: 'center' });
    }
  }

  const blob = doc.output('blob');
  return { blobUrl: URL.createObjectURL(blob) };
}
