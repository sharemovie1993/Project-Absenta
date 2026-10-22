import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getUkkRegulatoryEdition,
  calculateUkkPredikat,
} from '../../../config/ukkRegulatoryRegistry';

export interface UkkUnitKompetensi {
  kode_unit: string;
  judul_unit: string;
}

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
    ttd_kepala?: string | null;
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
    ttd_asesor_internal?: string | null;
    ttd_asesor_eksternal?: string | null;
    ttd_kepala_sekolah?: string | null;
    unit_kompetensi?: UkkUnitKompetensi[];
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

/**
 * Default Competency Units based on major (SKKNI Standard)
 */
export const getDefaultUnitKompetensi = (
  programKeahlian?: string,
  konsentrasiKeahlian?: string
): UkkUnitKompetensi[] => {
  const major = `${programKeahlian || ''} ${konsentrasiKeahlian || ''}`.toLowerCase();

  // 1. Perikanan / Agribisnis Perikanan (Matching User Reference PRK.IH)
  if (major.includes('ikan') || major.includes('perikanan') || major.includes('agribisnis')) {
    return [
      { kode_unit: 'PRK.IH01.009.01', judul_unit: 'Memenuhi Persyaratan Keselamatan, Kesehatan dan Lingkungan di Tempat Kerja Bidang Pembenihan' },
      { kode_unit: 'PRK.IH01.001.01', judul_unit: 'Menyiapkan Peralatan' },
      { kode_unit: 'PRK.IH01.002.01', judul_unit: 'Menyiapkan Wadah' },
      { kode_unit: 'PRK.IH02.001.01', judul_unit: 'Menyiapkan Sarana Instalasi Udara' },
      { kode_unit: 'PRK.IH02.004.01', judul_unit: 'Mengukur Kualitas Air' },
      { kode_unit: 'PRK.IH02.008.01', judul_unit: 'Memelihara Calon Induk Ikan Hias' },
      { kode_unit: 'PRK.IH02.010.01', judul_unit: 'Memijahkan Induk Ikan Hias Secara Alami' },
      { kode_unit: 'PRK.IH02.013.01', judul_unit: 'Menetaskan Telur' },
      { kode_unit: 'PRK.IH02.014.01', judul_unit: 'Memelihara Larva' },
      { kode_unit: 'PRK.IH02.016.01', judul_unit: 'Mencegah Hama dan Penyakit Ikan Hias' },
      { kode_unit: 'PRK.IH02.020.01', judul_unit: 'Mengkultur Pakan Alami Artemia' },
      { kode_unit: 'PRK.IH02.019.01', judul_unit: 'Memberi Pakan' },
    ];
  }

  // 2. Rekayasa Perangkat Lunak / PPLG
  if (major.includes('perangkat lunak') || major.includes('rpl') || major.includes('pplg') || major.includes('coding')) {
    return [
      { kode_unit: 'J.620100.004.01', judul_unit: 'Menerapkan Prinsip-prinsip Perancangan Antarmuka Pengguna (UI/UX)' },
      { kode_unit: 'J.620100.009.01', judul_unit: 'Menggunakan Struktur Data dan Algoritma Pemrograman' },
      { kode_unit: 'J.620100.017.02', judul_unit: 'Mengimplementasikan Pemrograman Berorientasi Objek (OOP)' },
      { kode_unit: 'J.620100.020.02', judul_unit: 'Merancang dan Mengimplementasikan Basis Data Relasional (SQL/RDBMS)' },
      { kode_unit: 'J.620100.025.02', judul_unit: 'Mengembangkan Aplikasi Berbasis Web (Fullstack Architecture & RESTful API)' },
      { kode_unit: 'J.620100.033.02', judul_unit: 'Melaksanakan Pengujian Perangkat Lunak (Software Testing & QA)' },
      { kode_unit: 'J.620100.042.01', judul_unit: 'Menerapkan Standar Keamanan Data dan Aplikasi' },
      { kode_unit: 'J.620100.045.01', judul_unit: 'Melakukan Deployment Aplikasi ke Server Cloud / Web Hosting' },
    ];
  }

  // 3. Teknik Kendaraan Ringan / Otomotif / Sepeda Motor
  if (major.includes('otomotif') || major.includes('tkr') || major.includes('tsm') || major.includes('sepeda motor')) {
    return [
      { kode_unit: 'OTO.KR01.001.01', judul_unit: 'Melaksanakan Pemeliharaan dan Servis Berkala Mesin Kendaraan Ringan' },
      { kode_unit: 'OTO.KR01.002.01', judul_unit: 'Memelihara dan Memperbaiki Sistem Bahan Bakar dan Injeksi (EFI)' },
      { kode_unit: 'OTO.KR02.001.01', judul_unit: 'Memelihara dan Memperbaiki Sistem Rem (Braking System & ABS)' },
      { kode_unit: 'OTO.KR02.002.01', judul_unit: 'Memelihara dan Memperbaiki Sistem Kemudi dan Suspensi' },
      { kode_unit: 'OTO.KR03.001.01', judul_unit: 'Memperbaiki Sistem Kelistrikan Bodi dan Instrumen Kendaraan' },
      { kode_unit: 'OTO.KR03.003.01', judul_unit: 'Melakukan Pengujian dan Diagnosa Engine Scanner pada Kendaraan' },
    ];
  }

  // 4. Default: Teknik Komputer dan Jaringan (TKJ)
  return [
    { kode_unit: 'J.611000.001.01', judul_unit: 'Mengumpulkan Kebutuhan Teknis Pengguna yang Menggunakan Jaringan' },
    { kode_unit: 'J.611000.002.01', judul_unit: 'Mengumpulkan Data Peralatan Jaringan dengan Teknologi yang Sesuai' },
    { kode_unit: 'J.611000.005.02', judul_unit: 'Menentukan Spesifikasi Perangkat Jaringan Komputer' },
    { kode_unit: 'J.611000.008.02', judul_unit: 'Menyiapkan Kabel Jaringan dan Menguji Konektivitas Fisik' },
    { kode_unit: 'J.611000.009.02', judul_unit: 'Memasang Jaringan Nirkabel (Wireless Network)' },
    { kode_unit: 'J.611000.010.02', judul_unit: 'Mengkonfigurasi Pengalamatan IP dan Subnetting pada Jaringan' },
    { kode_unit: 'J.611000.011.02', judul_unit: 'Memasang dan Mengkonfigurasi Perangkat Switch pada Jaringan' },
    { kode_unit: 'J.611000.012.02', judul_unit: 'Memasang dan Mengkonfigurasi Perangkat Router (Routing Statis & Dinamis)' },
    { kode_unit: 'J.611000.013.02', judul_unit: 'Mengkonfigurasi Routing pada Perangkat Jaringan Antar Autonomous System' },
    { kode_unit: 'J.611000.014.02', judul_unit: 'Memasang dan Mengkonfigurasi Layanan Server Jaringan (DNS, DHCP, Web, FTP)' },
    { kode_unit: 'J.611000.015.01', judul_unit: 'Memantau dan Mengamankan Keamanan Jaringan dari Akses Tidak Sah (Firewall)' },
  ];
};

