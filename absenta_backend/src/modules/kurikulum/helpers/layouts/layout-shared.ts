/**
 * layout-shared.ts
 * Context interface dan helper TTD yang dipakai bersama semua layout dokumen.
 */

export interface PerangkatLayoutContext {
  jenis: string;
  mapel_name: string;
  kelas: string;
  dynamicFase: string;
  topik: string;
  alokasi_waktu?: string;
  // TTD dinamis dari data tenant & profil guru login
  nama_kepala_sekolah?: string;
  nip_kepala_sekolah?: string;
  nama_guru?: string;
  nip_guru?: string;
  nama_sekolah?: string;
  kota_sekolah?: string;
  tahun_pelajaran?: string;
  jenjang?: string; // SD, SMP, SMA, SMK, MI, MTS, MA, etc.
  durasi_jp_menit?: number; // Custom KBM setting (if any)
  // Opsional flag Kop Surat Sekolah
  include_kop?: boolean;
}

/**
 * Menghitung durasi 1 Jam Pelajaran (JP) dalam menit secara dinamis.
 * Multi-tenant & Multi-jenjang aware:
 * - SD / MI          : 35 Menit (Fase A, B, C / Kelas 1-6)
 * - SMP / MTs        : 40 Menit (Fase D / Kelas 7-9)
 * - SMA / SMK / MA   : 45 Menit (Fase E, F / Kelas 10-12)
 * - Atau mengambil dari konfigurasi KBM Tenant bila tersedia.
 */
export function resolveDurasiJp(ctx: PerangkatLayoutContext): number {
  if (ctx.durasi_jp_menit && ctx.durasi_jp_menit > 0) {
    return ctx.durasi_jp_menit;
  }

  const jenjangUpper = String(ctx.jenjang || '').toUpperCase();
  const kelasNum = parseInt(String(ctx.kelas || '10').replace(/\D/g, '') || '10');
  const faseUpper = String(ctx.dynamicFase || '').toUpperCase();

  // SD / MI (Fase A, B, C / Kelas 1-6)
  if (
    jenjangUpper.includes('SD') ||
    jenjangUpper.includes('MI') ||
    faseUpper === 'A' ||
    faseUpper === 'B' ||
    faseUpper === 'C' ||
    (kelasNum >= 1 && kelasNum <= 6)
  ) {
    return 35;
  }

  // SMP / MTs (Fase D / Kelas 7-9)
  if (
    jenjangUpper.includes('SMP') ||
    jenjangUpper.includes('MTS') ||
    faseUpper === 'D' ||
    (kelasNum >= 7 && kelasNum <= 9)
  ) {
    return 40;
  }

  // SMA / SMK / MA / MAK (Fase E, F / Kelas 10-12)
  return 45;
}

export interface JpAllocationResult {
  totalSemesterJp: number;
  totalTahunanJp: number;
  jpPerTopic: number[]; // Array JP untuk masing-masing topik di Semester Ganjil
  jpPerTopicTahunan: number[]; // Array JP untuk seluruh topik (Ganjil + Genap)
  jpPerMinggu: number; // e.g. 4 JP / minggu
  durasiMenitPerJp: number; // e.g. 35, 40, 45
}

/**
 * Kalkulator Alokasi JP Terpadu (Unified & Mathematically Consistent).
 * Menjamin 100% konsistensi matematis & hirarki antara PROTA, PROMES, dan ATP:
 * - PROTA (Tahunan)  = Semester Ganjil JP + Semester Genap JP (e.g. 72 + 72 = 144 JP)
 * - PROMES (Ganjil)  = Total JP Topik 1..N (Semester Ganjil) = Grid Minggu (e.g. 72 JP)
 * - ATP (Ganjil)     = Total JP Topik 1..N (Semester Ganjil) (e.g. 72 JP)
 */
