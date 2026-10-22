import { jsPDF } from 'jspdf';

export interface SertifikatUkkPrintData {
  nomor_sertifikat?: string;
  tanggal_terbit?: string;
  sekolah?: {
    nama?: string;
    alamat?: string;
    kota?: string;
    kode_pos?: string;
    telepon?: string;
    email?: string;
    website?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
    logo_url?: string;
    logo_daerah?: string;
  };
  siswa: {
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string | Date;
    program_keahlian?: string;
    konsentrasi_keahlian?: string;
    nama_kelas?: string;
  };
  ukk: {
    skema_sertifikasi?: string;
    judul_penugasan?: string;
    judul_penugasan_en?: string;
    predikat?: string;
    predikat_en?: string;
    nilai_praktik?: number | string;
    nilai_teori?: number | string;
    asesor_internal?: string;
    asesor_eksternal?: string;
    mitra_nama?: string;
    catatan?: string;
  };
}

export const formatTanggalIndonesia = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateVal);
  }
};

// Official Tut Wuri Handayani Vector Emblem (High-Resolution Data URI)
export const TUT_WURI_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="94" fill="#0284c7" stroke="#ffffff" stroke-width="4"/>
  <circle cx="100" cy="100" r="87" fill="#0284c7" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="4,4"/>
  <!-- Sayap & Nyala Api -->
  <path d="M100 26 C105 45, 115 62, 138 70 C118 70, 108 58, 100 48 C92 58, 82 70, 62 70 C85 62, 95 45, 100 26 Z" fill="#ffffff"/>
  <path d="M100 48 L104 68 L118 64 L110 78 L124 82 L112 92 L122 100 L108 104 L114 118 L100 112 L86 118 L92 104 L78 100 L88 92 L76 82 L90 78 L82 64 L96 68 Z" fill="#f8fafc"/>
  <path d="M100 70 C94 84, 90 98, 76 106 C88 106, 96 98, 100 86 C104 98, 112 106, 124 106 C110 98, 106 84, 100 70 Z" fill="#0284c7"/>
  <!-- Belanga / Landasan Buku -->
  <path d="M52 136 C68 126, 132 126, 148 136 C138 152, 62 152, 52 136 Z" fill="#ffffff"/>
  <!-- Tulisan Melengkung Atas -->
  <path id="curve" d="M 38,95 A 64,64 0 0,1 162,95" fill="none"/>
  <text font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="bold" fill="#ffffff" letter-spacing="2">
    <textPath href="#curve" startOffset="50%" text-anchor="middle">
      TUT WURI HANDAYANI
    </textPath>
  </text>
</svg>
`)}`;

/**
 * Render Official Standardized UKK Certificate (A4 Portrait 210 x 297 mm)
 */
