/**
 * pdfTranskripNilai.ts
 * Generator Dokumen Transkrip Nilai Resmi Lintas Semester (Smt 1 - Smt 6 / Smt 8)
 * Berbasis jsPDF & jspdf-autotable (Client-side fast vector rendering, True WYSIWYG).
 * Mendukung Kurikulum Merdeka & Kurikulum 2013 Multi-Jenjang (SMK, SMA, SMP).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { normalizeStudentIdentity } from '../../academic/academicIdentityNormalizer';

export interface TranskripPrintMapelItem {
  mapel_id: string;
  mapel_name: string;
  kode_mapel?: string;
  kelompok_mapel?: string;
  nilai_per_semester?: Record<string, number | null>;
  rata_rata_mapel: number;
}

export interface TranskripPrintData {
  sekolah: {
    nama: string;
    alamat?: string;
    kota: string;
    telepon?: string;
    email?: string;
    website?: string;
    kepala_sekolah: string;
    nip_kepala?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
  };
  siswa: {
    id: string;
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    kelas?: string;
    jurusan?: string;
    program_keahlian?: string;
  };
  headers: Array<{
    index: number;
    label: string;
    sublabel: string;
  }>;
  mata_pelajaran: TranskripPrintMapelItem[];
  ringkasan: {
    rata_rata_ijazah: number;
    total_mapel: number;
    status_kelulusan?: string;
    nomor_ijazah?: string;
    nilai_ukk?: {
      nomor_sertifikat?: string;
      nilai_praktik?: number;
      nilai_teori?: number;
      predikat?: string;
      asesor_eksternal?: string;
    } | null;
    nilai_pkl?: {
      nomor_sertifikat?: string;
      nilai_akhir?: number;
      predikat?: string;
      instruktur?: string;
    } | null;
  };
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  };
  tanggal_terbit?: string;
}

export function generatePdfTranskripNilai(data: TranskripPrintData): { blobUrl: string; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  // ─── 1. KOP SURAT RESMI ───
  if (data.options?.logoDaerahBase64) {
    try {
      doc.addImage(data.options.logoDaerahBase64, 'PNG', 14, y, 20, 20);
    } catch {}
  }

  if (data.options?.logoSekolahBase64) {
    try {
      doc.addImage(data.options.logoSekolahBase64, 'PNG', pageWidth - 34, y, 20, 20);
    } catch {}
  }

  const startTextX = data.options?.logoDaerahBase64 ? 36 : 14;
  const endTextX = data.options?.logoSekolahBase64 ? pageWidth - 36 : pageWidth - 14;
  const textCenterX = (startTextX + endTextX) / 2;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  if (data.sekolah.nama_dinas_atas) {
    doc.text(data.sekolah.nama_dinas_atas.toUpperCase(), textCenterX, y + 2, { align: 'center' });
  }
  if (data.sekolah.nama_dinas_bawah) {
    doc.text(data.sekolah.nama_dinas_bawah.toUpperCase(), textCenterX, y + 6, { align: 'center' });
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text((data.sekolah.nama || 'SEKOLAH MENENGAH KEJURUAN').toUpperCase(), textCenterX, y + 11, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  const contactText = [data.sekolah.alamat, data.sekolah.telepon ? `Telp: ${data.sekolah.telepon}` : '', data.sekolah.email ? `Email: ${data.sekolah.email}` : '']
    .filter(Boolean)
    .join(' | ');
  doc.text(contactText || '', textCenterX, y + 16, { align: 'center' });

  // Garis Ganda Pembatas Kop
  y += 20;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  doc.setLineWidth(0.2);
  doc.line(14, y + 0.8, pageWidth - 14, y + 0.8);

  y += 6;

  // ─── 2. JUDUL DOKUMEN ───
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TRANSKRIP NILAI REKAPITULASI HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('Kompilasi Nilai Semester 1 s.d. Semester Akhir & Nilai Sekolah', pageWidth / 2, y, { align: 'center' });

  y += 6;

  // ─── 3. IDENTITAS SISWA ───
  doc.setFontSize(8.5);
  const leftColX = 14;
  const colGap = 32;

  const student = normalizeStudentIdentity(data.siswa);
  const rowH = 4.2;
  doc.setFont('Helvetica', 'normal');

  doc.text('Nama Peserta Didik', leftColX, y);
  doc.text(':', leftColX + colGap, y);
  doc.setFont('Helvetica', 'bold');
  doc.text((student.nama || '-').toUpperCase(), leftColX + colGap + 3, y);
  doc.setFont('Helvetica', 'normal');

  doc.text('NIS / NISN', pageWidth / 2 + 5, y);
  doc.text(':', pageWidth / 2 + 30, y);
  doc.text(`${student.nis || '-'} / ${student.nisn || '-'}`, pageWidth / 2 + 33, y);

  y += rowH;
  doc.text('Tempat, Tgl Lahir', leftColX, y);
  doc.text(':', leftColX + colGap, y);
  doc.text(student.ttlFormatted || '-', leftColX + colGap + 3, y);

  doc.text('Rombel / Kelas', pageWidth / 2 + 5, y);
  doc.text(':', pageWidth / 2 + 30, y);
  doc.text(student.namaKelas || '-', pageWidth / 2 + 33, y);

  y += rowH;
  doc.text('Program Keahlian', leftColX, y);
  doc.text(':', leftColX + colGap, y);
  doc.text(student.programKeahlian || student.namaJurusan || '-', leftColX + colGap + 3, y);

  doc.text('Status Kelulusan', pageWidth / 2 + 5, y);
  doc.text(':', pageWidth / 2 + 30, y);
  doc.setFont('Helvetica', 'bold');
  doc.text(data.ringkasan.status_kelulusan || 'MEMENUHI KRITERIA', pageWidth / 2 + 33, y);
  doc.setFont('Helvetica', 'normal');

  y += 6;

  // ─── 4. TABEL NILAI LINTAS SEMESTER (True WYSIWYG AutoTable) ───
  const semesterHeaders = (data.headers || []).map((h) => h.label);

  const tableHead = [
    ['No', 'Mata Pelajaran', ...semesterHeaders, 'Rata-Rata\nIjazah']
  ];

  const tableBody = (data.mata_pelajaran || []).map((m, idx) => {
    const semValues = (data.headers || []).map((h) => {
      const val = m.nilai_per_semester?.[h.label];
      return val !== null && val !== undefined && val > 0 ? String(val) : '-';
    });

    return [
      String(idx + 1),
      m.mapel_name,
      ...semValues,
      m.rata_rata_mapel > 0 ? String(m.rata_rata_mapel) : '-'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 62 },
      // Sisanya auto center
      ...semesterHeaders.reduce((acc, _, i) => {
        acc[i + 2] = { halign: 'center', cellWidth: 16 };
        return acc;
      }, {} as Record<number, any>),
      [semesterHeaders.length + 2]: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
    },
    didDrawPage: () => {
      // Background footer number
    },
  });

  // Ambil posisi Y setelah tabel
  y = (doc as any).lastAutoTable.finalY + 4;

  // ─── 5. KOMPONEN NILAI TAMBAHAN (UKK, PKL, & GPA) ───
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 18;
  }

  const summaryColW = (pageWidth - 28) / 3;

  // Kotak GPA
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(14, y, summaryColW - 2, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('RATA-RATA KUMULATIF IJAZAH', 17, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(data.ringkasan.rata_rata_ijazah || 0), 17, y + 12);

  // Kotak Nilai UKK
  doc.roundedRect(14 + summaryColW, y, summaryColW - 2, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('UJI KOMPETENSI KEAHLIAN (UKK)', 17 + summaryColW, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  const ukkText = data.ringkasan.nilai_ukk
    ? `${data.ringkasan.nilai_ukk.nilai_praktik ?? '-'} (${data.ringkasan.nilai_ukk.predikat ?? 'SANGAT BAIK'})`
    : 'TERINTEGRASI';
  doc.text(ukkText, 17 + summaryColW, y + 11.5);

  // Kotak Nilai PKL
  doc.roundedRect(14 + summaryColW * 2, y, summaryColW, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('PRAKTIK KERJA LAPANGAN (PKL)', 17 + summaryColW * 2, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  const pklText = data.ringkasan.nilai_pkl
    ? `${data.ringkasan.nilai_pkl.nilai_akhir ?? '-'} (${data.ringkasan.nilai_pkl.predikat ?? 'MEMUASKAN'})`
    : 'TUNTAS';
  doc.text(pklText, 17 + summaryColW * 2, y + 11.5);

  y += 22;

  // ─── 6. TITIMANGSA & TANDA TANGAN KEPALA SEKOLAH ───
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 18;
  }

  const signX = pageWidth - 75;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  const tglTerbit = data.tanggal_terbit || `${data.sekolah.kota || 'Kota'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(tglTerbit, signX, y);
  y += 4.5;
  doc.text('Kepala Sekolah,', signX, y);

  y += 20; // Ruang stempel & tanda tangan

  doc.setFont('Helvetica', 'bold');
  doc.text(data.sekolah.kepala_sekolah, signX, y);
  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${data.sekolah.nip_kepala || '-'}`, signX, y);

  const cleanFilename = `TRANSKRIP_NILAI_${data.siswa.nama_siswa.replace(/\s+/g, '_')}_${data.siswa.nis || 'NIS'}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { blobUrl, filename: cleanFilename };
}