export function calculateJpAllocation(
  ctx: PerangkatLayoutContext,
  numTopics: number = 3,
): JpAllocationResult {
  const durasiMenitPerJp = resolveDurasiJp(ctx);
  const n = Math.max(1, numTopics);

  // Parsing alokasi_waktu jika diberikan user (e.g. "72 JP", "144 JP", "4 JP / minggu")
  let parsedSemesterJp = 0;
  if (ctx.alokasi_waktu) {
    const numbers = ctx.alokasi_waktu.match(/\d+/g)?.map(Number) || [];
    if (numbers.length > 0) {
      const val = numbers[0];
      if (val >= 100) {
        // Jika angka >= 100, diasumsikan alokasi TAHUNAN (e.g. 144 JP)
        parsedSemesterJp = Math.round(val / 2);
      } else if (val >= 30) {
        // Jika angka 30..99, diasumsikan alokasi SEMESTER (e.g. 72 JP, 54 JP)
        parsedSemesterJp = val;
      } else if (val <= 10) {
        // Jika angka <= 10, diasumsikan JP per minggu (e.g. 4 JP / minggu -> 4 x 18 minggu = 72 JP)
        parsedSemesterJp = val * 18;
      }
    }
  }

  // Fallback standar Kurikulum Merdeka (18 Minggu Efektif x 4 JP/minggu = 72 JP per Semester / 144 JP per Tahun)
  const totalSemesterJp = parsedSemesterJp > 0 ? parsedSemesterJp : 72;
  const totalTahunanJp = totalSemesterJp * 2;
  const jpPerMinggu = Math.max(2, Math.round(totalSemesterJp / 18));

  // Distribusi JP per topik secara adil & presisi (total harus persis = totalSemesterJp)
  const baseJp = Math.floor(totalSemesterJp / n);
  const remainder = totalSemesterJp - baseJp * n;

  const jpPerTopic: number[] = [];
  for (let i = 0; i < n; i++) {
    const extra = i < remainder ? 1 : 0;
    jpPerTopic.push(baseJp + extra);
  }

  // Untuk PROTA (Tahunan): Ulangi pola JP yang sama untuk Semester Genap
  const jpPerTopicTahunan = [...jpPerTopic, ...jpPerTopic];

  return {
    totalSemesterJp,
    totalTahunanJp,
    jpPerTopic,
    jpPerTopicTahunan,
    jpPerMinggu,
    durasiMenitPerJp,
  };
}

/**
 * Membangun HTML Kop Surat Resmi Sekolah (Header Instansi/Dinas) secara dinamis.
 */
export function buildKopHeaderBlock(ctx: PerangkatLayoutContext): string {
  const namaSekolah = ctx.nama_sekolah || 'SMK NEGERI 1 CIMAHI';
  const kota = ctx.kota_sekolah || 'Cimahi';

  return `
<div id="kop-sekolah-official" class="kop-sekolah-official" style="width:100%;margin-bottom:14px;padding-bottom:8px;border-bottom:3px double #0f172a;text-align:center;font-family:Arial,sans-serif;">
  <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:4px;">
    <tr>
      <td style="width:12%;text-align:center;vertical-align:middle;border:none;padding:0;">
        <div style="font-size:32px;line-height:1;">🏫</div>
      </td>
      <td style="text-align:center;vertical-align:middle;border:none;padding:0 8px;">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#1e293b;margin-bottom:1px;">PEMERINTAH DAERAH PROVINSI / KABUPATEN</div>
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#334155;margin-bottom:2px;">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
        <div style="font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;margin-bottom:2px;">${namaSekolah}</div>
        <div style="font-size:8.5px;color:#475569;line-height:1.3;">Kota ${kota} &nbsp;|&nbsp; Email: info@sekolah.sch.id &nbsp;|&nbsp; Website: www.sekolah.sch.id</div>
      </td>
      <td style="width:12%;text-align:center;vertical-align:middle;border:none;padding:0;">
        <div style="font-size:24px;line-height:1;opacity:0.85;">🇮🇩</div>
      </td>
    </tr>
  </table>
</div>`;
}

/**
 * Membangun blok area tanda tangan (TTD) dokumen resmi secara dinamis.
 * Mengambil data Kepala Sekolah dari tenant config & Guru dari profil login.
 */
export function buildTtdBlock(ctx: PerangkatLayoutContext): string {
  const kota = ctx.kota_sekolah || '...............';
  const tahun = ctx.tahun_pelajaran
    ? ctx.tahun_pelajaran.substring(0, 4)
    : new Date().getFullYear().toString();

  const namaKepsek = ctx.nama_kepala_sekolah || '_______________________';
  const nipKepsek = ctx.nip_kepala_sekolah
    ? `NIP. ${ctx.nip_kepala_sekolah}`
    : 'NIP. ___________________';

  const namaGuru = ctx.nama_guru || '_______________________';
  const nipGuru = ctx.nip_guru
    ? `NIP. ${ctx.nip_guru}`
    : 'NIP. ___________________';

  const hasRealKepsek = !!ctx.nama_kepala_sekolah;
  const hasRealGuru = !!ctx.nama_guru;

  return `
<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px;font-family:Arial,sans-serif;">
  <div style="text-align:center;min-width:200px;">
    <div style="margin-bottom:4px;">Mengetahui,</div>
    <div style="font-weight:bold;">Kepala Sekolah</div>
    <div style="margin:60px 0 4px 0;">
      ${hasRealKepsek
        ? `<div style="font-weight:bold;text-decoration:underline;">${namaKepsek}</div>`
        : `<div>(_______________________)</div>`
      }
    </div>
    <div style="color:#64748b;font-size:11px;">${nipKepsek}</div>
  </div>
  <div style="text-align:center;min-width:200px;">
    <div style="margin-bottom:4px;">${kota}, Juli ${tahun}</div>
    <div style="font-weight:bold;">Guru Mata Pelajaran</div>
    <div style="margin:60px 0 4px 0;">
      ${hasRealGuru
        ? `<div style="font-weight:bold;text-decoration:underline;">${namaGuru}</div>`
        : `<div>(_______________________)</div>`
      }
    </div>
    <div style="color:#64748b;font-size:11px;">${nipGuru}</div>
  </div>
</div>`;
}