export const renderSertifikatUkk = (
  doc: jsPDF,
  data: SertifikatUkkPrintData,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  }
) => {
  const pageWidth = 210;
  const pageHeight = 297;

  const namaSekolah = (data.sekolah?.nama || 'SMK NEGERI ABSENTA').toUpperCase();
  const kotaSekolah = data.sekolah?.kota || 'Purwakarta';
  const kepalaSekolahNama = data.sekolah?.kepala_sekolah || 'Kepala Sekolah';
  const nomorSertifikat = data.nomor_sertifikat || '800/056/413.31/UKK/2026';
  const tanggalTerbit = data.tanggal_terbit || `${kotaSekolah}, ${formatTanggalIndonesia(new Date())}`;

  const { siswa, ukk } = data;

  // =========================================================================
  // 1. LEFT MODERN GEOMETRIC FACET (Exact match with official certificate)
  // =========================================================================

  // Top Light Blue / Sky Facet (#38bdf8 / #0284c7)
  doc.setFillColor(56, 189, 248);
  doc.lines(
    [
      [14, 0],
      [24, 76],
      [-38, 30],
      [0, -106],
    ],
    0,
    0,
    [1, 1],
    'F',
    true
  );

  // Deep Sky Blue Shadow Triangle
  doc.setFillColor(14, 165, 233);
  doc.lines(
    [
      [38, 76],
      [-14, 30],
      [-24, 0],
    ],
    0,
    0,
    [1, 1],
    'F',
    true
  );

  // Middle Amber / Orange Facet (#fb923c / #f97316)
  doc.setFillColor(251, 146, 60);
  doc.lines(
    [
      [22, -32],
      [14, 52],
      [-36, 68],
      [0, -88],
    ],
    0,
    106,
    [1, 1],
    'F',
    true
  );

  // Darker Orange Facet Accent
  doc.setFillColor(234, 88, 12);
  doc.lines(
    [
      [36, 20],
      [-12, 48],
      [-24, -68],
    ],
    0,
    106,
    [1, 1],
    'F',
    true
  );

  // Bottom Coral / Rose Red Facet (#f43f5e / #e11d48)
  doc.setFillColor(244, 63, 94);
  doc.lines(
    [
      [42, -32],
      [-16, 92],
      [-26, 43],
      [0, -103],
    ],
    0,
    194,
    [1, 1],
    'F',
    true
  );

  // =========================================================================
  // 2. LOGO TUT WURI HANDAYANI (Centered at top)
  // =========================================================================
  const logoW = 28;
  const logoH = 28;
  const logoX = (pageWidth - logoW) / 2 + 6; // Slight visual balance offset from left banner
  const logoY = 11;

  try {
    const logoToRender = options?.logoSekolahBase64 || TUT_WURI_LOGO_SVG;
    doc.addImage(logoToRender, 'PNG', logoX, logoY, logoW, logoH);
  } catch (err) {
    console.warn('Fallback rendering for Tut Wuri Handayani logo:', err);
  }

  // =========================================================================
  // 3. MAIN TITLE & NOMOR (Bilingual, Official Blue Typography)
  // =========================================================================
  const contentCenterX = 118; // Center of printable canvas (offset by left decorative margin)
  let curY = logoY + logoH + 7;

  // Title 1: SERTIFIKAT UJI KOMPETENSI (Blue #0284c7)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(2, 132, 199);
  doc.text('SERTIFIKAT UJI KOMPETENSI', contentCenterX, curY, { align: 'center' });

  // Title 2: CERTIFICATE OF COMPETENCY ASSESSMENT (Italic Blue #0284c7)
  curY += 4.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('CERTIFICATE OF COMPETENCY ASSESSMENT', contentCenterX, curY, { align: 'center' });

  // Nomor Sertifikat
  curY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nomor : ${nomorSertifikat}`, contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 4. CERTIFICATION STATEMENT (Bilingual)
  // =========================================================================
  curY += 9;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Dengan ini menyatakan', contentCenterX, curY, { align: 'center' });
  curY += 3.6;
  doc.text('bahwa, This is to certify', contentCenterX, curY, { align: 'center' });
  curY += 3.6;
  doc.text('that', contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 5. NAMA SISWA & NISN (Prominent Bold Centerpiece)
  // =========================================================================
  curY += 7.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(siswa.nama_siswa.toUpperCase(), contentCenterX, curY, { align: 'center' });

  curY += 4.8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const nisnDisplay = siswa.nisn || siswa.nis || '-';
  doc.text(`NISN : ${nisnDisplay}`, contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 6. KETERANGAN UJI KOMPETENSI & PROGRAM KEAHLIAN
  // =========================================================================
  curY += 6.5;
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text('Telah mengikuti Uji Kompetensi', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Keahlian has taken the', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('competency test', contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.text('pada Kompetensi', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Keahlian in', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Competency of', contentCenterX, curY, { align: 'center' });

  // Nama Program / Kompetensi Keahlian
  curY += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const kompetensiNama =
    siswa.konsentrasi_keahlian ||
    siswa.program_keahlian ||
    'Teknik Komputer dan Jaringan';
  doc.text(kompetensiNama, contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 7. JUDUL PENUGASAN (Assignment Title)
  // =========================================================================
  curY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text('pada Judul', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Penugasan on', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Assignment', contentCenterX, curY, { align: 'center' });

  // Judul Penugasan Indonesia
  curY += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const judulId =
    ukk.judul_penugasan ||
    'Implementasi Jaringan LAN dan Troubleshooting Perangkat Komputer';
  doc.text(judulId, contentCenterX, curY, { align: 'center' });

  // Judul Penugasan English
  curY += 4.5;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const judulEn =
    ukk.judul_penugasan_en ||
    'Local Area Network Implementation and Hardware Troubleshooting';
  doc.text(judulEn, contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 8. PREDIKAT KELULUSAN (Achievement Level)
  // =========================================================================
  curY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text('dengan predikat', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('with achievement', contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('level', contentCenterX, curY, { align: 'center' });

  // Predikat Indonesia
  curY += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  const rawPredikat = (ukk.predikat || 'Kompeten').trim();
  const predikatCapitalized =
    rawPredikat.charAt(0).toUpperCase() + rawPredikat.slice(1).toLowerCase();
  doc.text(predikatCapitalized, contentCenterX, curY, { align: 'center' });

  // Predikat English
  curY += 4.2;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const predikatEn =
    ukk.predikat_en ||
    (rawPredikat.toLowerCase().includes('sangat')
      ? 'Very Competent'
      : rawPredikat.toLowerCase().includes('cukup')
      ? 'Adequately Competent'
      : 'Competent');
  doc.text(predikatEn, contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 9. VALIDITAS SERTIFIKAT (3 Tahun)
  // =========================================================================
  curY += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Sertifikat ini berlaku untuk : 3 (tiga)', contentCenterX, curY, { align: 'center' });
  curY += 3.4;
  doc.text('Tahun This certificate is valid for : 3', contentCenterX, curY, { align: 'center' });
  curY += 3.4;
  doc.text('(three) Years', contentCenterX, curY, { align: 'center' });

  // =========================================================================
  // 10. TANDA TANGAN (Bipartit: Kepala Sekolah & Penguji Eksternal)
  // =========================================================================
  curY += 8.5;
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(tanggalTerbit, contentCenterX, curY, { align: 'center' });

  const signY = curY + 6.5;
  const colLeftX = 68;
  const colRightX = 168;

  // Left: Kepala Sekolah
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Atas nama ${namaSekolah}`, colLeftX, signY, { align: 'center' });
  doc.text(`On behalf of ${namaSekolah}`, colLeftX, signY + 3.2, { align: 'center' });
  doc.text('Kepala Sekolah', colLeftX, signY + 7.5, { align: 'center' });
  doc.text('Headmaster', colLeftX, signY + 10.7, { align: 'center' });

  // TTD Name Kepsek
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(kepalaSekolahNama, colLeftX, signY + 31, { align: 'center' });
  if (data.sekolah?.nip_kepala && data.sekolah.nip_kepala !== '-') {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`NIP. ${data.sekolah.nip_kepala}`, colLeftX, signY + 34.5, { align: 'center' });
  }

  // Right: Penguji Eksternal
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Penguji Eksternal', colRightX, signY + 4, { align: 'center' });
  doc.text('External Assessor', colRightX, signY + 7.5, { align: 'center' });

  const asesorEksName =
    ukk.asesor_eksternal ||
    (ukk.mitra_nama ? `Asesor ${ukk.mitra_nama}` : 'Penguji Asosiasi Industri');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(asesorEksName, colRightX, signY + 31, { align: 'center' });
  if (ukk.mitra_nama) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(ukk.mitra_nama, colRightX, signY + 34.5, { align: 'center' });
  }
};

