/**
 * layout-modul-ajar.ts
 * Fallback HTML builder & AI Prompt builder untuk dokumen Modul Ajar / RPP Plus
 * Kurikulum Merdeka.
 * Orientasi: PORTRAIT A4.
 */

import {
  PerangkatLayoutContext,
  buildTtdBlock,
  buildTopicGuideline,
  buildAIPromptSuffix,
  resolveDurasiJp,
} from './layout-shared';

const ROLE_PERSONA =
  'Anda adalah Pakar Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Ahli Pedagogi Pendidikan Nasional Indonesia.';

/**
 * Membangun HTML fallback untuk dokumen Modul Ajar (RPP Plus).
 */
export function buildModulAjarHtml(ctx: PerangkatLayoutContext): string {
  const { jenis, mapel_name, kelas, dynamicFase, topik, alokasi_waktu } = ctx;
  const durasiJp = resolveDurasiJp(ctx);
  const alokasiDisplay = alokasi_waktu || `2 x ${durasiJp} Menit`;
  const tahunPel =
    ctx.tahun_pelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  return `
<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;">

  <!-- JUDUL -->
  <div style="border-bottom:2.5px solid #0f172a;padding-bottom:12px;margin-bottom:18px;text-align:center;">
    <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">MODUL AJAR KURIKULUM MERDEKA</div>
    <div style="font-size:12px;font-weight:700;color:#334155;margin-top:4px;">${jenis} &mdash; ${topik}</div>
    <div style="font-size:10px;color:#64748b;margin-top:2px;">
      Mata Pelajaran: <b>${mapel_name}</b> | Kelas: <b>${kelas} (Fase ${dynamicFase})</b> | Alokasi: <b>${alokasiDisplay}</b> | T.P.: <b>${tahunPel}</b>
    </div>
  </div>

  <!-- I. INFORMASI UMUM -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">I. Informasi Umum Perangkat Ajar</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;width:30%;">Mata Pelajaran</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">${mapel_name}</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Tingkat / Kelas / Fase</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Kelas ${kelas} (Fase ${dynamicFase})</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Topik Pembelajaran</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">${topik}</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Alokasi Waktu</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">${alokasiDisplay} (1 Pertemuan)</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Model Pembelajaran</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Problem-Based Learning (PBL) &amp; Project-Based Learning (PjBL)</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Profil Pelajar Pancasila</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Bernalar Kritis, Gotong Royong, Kreatif, Mandiri</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;">Sarana &amp; Prasarana</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Laptop/PC, LCD Projector, LKPD, Akses Internet, Bahan Ajar Digital</td>
    </tr>
  </table>

  <!-- II. CAPAIAN & TUJUAN -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">II. Capaian &amp; Tujuan Pembelajaran (CP &amp; TP)</div>
  <div style="background:#eff6ff;border-left:3.5px solid #2563eb;padding:8px 12px;margin-bottom:12px;font-size:11px;line-height:1.6;border-radius:0 3px 3px 0;">
    <b>Capaian Pembelajaran (CP):</b> Peserta didik mampu menganalisis, merancang, serta mengaplikasikan pengetahuan <em>${topik}</em> secara kritis, kreatif, dan mandiri sesuai standar Kurikulum Merdeka Fase ${dynamicFase}.
  </div>
  <ul style="font-size:11px;margin-bottom:18px;padding-left:20px;line-height:1.8;">
    <li><b>TP 1.1:</b> Peserta didik mampu mengidentifikasi dan mendeskripsikan elemen utama <em>${topik}</em>.</li>
    <li><b>TP 1.2:</b> Peserta didik mampu merancang dan mempresentasikan solusi masalah pada topik <em>${topik}</em>.</li>
    <li><b>TP 1.3:</b> Peserta didik mampu mengevaluasi hasil karya dan merefleksikan proses belajar.</li>
  </ul>

  <!-- III. SKENARIO KBM -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">III. Skenario Kegiatan Pembelajaran (KBM)</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
    <thead>
      <tr style="background:#0f172a;color:#ffffff;">
        <th style="padding:8px 10px;border:1px solid #334155;width:20%;">Tahapan</th>
        <th style="padding:8px 10px;border:1px solid #334155;">Deskripsi Kegiatan</th>
        <th style="padding:8px 10px;border:1px solid #334155;width:15%;text-align:center;">Durasi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">Pendahuluan</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Salam, doa bersama, presensi, apersepsi (mengaitkan materi dengan pengalaman sehari-hari), dan penyampaian tujuan pembelajaran topik <em>${topik}</em>.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">15 Menit</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">Kegiatan Inti</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Orientasi masalah kontekstual, eksplorasi konsep <em>${topik}</em>, diskusi kelompok penyelesaian LKPD, dan presentasi karya/hasil diskusi kelompok.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">60 Menit</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;">Penutup</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;">Refleksi bersama, kesimpulan materi <em>${topik}</em>, umpan balik guru, penugasan tindak lanjut, dan doa penutup.</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">15 Menit</td>
      </tr>
    </tbody>
  </table>

  <!-- IV. ASESMEN -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">IV. Asesmen &amp; Evaluasi</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px;">
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;background:#f8fafc;width:30%;">Asesmen Formatif</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Observasi keaktifan diskusi kelompok, penugasan LKPD, dan tanya-jawab lisan.</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;background:#f8fafc;">Asesmen Sumatif</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Rubrik penilaian projek &amp; kuis pemahaman topik <em>${topik}</em>.</td>
    </tr>
    <tr>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:bold;background:#f8fafc;">Instrumen Penilaian</td>
      <td style="padding:7px 10px;border:1px solid #cbd5e1;">Lembar Observasi, Rubrik Unjuk Kerja, Soal Pilihan Ganda, dan Soal Esai.</td>
    </tr>
  </table>

  <!-- V. LAMPIRAN BAHAN AJAR & LKPD -->
  <div style="font-size:12px;font-weight:700;color:#0f172a;border-bottom:1.5px solid #cbd5e1;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">V. Lampiran Bahan Ajar &amp; LKPD</div>
  
  <!-- A. Ringkasan Materi Pembelajaran -->
  <div style="margin-bottom:14px;">
    <div style="font-size:11px;font-weight:bold;color:#1e3a5f;margin-bottom:6px;">A. Ringkasan / Uraian Materi Pembelajaran: <em>${topik}</em></div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 14px;border-radius:4px;font-size:10.5px;line-height:1.6;color:#334155;">
      <p style="margin-bottom:8px;"><b>1. Pengertian &amp; Konsep Utama:</b> Topik <em>${topik}</em> berfokus pada pemahaman fundamental, prinsip operasional, serta struktur aplikasi nyata dalam mata pelajaran <b>${mapel_name}</b>.</p>
      <p style="margin-bottom:8px;"><b>2. Karakteristik &amp; Kaidah Pokok:</b> Peserta didik mempelajari analisis sistematis, identifikasi variabel/elemen penting, serta langkah-langkah prosedural dalam menyelesaikan masalah ilmiah/praktis.</p>
      <p style="margin-top:0;"><b>3. Penerapan Kontekstual &amp; Contoh Kasus:</b> Materi diintegrasikan dengan studi kasus dunia nyata/industri, memungkinkan siswa mengeksplorasi solusi kreatif secara mandiri maupun bergotong royong.</p>
    </div>
  </div>

  <!-- B. Lembar Kerja Peserta Didik (LKPD) -->
  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:bold;color:#1e3a5f;margin-bottom:6px;">B. Lembar Kerja Peserta Didik (LKPD Siap Pakai)</div>
    <div style="border:1px solid #cbd5e1;padding:10px 14px;border-radius:4px;font-size:10.5px;line-height:1.6;">
      <div style="font-weight:bold;margin-bottom:6px;color:#0f172a;">Tugas Diskusi Kelompok (Problem-Based Learning):</div>
      <ol style="margin:0;padding-left:18px;">
        <li style="margin-bottom:4px;">Bacalah studi kasus mengenai <em>${topik}</em> dan analisislah masalah utamanya!</li>
        <li style="margin-bottom:4px;">Diskusikan bersama kelompok langkah-langkah penyelesaian berdasarkan konsep <b>${mapel_name}</b>!</li>
        <li>Tuliskan hasil diskusi pada lembar laporan dan presentasikan di depan kelas!</li>
      </ol>
    </div>
  </div>

  <!-- C. Glosarium & Daftar Pustaka -->
  <div style="margin-bottom:20px;font-size:10px;color:#64748b;line-height:1.5;">
    <div><b>Glosarium:</b> <em>Konsep Otentik</em> = Pembelajaran berbasis dunia nyata; <em>PBL</em> = Pembelajaran berbasis masalah.</div>
    <div><b>Daftar Pustaka:</b> Kemendikbudristek. (2024). <em>Buku Panduan Guru &amp; Siswa ${mapel_name} Kelas ${kelas}</em>. Jakarta: Pusat Kurikulum dan Perbukuan.</div>
  </div>

  ${buildTtdBlock(ctx)}
</div>`;
}

