/**
 * Helper template PDF Rapor Kurikulum Merdeka Terpadu & Terstandarisasi
 * Digunakan untuk Cover, Biodata, Laporan Capaian (CK1 & CK2), Rapor Sumatif, dan Leger Kelas.
 */

// SVG Lambang Daerah Jawa Barat (Gemah Ripah Repeh Rapih)
export const JABAR_LOGO_SVG = `
<svg width="105" height="125" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="50%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
  </defs>
  <!-- Perisai / Tameng -->
  <path d="M 50 5 Q 85 10 90 40 Q 92 80 50 115 Q 8 80 10 40 Q 15 10 50 5 Z" fill="url(#shieldGrad)" stroke="#14532d" stroke-width="2.5" />
  <!-- Padi dan Kapas Lingkar -->
  <path d="M 22 45 Q 18 75 50 95 Q 82 75 78 45" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-dasharray="2,2" />
  <!-- Kujang Pusaka Jawa Barat -->
  <path d="M 50 20 Q 58 28 55 42 Q 53 50 56 65 L 48 65 Q 46 48 44 40 Q 42 28 50 20 Z" fill="#ffffff" stroke="#1f2937" stroke-width="1.2" />
  <!-- Dam / Air Gelombang Biru Putih -->
  <rect x="25" y="70" width="50" height="12" fill="#0284c7" rx="2" />
  <path d="M 25 76 Q 37 72 50 76 Q 63 80 75 76 L 75 82 L 25 82 Z" fill="#ffffff" opacity="0.8" />
  <!-- Pita Semboyan Kuning Emas -->
  <path d="M 12 102 Q 50 116 88 102 L 86 111 Q 50 124 14 111 Z" fill="url(#goldGrad)" stroke="#a16207" stroke-width="1" />
  <!-- Teks Gemah Ripah Repeh Rapih -->
  <text x="50" y="108" font-family="'Arial', sans-serif" font-size="5" font-weight="bold" fill="#713f12" text-anchor="middle" letter-spacing="0.5">
    GEMAH RIPAH REPEH RAPIH
  </text>
</svg>
`;

/**
 * Pembungkus Layout Standar PDF (@page A4 / Margin Cetak / Typography)
 */
