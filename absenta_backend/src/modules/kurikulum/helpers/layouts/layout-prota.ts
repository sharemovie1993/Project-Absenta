/**
 * layout-prota.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen PROTA
 * (Program Tahunan) Kurikulum Merdeka.
 * Orientasi: LANDSCAPE A4.
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
 * Membangun HTML fallback untuk dokumen PROTA.
 */
export function buildProtaHtml(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik } = ctx;

  const topicsList = String(topik || '')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);

  const activeTopics =
    topicsList.length > 0 ? topicsList : ['Struktur Utama Pembelajaran'];
  
  // Gunakan Kalkulator Terpadu JP
  const jpAlloc = calculateJpAllocation(ctx, activeTopics.length);
  const totalJp = jpAlloc.totalSemesterJp;
  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const rowsHtml = activeTopics
    .map((tItem, idx) => {
      const isSemester2 = idx >= Math.ceil(activeTopics.length / 2);
      const semLabel = isSemester2 ? 'GENAP' : 'GANJIL';
      const isEven = idx % 2 === 1;
      const topicJp = jpAlloc.jpPerTopic[idx] || Math.round(totalJp / activeTopics.length);

      return `<tr style="${isEven ? 'background:#f8fafc;' : ''}">
  <td style="padding:7px;border:1px solid #cbd5e1;text-align:center;font-size:10px;">${idx + 1}</td>
  <td style="padding:7px;border:1px solid #cbd5e1;font-weight:bold;font-size:10px;">${semLabel}</td>
  <td style="padding:7px;border:1px solid #cbd5e1;font-size:10px;"><b>TP ${kelas}.${idx + 1}:</b> ${tItem}</td>
  <td style="padding:7px;border:1px solid #cbd5e1;text-align:center;font-size:10px;font-weight:bold;">${topicJp} JP</td>
  <td style="padding:7px;border:1px solid #cbd5e1;font-size:10px;">Bulan Ke-${idx + 1}</td>
</tr>`;
    })
    .join('');

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.5;">

  <!-- JUDUL -->
  <div style="text-align:center;padding-bottom:6px;margin-bottom:12px;">
    <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;">PROGRAM TAHUNAN (PROTA)</div>
    <div style="font-size:12px;font-weight:700;color:#334155;margin-top:3px;">KURIKULUM MERDEKA &mdash; ${mapel_name}</div>
    <div style="font-size:10px;color:#64748b;margin-top:2px;">
      Mata Pelajaran: <b>${mapel_name}</b> &nbsp;|&nbsp; Kelas: <b>${kelas} (Fase ${dynamicFase})</b> &nbsp;|&nbsp; Tahun Pelajaran: <b>${tahunPel}</b>
    </div>
  </div>

  <!-- IDENTITAS -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10px;">
    <colgroup><col style="width:20%;"/><col style="width:30%;"/><col style="width:20%;"/><col style="width:30%;"/></colgroup>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Satuan Pendidikan</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${ctx.nama_sekolah || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Fase / Kelas</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">Fase ${dynamicFase} / Kelas ${kelas}</td>
    </tr>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Mata Pelajaran</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${mapel_name}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Total JP Tahunan</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;"><b>${totalJp} JP</b> (${activeTopics.length} Topik)</td>
    </tr>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Penyusun</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${ctx.nama_guru || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Tahun Pelajaran</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${tahunPel}</td>
    </tr>
  </table>

  <!-- MATRIKS PROTA -->
  <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:16px;font-size:10px;word-break:break-word;">
    <colgroup>
      <col style="width:5%;"/>
      <col style="width:12%;"/>
      <col style="width:53%;"/>
      <col style="width:15%;"/>
      <col style="width:15%;"/>
    </colgroup>
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:8px 6px;border:1px solid #334155;text-align:center;">No</th>
        <th style="padding:8px 6px;border:1px solid #334155;">Semester</th>
        <th style="padding:8px 6px;border:1px solid #334155;">Capaian / Tujuan Pembelajaran (TP)</th>
        <th style="padding:8px 6px;border:1px solid #334155;text-align:center;">Alokasi Waktu</th>
        <th style="padding:8px 6px;border:1px solid #334155;">Keterangan Jadwal</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="background:#1e3a5f;color:white;font-weight:bold;">
        <td style="padding:8px;border:1px solid #334155;text-align:center;" colspan="3">TOTAL ALOKASI JAM PELAJARAN EFEKTIF PER TAHUN</td>
        <td style="padding:8px;border:1px solid #334155;text-align:center;">${totalJp} JP</td>
        <td style="padding:8px;border:1px solid #334155;font-size:9px;">100% Sesuai Struktur</td>
      </tr>
    </tbody>
  </table>

  ${buildTtdBlock(ctx)}
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen PROTA.
 */
export function buildProtaAIPrompt(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah dokumen PROGRAM TAHUNAN (PROTA) Kurikulum Merdeka.
Struktur Wajib Dokumen HTML PROTA:
1. JUDUL HEADER: "PROGRAM TAHUNAN (PROTA) KURIKULUM MERDEKA"
2. IDENTITAS & REKAPITULASI TAHUNAN: Mapel ${mapel_name}, Kelas ${kelas} (Fase ${dynamicFase}).
3. TABEL MATRIKS PROTA:
   Tabel HTML dengan pemetaan Semester 1 (Ganjil) dan Semester 2 (Genap):
   - No
   - Semester (GANJIL / GENAP)
   - Capaian / Elemen Pembelajaran
   - Tujuan Pembelajaran (TP) / Bab Topik Materi
   - Alokasi Waktu Efektif (JP)
   - Keterangan Pelaksanaan Bulan
   * Wajib memuat baris terpisah untuk setiap topik!
4. BARIS TOTAL: Baris rekapitulasi Total Jam Pelajaran Efektif selama 1 Tahun Ajaran.
5. LEMBAR PENGESAHAN: Tanda tangan Kepala Sekolah dan Guru.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: PROTA (Program Tahunan)
- Mata Pelajaran: ${mapel_name}
- Tingkat/Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'PROTA')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