/**
 * Membangun bagian topicGuideline untuk prompt AI (multi-topik).
 * Dipakai oleh semua layout AI prompt builder.
 */
export function buildTopicGuideline(
  ctx: PerangkatLayoutContext,
  jenisLabel: string,
): string {
  const topicList = String(ctx.topik || '')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);

  if (topicList.length > 1) {
    return `\nATURAN KHUSUS MULTI-TOPIK UNTUK DOKUMEN MAKRO (${jenisLabel}):
User memilih ${topicList.length} topik pembelajaran sekaligus untuk dirangkum dalam 1 dokumen matriks:
${topicList.map((t, idx) => `  - Topik ${idx + 1}: ${t}`).join('\n')}

WAJIB HUKUMNYA menyusun setiap topik di atas menjadi BARIS-BARIS TERPISAH (Row-by-Row) dalam tabel matriks ${jenisLabel}:
- Berikan kode TP berurutan untuk setiap topik (contoh: TP ${ctx.kelas}.1, TP ${ctx.kelas}.2, dst.).
- Bagi alokasi JP secara proporsional untuk masing-masing topik.
- Petakan alur waktu bulan/minggu pelaksanaan secara berkesinambungan (kontinum) dari Topik 1 hingga Topik ${topicList.length}.\n`;
  }

  return `\nFOKUS TOPIK UTAMA: "${ctx.topik}"\n`;
}

/**
 * Bagian standar akhir dari setiap AI prompt (formatting rules + TTD template).
 */
export function buildAIPromptSuffix(ctx: PerangkatLayoutContext): string {
  const ttdKota = ctx.kota_sekolah || '...............';
  const ttdTahun = ctx.tahun_pelajaran
    ? ctx.tahun_pelajaran.substring(0, 4)
    : new Date().getFullYear().toString();

  return `

STANDAR PROMPTING & FORMATTING OUTPUT (STRICT):
1. Output Wajib berupa Kode HTML Bersih (tanpa tag <html>, <head>, atau <body>, langsung berupa elemen <div> pembungkus utama).
2. Gunakan gaya bahasa akademis resmi Indonesia sesuai Permendikbudristek No. 12 Tahun 2024.
3. Seluruh bagian dokumen WAJIB diisi lengkap, detail, dan komprehensif. DILARANG keras menggunakan kata penampung seperti "[Isi di sini]", "...", atau kalimat yang terpotong.
4. Gunakan struktur tabel HTML dengan border yang rapi (border-collapse: collapse; style="border: 1px solid #cbd5e1; padding: 8px;") untuk menjabarkan matriks KBM, rubrik, atau jadwal agar tampilan di Word Editor terlihat sangat profesional.
5. LEMBAR PENGESAHAN (WAJIB): Di bagian akhir dokumen, WAJIB sertakan area tanda tangan dengan format HTML flex/space-between persis seperti berikut (gunakan nama nyata yang disediakan, BUKAN placeholder kosong):
<div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-family: Arial, sans-serif;">
  <div style="text-align: center; min-width: 200px;">
    <div>Mengetahui,</div>
    <div style="font-weight: bold;">Kepala Sekolah</div>
    <div style="margin: 60px 0 4px 0;"><div style="font-weight: bold; text-decoration: underline;">${ctx.nama_kepala_sekolah || '_______________________'}</div></div>
    <div style="color: #64748b; font-size: 11px;">${ctx.nip_kepala_sekolah ? `NIP. ${ctx.nip_kepala_sekolah}` : 'NIP. ___________________'}</div>
  </div>
  <div style="text-align: center; min-width: 200px;">
    <div>${ttdKota}, Juli ${ttdTahun}</div>
    <div style="font-weight: bold;">Guru Mata Pelajaran</div>
    <div style="margin: 60px 0 4px 0;"><div style="font-weight: bold; text-decoration: underline;">${ctx.nama_guru || '_______________________'}</div></div>
    <div style="color: #64748b; font-size: 11px;">${ctx.nip_guru ? `NIP. ${ctx.nip_guru}` : 'NIP. ___________________'}</div>
  </div>
</div>
--- END LEMBAR PENGESAHAN TEMPLATE (gunakan persis seperti di atas, JANGAN modifikasi struktur HTML) ---`;
}
