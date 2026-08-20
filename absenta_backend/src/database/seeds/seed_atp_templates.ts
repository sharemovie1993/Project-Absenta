import { PrismaClient } from '@prisma/client';

export interface SeedAtpTemplateItem {
  kode_mapel_ref: string;
  nama_mapel_ref: string;
  fase: string;
  tingkat: number;
  nama_template: string;
  deskripsi: string;
  sumber: string;
  url_sumber: string;
  tags: string[];
  total_alokasi_jp: number;
  status: string;
  tujuan_pembelajaran: {
    kode_tp: string;
    judul_materi: string;
    deskripsi_tp: string;
    alokasi_jp: number;
    urutan: number;
  }[];
}

export const ATP_TEMPLATE_PRESETS: SeedAtpTemplateItem[] = [
  {
    kode_mapel_ref: 'IND',
    nama_mapel_ref: 'Bahasa Indonesia',
    fase: 'E',
    tingkat: 10,
    nama_template: 'ATP Bahasa Indonesia Fase E (Kelas 10 SMA/SMK) — Literasi Lanjut & Teks Akademik',
    deskripsi: 'Alur Tujuan Pembelajaran Bahasa Indonesia Fase E Kelas 10 SMA/SMK Kurikulum Merdeka (mengacu Permendikbudristek & Panduan Guru Literasi Lanjut). Mengintegrasikan 4 elemen (Menyimak, Membaca & Memirsa, Berbicara & Mempresentasikan, Menulis) dengan fokus penalaran kritis (HOTS), penulisan akademik pemula, komunikasi profesional, dan apresiasi sastra modern/klasik.',
    sumber: 'Kemendikbudristek / kepalasekolah.id (Aztopan, S.Pd.)',
    url_sumber: 'https://kepalasekolah.id/download-dokumen-cp-tp-dan-atp-bahasa-indonesia-fase-e-kelas-10-sma-smk-panduan-guru-mengembangkan-literasi-tingkat-lanjut-di-kurikulum-merdeka/',
    tags: [
      'Bahasa Indonesia',
      'Fase E',
      'Kelas 10',
      'SMA',
      'SMK',
      'Kurikulum Merdeka',
      'Literasi Kritis',
      'Teks Akademik',
      'Kemendikbudristek'
    ],
    total_alokasi_jp: 108,
    status: 'PUBLISHED',
    tujuan_pembelajaran: [
      // ─── SEMESTER 1 (GANJIL) — 54 JP ─────────────────────────────
      {
        kode_tp: 'TP 10.1',
        judul_materi: 'Menganalisis Informasi & Struktur Teks Laporan Hasil Observasi (LHO)',
        deskripsi_tp: 'Peserta didik mampu mengidentifikasi ide pokok, fakta ilmiah, struktur retorika (pernyataan umum, deskripsi bagian, deskripsi manfaat), dan menilai akurasi data dalam teks Laporan Hasil Observasi (LHO) lisan maupun tulis secara kritis.',
        alokasi_jp: 10,
        urutan: 1
      },
      {
        kode_tp: 'TP 10.2',
        judul_materi: 'Menyusun & Mempresentasikan Teks LHO Otentik Berbasis Data',
        deskripsi_tp: 'Peserta didik mampu menyusun teks Laporan Hasil Observasi berbasis pengamatan riil lingkungan atau bidang kejuruan/vokasi dengan kaidah kebahasaan baku, infografis/visual pendukung, serta mempresentasikannya secara runtut dan meyakinkan.',
        alokasi_jp: 8,
        urutan: 2
      },
      {
        kode_tp: 'TP 10.3',
        judul_materi: 'Menganalisis Gagasan, Retorika, & Kritik Sosial dalam Teks Anekdot',
        deskripsi_tp: 'Peserta didik mampu mengidentifikasi pesan tersirat, kritik sosial, struktur retorika (abstraksi, orientasi, krisis, reaksi, koda), serta membedakan fakta, opini, dan unsur humor/lawakan tunggal dalam teks anekdot lisan maupun multimodal.',
        alokasi_jp: 8,
        urutan: 3
      },
      {
        kode_tp: 'TP 10.4',
        judul_materi: 'Mengkreasi Teks Anekdot & Lawakan Tunggal (Stand Up Comedy)',
        deskripsi_tp: 'Peserta didik mampu menyusun teks anekdot tertulis atau komik strip, serta menyajikan lawakan tunggal (stand up comedy) berisi kritik sosial konstruktif dengan memperhatikan kesantunan berbahasa dan logika penalaran yang sehat.',
        alokasi_jp: 8,
        urutan: 4
      },
      {
        kode_tp: 'TP 10.5',
        judul_materi: 'Mengeksplorasi Nilai Moral & Intertekstualitas Hikayat dan Cerpen',
        deskripsi_tp: 'Peserta didik mampu menganalisis nilai-nilai moral, sosial, budaya, karakteristik bahasa arkais hikayat klasik, serta membandingkan intertekstualitas tema dan penokohan antara hikayat dengan cerpen modern.',
        alokasi_jp: 10,
        urutan: 5
      },
      {
        kode_tp: 'TP 10.6',
        judul_materi: 'Mengalihwacanakan Hikayat Menjadi Cerpen Modern Kreatif',
        deskripsi_tp: 'Peserta didik mampu menulis cerita pendek (cerpen) kreatif yang diadaptasi dari hikayat lokal dengan sudut pandang baru, alur dramatik yang kuat, penggambaran emosi karakter yang mendalam, dan menggunakan kaidah bahasa Indonesia yang dinamis.',
        alokasi_jp: 10,
        urutan: 6
      },

      // ─── SEMESTER 2 (GENAP) — 54 JP ──────────────────────────────
      {
        kode_tp: 'TP 10.7',
        judul_materi: 'Menganalisis Pengajuan, Penawaran, & Kesepakatan dalam Teks Negosiasi',
        deskripsi_tp: 'Peserta didik mampu mengevaluasi faktor penentu keberhasilan negosiasi, taktik persuasi, alasan logis, dan kesantunan berbahasa dalam teks negosiasi kontekstual dunia kerja, bisnis, atau kehidupan sehari-hari.',
        alokasi_jp: 8,
        urutan: 7
      },
      {
        kode_tp: 'TP 10.8',
        judul_materi: 'Praktik Simulasi Negosiasi Bisnis & Debat Ilmiah Logis',
        deskripsi_tp: 'Peserta didik mampu melakukan simulasi perundingan/negosiasi bisnis serta berpartisipasi aktif dalam debat formal dengan menyampaikan mosi, argumen berbasis data kredibel, dan sanggahan yang logis dan santun.',
        alokasi_jp: 10,
        urutan: 8
      },
      {
        kode_tp: 'TP 10.9',
        judul_materi: 'Meneladani Keteladanan & Menganalisis Struktur Teks Biografi',
        deskripsi_tp: 'Peserta didik mampu merefleksikan karakter unggul dan gagasan tokoh inspiratif, serta menganalisis struktur wacana naratif-kritis, pola kronologi, dan penggunaan pronomina/konjungsi temporal dalam teks biografi.',
        alokasi_jp: 8,
        urutan: 9
      },
      {
        kode_tp: 'TP 10.10',
        judul_materi: 'Menulis Biografi Tokoh Lokal / Wirausahawan Mandiri',
        deskripsi_tp: 'Peserta didik mampu mengumpulkan data melalui wawancara dan menyusun teks biografi naratif-kritis tentang tokoh lokal atau wirausahawan sukses dengan kaidah penulisan akademik yang akurat dan menarik.',
        alokasi_jp: 10,
        urutan: 10
      },
      {
        kode_tp: 'TP 10.11',
        judul_materi: 'Mendalami Diksi, Imaji, & Makna Tersirat dalam Teks Puisi',
        deskripsi_tp: 'Peserta didik mampu menganalisis suasana batin, tema, diksi konotatif, daya bayang (imaji), majas, dan pesan filosofis/sosial dalam karya puisi klasik maupun kontemporer.',
        alokasi_jp: 8,
        urutan: 11
      },
      {
        kode_tp: 'TP 10.12',
        judul_materi: 'Menulis Puisi Orisinal & Musikalisasi / Dramatisasi Puisi',
        deskripsi_tp: 'Peserta didik mampu menciptakan puisi orisinal yang mengekspresikan gagasan kritis atau respon sosial, serta menyajikannya secara ekspresif melalui pembacaan puisi panggung atau pertunjukan musikalisasi puisi.',
        alokasi_jp: 10,
        urutan: 12
      }
    ]
  }
];

