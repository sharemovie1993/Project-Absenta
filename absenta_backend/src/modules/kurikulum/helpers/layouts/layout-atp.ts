/**
 * layout-atp.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen ATP
 * (Alur Tujuan Pembelajaran) Kurikulum Merdeka.
 * Orientasi: LANDSCAPE A4 — 2 halaman profesional.
 */

import {
  PerangkatLayoutContext,
  buildTtdBlock,
  buildTopicGuideline,
  buildAIPromptSuffix,
  resolveDurasiJp,
  calculateJpAllocation,
} from './layout-shared';

const ROLE_PERSONA =
  'Anda adalah Pakar Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Ahli Pedagogi Pendidikan Nasional Indonesia.';

// ─── KKO Bloom (rotasi per baris) ────────────────────────────────────────────
const KKO_POOL = [
  ['mengidentifikasi', 'mendeskripsikan'],
  ['menganalisis', 'membandingkan'],
  ['merancang', 'menyusun'],
  ['mengevaluasi', 'mengembangkan'],
];

// ─── Elemen CP (Capaian Pembelajaran Kurikulum Merdeka) ───────────────────────
const ELEMEN_POOL = [
  'Pemahaman Konseptual',
  'Penerapan & Proses',
  'Analisis Kritis',
  'Refleksi & Akses',
];

// ─── Dimensi Profil Pelajar Pancasila ────────────────────────────────────────
const P3_POOL = [
  'Bernalar Kritis, Mandiri',
  'Gotong Royong, Kreatif',
  'Bernalar Kritis, Gotong Royong',
  'Kreatif, Mandiri',
];

// ─── Asesmen / Penilaian ─────────────────────────────────────────────────────
const ASESMEN_POOL = [
  'Tes Tertulis & Observasi',
  'Unjuk Kerja & Portofolio',
  'Presentasi & Rubrik',
  'Proyek & Penilaian Diri',
];

// ─── Lebar kolom landscape A4 (~253mm usable) ────────────────────────────────
// No:4% | Elemen:15% | TP:27% | Pokok:24% | P3:13% | JP:5% | Asesmen:12%
const COL_WIDTHS = ['4%', '15%', '27%', '24%', '13%', '5%', '12%'];

/**
 * Membangun HTML fallback untuk dokumen ATP (2 halaman landscape).
 */
