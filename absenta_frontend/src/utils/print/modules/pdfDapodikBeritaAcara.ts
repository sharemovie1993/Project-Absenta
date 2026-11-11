/**
 * pdfDapodikBeritaAcara.ts
 * Engine 2 Fallback Programmatic Vector PDF Generator (jsPDF + autoTable)
 * untuk Berita Acara Verval Data Usia Siswa Dapodik (LPPD) dan Rekonsiliasi Dapodik.
 * Mengikuti standar skill universal-document-printing-pdf.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DapodikAgeDistributionResult } from '@/utils/dapodik/dapodikAgeStats';
import type { ReconciliationSummary } from '@/api/dapodik.api';
import type { SignerPerson } from '@/hooks/useDocumentSigners';

export interface PdfDapodikBeritaAcaraData {
  mode: 'lppd_usia' | 'rekon_absenta';
  documentNumber?: string;
  auditDateText: string;
  cutoffDateText: string;
  sourceLabel: string;
  cabangDinasWilayah?: string;
  kabupatenKota?: string;
  npsn: string;
  dapodikHost: string;
  templateName?: string;
  showGenderAndGradeBreakdown?: boolean;
  includeKepsekTier?: boolean;
  ageStats: DapodikAgeDistributionResult;
  reconciliationSummary?: ReconciliationSummary;
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
    print_header_lines?: Array<{ text: string; fontSize?: number; bold?: boolean; italic?: boolean; uppercase?: boolean }>;
  };
  options: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  };
  signers: {
    operatorDapodik: SignerPerson;
    verifikatorData: SignerPerson;
    kepsek: SignerPerson;
    titimangsaCity: string;
    titimangsaDate: string;
  };
}

function drawStandardKop(doc: jsPDF, data: PdfDapodikBeritaAcaraData): number {
  const pageWidth = 210;
  const margin = 16;

  const lines =
    data.sekolah.print_header_lines && data.sekolah.print_header_lines.length > 0
      ? data.sekolah.print_header_lines.map((l) => l.text).filter(Boolean)
      : [
          data.sekolah.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          data.sekolah.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          data.sekolah.nama_cabang_dinas || data.cabangDinasWilayah || 'CABANG DINAS PENDIDIKAN',
          data.sekolah.nama || 'SATUAN PENDIDIKAN',
        ];

  if (data.options.logoDaerahBase64) {
    try {
      doc.addImage(data.options.logoDaerahBase64, 'PNG', margin, 11, 17, 17);
    } catch {}
  }
  if (data.options.logoSekolahBase64) {
    try {
      doc.addImage(data.options.logoSekolahBase64, 'PNG', pageWidth - margin - 17, 11, 17, 17);
    } catch {}
  }

  let y = 14;
  lines.forEach((line, idx) => {
    const isSchool = idx === lines.length - 1;
    doc.setFont('times', isSchool ? 'bold' : idx < 2 ? 'bold' : 'normal');
    doc.setFontSize(isSchool ? 12.5 : idx < 2 ? 11 : 10);
    doc.setTextColor(0, 0, 0);
    doc.text(line.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += isSchool ? 5 : 4.2;
  });

  const contactParts = [
    data.sekolah.alamat,
    data.sekolah.telepon ? `Telp. ${data.sekolah.telepon}` : '',
    data.sekolah.website,
    data.sekolah.email,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.text(contactParts.join(' • '), pageWidth / 2, y, { align: 'center', maxWidth: pageWidth - margin * 2 - 40 });
    y += 4;
  }

  const lineY = Math.max(y + 1, 33);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.75);
  doc.line(margin, lineY, pageWidth - margin, lineY);
  doc.setLineWidth(0.25);
  doc.line(margin, lineY + 1.1, pageWidth - margin, lineY + 1.1);

  return lineY + 7;
}

function drawSignaturePerson(
  doc: jsPDF,
  person: SignerPerson,
  centerX: number,
  startY: number,
  headerPrefix?: string
): void {
  let y = startY;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);

  if (headerPrefix) {
    doc.text(headerPrefix, centerX, y, { align: 'center' });
    y += 4;
  }

  const roleLines = String(person.roleTitle || '').split('\n').filter(Boolean);
  for (const r of roleLines) {
    doc.text(r, centerX, y, { align: 'center' });
    y += 4;
  }

  if (person.signatureImage) {
    try {
      doc.addImage(person.signatureImage, 'PNG', centerX - 16, y + 1, 32, 14);
    } catch {}
  }

  const nameY = startY + 28;
  doc.setFont('times', 'bold');
  doc.text(person.personName || '........................................', centerX, nameY, { align: 'center' });

  if (person.nip) {
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`NIP. ${person.nip}`, centerX, nameY + 4, { align: 'center' });
  }
}

export const generatePdfDapodikBeritaAcara = (
  data: PdfDapodikBeritaAcaraData
): { doc: jsPDF; blobUrl: string } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = drawStandardKop(doc, data);

  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  const mainTitle =
    data.mode === 'lppd_usia'
      ? 'BERITA ACARA VERIFIKASI DAN VALIDASI DATA SISWA MENURUT USIA (LPPD)'
      : 'BERITA ACARA REKONSILIASI DATA PESERTA DIDIK DAPODIK';
  doc.text(mainTitle, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });
  y += 5;

  doc.setFontSize(9.5);
  doc.setFont('times', 'italic');
  doc.text(
    `Nomor: ${data.documentNumber || `421.5/BA-LPPD/${new Date().getFullYear()}/TU`}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const intro =
    data.mode === 'lppd_usia'
      ? `Pada hari ini, ${data.auditDateText}, telah dilaksanakan verifikasi dan validasi rekapitulasi data peserta didik menurut usia berdasarkan sumber data Dapodik (${data.sourceLabel}) dengan batas tanggal acuan usia ${data.cutoffDateText} pada satuan pendidikan:`
      : `Pada hari ini, ${data.auditDateText}, telah dilaksanakan proses audit dan rekonsiliasi data peserta didik antara sumber Dapodik (${data.sourceLabel}) dan database sekolah (Absenta):`;

  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { font: 'times', fontSize: 9.5, cellPadding: 1.2, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 4 },
      2: { cellWidth: contentWidth - 46 },
    },
    body: [
      ['Nama Sekolah', ':', data.sekolah.nama || '-'],
      ['NPSN', ':', data.npsn || '-'],
      ['Kabupaten / Kota', ':', data.kabupatenKota || data.sekolah.kota || '-'],
      ['Wilayah / Sumber Data', ':', `${data.cabangDinasWilayah || '-'} (${data.sourceLabel})`],
      ['Tanggal Acuan Usia', ':', data.cutoffDateText],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  if (data.mode === 'lppd_usia') {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Data Siswa Menurut Usia (Sumber Data: Dapodik)', margin, y);
    y += 3;

    const bucketMap = new Map(data.ageStats.buckets.map((b) => [b.key, b]));
    const keys = ['under15', 'age15', 'age16', 'age17', 'age18', 'over18'] as const;

    const bodyRows: any[] = [
      keys.map((k) => (bucketMap.get(k)?.total ?? 0).toLocaleString('id-ID')),
    ];

    if (data.showGenderAndGradeBreakdown) {
      bodyRows.push(keys.map((k) => `L: ${(bucketMap.get(k)?.male ?? 0).toLocaleString('id-ID')} | P: ${(bucketMap.get(k)?.female ?? 0).toLocaleString('id-ID')}`));
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: {
        font: 'times',
        fontSize: 9.5,
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      head: [['Dibawah 15 Tahun', '15 Tahun', '16 Tahun', '17 Tahun', '18 Tahun', 'Diatas 18 Tahun']],
      body: bodyRows,
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Total Siswa Sumber Dapodik: ${data.ageStats.totalDapodikStudents.toLocaleString('id-ID')} siswa (Laki-laki: ${data.ageStats.totalMale.toLocaleString('id-ID')}, Perempuan: ${data.ageStats.totalFemale.toLocaleString('id-ID')}${data.ageStats.missingBirthDateCount > 0 ? `, Tanggal Lahir Kosong: ${data.ageStats.missingBirthDateCount}` : ''}).`,
      margin,
      y,
      { maxWidth: contentWidth }
    );
    y += 6;

    if (data.showGenderAndGradeBreakdown && data.ageStats.byTingkat.length > 0) {
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.text('Rincian Sebaran Usia Per Tingkat (Sumber Dapodik)', margin, y);
      y += 2.5;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: {
          font: 'times',
          fontSize: 8.5,
          halign: 'center',
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          textColor: [0, 0, 0],
          cellPadding: 1.8,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        head: [['Tingkat', '< 15 Th', '15 Th', '16 Th', '17 Th', '18 Th', '> 18 Th', 'Jumlah']],
        body: data.ageStats.byTingkat.map((row) => [
          row.tingkat,
          row.under15.toLocaleString('id-ID'),
          row.age15.toLocaleString('id-ID'),
          row.age16.toLocaleString('id-ID'),
          row.age17.toLocaleString('id-ID'),
          row.age18.toLocaleString('id-ID'),
          row.over18.toLocaleString('id-ID'),
          row.total.toLocaleString('id-ID'),
        ]),
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }
  } else if (data.reconciliationSummary) {
    const s = data.reconciliationSummary;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: {
        font: 'times',
        fontSize: 9.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      head: [['No', 'Indikator Komparasi', 'Jumlah Siswa']],
      body: [
        ['1', 'Total Siswa Sumber Dapodik', s.totalDapodik.toLocaleString('id-ID')],
        ['2', 'Total Siswa Terdaftar di Absenta', s.totalAbsenta.toLocaleString('id-ID')],
        ['3', 'Data Selaras Identik (100% Match)', s.matchCount.toLocaleString('id-ID')],
        ['4', 'Selisih Data (Mismatch)', s.mismatchCount.toLocaleString('id-ID')],
        ['5', 'Hanya Ada di Dapodik', s.dapodikOnlyCount.toLocaleString('id-ID')],
        ['6', 'Hanya Ada di Absenta', s.absentaOnlyCount.toLocaleString('id-ID')],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  const closingText = 'Demikian berita acara ini dibuat dengan sebenar-benarnya sebagai bukti verifikasi dan validasi data peserta didik sumber Dapodik agar dapat dipergunakan sebagaimana mestinya.';
  const closingLines = doc.splitTextToSize(closingText, contentWidth);
  doc.text(closingLines, margin, y);
  y += closingLines.length * 4.5 + 5;

  // Anti-Cutoff Guard sesuai skill universal-document-printing-pdf (batas Y > 200 mm)
  if (y > 200) {
    doc.addPage('a4', 'portrait');
    y = 24;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${data.signers.titimangsaCity}, ${data.signers.titimangsaDate}`, pageWidth - margin - 38, y, {
    align: 'center',
  });
  y += 6;

  drawSignaturePerson(doc, data.signers.verifikatorData, margin + 38, y, 'Verifikator Data,');
  drawSignaturePerson(doc, data.signers.operatorDapodik, pageWidth - margin - 38, y, 'Yang Menyerahkan Data,');

  if (data.includeKepsekTier) {
    const tier2Y = y + 38;
    if (tier2Y > 255) {
      doc.addPage('a4', 'portrait');
      drawSignaturePerson(doc, data.signers.kepsek, pageWidth / 2, 26, 'Mengetahui / Menyetujui,');
    } else {
      drawSignaturePerson(doc, data.signers.kepsek, pageWidth / 2, tier2Y, 'Mengetahui / Menyetujui,');
    }
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { doc, blobUrl };
};
