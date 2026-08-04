import { WordEditorPage } from '../../components/common/WordEditorModal';

/**
 * Returns default master Word-style HTML pages for KOSP (Kurikulum Operasional Satuan Pendidikan)
 */
export const getDefaultKospMasterPages = (): WordEditorPage[] => {
  return [
    {
      label: 'Sampul Depan (Cover Resmi)',
      html: `
        <div style="text-align:center; padding:20px 10px; font-family:Arial, sans-serif;">
          <!-- Top Border Accent -->
          <div style="width:100%; height:6px; background:linear-gradient(to right, #1e3a8a, #3b82f6, #1e3a8a); margin-bottom:24px;"></div>

          <h1 style="margin:0; font-size:20pt; font-weight:bold; color:#0f172a; letter-spacing:1px; text-transform:uppercase;">
            KURIKULUM OPERASIONAL<br/>SATUAN PENDIDIKAN (KOSP)
          </h1>
          <h2 style="margin:8px 0 0 0; font-size:14pt; font-weight:bold; color:#1e40af; text-transform:uppercase;">
            {{NAMASEKOLAH}}
          </h2>
          <p style="margin:6px 0 0 0; font-size:12pt; font-weight:bold; color:#475569;">
            TAHUN AJARAN {{TAHUNPELAJARAN}}
          </p>

          <!-- Dynamic Logo -->
          <div style="margin:36px auto;">
            {{LOGOSEKOLAH_HTML}}
          </div>

          <div style="margin-top:20px; font-size:11pt; color:#334155;">
            <p style="margin:2px 0; font-weight:bold; font-size:12pt; text-transform:uppercase;">DISUSUN OLEH:</p>
            <p style="margin:2px 0; font-weight:bold; color:#1e293b;">TIM PENGEMBANG KURIKULUM</p>
            <p style="margin:2px 0; font-weight:bold; color:#1e40af;">{{NAMASEKOLAH}}</p>
            <p style="margin:6px 0 0 0; font-size:10pt; color:#64748b;">SK Kepala Sekolah Nomor: <strong>{{NOMOR_SK}}</strong></p>
          </div>

          <div style="margin-top:48px; border-top:2px solid #e2e8f0; padding-top:16px; font-size:10.5pt; color:#64748b; line-height:1.6;">
            <strong style="color:#334155;">{{NAMA_DINAS_PROVINSI}}</strong><br/>
            <strong style="color:#334155;">{{NAMA_CABDIN}}</strong><br/>
            <span>Alamat: {{ALAMATSEKOLAH}} &bull; {{KOTASEKOLAH}}</span>
          </div>

          <!-- Bottom Border Accent -->
          <div style="width:100%; height:6px; background:linear-gradient(to right, #1e3a8a, #3b82f6, #1e3a8a); margin-top:24px;"></div>
        </div>
      `
    },
    {
      label: 'Kata Pengantar & Daftar Isi',
      html: `
        <div style="font-family:Arial, sans-serif;">
          <h3 style="text-align:center; font-size:14pt; font-weight:bold; text-transform:uppercase; margin-top:0;">KATA PENGANTAR</h3>
          
          <p style="text-align:justify; font-size:11pt; line-height:1.6; text-indent:30px;">
            Puji dan syukur kami panjatkan ke hadirat Allah SWT Tuhan Yang Maha Esa, karena atas rahmat dan karunia-Nya naskah Dokumen <strong>Kurikulum Operasional Satuan Pendidikan (KOSP) {{NAMASEKOLAH}} Tahun Ajaran {{TAHUNPELAJARAN}}</strong> ini telah berhasil disusun dan diselesaikan dengan baik.
          </p>
          <p style="text-align:justify; font-size:11pt; line-height:1.6; text-indent:30px;">
            Kurikulum ini disusun berbasis Kurikulum Merdeka (Kepmendikbudristek No. 262/M/2022) serta mengacu pada karakteristik sosial-kultural sekolah, potensi daerah, dan kebutuhan Industri / Dunia Usaha dan Dunia Kerja (DUDI) mitra. KOSP ini menjadi pedoman utama dalam penyelenggaraan intrakurikuler, kokurikuler (P5), serta Praktik Kerja Lapangan (PKL).
          </p>
          <p style="text-align:justify; font-size:11pt; line-height:1.6; text-indent:30px;">
            Ucapan terima kasih dan penghargaan kami sampaikan kepada Tim Penyusun Kurikulum, Komite Sekolah, Pengawas Pembina, serta DUDI Pasangan yang telah memberikan kontribusi pemikiran dan masukan berharga.
          </p>

          <div style="margin-top:30px; text-align:right; font-size:11pt;">
            {{KOTASEKOLAH}}, {{TANGGALPENGESAHAN}}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong><u>{{NAMAKEPALASEKOLAH}}</u></strong><br/>
            NIP. {{NIPKEPALASEKOLAH}}
          </div>

          <hr style="margin:30px 0; border:0; border-top:1px solid #cbd5e1;" />

          <h3 style="text-align:center; font-size:14pt; font-weight:bold; text-transform:uppercase;">DAFTAR ISI NASKAH KOSP</h3>
          <table style="width:100%; font-size:11pt; border-collapse:collapse; line-height:1.8;">
            <tr><td style="font-weight:bold;">HALAMAN COVER / SAMPUL DEPAN</td><td style="text-align:right;">i</td></tr>
            <tr><td style="font-weight:bold;">LEMBAR PENGESAHAN KURIKULUM</td><td style="text-align:right;">ii</td></tr>
            <tr><td style="font-weight:bold;">KATA PENGANTAR & DAFTAR ISI</td><td style="text-align:right;">iii</td></tr>
            <tr><td style="font-weight:bold;">BAB I: KARAKTERISTIK SATUAN PENDIDIKAN</td><td style="text-align:right;">1</td></tr>
            <tr><td style="font-weight:bold;">BAB II: VISI, MISI, DAN TUJUAN SEKOLAH</td><td style="text-align:right;">3</td></tr>
            <tr><td style="font-weight:bold;">BAB III: PENGORGANISASIAN PEMBELAJARAN & PKL</td><td style="text-align:right;">5</td></tr>
            <tr><td style="font-weight:bold;">BAB IV & V: RENCANA PEMBELAJARAN, ASESMEN, & EVALUASI</td><td style="text-align:right;">8</td></tr>
            <tr><td style="font-weight:bold;">LAMPIRAN 1: SK TIM PENYUSUN KOSP</td><td style="text-align:right;">10</td></tr>
            <tr><td style="font-weight:bold;">LAMPIRAN 2: TABEL STRUKTUR KURIKULUM LIVE SEMUA JURUSAN</td><td style="text-align:right;">12</td></tr>
            <tr><td style="font-weight:bold;">LAMPIRAN 3: KALENDER PENDIDIKAN & HARI EFEKTIF</td><td style="text-align:right;">15</td></tr>
            <tr><td style="font-weight:bold;">LAMPIRAN 4: PENGATURAN JAM KBM & ROSTER</td><td style="text-align:right;">17</td></tr>
            <tr><td style="font-weight:bold;">LAMPIRAN 5: DAFTAR INDUSTRI PASANGAN (DUDI MITRA PKL)</td><td style="text-align:right;">19</td></tr>
          </table>
        </div>
      `
    },
    {
      label: 'Halaman Pengesahan Resmi',
      html: `
        <div style="text-align:center; margin-bottom:20px;">
          <h2 style="margin:0; font-size:16pt; font-weight:bold; text-transform:uppercase;">LEMBAR PENGESAHAN</h2>
          <h3 style="margin:6px 0 0 0; font-size:13pt; font-weight:bold; text-transform:uppercase;">KURIKULUM OPERASIONAL SATUAN PENDIDIKAN (KOSP)</h3>
          <h4 style="margin:4px 0 0 0; font-size:12pt; font-weight:bold; color:#2563eb;">{{NAMASEKOLAH}}</h4>
          <p style="margin:4px 0 0 0; font-size:11pt; font-weight:bold;">TAHUN AJARAN {{TAHUNPELAJARAN}}</p>
        </div>

        <p style="text-align:justify; font-size:11pt; line-height:1.6; text-indent:30px;">
          Setelah memperhatikan pertimbangan dan masukan dari Komite Sekolah, Industri/DUDI Pasangan, serta Dinas Pendidikan Provinsi, dengan ini Kurikulum Operasional Satuan Pendidikan (KOSP) <strong>{{NAMASEKOLAH}}</strong> Tahun Ajaran <strong>{{TAHUNPELAJARAN}}</strong> ditetapkan dan disahkan untuk diberlakukan.
        </p>

        <div style="margin-top:40px;">
          <table style="width:100%; font-size:11pt; border-collapse:collapse;">
            <tr>
              <td style="width:50%; text-align:left; vertical-align:top;">
                Ditetapkan di: {{KOTASEKOLAH}}<br/>
                Pada Tanggal: {{TANGGALPENGESAHAN}}
              </td>
              <td style="width:50%; text-align:left; vertical-align:top;">
                Menyetujui,<br/>
                <strong>Ketua Komite Sekolah</strong>
                <br/><br/><br/><br/>
                <strong><u>{{NAMAKETUAKOMITE}}</u></strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:30px; text-align:left; vertical-align:top;">
                Mengetahui,<br/>
                <strong>Kepala Sekolah</strong>
                <br/><br/><br/><br/>
                <strong><u>{{NAMAKEPALASEKOLAH}}</u></strong><br/>
                NIP. {{NIPKEPALASEKOLAH}}
              </td>
              <td style="padding-top:30px; text-align:left; vertical-align:top;">
                Mengesahkan,<br/>
                <strong>An. Kepala Dinas Pendidikan Provinsi</strong><br/>
                Kepala Cabang Dinas Pendidikan
                <br/><br/><br/><br/>
                <strong><u>{{NAMAKEPAKACABDIN}}</u></strong><br/>
                NIP. {{NIPKEPAKACABDIN}}
              </td>
            </tr>
          </table>
        </div>
      `
    },
    {
      label: 'Bab I: Karakteristik Satuan Pendidikan',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB I: KARAKTERISTIK SATUAN PENDIDIKAN</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Gambaran Umum & Context Sekolah</h4>
        <div class="kosp-section-karakteristik">
          {{KARAKTERISTIK_SEKOLAH}}
        </div>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Karakteristik Konsentrasi Keahlian (Jurusan-Jurusan)</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          {{NAMASEKOLAH}} menyelenggarakan program pendidikan keahlian berbasis Kurikulum Merdeka yang disesuaikan dengan kebutuhan Industri, Dunia Usaha, dan Dunia Kerja (DUDI) mitra, meliputi:
        </p>
        {{DAFTAR_JURUSAN_SUMMARY}}
      `
    },
    {
      label: 'Bab II: Visi, Misi, & Tujuan Sekolah',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB II: VISI, MISI, DAN TUJUAN</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Visi Sekolah</h4>
        <div style="background-color:#f8fafc; border-left:4px solid #2563eb; padding:10px 14px; font-size:11pt; font-style:italic;">
          {{VISI_SEKOLAH}}
        </div>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Misi Sekolah</h4>
        <div class="kosp-section-misi" style="font-size:11pt; line-height:1.6;">
          {{MISI_SEKOLAH}}
        </div>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">C. Tujuan Satuan Pendidikan</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Mewujudkan lulusan SMK yang beriman, bertaqwa, berkebhinekaan global, mandiri, kreatif, bernalar kritis, dan bergotong royong serta memiliki kompetensi keahlian yang diakui oleh dunia industri.
        </p>
      `
    },
    {
      label: 'Bab III: Pengorganisasian Pembelajaran & PKL',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB III: PENGORGANISASIAN PEMBELAJARAN</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Intrakurikuler (Struktur Kurikulum Live)</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Struktur kurikulum intrakurikuler pada {{NAMASEKOLAH}} disusun berdasarkan Kepmendikbudristek No. 262/M/2022 tentang Perubahan atas Kepmendikbudristek No. 56/M/2022 tentang Pedoman Penerapan Kurikulum dalam Rangka Pemulihan Pembelajaran.
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:18px; color:#1e293b;">B. Projek Penguatan Profil Pelajar Pancasila (P5) & Budaya Kerja</h4>
        {{TABEL_P5_MATRIKS}}

        <h4 style="font-size:12pt; font-weight:bold; margin-top:18px; color:#1e293b;">C. Skema Praktik Kerja Lapangan (PKL)</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          PKL dilaksanakan selama 1 (satu) semester penuh di Kelas XII (Semester Ganjil) dengan bobot 44-46 JP/minggu di Dunia Usaha/Dunia Kerja (DUDI) mitra. Pada semester ini, mata pelajaran Konsentrasi Keahlian (KK) dan Projek Kreatif (PKK) digantikan secara utuh oleh kegiatan PKL di Industri.
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:18px; color:#1e293b;">D. Ekstrakurikuler & Pengembangan Diri</h4>
        {{TABEL_ESKUL_MATRIKS}}
      `
    },
    {
      label: 'Bab IV & V: Rencana & Evaluasi',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB IV: RENCANA PEMBELAJARAN DAN ASESMEN</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Prinsip Pembelajaran Berbasis Kurikulum Merdeka</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.6;">
          Pembelajaran di {{NAMASEKOLAH}} dirancang berdasarkan prinsip <strong>student-centered learning</strong>, berpusat pada kebutuhan, potensi, dan perkembangan peserta didik. Pendekatan yang digunakan mengintegrasikan pengetahuan, keterampilan, dan sikap secara holistik melalui:<br/>
          (1) Alur Tujuan Pembelajaran (ATP) sebagai panduan urutan belajar, (2) Modul Ajar berbasis konteks industri lokal, (3) Pembelajaran Berbasis Proyek (PBL), dan (4) Asesmen Autentik berbasis kinerja.
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Sistem Penilaian & Asesmen</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.6;">
          Penilaian dilaksanakan secara berkesinambungan dan menyeluruh:
        </p>
        <ul style="font-size:11pt; line-height:1.8; padding-left:20px;">
          <li><strong>Asesmen Formatif:</strong> Penilaian harian, observasi, diskusi kelas, dan refleksi diri.</li>
          <li><strong>Asesmen Sumatif Tengah Semester (ASTS):</strong> Penilaian tertulis/praktik di tengah semester.</li>
          <li><strong>Asesmen Sumatif Akhir Semester (ASAS):</strong> Penilaian komprehensif akhir semester.</li>
          <li><strong>Uji Kompetensi Keahlian (UKK):</strong> Penilaian praktik keahlian bersertifikat Kelas XII bersama DUDI/LSP.</li>
          <li><strong>Portofolio Projek:</strong> Dokumentasi karya dan hasil P5/PKL peserta didik.</li>
        </ul>

        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:24px;">BAB V: PENDAMPINGAN, EVALUASI, & PENGEMBANGAN PROFESIONAL</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Evaluasi KOSP</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.6;">
          Evaluasi KOSP dilakukan secara berkala setiap akhir semester dan akhir tahun pelajaran oleh <strong>Tim Penjaminan Mutu Internal Sekolah (TPMIS)</strong> bersama Kepala Sekolah, Pengawas Pembina, dan representasi Komite Sekolah. Evaluasi mencakup ketercapaian target kurikulum, efektivitas pembelajaran, dan relevansi dengan kebutuhan DUDI.
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Pendampingan Profesional Guru</h4>
        <ul style="font-size:11pt; line-height:1.8; padding-left:20px;">
          <li><strong>Supervisi Akademik:</strong> Dilaksanakan oleh Kepala Sekolah dan Pengawas Pembina minimal 2x per semester.</li>
          <li><strong>In-House Training (IHT):</strong> Pelatihan internal peningkatan kompetensi pedagogis dan vokasional guru.</li>
          <li><strong>Magang Industri Guru (Teacher Industrial Attachment):</strong> Program magang guru di DUDI mitra 1-2 minggu per tahun.</li>
          <li><strong>Komunitas Belajar (KomBel):</strong> Forum berbagi praktik baik antar guru mapel sejenis setiap bulan.</li>
        </ul>
      `
    },
    {
      label: 'Lampiran 1: SK Tim Penyusun KOSP',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 1: SK TIM PENYUSUN KOSP</h3>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #1e40af; padding:10px 14px; font-size:11pt; margin-bottom:16px; border-radius:4px;">
          <strong>Nomor SK:</strong> {{NOMOR_SK}}<br/>
          <strong>Tanggal Penetapan:</strong> {{TANGGALPENGESAHAN}}
        </div>

        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Berdasarkan SK Kepala Sekolah Nomor: <strong>{{NOMOR_SK}}</strong>, susunan Tim Pengembang &amp; Penyusun Kurikulum Operasional Satuan Pendidikan (KOSP) <strong>{{NAMASEKOLAH}}</strong> Tahun Ajaran <strong>{{TAHUNPELAJARAN}}</strong> adalah sebagai berikut:
        </p>

        {{TABEL_SK_TIM_PENYUSUN}}
      `
    },
    {
      label: 'Lampiran 2: Struktur Kurikulum Live Semua Jurusan',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 2: TABEL STRUKTUR KURIKULUM RESMI</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Tabel Alokasi Jam Pelajaran (JP) per minggu/semester untuk setiap konsentrasi keahlian pada {{NAMASEKOLAH}} Tahun Ajaran {{TAHUNPELAJARAN}}:
        </p>

        {{TABEL_STRUKTUR_KURIKULUM_SEMUA_JURUSAN}}
      `
    },
    {
      label: 'Lampiran 3: Kalender Pendidikan Sekolah',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 3: KALENDER PENDIDIKAN SEKOLAH</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Kalender Pendidikan {{NAMASEKOLAH}} Tahun Ajaran {{TAHUNPELAJARAN}} beserta rincian minggu efektif dan agenda kegiatan akademik:
        </p>

        {{TABEL_KALENDER_PENDIDIKAN}}
      `
    },
    {
      label: 'Lampiran 4: Pengaturan Jam KBM & Roster',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 4: ALOKASI WAKTU JAM KBM</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Struktur rentang waktu Kegiatan Belajar Mengajar (KBM) harian {{NAMASEKOLAH}}:
        </p>

        {{TABEL_JAM_KBM}}
      `
    },
    {
      label: 'Lampiran 5: Mitra Industri / DUDI Pasangan',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 5: DAFTAR INDUSTRI PASANGAN (DUDI MITRA)</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Daftar Dunia Usaha, Dunia Industri, dan Dunia Kerja (DUDI) mitra kerja sama {{NAMASEKOLAH}} dalam pelaksanaan Praktik Kerja Lapangan (PKL), sinkronisasi kurikulum, dan rekrutmen lulusan:
        </p>

        {{TABEL_DUDI_MITRA}}
      `
    }
  ];
};