// Official Tut Wuri Handayani Vector Emblem (Static Public Asset)
export const TUT_WURI_LOGO_SVG = '/assets/tutwuri.svg';

/**
 * Helper to rasterize SVG into a PNG data URL for rock-solid jsPDF compatibility
 */
let cachedTutWuriPng: string | null = null;
export const getTutWuriPngDataUrl = async (): Promise<string | null> => {
  if (cachedTutWuriPng) return cachedTutWuriPng;
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 400, 400);
            cachedTutWuriPng = canvas.toDataURL('image/png');
            resolve(cachedTutWuriPng);
            return;
          }
        } catch (e) {
          console.warn('Canvas rasterization error for Tut Wuri logo:', e);
        }
        resolve(null);
      };
      img.onerror = () => {
        console.warn('Failed to load /assets/tutwuri.svg into Image element');
        resolve(null);
      };
      img.src = TUT_WURI_LOGO_SVG;
    } catch {
      resolve(null);
    }
  });
};

export interface SertifikatUkkRenderOptions {
  logoDaerahBase64?: string | null;
  logoSekolahBase64?: string | null;
  editionId?: string;
  templateType?: 'sertifikat' | 'suket_lampiran_2';
}

/**
 * =========================================================================
 * HALAMAN 1 (FRONT): SERTIFIKAT UJI KOMPETENSI KEMENDIKBUDRISTEK / KEMENDIKDASMEN
 * Standar Resmi: Tut Wuri Handayani Tunggal di Tengah Atas, Poligon Kiri Bersih,
 * dan Area Teks Bebas Tabrakan (100% Sesuai Gambar Referensi Resmi 2026).
 * =========================================================================
 */