export async function seedAtpTemplates(prisma: PrismaClient) {
  console.log('🌱 Seeding Global ATP Templates (Kurikulum Merdeka Official Presets)...');

  for (const preset of ATP_TEMPLATE_PRESETS) {
    const existing = await prisma.atpTemplate.findFirst({
      where: {
        kode_mapel_ref: preset.kode_mapel_ref,
        fase: preset.fase,
        tingkat: preset.tingkat
      }
    });

    let templateRecord;

    if (existing) {
      console.log(`  Updating existing ATP template: ${preset.nama_template}`);
      templateRecord = await prisma.atpTemplate.update({
        where: { id: existing.id },
        data: {
          nama_mapel_ref: preset.nama_mapel_ref,
          nama_template: preset.nama_template,
          deskripsi: preset.deskripsi,
          sumber: preset.sumber,
          url_sumber: preset.url_sumber,
          tags: preset.tags,
          total_alokasi_jp: preset.total_alokasi_jp,
          status: preset.status
        }
      });

      // Clear existing TP items before inserting updated ones
      await prisma.atpTpTemplate.deleteMany({
        where: { atp_template_id: existing.id }
      });
    } else {
      console.log(`  Creating new ATP template: ${preset.nama_template}`);
      templateRecord = await prisma.atpTemplate.create({
        data: {
          kode_mapel_ref: preset.kode_mapel_ref,
          nama_mapel_ref: preset.nama_mapel_ref,
          fase: preset.fase,
          tingkat: preset.tingkat,
          nama_template: preset.nama_template,
          deskripsi: preset.deskripsi,
          sumber: preset.sumber,
          url_sumber: preset.url_sumber,
          tags: preset.tags,
          total_alokasi_jp: preset.total_alokasi_jp,
          status: preset.status
        }
      });
    }

    // Insert all TP items
    await prisma.atpTpTemplate.createMany({
      data: preset.tujuan_pembelajaran.map((tp) => ({
        atp_template_id: templateRecord.id,
        kode_tp: tp.kode_tp,
        judul_materi: tp.judul_materi,
        deskripsi_tp: tp.deskripsi_tp,
        alokasi_jp: tp.alokasi_jp,
        urutan: tp.urutan
      }))
    });

    console.log(`  ✅ Successfully seeded ${preset.tujuan_pembelajaran.length} TP items for ${preset.nama_template}`);
  }

  console.log('✨ ATP Templates seeding completed successfully.\n');
}
