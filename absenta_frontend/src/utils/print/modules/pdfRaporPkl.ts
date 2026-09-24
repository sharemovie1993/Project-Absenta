/**
 * pdfRaporPkl.ts
 * Generator Dokumen Rapor Praktik Kerja Lapangan (PKL) 2 Halaman Kurikulum Merdeka
 * Berbasis jsPDF & jspdf-autotable (Client-side fast rendering, 0 Puppeteer).
 * 
 * Halaman 1: Capaian Kompetensi PKL (Baris 3 Kolom 3 dinamis dari Master TP DUDI) & Catatan Pembimbing
 * Halaman 2: Rekap Presensi PKL & Pengesahan 3 Pihak (Orang Tua, Wali Kelas, Kepala Sekolah)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTanggalIndonesia } from './pdfSertifikatPkl';

export interface RaporPklItemData {
  siswa: {
    id: string;
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    nama_kelas?: string;
    program_keahlian?: string;
    konsentrasi_keahlian?: string;
  };
  pkl: {
    mitra_nama: string;
    mitra_alamat?: string;
    tanggal_mulai?: string | Date;
    tanggal_selesai?: string | Date;
    instruktur_nama?: string;
    pembimbing_nama?: string;
    pembimbing_nip?: string;
    catatan_pkl?: string;
    deskripsi_tp?: string; // Narasi Capaian TP DUDI untuk Baris 3 Kolom 3
    sakit_pkl?: number;
    izin_pkl?: number;
    alpa_pkl?: number;
  };
  penilaian: {
    hard_kompetensi_teknis?: number | null;
    hard_sop_k3lh?: number | null;
    hard_alur_bisnis?: number | null;
    soft_kedisiplinan?: number | null;
    soft_kerajinan_inisiatif?: number | null;
    soft_kerjasama?: number | null;
    soft_kejujuran?: number | null;
    soft_tanggung_jawab?: number | null;
    nilai_akhir_pkl?: number | null;
    predikat_pkl?: string | null;
  };
  sekolah: {
    nama: string;
    kota: string;
    kepala_sekolah: string;
    nip_kepala: string;
  };
  wali_kelas?: {
    nama: string;
    nip: string;
  };
  tahun_pelajaran?: string;
  semester?: string;
  tanggal_terbit?: string;
}

/**
 * Render Halaman 1 Rapor PKL: Capaian Kompetensi & Catatan Pembimbing
 */
