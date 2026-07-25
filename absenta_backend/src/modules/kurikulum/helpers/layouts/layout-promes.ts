/**
 * layout-promes.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen PROMES
 * (Program Semester) Kurikulum Merdeka.
 * Orientasi: LANDSCAPE A4 — grid kalender mingguan.
 */

import {
  PerangkatLayoutContext,
  buildTtdBlock,
  buildTopicGuideline,
  buildAIPromptSuffix,
  calculateJpAllocation,
} from './layout-shared';

const ROLE_PERSONA =
  'Anda adalah Pakar Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Ahli Pedagogi Pendidikan Nasional Indonesia.';

/**
 * Membangun HTML fallback untuk dokumen PROMES (grid kalender).
 */
export function buildPromesHtml(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik } = ctx;
  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const topicsList = String(topik || '')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);
  const activeTopics =
    topicsList.length > 0 ? topicsList : ['Topik Utama Pembelajaran'];

  // Gunakan Kalkulator Terpadu JP
  const jpAlloc = calculateJpAllocation(ctx, activeTopics.length);
  const totalJp = jpAlloc.totalSemesterJp;

  // Grid bulan: Juli – Desember (Semester Ganjil)
  const months = ['JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const weeks = ['M1', 'M2', 'M3', 'M4'];

  const monthHeaders = months
    .map((m) => `<th style="padding:5px 3px;border:1px solid #334155;text-align:center;font-size:8px;" colspan="4">${m}</th>`)
    .join('');

  const weekSubHeaders = months
    .flatMap(() =>
      weeks.map(
        (w) =>
          `<th style="padding:3px 1px;border:1px solid #334155;text-align:center;font-size:7px;width:2%;">${w}</th>`,
      ),
    )
    .join('');

  const rowsHtml = activeTopics
    .map((tItem, idx) => {
      const isEven = idx % 2 === 1;
      const topicJp = jpAlloc.jpPerTopic[idx] || Math.round(totalJp / activeTopics.length);

      // Tandai minggu aktif berdasarkan urutan topik
      const activeCells = months.flatMap((_, mIdx) =>
        weeks.map((_, wIdx) => {
          const cellIdx = mIdx * 4 + wIdx;
          const isActive = cellIdx >= idx * 3 && cellIdx < idx * 3 + 3;
          return isActive
            ? `<td style="padding:3px 1px;border:1px solid #cbd5e1;text-align:center;background:#3b82f6;color:white;font-size:8px;font-weight:bold;">✓</td>`
            : `<td style="padding:3px 1px;border:1px solid #cbd5e1;text-align:center;font-size:8px;"></td>`;
        }),
      ).join('');

      return `<tr style="${isEven ? 'background:#f8fafc;' : ''}">
  <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;font-size:9px;">${idx + 1}</td>
  <td style="padding:5px 6px;border:1px solid #cbd5e1;font-size:9px;"><b>TP ${kelas}.${idx + 1}:</b> ${tItem}</td>
  <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:center;font-size:9px;font-weight:bold;">${topicJp} JP</td>
  ${activeCells}
</tr>`;
    })
    .join('');

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.5;font-size:9.5px;">

  <!-- JUDUL -->
  <div style="text-align:center;padding-bottom:4px;margin-bottom:10px;">
    <div style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;">PROGRAM SEMESTER (PROMES)</div>
    <div style="font-size:11px;font-weight:700;color:#334155;margin-top:2px;">SEMESTER GANJIL &mdash; KURIKULUM MERDEKA &mdash; ${mapel_name}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px;">
      Mapel: <b>${mapel_name}</b> &nbsp;|&nbsp; Kelas: <b>${kelas} (Fase ${dynamicFase})</b> &nbsp;|&nbsp; Tahun Pelajaran: <b>${tahunPel}</b>
    </div>
  </div>

  <!-- IDENTITAS 4-kolom compact -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9px;">
    <tr>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;width:16%;">Satuan Pendidikan</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;width:34%;">${ctx.nama_sekolah || '...'}</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;width:16%;">Penyusun</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;">${ctx.nama_guru || '...'}</td>
    </tr>
    <tr>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Mata Pelajaran</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;">${mapel_name}</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Semester / T.P.</td>
      <td style="padding:3px 6px;border:1px solid #cbd5e1;">Ganjil / ${tahunPel}</td>
    </tr>
  </table>

  <!-- GRID PROMES -->
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:8.5px;word-break:break-word;">
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:5px 3px;border:1px solid #334155;text-align:center;width:3%;" rowspan="2">No</th>
        <th style="padding:5px 4px;border:1px solid #334155;width:28%;" rowspan="2">Tujuan Pembelajaran (TP) / Materi Pokok</th>
        <th style="padding:5px 3px;border:1px solid #334155;text-align:center;width:5%;" rowspan="2">JP</th>
        ${monthHeaders}
      </tr>
      <tr style="background:#1e3a5f;color:#ffffff;">
        ${weekSubHeaders}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="background:#1e3a5f;color:white;font-weight:bold;">
        <td style="padding:5px;border:1px solid #334155;text-align:center;" colspan="2">TOTAL ALOKASI WAKTU EFEKTIF SEMESTER GANJIL</td>
        <td style="padding:5px;border:1px solid #334155;text-align:center;font-size:9px;font-weight:900;">${totalJp} JP</td>
        <td style="padding:5px;border:1px solid #334155;font-size:8px;" colspan="24">100% Sesuai Struktur Program Tahunan &amp; ATP</td>
      </tr>
    </tbody>
  </table>

  <!-- Legenda -->
  <div style="margin-top:8px;font-size:8.5px;color:#475569;">
    <b>Keterangan:</b>
    <span style="margin-left:8px;">✓ = KBM Efektif</span>
    <span style="margin-left:12px;background:#f59e0b;color:white;padding:1px 4px;border-radius:2px;">PTS/PAS</span> = Sumatif
    <span style="margin-left:12px;background:#10b981;color:white;padding:1px 4px;border-radius:2px;">P5</span> = Projek P5
  </div>

  ${buildTtdBlock(ctx)}
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen PROMES.
 */
export function buildPromesAIPrompt(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah dokumen PROGRAM SEMESTER (PROMES) Kurikulum Merdeka.
Struktur Wajib Dokumen HTML PROMES:
1. JUDUL HEADER: "PROGRAM SEMESTER (PROMES) KURIKULUM MERDEKA"
2. TABEL GRID KALENDER MINGGUAN:
   Tabel HTML matriks mingguan (Kolom: No, Tujuan Pembelajaran / Materi, Alokasi JP, dan Grid Bulan Juli s.d. Desember atau Januari s.d. Juni yang terbagi menjadi Minggu 1, 2, 3, 4, 5).
   * Wajib memuat baris terpisah untuk setiap topik!
3. LEGENDA GRID: Keterangan simbol [X] Jam Efektif KBM, [P5] Projek Profil Pancasila, [PTS/PAS] Sumatif, dan Libur Semester.
4. LEMBAR PENGESAHAN.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: PROMES (Program Semester)
- Mata Pelajaran: ${mapel_name}
- Tingkat/Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'PROMES')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