/**
 * Generate Single UKK Certificate Document
 */
export const generateSertifikatUkkDoc = async (
  data: SertifikatUkkPrintData,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  }
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  renderSertifikatUkk(doc, data, options);
  return doc;
};

/**
 * Generate Single PDF Blob URL & Filename
 */
export const generateSertifikatUkkSinglePdf = async (
  data: SertifikatUkkPrintData,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  }
): Promise<{ blobUrl: string; filename: string; doc: jsPDF }> => {
  const doc = await generateSertifikatUkkDoc(data, options);
  const cleanName = (data.siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_');
  const filename = `SERTIFIKAT_UKK_${cleanName}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename, doc };
};

/**
 * Generate Batch UKK Certificates PDF (Sekelas)
 */
export const generateSertifikatUkkBatchPdf = async (
  list: SertifikatUkkPrintData[],
  namaKelas = 'Kelas',
  onProgress?: (current: number, total: number, studentName: string) => void,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  }
): Promise<{ blobUrl: string; filename: string; doc: jsPDF }> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (i > 0) {
      doc.addPage('a4', 'portrait');
    }
    onProgress?.(i + 1, list.length, item.siswa.nama_siswa);
    renderSertifikatUkk(doc, item, options);
  }

  const cleanKelas = namaKelas.replace(/\s+/g, '_');
  const filename = `SERTIFIKAT_UKK_SEKELAS_${cleanKelas}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename, doc };
};