export const renderRaporPklPage1 = (doc: jsPDF, data: RaporPklItemData, isNewPage = false) => {
  if (isNewPage) {
    doc.addPage('a4', 'portrait');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // 1. Header Judul Rapor
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text((data.sekolah.nama || 'SMK NEGERI 1 PLERED').toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 5;
  const tpText = data.tahun_pelajaran ? `TAHUN AJARAN ${data.tahun_pelajaran.toUpperCase()}` : 'TAHUN AJARAN 2025 / 2026';
  doc.text(tpText, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // 2. Identitas Siswa & PKL
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);

  const tglMulaiStr = data.pkl.tanggal_mulai ? formatTanggalIndonesia(data.pkl.tanggal_mulai) : '14 Jul 2025';
  const tglSelesaiStr = data.pkl.tanggal_selesai ? formatTanggalIndonesia(data.pkl.tanggal_selesai) : '15 Des 2025';

  const metaRows: [string, string, string?][] = [
    ['Nama Peserta Didik', `:  ${(data.siswa.nama_siswa || '-').toUpperCase()}`],
    ['NISN', `:  ${data.siswa.nisn || data.siswa.nis || '-'}`],
    ['Kelas', `:  ${data.siswa.nama_kelas || '-'}`],
    ['Program Keahlian', `:  ${data.siswa.program_keahlian || '-'}`],
    ['Konsentrasi Keahlian', `:  ${data.siswa.konsentrasi_keahlian || '-'}`],
    ['Tempat PKL', `:  ${(data.pkl.mitra_nama || '-').toUpperCase()}`],
    ['Tanggal PKL', `:  Mulai  :   ${tglMulaiStr}`, `Selesai  :   ${tglSelesaiStr}`],
    ['Nama Instruktur', `:  ${data.pkl.instruktur_nama || '-'}`],
    ['Nama Pembimbing', `:  ${data.pkl.pembimbing_nama || '-'}`],
  ];

  const leftColX = 16;
  const valColX = 52;

  metaRows.forEach((row) => {
    doc.setFont('Helvetica', 'normal');
    doc.text(row[0], leftColX, y);
    doc.setFont('Helvetica', row[0] === 'Nama Peserta Didik' ? 'bold' : 'normal');
    doc.text(row[1], valColX, y);
    if (row[2]) {
      doc.text(row[2], 115, y);
    }
    y += 4.5;
  });

  y += 3;

  // 3. Perhitungan Skor Capaian (Fallback jika belum dinilai)
  // Soft skill: rata-rata dari 5 aspek soft skill
  const softScores = [
    data.penilaian.soft_kedisiplinan,
    data.penilaian.soft_kerajinan_inisiatif,
    data.penilaian.soft_kerjasama,
    data.penilaian.soft_kejujuran,
    data.penilaian.soft_tanggung_jawab,
  ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const avgSoftSkill = softScores.length > 0 
    ? Math.round(softScores.reduce((a, b) => a + b, 0) / softScores.length)
    : 85;

  const skorK3lh = Math.round(data.penilaian.hard_sop_k3lh ?? 89);
  const skorTeknis = Math.round(data.penilaian.hard_kompetensi_teknis ?? 88);
  const skorAlurBisnis = Math.round(data.penilaian.hard_alur_bisnis ?? 87);

  // 4. Deskripsi Narasi
  // Baris 1: Statis Kurikulum Merdeka
  const deskripsiSoftSkill =
    'Peserta didik sudah memiliki soft skill sesuai harapan dalam melaksanakan komunikasi telepon sesuai kaidah, memiliki etos kerja, menunjukan kemandirian, menunjukan kerjasama namun masih perlu di tingkatkan dalam hal, menunjukan integritas (antara lain jujur, disiplin,komitmen dan tanggung jawab), menunjukan kepedulian sosial dan lingkungan';

  // Baris 2: Statis Kurikulum Merdeka
  const deskripsiK3lh =
    'Peserta didik sudah memiliki soft skill sesuai harapan dalam melaksanakan pekerjaan sesuai POS namun masih perlu ditingkatkan dalam hal, menggunakan APD dengan tertib dan benar';

  // Baris 3: DINAMIS DARI MASTER CAPAIAN TP DUDI
  const defaultDeskripsiTeknis =
    `Peserta didik diharapkan mampu memahami dan menerapkan Kompetensi teknis kejuruan pada ${data.pkl.mitra_nama || 'dunia kerja'}, melaksanakan SOP standar industri, memahami alur kerja operasional, serta peserta didik mampu mengerjakan tugas dengan penuh rasa tanggung jawab.`;
  const deskripsiTeknis = data.pkl.deskripsi_tp?.trim() || defaultDeskripsiTeknis;

  // Baris 4: Statis Kurikulum Merdeka
  const deskripsiAlurBisnis =
    'Peserta didik telah mampu membekali kemandiriannya dengan menguasai dan menjelaskan rencana usaha yang akan dilaksanakan namun masih perlu bimbingan dalam mengidentifikasi kegiatan usaha di tempat kerja';

  // 5. Tabel Capaian Penilaian
  autoTable(doc, {
    startY: y,
    head: [['Tujuan Pembelajaran', 'Skor', 'Deskripsi']],
    body: [
      [
        'Menerapkan soft skill yang dibutuhkan dalam dunia kerja (tempat PKL)',
        String(avgSoftSkill),
        deskripsiSoftSkill
      ],
      [
        'Menerapkan norma, POS dan K3LH yang ada pada dunia Kerja (Tempat PKL)',
        String(skorK3lh),
        deskripsiK3lh
      ],
      [
        'Menerapkan Kompetensi teknis yang sudah dipelajari di sekolah dan/atau baru di pelajari pada dunia kerja (tempat PKL)',
        String(skorTeknis),
        deskripsiTeknis
      ],
      [
        'Memahami alur bisnis dunia kerja tempat PKL',
        String(skorAlurBisnis),
        deskripsiAlurBisnis
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.3,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      valign: 'middle',
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
      cellPadding: 2.8
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'normal' },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 109, fontStyle: 'normal' }
    },
    margin: { left: 16, right: 16 }
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // 6. Kotak Catatan Pembimbing
  const catatanText = data.pkl.catatan_pkl?.trim() || 'Rajin dan bertanggung jawab dalam praktek';
  const boxWidth = 178;
  const boxHeight = 15;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(16, y, boxWidth, boxHeight);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Catatan :', 18, y + 4.5);

  doc.setFont('Helvetica', 'normal');
  const splitCatatan = doc.splitTextToSize(catatanText, boxWidth - 6);
  doc.text(splitCatatan.slice(0, 2), 18, y + 9);

  y += boxHeight + 12;

  // 7. Tanda Tangan Guru Pembimbing (Kiri Bawah)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Guru Pembimbing,', 16, y);

  y += 24;
  const pembimbingNama = data.pkl.pembimbing_nama || 'Muhammad, S.T.';
  doc.setFont('Helvetica', 'bold');
  doc.text(pembimbingNama, 16, y);
  doc.setLineWidth(0.3);
  doc.line(16, y + 0.8, 16 + doc.getTextWidth(pembimbingNama), y + 0.8);

  y += 4.5;
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${data.pkl.pembimbing_nip || '197906202022211010'}`, 16, y);
};

/**
 * Render Halaman 2 Rapor PKL: Rekap Presensi & Pengesahan 3 Pihak
 */
export const renderRaporPklPage2 = (doc: jsPDF, data: RaporPklItemData) => {
  doc.addPage('a4', 'portrait');

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // 1. Identitas Singkat Siswa
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);

  const metaRowsPage2: [string, string][] = [
    ['Nama Peserta Didik', `:  ${(data.siswa.nama_siswa || '-').toUpperCase()}`],
    ['NISN', `:  ${data.siswa.nisn || data.siswa.nis || '-'}`],
    ['Kelas', `:  ${data.siswa.nama_kelas || '-'}`],
    ['Tahun Pelajaran', `:  ${data.tahun_pelajaran || '2025 / 2026'}`],
    ['Semester', `:  ${data.semester || 'Ganjil'}`],
  ];

  const leftColX = 16;
  const valColX = 52;

  metaRowsPage2.forEach((row) => {
    doc.setFont('Helvetica', 'normal');
    doc.text(row[0], leftColX, y);
    doc.setFont('Helvetica', row[0] === 'Nama Peserta Didik' ? 'bold' : 'normal');
    doc.text(row[1], valColX, y);
    y += 4.5;
  });

  y += 4;

  // 2. Tabel Ketidakhadiran (Sakit, Izin, Tanpa Keterangan)
  const sakitVal = data.pkl.sakit_pkl !== undefined && data.pkl.sakit_pkl !== null && data.pkl.sakit_pkl > 0 
    ? String(data.pkl.sakit_pkl) 
    : '';
  const izinVal = data.pkl.izin_pkl !== undefined && data.pkl.izin_pkl !== null && data.pkl.izin_pkl > 0 
    ? String(data.pkl.izin_pkl) 
    : '';
  const alpaVal = data.pkl.alpa_pkl !== undefined && data.pkl.alpa_pkl !== null && data.pkl.alpa_pkl > 0 
    ? String(data.pkl.alpa_pkl) 
    : '';

  autoTable(doc, {
    startY: y,
    head: [[{ content: 'Ketidakhadiran', colSpan: 3, styles: { halign: 'center' } }]],
    body: [
      ['Sakit', ':', `${sakitVal ? `${sakitVal}  ` : ''}hari`],
      ['Izin', ':', `${izinVal ? `${izinVal}  ` : ''}hari`],
      ['Tanpa Keterangan', ':', `${alpaVal ? `${alpaVal}  ` : ''}hari`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [210, 210, 210],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      fontStyle: 'bold',
      lineWidth: 0.3,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 6, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
    },
    margin: { left: 16 }
  });

  y = (doc as any).lastAutoTable.finalY + 18;

  // 3. Pengesahan 3 Pihak (Orang Tua & Wali Kelas)
  const kotaStr = data.sekolah.kota || 'Purwakarta';
  const tglTerbitStr = data.tanggal_terbit || '22 Desember 2025';

  // Sisi Kiri: Orang Tua/Wali
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali', 16, y);

  // Sisi Kanan: Wali Kelas
  const rightColX = 135;
  doc.text(`${kotaStr}, ${tglTerbitStr}`, rightColX, y);
  doc.text('Wali Kelas,', rightColX, y + 4.5);

  y += 24;
  doc.text('..................................................', 16, y);

  const waliKelasNama = data.wali_kelas?.nama || 'SITI NURUL FALAHIYAH, S.Kom.I.';
  const waliKelasNip = data.wali_kelas?.nip || '199110292022212020';

  doc.setFont('Helvetica', 'bold');
  doc.text(waliKelasNama, rightColX, y);
  doc.setLineWidth(0.3);
  doc.line(rightColX, y + 0.8, rightColX + doc.getTextWidth(waliKelasNama), y + 0.8);

  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${waliKelasNip}`, rightColX, y + 4.5);

  // 4. Pengesahan Bawah: Mengetahui Kepala Sekolah (Center)
  y += 18;
  doc.text('Mengetahui', pageWidth / 2, y, { align: 'center' });
  doc.text('Kepala Sekolah,', pageWidth / 2, y + 4.5, { align: 'center' });

  y += 24;
  const kepsekNama = data.sekolah.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.';
  const kepsekNip = data.sekolah.nip_kepala || '197111022008011001';

  doc.setFont('Helvetica', 'bold');
  doc.text(kepsekNama, pageWidth / 2, y, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - doc.getTextWidth(kepsekNama) / 2, y + 0.8, pageWidth / 2 + doc.getTextWidth(kepsekNama) / 2, y + 0.8);

  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${kepsekNip}`, pageWidth / 2, y + 4.5, { align: 'center' });
};

/**
 * Generate Rapor PKL 2 Halaman untuk 1 Siswa
 */
export const generateRaporPklSinglePdf = async (data: RaporPklItemData): Promise<{ blobUrl: string; filename: string }> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  renderRaporPklPage1(doc, data, false);
  renderRaporPklPage2(doc, data);

  const cleanName = (data.siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_');
  const filename = `RAPOR_PKL_${cleanName}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * Generate Rapor PKL 2 Halaman Gabungan Sekelas (Batch Printing)
 */
export const generateRaporPklBatchPdf = async (
  list: RaporPklItemData[],
  namaKelas = 'Kelas',
  onProgress?: (current: number, total: number, studentName: string) => void
): Promise<{ blobUrl: string; filename: string }> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  (list ?? []).forEach((item, index) => {
    onProgress?.(index + 1, list.length, item.siswa?.nama_siswa || 'Siswa');
    // Page 1
    renderRaporPklPage1(doc, item, index > 0);
    // Page 2
    renderRaporPklPage2(doc, item);
  });

  const cleanKelas = namaKelas.replace(/\s+/g, '_');
  const filename = `RAPOR_PKL_GABUNGAN_${cleanKelas}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};
