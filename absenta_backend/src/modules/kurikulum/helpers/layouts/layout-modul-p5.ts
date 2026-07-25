/**
 * layout-modul-p5.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen Modul Projek P5
 * (Projek Penguatan Profil Pelajar Pancasila) Kurikulum Merdeka.
 * Orientasi: PORTRAIT A4.
 */

import {
  PerangkatLayoutContext,
  buildTtdBlock,
  buildTopicGuideline,
  buildAIPromptSuffix,
} from './layout-shared';

const ROLE_PERSONA =
  'Anda adalah Pakar Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Ahli Pedagogi Pendidikan Nasional Indonesia.';

// Tema P5 resmi Kemendikbudristek
const TEMA_P5 = [
  'Gaya Hidup Berkelanjutan',
  'Kewirausahaan',
  'Suara Demokrasi',
  'Bhinneka Tunggal Ika',
  'Bangunlah Jiwa dan Raganya',
  'Rekayasa dan Teknologi',
  'Kearifan Lokal',
];

/**
 * Membangun HTML fallback untuk dokumen Modul Projek P5.
 */
export function buildModulP5Html(ctx: PerangkatLayoutContext): string {
  const { kelas, dynamicFase, topik } = ctx;
  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  // Deteksi tema dari topik (fallback ke tema pertama)
  const detectedTema =
    TEMA_P5.find((t) => topik.toLowerCase().includes(t.toLowerCase().split(' ')[0])) ||
    TEMA_P5[0];

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;">

  <!-- JUDUL -->
  <div style="border-bottom:2.5px solid #0f172a;padding-bottom:12px;margin-bottom:18px;text-align:center;">
    <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">MODUL PROJEK P5 KURIKULUM MERDEKA</div>
    <div style="font-size:12px;font-weight:700;color:#334155;margin-top:4px;">PROJEK PENGUATAN PROFIL PELAJAR PANCASILA</div>
    <div style="font-size:10px;color:#64748b;margin-top:2px;">
      Tema: <b>${detectedTema}</b> | Topik: <b>${topik}</b> | Kelas: <b>${kelas} (Fase ${dynamicFase})</b> | T.P.: <b>${tahunPel}</b>
    </div>
  </div>

  <!-- I. INFORMASI UMUM -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">I. Informasi Umum Projek P5</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;width:30%;">Tema Projek P5</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">${detectedTema}</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Topik / Isu Kontekstual</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">${topik}</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Target Fase / Kelas</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Kelas ${kelas} (Fase ${dynamicFase})</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Total Alokasi Waktu</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">120 Jam Pelajaran (JP)</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Dimensi P3 Utama</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Gotong Royong, Bernalar Kritis, Kreatif</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Sub-elemen P3</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Kolaborasi, Kepedulian, Menghasilkan Karya &amp; Tindakan Nyata</td>
    </tr>
  </table>

  <!-- II. ALUR AKTIVITAS -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">II. Alur Aktivitas Projek (4 Tahap)</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:8px 10px;border:1px solid #334155;width:25%;">Tahapan Projek</th>
        <th style="padding:8px 10px;border:1px solid #334155;">Deskripsi Aktivitas</th>
        <th style="padding:8px 10px;border:1px solid #334155;width:15%;text-align:center;">Alokasi JP</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">1. Pengenalan</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Mengenalkan isu &amp; masalah kontekstual seputar <em>${topik}</em>. Peserta didik mengeksplorasi fakta, data, dan dampak nyata dari isu tersebut di lingkungan sekitar.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">20 JP</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">2. Kontekstualisasi</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Melakukan observasi lapangan, wawancara narasumber, &amp; studi literatur. Peserta didik menyusun ide dan rancangan solusi kelompok secara kolaboratif.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">30 JP</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">3. Aksi Nyata</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Pembuatan produk/karya nyata berupa <em>${topik}</em> sebagai solusi inovatif. Sosialisasi hasil ke warga sekolah &amp; masyarakat sekitar.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">50 JP</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">4. Refleksi &amp; Pameran</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Evaluasi proses &amp; hasil projek secara mandiri (refleksi diri). Pameran Karya (Panen Hasil) sebagai perayaan &amp; bukti capaian projek.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">20 JP</td>
      </tr>
    </tbody>
  </table>

  <!-- III. RUBRIK ASESMEN P5 -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">III. Rubrik Asesmen Perkembangan Dimensi P5</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
    <thead>
      <tr style="background:#475569;color:#ffffff;">
        <th style="padding:7px 8px;border:1px solid #334155;width:20%;">Dimensi P3</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Mulai Berkembang</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Sedang Berkembang</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Berkembang Sesuai Harapan</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Sangat Berkembang</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Gotong Royong</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mulai mengenal kerja tim</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Berpartisipasi dengan bimbingan</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Aktif berkolaborasi mandiri</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Menginisiasi &amp; memimpin tim</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Bernalar Kritis</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mulai mengajukan pertanyaan</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Menganalisis dengan panduan</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Menganalisis &amp; mengevaluasi</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mengkritisi &amp; membuktikan</td>
      </tr>
      <tr>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Kreatif</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Meniru karya yang ada</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Memodifikasi dengan bimbingan</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Menghasilkan karya orisinal</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Berkarya inovatif &amp; berdampak</td>
      </tr>
    </tbody>
  </table>

  ${buildTtdBlock(ctx)}
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen Modul Projek P5.
 */
export function buildModulP5AIPrompt(ctx: PerangkatLayoutContext): string {
  const { kelas, dynamicFase, topik, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah MODUL PROJEK P5 (Projek Penguatan Profil Pelajar Pancasila).
Struktur Wajib Dokumen HTML Modul P5:
1. JUDUL HEADER: "MODUL PROJEK P5 KURIKULUM MERDEKA"
2. I. INFORMASI UMUM PROJEK: Tema P5 (Gaya Hidup Berkelanjutan / Kewirausahaan / Suara Demokrasi), Target Dimensi & Subelemen P3, Alokasi JP.
3. II. ALUR AKTIVITAS PROJEK (4 TAHAP):
   - Tahap 1: Pengenalan Isu Kontekstual
   - Tahap 2: Kontekstualisasi & Observasi Masalah
   - Tahap 3: Aksi Nyata & Pembuatan Produk/Karya (${topik})
   - Tahap 4: Refleksi, Evaluasi, & Pameran Hasil (Panen Karya)
4. III. RUBRIK ASESMEN PERKEMBANGAN DIMENSI P5.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: Modul Projek P5
- Topik / Isu Kontekstual: ${topik}
- Target Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'MODUL_PROJEK')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