/**
 * Membangun AI prompt untuk dokumen Modul Ajar / RPP Plus.
 */
export function buildModulAjarAIPrompt(ctx: PerangkatLayoutContext): string {
  const { mapel_name, kelas, dynamicFase, topik, alokasi_waktu } = ctx;

  const pedagogicalContext = `Tugas Anda: Susunlah MODUL AJAR (RPP PLUS) yang LENGKAP, KONTEKSTUAL, DAN SIAP GUNA.
Struktur Wajib Dokumen HTML Modul Ajar:
1. I. INFORMASI UMUM: Identitas Penulis, Sekolah, Kelas ${kelas} (Fase ${dynamicFase}), Mapel ${mapel_name}, Model Pembelajaran (PBL/PjBL), Profil Pelajar Pancasila, Sarana & Prasarana.
2. II. KOMPONEN INTI: Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), Pemahaman Bermakna, Pertanyaan Pemantik seputar: ${topik}.
3. III. SKENARIO KEGIATAN PEMBELAJARAN (KBM):
   Tabel Skenario KBM 3 Tahap:
   - Pendahuluan (Salam, doa, presensi, apersepsi - 15 Menit)
   - Kegiatan Inti (Orientasi masalah, eksplorasi konsep ${topik}, diskusi kelompok LKPD, presentasi - 60 Menit)
   - Penutup (Refleksi bersama, kesimpulan, umpan balik - 15 Menit)
4. IV. ASESMEN & EVALUASI: Formatif & Sumatif dengan Rubrik Penilaian.
5. V. LAMPIRAN BAHAN AJAR & LKPD (WAJIB DITULIS LENGKAP):
   - A. RINGKASAN / URAIAN MATERI PEMBELAJARAN LENGKAP: Tulislah materi pembelajaran topik ${topik} secara komprehensif, jelas, dan mendalam (bukan hanya poin singkat) agar dapat langsung dipelajari siswa & guru.
   - B. LEMBAR KERJA PESERTA DIDIK (LKPD SIAP PAKAI): Berikan instruksi tugas kelompok, studi kasus kontekstual, dan soal eksplorasi.
   - C. GLOSARIUM & DAFTAR PUSTAKA KEMENDIKBUDRISTEK.`;

  return `${ROLE_PERSONA}

SPESIFIKASI DOKUMEN:
- Jenis Dokumen: Modul Ajar (RPP Plus)
- Mata Pelajaran: ${mapel_name}
- Tingkat/Kelas: Kelas ${kelas} (Fase ${dynamicFase})
${alokasi_waktu ? `- Total Alokasi Waktu: ${alokasi_waktu}` : ''}
${buildTopicGuideline(ctx, 'MODUL_AJAR')}

${pedagogicalContext}
${buildAIPromptSuffix(ctx)}`;
}