export const renderSertifikatUkkFront = (
  doc: jsPDF,
  data: SertifikatUkkPrintData,
  options?: SertifikatUkkRenderOptions,
  tutWuriPng?: string | null
) => {
  const edition = getUkkRegulatoryEdition(options?.editionId);

  const namaSekolah = (data.sekolah?.nama || 'SMK NEGERI ABSENTA').toUpperCase();
  const kotaSekolah = data.sekolah?.kota || 'Purwakarta';
  const kepalaSekolahNama = data.sekolah?.kepala_sekolah || 'Kepala Sekolah';
  const nomorSertifikat = data.nomor_sertifikat || '800/056/413.31/UKK/2026';
  const tanggalTerbit = data.tanggal_terbit || `${kotaSekolah}, ${formatTanggalIndonesia(new Date())}`;

  const { siswa, ukk } = data;

  // 1. LEFT MODERN GEOMETRIC FACET (Exact match with official certificate blueprint)
  doc.setFillColor(56, 189, 248); // #38bdf8
  doc.lines([[14, 0], [24, 76], [-38, 30], [0, -106]], 0, 0, [1, 1], 'F', true);

  doc.setFillColor(14, 165, 233); // #0ea5e9
  doc.lines([[38, 76], [-14, 30], [-24, 0]], 0, 0, [1, 1], 'F', true);

  doc.setFillColor(251, 146, 60); // #fb923c
  doc.lines([[22, -32], [14, 52], [-36, 68], [0, -88]], 0, 106, [1, 1], 'F', true);

  doc.setFillColor(234, 88, 12); // #ea580c
  doc.lines([[36, 20], [-12, 48], [-24, -68]], 0, 106, [1, 1], 'F', true);

  doc.setFillColor(244, 63, 94); // #f43f5e
  doc.lines([[42, -32], [-16, 92], [-26, 43], [0, -103]], 0, 194, [1, 1], 'F', true);

  // 2. CENTER CONTENT BOUNDING BOX (Safe from Left Geometric Shapes: 44mm to 196mm)
  const contentCenterX = 120;
  const maxContentWidth = 140;

  // 3. LOGO: TUT WURI HANDAYANI TUNGGAL DI TENGAH ATAS (Sesuai Referensi Resmi)
  const logoW = 20;
  const logoH = 20;
  const logoX = contentCenterX - (logoW / 2);
  const logoY = 12;

  if (tutWuriPng) {
    try {
      doc.addImage(tutWuriPng, 'PNG', logoX, logoY, logoW, logoH);
    } catch (err) {
      console.warn('Fallback rendering for Tut Wuri Handayani logo:', err);
    }
  } else {
    // Symmetrical vector emblem fallback if PNG not yet ready
    doc.setFillColor(2, 132, 199);
    doc.circle(contentCenterX, logoY + logoH / 2, logoW / 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TUT WURI HANDAYANI', contentCenterX, logoY + logoH / 2 + 1.2, { align: 'center' });
  }

  // 4. MAIN TITLE & NOMOR
  let curY = logoY + logoH + 6;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Black
  doc.text(edition.titleId || 'SERTIFIKAT KOMPETENSI', contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('Helvetica', 'bolditalic');
  doc.setFontSize(15.5);
  doc.setTextColor(0, 102, 255); // #0066FF Electric / Royal Blue
  doc.text(edition.titleEn || 'COMPETENCY CERTIFICATE', contentCenterX, curY, { align: 'center' });

  curY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nomor : ${nomorSertifikat}`, contentCenterX, curY, { align: 'center' });

  // 5. CERTIFICATION STATEMENT (Bilingual)
  curY += 8.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(edition.statementId, contentCenterX, curY, { align: 'center' });
  curY += 3.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(edition.statementEn, contentCenterX, curY, { align: 'center' });

  // 6. NAMA SISWA & NISN (Prominent Bold Centerpiece)
  curY += 7.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(siswa.nama_siswa.toUpperCase(), contentCenterX, curY, { align: 'center' });

  curY += 4.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const nisnDisplay = siswa.nisn || siswa.nis || '-';
  doc.text(`NISN: ${nisnDisplay}`, contentCenterX, curY, { align: 'center' });

  // 7. KETERANGAN UJI KOMPETENSI & PROGRAM KEAHLIAN
  curY += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(edition.hasTakenId, contentCenterX, curY, { align: 'center' });
  curY += 3.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(edition.hasTakenEn, contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(edition.competencyPrefixId, contentCenterX, curY, { align: 'center' });
  curY += 3.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(edition.competencyPrefixEn, contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const kompetensiNama =
    siswa.konsentrasi_keahlian ||
    siswa.program_keahlian ||
    'Agribisnis Ikan Hias';
  doc.text(kompetensiNama, contentCenterX, curY, { align: 'center' });

  // 8. JUDUL PENUGASAN (Assignment Title with Auto-Wrapping)
  curY += 5.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('pada Judul Penugasan', contentCenterX, curY, { align: 'center' });
  curY += 3.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('on Assignment', contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const judulId = ukk.judul_penugasan || 'Pembenihan Ikan Hias';
  const splitJudulId = doc.splitTextToSize(judulId, maxContentWidth);
  doc.text(splitJudulId, contentCenterX, curY, { align: 'center' });
  curY += (splitJudulId.length - 1) * 4.5;

  if (ukk.judul_penugasan_en) {
    curY += 4;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitJudulEn = doc.splitTextToSize(ukk.judul_penugasan_en, maxContentWidth);
    doc.text(splitJudulEn, contentCenterX, curY, { align: 'center' });
    curY += (splitJudulEn.length - 1) * 4;
  }

  // 9. PREDIKAT KELULUSAN (Achievement Level)
  curY += 5.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('dengan predikat', contentCenterX, curY, { align: 'center' });
  curY += 3.8;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('with achievement level', contentCenterX, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);

  const evaluatedPredikat = calculateUkkPredikat(ukk.nilai_akhir ?? 85, edition.id);
  const rawPredikat = (ukk.predikat || evaluatedPredikat.predikatId).trim();
  const predikatCapitalized =
    rawPredikat.charAt(0).toUpperCase() + rawPredikat.slice(1).toLowerCase();
  doc.text(predikatCapitalized, contentCenterX, curY, { align: 'center' });

  curY += 4.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const predikatEn = ukk.predikat_en || evaluatedPredikat.predikatEn;
  doc.text(predikatEn, contentCenterX, curY, { align: 'center' });

  // 10. VALIDITAS SERTIFIKAT (3 Tahun)
  curY += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(edition.klausulMasaBerlakuId, contentCenterX, curY, { align: 'center' });
  curY += 3.5;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(edition.klausulMasaBerlakuEn, contentCenterX, curY, { align: 'center' });

  // 11. TANDA TANGAN (Simetris 2 Kolom Sesuai Referensi)
  curY += 7.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(tanggalTerbit, contentCenterX, curY, { align: 'center' });

  const signY = curY + 6;
  const colLeftX = 82;
  const colRightX = 162;

  // Left: Kepala Sekolah (Atas nama Sekolah)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${edition.labelTtdKepalaSekolah} ${namaSekolah}`, colLeftX, signY, { align: 'center' });
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(`${edition.labelTtdKepalaSekolahEn} ${namaSekolah}`, colLeftX, signY + 3.5, { align: 'center' });

  // Right: Mitra Industri DU-DI
  const mitraText = (ukk.mitra_nama || 'MITRA INDUSTRI').toUpperCase();
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(mitraText, colRightX, signY, { align: 'center' });

  const sigNameY = signY + 22;

  // Digital Signatures
  const ttdKepala = data.sekolah?.ttd_kepala || ukk.ttd_kepala_sekolah;
  if (ttdKepala) {
    try {
      doc.addImage(ttdKepala, 'PNG', colLeftX - 16, signY + 5, 32, 14);
    } catch {}
  }
  if (ukk.ttd_asesor_eksternal) {
    try {
      doc.addImage(ukk.ttd_asesor_eksternal, 'PNG', colRightX - 16, signY + 5, 32, 14);
    } catch {}
  }

  // Left Signer Name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(kepalaSekolahNama, colLeftX, sigNameY, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Kepala Sekolah', colLeftX, sigNameY + 3.5, { align: 'center' });
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('School Principal', colLeftX, sigNameY + 6.8, { align: 'center' });

  // Right Signer Name
  const asesorEksName =
    ukk.asesor_eksternal ||
    (ukk.mitra_nama ? `Asesor ${ukk.mitra_nama}` : 'Penguji Asosiasi Industri');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(asesorEksName, colRightX, sigNameY, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Penguji Eksternal', colRightX, sigNameY + 3.5, { align: 'center' });
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('External Assessor', colRightX, sigNameY + 6.8, { align: 'center' });
};

/**
 * =========================================================================
 * HALAMAN 2 (BACK): DAFTAR UNIT KOMPETENSI (List of Competency Unit)
 * Sesuai 100% dengan lembar belakang resmi (Tabel Bersih & 2 Kolom Asesor Simetris).
 * =========================================================================
 */
export const renderSertifikatUkkBack = (
  doc: jsPDF,
  data: SertifikatUkkPrintData
) => {
  const pageWidth = 210;
  const { siswa, ukk } = data;

  // 1. Title: DAFTAR UNIT KOMPETENSI / List of Competency Unit
  let curY = 22;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR UNIT KOMPETENSI', pageWidth / 2, curY, { align: 'center' });

  curY += 5;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('List of Competency Unit', pageWidth / 2, curY, { align: 'center' });

  // 2. Table: Kode Unit & Judul Unit
  curY += 7;
  const unitList =
    ukk.unit_kompetensi && ukk.unit_kompetensi.length > 0
      ? ukk.unit_kompetensi
      : getDefaultUnitKompetensi(siswa.program_keahlian, siswa.konsentrasi_keahlian);

  const tableBody = unitList.map((u) => [u.kode_unit, u.judul_unit]);

  autoTable(doc, {
    startY: curY,
    margin: { left: 20, right: 20 },
    head: [['Kode Unit\nUnit Code', 'Judul Unit\nUnit Title']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249], // #f1f5f9 light slate gray
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2.8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 2.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 38, halign: 'center', fontStyle: 'normal' },
      1: { cellWidth: 'auto', halign: 'left' },
    },
    didDrawCell: (dataCell) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(dataCell.cell.x, dataCell.cell.y, dataCell.cell.width, dataCell.cell.height);
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || (curY + 120);

  // 3. Symmetrical Dual Signatures (Penguji Internal & Penguji Eksternal)
  const signStartY = Math.max(finalY + 12, 230);
  const colLeftX = 60;
  const colRightX = 150;

  // Column 1: Penguji Internal
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Penguji Internal', colLeftX, signStartY, { align: 'center' });
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Internal Assessor', colLeftX, signStartY + 3.5, { align: 'center' });

  // Column 2: Penguji Eksternal
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Penguji Eksternal', colRightX, signStartY, { align: 'center' });
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('External Assessor', colRightX, signStartY + 3.5, { align: 'center' });

  const nameY = signStartY + 22;

  // Digital Signatures
  if (ukk.ttd_asesor_internal) {
    try {
      doc.addImage(ukk.ttd_asesor_internal, 'PNG', colLeftX - 16, signStartY + 5, 32, 14);
    } catch {}
  }
  if (ukk.ttd_asesor_eksternal) {
    try {
      doc.addImage(ukk.ttd_asesor_eksternal, 'PNG', colRightX - 16, signStartY + 5, 32, 14);
    } catch {}
  }

  // Column 1 Signer
  const asesorIntText = ukk.asesor_internal || 'Penguji Sekolah';
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(asesorIntText, colLeftX, nameY, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`(${data.sekolah?.nama || 'SMK ASSALAM'})`, colLeftX, nameY + 3.8, { align: 'center' });

  // Column 2 Signer
  const asesorEksText = ukk.asesor_eksternal || 'Penguji DU/DI';
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(asesorEksText, colRightX, nameY, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`(${ukk.mitra_nama || 'Mitra Industri'})`, colRightX, nameY + 3.8, { align: 'center' });
};

/**
 * =========================================================================
 * LAMPIRAN 2 (JUKNIS 2026 HAL 23): SURAT KETERANGAN TELAH MENGIKUTI UKK
 * Diberikan kepada peserta uji yang belum mencapai ambang batas kompeten (skor < 75)
 * =========================================================================
 */
export const renderSuratKeteranganUkk = (
  doc: jsPDF,
  data: SertifikatUkkPrintData,
  options?: SertifikatUkkRenderOptions
) => {
  const pageWidth = 210;
  const namaSekolah = data.sekolah?.nama || 'SMK NEGERI ABSENTA';
  const kotaSekolah = data.sekolah?.kota || 'Purwakarta';
  const kepalaSekolahNama = data.sekolah?.kepala_sekolah || 'Kepala Sekolah';
  const nipKepala = data.sekolah?.nip_kepala || '-';
  const nomorSurat = `${data.nomor_sertifikat || '800/056/413.31/UKK/2026'}/SK-UKK/${new Date().getFullYear()}`;
  const tanggalTerbit = data.tanggal_terbit || `${kotaSekolah}, ${formatTanggalIndonesia(new Date())}`;
  const { siswa, ukk } = data;

  let curY = 16;

  // 1. Kop Surat Resmi
  if (options?.logoDaerahBase64) {
    try {
      doc.addImage(options.logoDaerahBase64, 'PNG', 18, curY, 20, 20);
    } catch {}
  }
  if (options?.logoSekolahBase64) {
    try {
      doc.addImage(options.logoSekolahBase64, 'PNG', pageWidth - 38, curY, 20, 20);
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('PEMERINTAH DAERAH PROVINSI', pageWidth / 2, curY + 2, { align: 'center' });
  doc.setFontSize(10);
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, curY + 6.5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, curY + 11.5, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const alamat = data.sekolah?.alamat || 'Jl. Pendidikan No. 1';
  const telp = data.sekolah?.telepon ? `Telp: ${data.sekolah.telepon}` : '';
  const email = data.sekolah?.email ? `Email: ${data.sekolah.email}` : '';
  doc.text(`${alamat} ${telp ? '• ' + telp : ''} ${email ? '• ' + email : ''}`, pageWidth / 2, curY + 16, { align: 'center' });

  curY += 21;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(18, curY, pageWidth - 18, curY);
  doc.setLineWidth(0.2);
  doc.line(18, curY + 1, pageWidth - 18, curY + 1);

  // 2. Judul Surat Keterangan
  curY += 10;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('SURAT KETERANGAN', pageWidth / 2, curY, { align: 'center' });
  curY += 5;
  doc.setFontSize(11);
  doc.text('TELAH MENGIKUTI UJI KOMPETENSI KEAHLIAN', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nomor : ${nomorSurat}`, pageWidth / 2, curY, { align: 'center' });

  // 3. Narasi Pembuka
  curY += 9;
  doc.setFontSize(9.5);
  doc.text(`Kepala ${namaSekolah} menerangkan bahwa :`, 20, curY);

  curY += 4;
  const siswaData = [
    ['Nama', `:  ${siswa.nama_siswa}`],
    ['NISN', `:  ${siswa.nisn || siswa.nis || '-'}`],
    ['Program Keahlian', `:  ${siswa.program_keahlian || '-'}`],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: 22, right: 22 },
    body: siswaData,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.2, textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
  });

  const studentFinalY = (doc as any).lastAutoTable?.finalY || (curY + 18);
  curY = studentFinalY + 4;

  const judulPaket = ukk.judul_penugasan || 'Implementasi Jaringan Komputer';
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  const narrativeLines = doc.splitTextToSize(
    `Telah mengikuti uji kompetensi keahlian pada paket ${judulPaket} dengan keterangan pada unit di bawah ini :`,
    pageWidth - 40
  );
  doc.text(narrativeLines, 20, curY);
  curY += narrativeLines.length * 4.5 + 2;

  // 4. Tabel 3 Kolom Lampiran 2
  const unitList =
    ukk.unit_kompetensi && ukk.unit_kompetensi.length > 0
      ? ukk.unit_kompetensi
      : getDefaultUnitKompetensi(siswa.program_keahlian, siswa.konsentrasi_keahlian);

  const nilaiAkhirNum = Number(ukk.nilai_akhir ?? 70);
  const tableBody = unitList.map((u, idx) => {
    const isKompeten = nilaiAkhirNum >= 75 || idx < 8;
    return [u.kode_unit, u.judul_unit, isKompeten ? 'Kompeten' : 'Belum Kompeten'];
  });

  autoTable(doc, {
    startY: curY,
    margin: { left: 20, right: 20 },
    head: [['Kode Unit\nUnit Code', 'Judul Unit\nUnit Title', 'Keterangan\nInformation']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      lineColor: [100, 116, 139],
      lineWidth: 0.3,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [100, 116, 139],
      lineWidth: 0.3,
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 36, halign: 'center', fontStyle: 'normal' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
    },
    didDrawCell: (dataCell) => {
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.rect(dataCell.cell.x, dataCell.cell.y, dataCell.cell.width, dataCell.cell.height);
    },
  });

  const tableFinalY = (doc as any).lastAutoTable?.finalY || (curY + 60);
  curY = tableFinalY + 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Demikian surat keterangan ini kami sampaikan untuk di pergunakan sebagaimana mestinya.', 20, curY);

  // 5. Tanda Tangan Tunggal Kepala Sekolah (Kanan Bawah)
  const signBlockY = Math.max(curY + 12, 235);
  const signCenterX = 155;

  doc.text(tanggalTerbit, signCenterX, signBlockY, { align: 'center' });
  doc.text('Kepala SMK,', signCenterX, signBlockY + 4.5, { align: 'center' });

  const ttdKepala = data.sekolah?.ttd_kepala || ukk.ttd_kepala_sekolah;
  if (ttdKepala) {
    try {
      doc.addImage(ttdKepala, 'PNG', signCenterX - 16, signBlockY + 7, 32, 16);
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(kepalaSekolahNama, signCenterX, signBlockY + 28, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${nipKepala}`, signCenterX, signBlockY + 32, { align: 'center' });
};

/**
 * =========================================================================
 * GENERATE COMPLETE DOCUMENT (1 or 2 Pages based on templateType)
 * =========================================================================
 */
export const generateSertifikatUkkDoc = async (
  data: SertifikatUkkPrintData,
  options?: SertifikatUkkRenderOptions
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const tutWuriPng = await getTutWuriPngDataUrl();

  if (options?.templateType === 'suket_lampiran_2') {
    // 1 Halaman: Surat Keterangan Telah Mengikuti UKK (Lampiran 2 Hal 23)
    renderSuratKeteranganUkk(doc, data, options);
  } else {
    // 2 Halaman: Sertifikat Kompetensi Resmi
    // Halaman 1: Muka Sertifikat Resmi
    renderSertifikatUkkFront(doc, data, options, tutWuriPng);

    // Halaman 2: Daftar Unit Kompetensi (Lembar Belakang)
    doc.addPage('a4', 'portrait');
    renderSertifikatUkkBack(doc, data);
  }

  return doc;
};

/**
 * Generate Single PDF Blob URL & Filename
 */
export const generateSertifikatUkkSinglePdf = async (
  data: SertifikatUkkPrintData,
  options?: SertifikatUkkRenderOptions
): Promise<{ blobUrl: string; filename: string; doc: jsPDF }> => {
  const doc = await generateSertifikatUkkDoc(data, options);
  const cleanName = (data.siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_');
  const prefix = options?.templateType === 'suket_lampiran_2' ? 'SURAT_KETERANGAN_UKK' : 'SERTIFIKAT_UKK';
  const filename = `${prefix}_${cleanName}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename, doc };
};

/**
 * Generate Batch UKK Certificates PDF (Sekelas, Sesuai Format Pilihan)
 */
export const generateSertifikatUkkBatchPdf = async (
  list: SertifikatUkkPrintData[],
  namaKelas = 'Kelas',
  onProgress?: (current: number, total: number, studentName: string) => void,
  options?: SertifikatUkkRenderOptions
): Promise<{ blobUrl: string; filename: string; doc: jsPDF }> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const tutWuriPng = await getTutWuriPngDataUrl();

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (i > 0) {
      doc.addPage('a4', 'portrait');
    }
    onProgress?.(i + 1, list.length, item.siswa.nama_siswa);

    if (options?.templateType === 'suket_lampiran_2') {
      renderSuratKeteranganUkk(doc, item, options);
    } else {
      // Page 1: Muka Depan
      renderSertifikatUkkFront(doc, item, options, tutWuriPng);

      // Page 2: Lembar Belakang
      doc.addPage('a4', 'portrait');
      renderSertifikatUkkBack(doc, item);
    }
  }

  const cleanKelas = namaKelas.replace(/\s+/g, '_');
  const prefix = options?.templateType === 'suket_lampiran_2' ? 'SURAT_KETERANGAN_UKK_SEKELAS' : 'SERTIFIKAT_UKK_SEKELAS';
  const filename = `${prefix}_${cleanKelas}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename, doc };
};
