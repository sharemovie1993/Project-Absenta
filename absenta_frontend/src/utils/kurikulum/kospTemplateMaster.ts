import { WordEditorPage } from '../../components/common/WordEditorModal';

/**
 * Returns default master Word-style HTML pages for KOSP (Kurikulum Operasional Satuan Pendidikan)
 */
export const getDefaultKospMasterPages = (): WordEditorPage[] => {
  return [
    {
      label: 'Halaman Pengesahan',
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

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Gambaran Umum Sekolah</h4>
        <div class="kosp-section-karakteristik">
          {{KARAKTERISTIK_SEKOLAH}}
        </div>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Karakteristik Konsentrasi Keahlian (Jurusan)</h4>
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
      label: 'Bab III: Pengorganisasian Pembelajaran',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB III: PENGORGANISASIAN PEMBELAJARAN</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Intrakurikuler (Struktur Kurikulum Live)</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Struktur kurikulum intrakurikuler pada {{NAMASEKOLAH}} disusun berdasarkan Kepmendikbudristek No. 262/M/2022 tentang Perubahan atas Kepmendikbudristek No. 56/M/2022 tentang Pedoman Penerapan Kurikulum dalam Rangka Pemulihan Pembelajaran.
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:18px; color:#1e293b;">B. Skema Praktik Kerja Lapangan (PKL)</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          PKL dilaksanakan selama 1 (satu) semester penuh di Kelas XII (Semester Ganjil) dengan bobot 44-46 JP/minggu di Dunia Usaha/Dunia Kerja (DUDI) mitra. Pada semester ini, mata pelajaran Konsentrasi Keahlian (KK) dan Projek Kreatif (PKK) digantikan secara utuh oleh kegiatan PKL di Industri.
        </p>
      `
    },
    {
      label: 'Bab IV & V: Rencana & Evaluasi',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">BAB IV & V: RENCANA PEMBELAJARAN, ASESMEN, & EVALUASI</h3>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:14px; color:#1e293b;">A. Rencana Pembelajaran & Asesmen</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Perencanaan pembelajaran disusun dalam bentuk Alur Tujuan Pembelajaran (ATP) dan Modul Ajar oleh masing-masing Guru Mata Pelajaran. Penilaian dilakukan melalui Asesmen Formatif (berkelanjutan) dan Asesmen Sumatif (Tengah/Akhir Semester dan Uji Kompetensi Keahlian / UKK).
        </p>

        <h4 style="font-size:12pt; font-weight:bold; margin-top:16px; color:#1e293b;">B. Evaluasi dan Pendampingan Profesional</h4>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Evaluasi KOSP dilakukan berkala setiap akhir semester oleh Tim Penjaminan Mutu Sekolah, Kepala Sekolah, dan Pengawas Pembina. Pendampingan profesional guru dilaksanakan melalui Supervisi Akademik, In-House Training (IHT), dan Magang Industri Guru.
        </p>
      `
    },
    {
      label: 'Lampiran 1: Struktur Kurikulum Live Semua Jurusan',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 1: TABEL STRUKTUR KURIKULUM RESMI</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Tabel Alokasi Jam Pelajaran (JP) per minggu/semester untuk setiap konsentrasi keahlian pada {{NAMASEKOLAH}} Tahun Ajaran {{TAHUNPELAJARAN}}:
        </p>

        {{TABEL_STRUKTUR_KURIKULUM_SEMUA_JURUSAN}}
      `
    },
    {
      label: 'Lampiran 2: Kalender Pendidikan Sekolah',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 2: KALENDER PENDIDIKAN SEKOLAH</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Kalender Pendidikan {{NAMASEKOLAH}} Tahun Ajaran {{TAHUNPELAJARAN}} beserta rincian minggu efektif dan agenda kegiatan akademik:
        </p>

        {{TABEL_KALENDER_PENDIDIKAN}}
      `
    },
    {
      label: 'Lampiran 3: Pengaturan Jam KBM & Roster',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 3: ALOKASI WAKTU JAM KBM</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Struktur rentang waktu Kegiatan Belajar Mengajar (KBM) harian {{NAMASEKOLAH}}:
        </p>

        {{TABEL_JAM_KBM}}
      `
    },
    {
      label: 'Lampiran 4: Mitra Industri / DUDI Pasangan',
      html: `
        <h3 style="font-size:14pt; font-weight:bold; border-bottom:2px solid #0f172a; padding-bottom:4px; margin-top:0;">LAMPIRAN 4: DAFTAR INDUSTRI PASANGAN (DUDI MITRA)</h3>
        <p style="text-align:justify; font-size:11pt; line-height:1.5;">
          Daftar Dunia Usaha, Dunia Industri, dan Dunia Kerja (DUDI) mitra kerja sama {{NAMASEKOLAH}} dalam pelaksanaan Praktik Kerja Lapangan (PKL), sinkronisasi kurikulum, dan rekrutmen lulusan:
        </p>

        {{TABEL_DUDI_MITRA}}
      `
    }
  ];
};