export function buildAtpHtml(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik } = ctx;
  const durasiJp = resolveDurasiJp(ctx);

  const topicsList = String(topik || '')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);

  const activeTopics =
    topicsList.length > 0 ? topicsList : ['Konsep Dasar & Struktur Utama'];
  const totalTopics = activeTopics.length;

  // Gunakan Kalkulator Terpadu JP
  const jpAlloc = calculateJpAllocation(ctx, totalTopics);
  const totalJp = jpAlloc.totalSemesterJp;

  const rowsHtml = activeTopics
    .map((tItem, idx) => {
      const tpCode = `TP ${kelas}.${idx + 1}`;
      const isEven = idx % 2 === 1;
      const [kko1, kko2] = KKO_POOL[idx % KKO_POOL.length];
      const elemen = ELEMEN_POOL[idx % ELEMEN_POOL.length];
      const dimensiP3 = P3_POOL[idx % P3_POOL.length];
      const asesmen = ASESMEN_POOL[idx % ASESMEN_POOL.length];
      const jp = jpAlloc.jpPerTopic[idx] || Math.round(totalJp / totalTopics);

      // Pokok Materi: 3 poin jelas dan nyaman dibaca
      const pokokMateri = `<div style="font-size:9.5px;line-height:1.5;">
  <div>• Konsep &amp; kaidah utama ${tItem}</div>
  <div>• Penerapan kontekstual &amp; analisis kasus</div>
  <div>• Praktik otentik &amp; refleksi materi</div>
</div>`;

      // TP rumusan lengkap dan nyaman dibaca
      const rumusanTp = `Peserta didik mampu <b>${kko1}</b> konsep &amp; struktur <em>${tItem}</em>, serta <b>${kko2 ?? 'menganalisis'}</b> penerapannya secara kritis.`;
      const rowBg = isEven ? 'background:#f8fafc;' : 'background:#ffffff;';

      return `<tr style="${rowBg}break-inside:avoid;">
  <td style="padding:6px 4px;border:1px solid #cbd5e1;text-align:center;vertical-align:middle;font-size:10px;font-weight:bold;">${idx + 1}</td>
  <td style="padding:6px 8px;border:1px solid #cbd5e1;vertical-align:top;font-size:10px;line-height:1.45;">${elemen}</td>
  <td style="padding:6px 8px;border:1px solid #cbd5e1;vertical-align:top;font-size:10px;line-height:1.45;"><b>${tpCode}:</b> ${rumusanTp}</td>
  <td style="padding:6px 8px;border:1px solid #cbd5e1;vertical-align:top;">${pokokMateri}</td>
  <td style="padding:6px 8px;border:1px solid #cbd5e1;vertical-align:middle;font-size:9.5px;line-height:1.4;">${dimensiP3}</td>
  <td style="padding:6px 4px;border:1px solid #cbd5e1;text-align:center;vertical-align:middle;font-size:10px;font-weight:bold;">${jp} JP</td>
  <td style="padding:6px 8px;border:1px solid #cbd5e1;vertical-align:top;font-size:9.5px;line-height:1.4;">${asesmen}</td>
</tr>`;
    })
    .join('');

  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.5;font-size:10px;">

  <!-- ═══ HALAMAN 1: HEADER + IDENTITAS + MATRIKS ATP ═══ -->

  <!-- Judul Dokumen -->
  <div style="text-align:center;padding-bottom:4px;margin-bottom:12px;">
    <div style="font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;">ALUR TUJUAN PEMBELAJARAN (ATP)</div>
    <div style="font-size:11px;font-weight:700;color:#334155;margin-top:3px;">KURIKULUM MERDEKA &mdash; ${mapel_name}</div>
    <div style="font-size:9.5px;color:#64748b;margin-top:2px;">
      Mata Pelajaran: <b>${mapel_name}</b> &nbsp;|&nbsp; Kelas: <b>${kelas} (Fase ${dynamicFase})</b> &nbsp;|&nbsp; Tahun Pelajaran: <b>${tahunPel}</b>
    </div>
  </div>

  <!-- Identitas 4 kolom -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px;">
    <colgroup>
      <col style="width:18%;"/><col style="width:32%;"/>
      <col style="width:18%;"/><col style="width:32%;"/>
    </colgroup>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Satuan Pendidikan</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${ctx.nama_sekolah || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Fase / Kelas</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">Fase ${dynamicFase} / Kelas ${kelas}</td>
    </tr>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Mata Pelajaran</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${mapel_name}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Total Alokasi JP</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;"><b>${totalJp} JP</b> (${totalTopics} Topik)</td>
    </tr>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Penyusun / Guru</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${ctx.nama_guru || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Tahun Pelajaran</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${tahunPel}</td>
    </tr>
  </table>

  <!-- CP Elemen callout -->
  <div style="background:#eff6ff;border-left:3.5px solid #2563eb;padding:6px 10px;margin-bottom:10px;font-size:9.5px;line-height:1.5;border-radius:0 3px 3px 0;">
    <b>Capaian Pembelajaran (CP) Elemen:</b> Peserta didik mampu menganalisis, merancang, memproduksi, dan mengevaluasi pengetahuan serta keterampilan dalam mata pelajaran <em>${mapel_name}</em> secara sistematis, kritis, kreatif, dan mandiri sesuai Capaian Pembelajaran Fase ${dynamicFase} Kurikulum Merdeka <em>(Permendikbudristek No. 12/2024)</em>.
  </div>

  <!-- Matriks ATP — table-layout:fixed agar tidak overflow -->
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:10px;word-break:break-word;overflow-wrap:break-word;">
    <colgroup>
      ${COL_WIDTHS.map((w) => `<col style="width:${w};"/>`).join('\n      ')}
    </colgroup>
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:7px 5px;border:1px solid #334155;text-align:center;font-size:9.5px;">No</th>
        <th style="padding:7px 6px;border:1px solid #334155;font-size:9.5px;">Elemen CP</th>
        <th style="padding:7px 6px;border:1px solid #334155;font-size:9.5px;">Tujuan Pembelajaran (TP)</th>
        <th style="padding:7px 6px;border:1px solid #334155;font-size:9.5px;">Pokok Materi</th>
        <th style="padding:7px 6px;border:1px solid #334155;font-size:9.5px;">Dimensi P3</th>
        <th style="padding:7px 5px;border:1px solid #334155;text-align:center;font-size:9.5px;">JP</th>
        <th style="padding:7px 6px;border:1px solid #334155;font-size:9.5px;">Asesmen</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="background:#1e3a5f;color:white;font-weight:bold;">
        <td style="padding:6px;border:1px solid #334155;text-align:center;font-size:9.5px;" colspan="5">TOTAL ALOKASI WAKTU EFEKTIF SEMESTER</td>
        <td style="padding:6px;border:1px solid #334155;text-align:center;font-size:10px;font-weight:900;">${totalJp} JP</td>
        <td style="padding:6px;border:1px solid #334155;font-size:9px;">Formatif + Sumatif</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ HALAMAN 2: CATATAN + KETERANGAN + PENGESAHAN ═══ -->
  <div style="page-break-before:always;padding-top:16px;">

    <!-- Header mini halaman 2 -->
    <div style="border-bottom:1.5px solid #cbd5e1;padding-bottom:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="font-size:11px;font-weight:800;color:#0f172a;">ALUR TUJUAN PEMBELAJARAN (ATP) — <em>${mapel_name}</em></div>
        <div style="font-size:9px;color:#64748b;">Kelas ${kelas} (Fase ${dynamicFase}) &nbsp;|&nbsp; ${tahunPel} &nbsp;|&nbsp; Penyusun: ${ctx.nama_guru || '...'}</div>
      </div>
      <div style="font-size:9px;color:#94a3b8;font-style:italic;">Halaman 2 dari 2</div>
    </div>

    <!-- A. Catatan Penyusun -->
    <div style="margin-bottom:20px;">
      <div style="font-size:10.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.3px;">A. Catatan Penyusun</div>
      <div style="font-size:9.5px;color:#475569;border:1px dashed #cbd5e1;padding:8px 12px;border-radius:4px;line-height:1.6;">
        ATP ini disusun mengacu pada <b>Panduan Pembelajaran dan Asesmen (PPA) Kemendikbudristek 2022</b> dan <b>Permendikbudristek No. 12 Tahun 2024</b>.
        Urutan Tujuan Pembelajaran (TP) bersifat <em>fleksibel</em> dan dapat disesuaikan dengan kondisi, karakteristik, serta kebutuhan peserta didik.
        Satu JP = ${durasiJp} menit. Total alokasi <b>${totalJp} JP</b> untuk <b>${totalTopics} topik</b> pembelajaran dalam satu semester.
      </div>
    </div>

    <!-- B. Keterangan Singkatan -->
    <div style="margin-bottom:24px;">
      <div style="font-size:10.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.3px;">B. Keterangan Singkatan</div>
      <table style="width:60%;border-collapse:collapse;font-size:9px;">
        <tr>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;width:80px;">ATP</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Alur Tujuan Pembelajaran</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;width:60px;">CP</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Capaian Pembelajaran</td>
        </tr>
        <tr>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">TP</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Tujuan Pembelajaran</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">P3</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Profil Pelajar Pancasila</td>
        </tr>
        <tr>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">JP</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Jam Pelajaran (1 JP = ${durasiJp} mnt)</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">KKO</td>
          <td style="padding:3px 8px;border:1px solid #e2e8f0;">Kata Kerja Operasional Bloom</td>
        </tr>
      </table>
    </div>

    <!-- C. Lembar Pengesahan -->
    <div style="margin-top:8px;">
      <div style="font-size:10.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:20px;text-transform:uppercase;letter-spacing:0.3px;">C. Lembar Pengesahan</div>
      ${buildTtdBlock(ctx)}
    </div>

  </div>
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen ATP.
 */
export function buildAtpAIPrompt(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah dokumen ALUR TUJUAN PEMBELAJARAN (ATP) yang sistematis dan logis.
Struktur Wajib Dokumen HTML ATP:
1. JUDUL HEADER: "ALUR TUJUAN PEMBELAJARAN (ATP) KURIKULUM MERDEKA"
2. IDENTITAS & DESKRIPSI CP ELEMEN: Tuliskan Capaian Pembelajaran (CP) Elemen Mata Pelajaran ${mapel_name} Fase ${dynamicFase} secara akademis.
3. TABEL MATRIKS UTAMA ATP:
   Tabel HTML (border-collapse, header background #0f172a, text white) dengan kolom:
   - No
   - Elemen Capaian Pembelajaran (CP)
   - Tujuan Pembelajaran (TP) & Kode TP (Contoh: TP ${kelas}.1, TP ${kelas}.2, dst)
   - Alur Topik / Pokok Bahasan
   - Dimensi Profil Pelajar Pancasila (P3)
   - Alokasi Waktu (JP)
   - Asesmen & Rencana Penilaian
   * Wajib memuat baris terpisah untuk setiap topik!
4. LEMBAR PENGESAHAN: Tempat tanda tangan Kepala Sekolah dan Guru Mata Pelajaran.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: ATP (Alur Tujuan Pembelajaran)
- Mata Pelajaran: ${mapel_name}
- Tingkat/Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'ATP')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