export function wrapWithPdfLayout(
  bodyContent: string,
  options: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    extraStyles?: string;
    margin?: string;
  } = {}
): string {
  const orientation = options.orientation || 'portrait';
  const margin = options.margin || (orientation === 'landscape' ? '8mm 12mm' : '10mm 15mm');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${options.title || 'Dokumen Rapor Absenta'}</title>
      <style>
        @page {
          size: A4 ${orientation};
          margin: ${margin};
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.35;
          color: #111;
          margin: 0;
          padding: 0;
          background-color: #fff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .page-break {
          page-break-before: always;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        
        /* Standard Table Styling */
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        table.data-table th, table.data-table td {
          border: 1px solid #111;
          padding: 5px 6px;
        }
        table.data-table th {
          background-color: #e5e7eb;
          font-weight: bold;
          text-align: center;
          font-size: 10.5px;
        }
        ${options.extraStyles || ''}
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
}

/**
 * Render Kop Identitas Rapor Siswa 2 Kolom (Sesuai Standar Blangko Resmi SMK)
 */
export function renderStudentReportHeader(
  student: {
    nama_siswa: string;
    nis: string;
    nisn?: string | null;
    kelas?: string | null;
    tingkat?: number | null;
    fase?: string | null;
    jurusan?: string | null;
    program_keahlian?: string | null;
    bidang_keahlian?: string | null;
  },
  academicCtx: {
    schoolName: string;
    schoolAddress?: string;
    semesterName: string;
    tahunPelajaran: string;
  },
  options: {
    compact?: boolean;
    hideVocationalDetails?: boolean;
  } = {}
): string {
  const fase = student.fase || (student.tingkat && student.tingkat >= 11 ? 'F' : 'E');
  const konsentrasi = student.jurusan || 'Teknik Audio Video';
  const program = student.program_keahlian || student.jurusan || 'Teknik Elektronika';
  const bidang = student.bidang_keahlian || 'Teknologi Manufaktur dan Rekayasa';
  const alamat = academicCtx.schoolAddress || 'Jl. Rawasari, Plered';

  const vocationalRows = options.hideVocationalDetails ? '' : `
    <tr>
      <td style="padding: 1.5px 0;">Bidang Keahlian</td>
      <td style="width: 2%;">:</td>
      <td style="padding: 1.5px 0;">${bidang}</td>
      <td colspan="3"></td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0;">Program Keahlian</td>
      <td>:</td>
      <td style="padding: 1.5px 0;">${program}</td>
      <td colspan="3"></td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0;">Konsentrasi Keahlian</td>
      <td>:</td>
      <td style="padding: 1.5px 0;">${konsentrasi}</td>
      <td colspan="3"></td>
    </tr>
  `;

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px;">
      <tr>
        <td style="width: 20%; padding: 1.5px 0;">Nama Peserta Didik</td>
        <td style="width: 2%;">:</td>
        <td style="width: 40%; font-weight: bold; text-transform: uppercase;">${student.nama_siswa}</td>
        <td style="width: 18%; padding: 1.5px 0;">Kelas</td>
        <td style="width: 2%;">:</td>
        <td style="width: 18%; font-weight: bold;">${student.kelas || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 1.5px 0;">NIS/NISN</td>
        <td>:</td>
        <td style="font-weight: bold;">${student.nis} / ${student.nisn || '-'}</td>
        <td style="padding: 1.5px 0;">Fase</td>
        <td>:</td>
        <td style="font-weight: bold;">${fase}</td>
      </tr>
      <tr>
        <td style="padding: 1.5px 0;">Nama Sekolah</td>
        <td>:</td>
        <td style="font-weight: bold; text-transform: uppercase;">${academicCtx.schoolName}</td>
        <td style="padding: 1.5px 0;">Semester</td>
        <td>:</td>
        <td>${academicCtx.semesterName}</td>
      </tr>
      <tr>
        <td style="padding: 1.5px 0;">Alamat</td>
        <td>:</td>
        <td>${alamat}</td>
        <td style="padding: 1.5px 0;">Tahun Pelajaran</td>
        <td>:</td>
        <td>${academicCtx.tahunPelajaran}</td>
      </tr>
      ${vocationalRows}
    </table>
  `;
}

/**
 * Render Blok Tanda Tangan Pengesahan (Orang Tua, Wali Kelas, Kepala Sekolah)
 */
export function renderSignaturesBlock(params: {
  includeOrtu?: boolean;
  walas?: { nama: string; nip?: string | null };
  kepsek?: { nama: string; nip?: string | null; status?: string | null; kota?: string | null };
  titimangsaDate?: string;
  isGenap?: boolean;
  orientation?: 'portrait' | 'landscape';
}): string {
  const includeOrtu = params.includeOrtu !== false;
  const walasNama = params.walas?.nama || '...................................................';
  const walasNip = params.walas?.nip ? `NIP. ${params.walas.nip}` : 'NIP. -';
  const kepsekNama = params.kepsek?.nama || '...................................................';
  const kepsekNip = params.kepsek?.nip ? `NIP. ${params.kepsek.nip}` : 'NIP. -';
  const kepsekJabatan = params.kepsek?.status === 'PLT' ? 'Plt. Kepala Sekolah,' : 'Kepala Sekolah,';
  const dateText = `${params.kepsek?.kota || 'Purwakarta'}, ${params.titimangsaDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  if (params.orientation === 'landscape') {
    return `
      <div style="margin-top: 25px; page-break-inside: avoid; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="width: 40%; text-align: left;">
            <div>Mengetahui,</div>
            <div style="margin-bottom: 50px;">${kepsekJabatan}</div>
            <div style="font-weight: bold; text-decoration: underline;">${kepsekNama}</div>
            <div style="font-size: 10px; color: #333;">${kepsekNip}</div>
          </div>
          <div style="width: 40%; text-align: right;">
            <div>${dateText}</div>
            <div style="margin-bottom: 50px; margin-top: 3px;">Wali Kelas,</div>
            <div style="font-weight: bold; text-decoration: underline;">${walasNama}</div>
            <div style="font-size: 10px; color: #333;">${walasNip}</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top: 30px; page-break-inside: avoid; font-size: 11px;">
      <div style="text-align: right; margin-bottom: 8px; padding-right: 25px;">
        ${dateText}
      </div>
      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <tr>
          ${includeOrtu ? '<td style="width: 50%; padding-bottom: 55px; vertical-align: top;">Orang Tua/Wali Siswa,</td>' : ''}
          <td style="${includeOrtu ? 'width: 50%;' : 'width: 100%;'} padding-bottom: 55px; vertical-align: top;">Wali Kelas,</td>
        </tr>
        <tr>
          ${includeOrtu ? '<td>...................................................</td>' : ''}
          <td>
            <div style="font-weight: bold; text-decoration: underline;">${walasNama}</div>
            <div style="font-size: 10px; color: #333;">${walasNip}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <div>Mengetahui;</div>
        <div style="margin-bottom: 55px;">${kepsekJabatan}</div>
        <div style="font-weight: bold; text-decoration: underline;">${kepsekNama}</div>
        <div style="font-size: 10px; color: #333;">${kepsekNip}</div>
      </div>
    </div>
  `;
}

/**
 * Helper Terbilang Angka Indonesia Sederhana (1 -> Satu, 2 -> Dua, dst)
 */
export function numberToWordsIndonesian(n: number | null | undefined): string {
  if (!n && n !== 0) return '-';
  const words = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas', 'Dua Belas'];
  if (n <= 12) return `${n} (${words[n]})`;
  return `${n}`;
}
