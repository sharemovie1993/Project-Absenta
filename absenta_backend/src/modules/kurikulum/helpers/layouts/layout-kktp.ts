/**
 * layout-kktp.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen KKTP
 * (Kriteria Ketercapaian Tujuan Pembelajaran) Kurikulum Merdeka.
 */

import {
  PerangkatLayoutContext,
  buildTtdBlock,
  buildTopicGuideline,
  buildAIPromptSuffix,
} from './layout-shared';

const ROLE_PERSONA =
  'Anda adalah Pakar Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Ahli Pedagogi Pendidikan Nasional Indonesia.';

/**
 * Membangun HTML fallback untuk dokumen KKTP.
 */
export function buildKktpHtml(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik } = ctx;
  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;">

  <!-- JUDUL -->
  <div style="border-bottom:2.5px solid #0f172a;padding-bottom:12px;margin-bottom:18px;text-align:center;">
    <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)</div>
    <div style="font-size:12px;font-weight:700;color:#334155;margin-top:4px;">KURIKULUM MERDEKA — ${topik}</div>
    <div style="font-size:10px;color:#64748b;margin-top:2px;">Mata Pelajaran: <b>${mapel_name}</b> | Kelas: <b>${kelas} (Fase ${dynamicFase})</b> | Tahun Pelajaran: <b>${tahunPel}</b></div>
  </div>

  <!-- IDENTITAS -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;width:22%;">Satuan Pendidikan</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;width:28%;">${ctx.nama_sekolah || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;width:22%;">Mata Pelajaran</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${mapel_name}</td>
    </tr>
    <tr>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Penyusun</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">${ctx.nama_guru || '...'}</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;font-weight:bold;background:#f1f5f9;">Kelas / Fase</td>
      <td style="padding:5px 8px;border:1px solid #cbd5e1;">Kelas ${kelas} / Fase ${dynamicFase}</td>
    </tr>
  </table>

  <!-- PENDEKATAN 1: RUBRIK DESKRIPSI -->
  <div style="font-size:11px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">I. RUBRIK DESKRIPSI KETERCAPAIAN</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:10px;">
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:7px 8px;border:1px solid #334155;width:22%;">Aspek Kriteria</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Baru Berkembang (0–60%)</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Layak (61–75%)</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Cakap (76–85%)</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Mahir (86–100%)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Pemahaman Konsep<br/><em>${topik}</em></td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Belum mampu menjelaskan konsep dasar ${topik}.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu menjelaskan istilah dasar dengan bimbingan guru.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu menganalisis &amp; menjelaskan secara mandiri.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu mendesain &amp; mengevaluasi secara kritis dan inovatif.</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Keterampilan Proses</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Belum mampu menerapkan prosedur dasar.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu menerapkan prosedur dengan panduan.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu menerapkan prosedur secara mandiri &amp; tepat.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu mengembangkan &amp; mengoptimalkan prosedur secara kreatif.</td>
      </tr>
      <tr>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:bold;">Sikap &amp; Kolaborasi</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Belum menunjukkan sikap aktif dalam kegiatan kelompok.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mulai aktif berpartisipasi dengan dorongan guru.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Aktif berkolaborasi dan berkontribusi dalam tim.</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Mampu memimpin, menginisiasi, dan menginspirasi anggota tim.</td>
      </tr>
    </tbody>
  </table>

  <!-- PENDEKATAN 2: INTERVAL NILAI -->
  <div style="font-size:11px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">II. TABEL INTERVAL NILAI &amp; TINDAK LANJUT</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
    <thead>
      <tr style="background:#475569;color:#ffffff;">
        <th style="padding:7px 8px;border:1px solid #334155;width:18%;text-align:center;">Interval Nilai</th>
        <th style="padding:7px 8px;border:1px solid #334155;width:30%;">Kriteria Ketercapaian</th>
        <th style="padding:7px 8px;border:1px solid #334155;">Tindak Lanjut Pembelajaran</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#fee2e2;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">0 – 40%</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Belum mencapai ketercapaian minimum</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Remedial total di seluruh bagian materi ${topik}</td>
      </tr>
      <tr style="background:#fef3c7;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">41 – 74%</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Belum mencapai ketercapaian minimum</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Remedial parsial pada bagian yang belum tuntas</td>
      </tr>
      <tr style="background:#d1fae5;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">75 – 85%</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Sudah mencapai ketercapaian</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Tidak perlu remedial, dapat melanjutkan ke materi baru</td>
      </tr>
      <tr style="background:#eff6ff;">
        <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;">86 – 100%</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Melampaui ketercapaian</td>
        <td style="padding:7px 8px;border:1px solid #cbd5e1;">Pengayaan &amp; tantangan projek mandiri tingkat lanjut</td>
      </tr>
    </tbody>
  </table>

  ${buildTtdBlock(ctx)}
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen KKTP.
 */
export function buildKktpAIPrompt(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah dokumen KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP) pengganti KKM.
Struktur Wajib Dokumen HTML KKTP:
1. JUDUL HEADER: "KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)"
2. BAGIAN I - RUBRIK KETERCAPAIAN KUALITATIF:
   Tabel Rubrik dengan Kolom: Indikator Aspek, Baru Berkembang (0-60%), Layak (61-75%), Cakap (76-85%), Mahir (86-100%). Jabarkan kriteria konkrit untuk topik: ${topik}.
3. BAGIAN II - TABEL INTERVAL NILAI & TINDAK LANJUT:
   Tabel Interval Nilai (0-40% Remedial Total, 41-74% Remedial Parsial, 75-85% Tuntas Tanpa Remedial, 86-100% Pengayaan).
4. LEMBAR PENGESAHAN.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)
- Mata Pelajaran: ${mapel_name}
- Tingkat/Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'KKTP')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
