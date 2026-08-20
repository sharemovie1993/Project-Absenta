import { PrismaClient } from '@prisma/client';

export async function seedBahanAjarPresets(prisma: PrismaClient) {
  console.log('--- SEEDING MULTI-MODUL BAHAN AJAR PRESET (DIGITAL TEACHING READER) ---');

  // ==========================================
  // MODUL 1: B. INDONESIA FASE E (KELAS 10) - LHO
  // ==========================================
  const modul1Content = [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Pengertian, Fungsi, dan Struktur Laporan Hasil Observasi (LHO)',
      tujuan_pembelajaran: [
        'Membandingkan informasi berupa gagasan yang akurat dari menyimak teks LHO monolog.',
        'Merumuskan gagasan utama dan menganalisis struktur teks LHO (Pernyataan Umum, Deskripsi Bagian, Deskripsi Manfaat).'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Pembukaan: Guru membuka pelajaran dengan salam, doa, dan memeriksa kehadiran siswa.',
            'Apersepsi (Mindful Learning): Guru menampilkan gambar Observatorium Bosscha atau objek observasi alam.',
            'Pertanyaan Pemantik: "Pernahkah kalian mengamati objek di alam secara detail seolah-olah menjadi seorang peneliti? Menurut kalian apa perbedaan fakta dan opini?"',
            'Motivasi (Meaningful Learning): Menanamkan rasa syukur atas keteraturan ciptaan Tuhan dan kepedulian merawat alam.'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Asesmen Diagnostik Awal: Menggali pemahaman dasar siswa tentang teks deskripsi dari SMP.',
            'Eksplorasi Konsep: Siswa menganalisis hal-hal menarik yang diamati dan memilah mana data fakta vs opini.',
            'Menyimak Teks LHO: Guru memodelkan membaca nyaring teks LHO dengan intonasi yang tepat.',
            'Diskusi Kelompok (Bernalar Kritis & Gotong Royong): Siswa mengidentifikasi struktur teks LHO (Pernyataan Umum, Deskripsi Bagian, dan Deskripsi Manfaat).'
          ],
          teks_bacaan: {
            judul: 'Observatorium Bosscha: Menyingkap Rahasia Benda Langit Secara Objektif',
            paragraf: [
              'Observatorium Bosscha merupakan fasilitas peneropongan bintang tertua di Indonesia yang didirikan pada tahun 1923 di kawasan Lembang, Bandung Barat. Terletak pada ketinggian 1.310 meter di atas permukaan laut, observatorium ini memiliki teleskop refraktor ganda Zeiss 60 cm yang menjadi ikon pengamatan astronomi nasional.',
              'Secara struktural, bangunan observatorium didesain dengan kubah logam berdiameter 14,5 meter yang dapat berputar 360 derajat untuk mengarahkan teleskop ke berbagai posisi langit malam.',
              'Keberadaan Observatorium Bosscha memberikan manfaat besar bagi penelitian sains astrofisika di Asia Tenggara serta menjadi pusat literasi astronomi dan edukasi observasi faktual bagi masyarakat.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Analisis Struktur Teks & Pemilahan Fakta-Opini',
            petunjuk: '1. Diskusikan teks Observatorium Bosscha di atas bersama rekan kelompok!\n2. Tuliskan 3 kalimat fakta ilmiah dan 1 kalimat opini!\n3. Tentukan paragraf yang berperan sebagai Pernyataan Umum, Deskripsi Bagian, dan Deskripsi Manfaat!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi Pembelajaran: "Apa pemahaman baru yang kalian dapatkan hari ini tentang teks LHO?"',
            'Rangkuman bersama dan penugasan mencari tahu teks eksplanasi sebagai pendukung fakta LHO.',
            'Doa dan salam penutup.'
          ]
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Teks Eksplanasi Pendukung LHO & Kaidah Kebahasaan',
      tujuan_pembelajaran: [
        'Mengevaluasi teks LHO menggunakan teks eksplanasi pendukung untuk menilai akurasi dan kualitas data.',
        'Mengidentifikasi istilah sains/sosial baru menggunakan KBBI dan tesaurus serta menerapkan kaidah kebahasaan LHO.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka, doa bersama, dan presensi.',
            'Review singkat materi Pertemuan 1 mengenai struktur LHO.',
            'Pertanyaan Pemantik: "Mengapa teks eksplanasi diperlukan untuk mendukung keakuratan data dalam teks laporan hasil observasi?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Kritis: Membaca teks LHO dan teks eksplanasi "Kunang-Kunang yang Perlahan Menghilang" dengan metode SQ3R.',
            'Membandingkan Teks: Siswa membandingkan data LHO dengan fakta ilmiah proses bioluminesensi pada kunang-kunang.',
            'Identifikasi Kata Baru: Membuka KBBI / Tesaurus digital untuk menemukan arti istilah: bioluminesensi, polusi cahaya, nokturnal.',
            'Bedah Kaidah Bahasa: Menganalisis kalimat definisi, kalimat deskripsi, serta penulisan kutipan tidak langsung.'
          ],
          teks_bacaan: {
            judul: 'Kunang-Kunang dan Fenomena Bioluminesensi',
            paragraf: [
              'Kunang-kunang adalah sejenis serangga yang mampu mengeluarkan cahaya yang jelas terlihat saat malam hari. Cahaya ini dihasilkan dari reaksi kimia dalam tubuh serangga tersebut yang disebut bioluminesensi.',
              'Cahaya pada kunang-kunang berfungsi sebagai sinyal komunikasi untuk menarik pasangan kawin serta tanda pertahanan diri dari predator.',
              'Saat ini populasi kunang-kunang di alam bebas kian terancam akibat alih fungsi lahan dan tingginya polusi cahaya buatan di perkotaan.'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Perbandingan Informasi & Kamus Mini Istilah Sains',
            petunjuk: '1. Buat tabel perbandingan antara teks LHO dan teks eksplanasi pendukung!\n2. Susun kamus mini untuk 5 istilah biologi/sains yang ditemukan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi kepedulian terhadap kelestarian alam dan serangga penyerbuk.',
            'Pemberian tugas menentukan objek observasi nyata di lingkungan sekitar sekolah/rumah.',
            'Doa dan salam penutup.'
          ]
        }
      }
    }
  ];

  await prisma.bahanAjarPreset.upsert({
    where: { id: 'preset-b-indo-fase-e-modul-1' },
    update: {
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Mengungkap Fakta Alam Secara Objektif (LHO)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) materi Teks Laporan Hasil Observasi (LHO), teks eksplanasi pendukung, dan gelar karya observasi.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'LHO', 'Kurikulum Merdeka'],
      konten_json: modul1Content as any,
      status: 'PUBLISHED'
    },
    create: {
      id: 'preset-b-indo-fase-e-modul-1',
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Mengungkap Fakta Alam Secara Objektif (LHO)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) materi Teks Laporan Hasil Observasi (LHO), teks eksplanasi pendukung, dan gelar karya observasi.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'LHO', 'Kurikulum Merdeka'],
      konten_json: modul1Content as any,
      status: 'PUBLISHED'
    }
  });

  // ==========================================
  // MODUL 2: B. INDONESIA FASE E (KELAS 10) - ANEKDOT
  // ==========================================
  const modul2Content = [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Pengertian, Ciri Khas, dan Struktur Teks Anekdot',
      tujuan_pembelajaran: [
        'Menganalisis pesan tersirat dan kritik sosial dalam teks anekdot lisan maupun tulis.',
        'Mengidentifikasi struktur teks anekdot (Abstraksi, Orientasi, Krisis, Reaksi, Koda).'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka, doa, dan apersepsi humor berfaedah.',
            'Pertanyaan Pemantik: "Pernahkah kalian mendengar cerita lucu yang sebenarnya menyindir kebiasaan buruk masyarakat? Menurut kalian mengapa humor sering dipakai menyampaikan kritik?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Menyimak teks komik/anekdot "Baju Tahanan KPK".',
            'Membedah pesan tersirat di balik humor politik/sosial.',
            'Analisis 5 struktur teks anekdot secara berkelompok.'
          ],
          teks_bacaan: {
            judul: 'Baju Termahal di Indonesia',
            paragraf: [
              'Dua orang sahabat, Amar dan Bejo, sedang asyik berbincang di sebuah warung kopi di pinggir jalan.',
              'Amar bertanya, "Bejo, kamu tahu nggak baju apa yang paling mahal di negara kita?" Bejo berpikir keras, "Mungkin jas impor dari Paris ya?"',
              'Amar tersenyum kecut, "Bukan! Baju termahal itu rompi oranye KPK. Soalnya, seseorang harus mengantongi uang rakyat miliaran rupiah dulu baru bisa pakai baju itu!" Keduanya pun tertawa getir.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Bedah Struktur & Kritik Tersirat Teks Anekdot',
            petunjuk: '1. Tuliskan pesan moral dan kritik sosial pada teks di atas!\n2. Tandai bagian Abstraksi, Orientasi, Krisis, Reaksi, dan Koda!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi etika dalam menyampaikan kritik yang santun dan konstruktif.',
            'Doa dan penutup.'
          ]
        }
      }
    }
  ];

  await prisma.bahanAjarPreset.upsert({
    where: { id: 'preset-b-indo-fase-e-modul-2' },
    update: {
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 2: Mengungkapkan Kritik Lewat Senyuman (Teks Anekdot)',
      deskripsi: 'Panduan KBM teks anekdot, lawakan tunggal (stand-up comedy), kritik sosial santun, dan komik potongan.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Joyful & Critical Thinking)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Anekdot', 'Kurikulum Merdeka'],
      konten_json: modul2Content as any,
      status: 'PUBLISHED'
    },
    create: {
      id: 'preset-b-indo-fase-e-modul-2',
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 2: Mengungkapkan Kritik Lewat Senyuman (Teks Anekdot)',
      deskripsi: 'Panduan KBM teks anekdot, lawakan tunggal (stand-up comedy), kritik sosial santun, dan komik potongan.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Joyful & Critical Thinking)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Anekdot', 'Kurikulum Merdeka'],
      konten_json: modul2Content as any,
      status: 'PUBLISHED'
    }
  });

  // ==========================================
  // MODUL 1: B. INDONESIA FASE F (KELAS 11) - TEKS ARGUMENTASI & KETAHANAN PANGAN
  // ==========================================
  const modulFaseFContent = [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Membaca Kritis Teks Argumentasi: Ketahanan Pangan Lokal',
      tujuan_pembelajaran: [
        'Menemukan ide pokok dan ide pendukung pada teks argumentasi bertema diversifikasi pangan lokal.',
        'Membedakan kalimat fakta dan opini dalam isu strategis ketahanan pangan nasional.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Pembukaan: Salam, doa bersama, dan presensi kelas XI.',
            'Apersepsi: Guru menayangkan gambar aneka pangan lokal non-beras (sagu, singkong, jagung, talas).',
            'Pertanyaan Pemantik: "Mengapa masyarakat Indonesia sangat bergantung pada beras padahal negeri kita kaya akan ragam umbi dan karbohidrat alternatif?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Kritis: Teks "Ketahanan Pangan Lokal: Masa Depan Kedaulatan Bangsa".',
            'Diskusi Bedah Argumen: Menemukan premis pendukung, data statistik konsumsi, dan solusi diversifikasi pangan.',
            'Menulis Paragraf Argumentasi: Siswa menyusun 1 paragraf argumentasi berbasis fakta tentang potensi komoditas pangan di daerah masing-masing.'
          ],
          teks_bacaan: {
            judul: 'Diversifikasi Pangan Nusantara untuk Ketahanan Nasional',
            paragraf: [
              'Ketergantungan bangsa Indonesia terhadap komoditas beras sebagai makanan pokok utama telah berlangsung puluhan tahun. Pola konsumsi seragam ini rentan memicu krisis pangan saat anomali iklim El Nino melanda lahan persawahan nasional.',
              'Kekayaan hayati Nusantara sesungguhnya menyediakan lebih dari 77 jenis tanaman sumber karbohidrat, mulai dari sagu Papua, ubi jalar Papua Barat, talas Bogor, hingga sukun di Kepulauan Seribu.',
              'Diversifikasi pangan berbasis potensi lokal bukan sekadar upaya substitusi darurat, melainkan strategi kedaulatan jangka panjang yang memperkuat ekonomi petani pedesaan.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Peta Konsep Argumen & Riset Pangan Lokal',
            petunjuk: '1. Tuliskan gagasan utama pada tiap paragraf teks argumentasi di atas!\n2. Identifikasi 3 argumen logis yang diajukan penulis untuk mendukung diversifikasi pangan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi: Menghargai keragaman pangan lokal sebagai warisan budaya dan ketahanan masa depan.',
            'Rangkuman alur menyusun tesis dan argumen logis.',
            'Doa dan salam penutup.'
          ]
        }
      }
    }
  ];

  await prisma.bahanAjarPreset.upsert({
    where: { id: 'preset-b-indo-fase-f-modul-1' },
    update: {
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'F',
      tingkat: 11,
      judul_modul: 'Modul 1: Menulis Gagasan Kritis Teks Argumentasi (Pangan Lokal)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase F Kelas 11 materi Teks Argumentasi, opini ilmiah, fakta statistik, dan poster advokasi pangan lokal.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Critical Thinking & Civic Engagement)',
      sumber: 'Kemendikbudristek 2024 / Modulguruku',
      tags: ['Bahasa Indonesia', 'Fase F', 'Kelas 11', 'Teks Argumentasi', 'Kurikulum Merdeka'],
      konten_json: modulFaseFContent as any,
      status: 'PUBLISHED'
    },
    create: {
      id: 'preset-b-indo-fase-f-modul-1',
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'F',
      tingkat: 11,
      judul_modul: 'Modul 1: Menulis Gagasan Kritis Teks Argumentasi (Pangan Lokal)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase F Kelas 11 materi Teks Argumentasi, opini ilmiah, fakta statistik, dan poster advokasi pangan lokal.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Critical Thinking & Civic Engagement)',
      sumber: 'Kemendikbudristek 2024 / Modulguruku',
      tags: ['Bahasa Indonesia', 'Fase F', 'Kelas 11', 'Teks Argumentasi', 'Kurikulum Merdeka'],
      konten_json: modulFaseFContent as any,
      status: 'PUBLISHED'
    }
  });

  // ==========================================
  // MODUL 1: PENDIDIKAN AGAMA ISLAM & BUDI PEKERTI (FASE E - KELAS 10)
  // ==========================================
  const modulPaiContent = [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Meraih Ketenteraman Hati dengan Berpikir Kritis & Mencintai Iptek (Q.S. Ali Imran: 190-191)',
      tujuan_pembelajaran: [
        'Membaca Q.S. Ali Imran: 190-191 dan Q.S. Ar-Rahman: 33 sesuai dengan kaidah tajwid, khususnya hukum bacaan tafkhim dan tarqiq.',
        'Menganalisis keterkaitan antara fenomena alam semesta (ayat kauniyah) dengan karakter berpikir kritis generasi Ulil Albab.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Pembukaan: Guru membuka dengan salam, doa bersama, dan tadarus 5 menit.',
            'Apersepsi: Guru menampilkan video rotasi bumi dan pergantian siang-malam di alam semesta.',
            'Pertanyaan Pemantik: "Pernahkah kalian merenungkan bagaimana keteraturan alam semesta ini bekerja? Mengapa Islam memerintahkan umatnya untuk selalu berpikir kritis dan mencintai sains?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Tartil: Guru memodelkan bacaan Q.S. Ali Imran: 190-191 dan diikuti siswa bersama-sama.',
            'Identifikasi Tajwid: Siswa menemukan hukum bacaan alif lam syamsiyah, qamariyah, tafkhim, dan tarqiq.',
            'Kajian Tafsir & Karakter Ulil Albab: Diskusi kelompok tentang 2 ciri utama Ulil Albab (Dzikrullah dalam setiap keadaan dan Fikr / merenungi ciptaan Allah).',
            'Presentasi Kelompok: Merumuskan langkah konkret pelajar muslim dalam memanfaatkan kemajuan teknologi untuk kebaikan.'
          ],
          teks_bacaan: {
            judul: 'Tafsir Q.S. Ali Imran Ayat 190-191: Karakter Intelektual Muslim (Ulil Albab)',
            paragraf: [
              'Sesungguhnya dalam penciptaan langit dan bumi, dan silih bergantinya malam dan siang terdapat tanda-tanda kebesaran Allah bagi orang-orang yang berakal (Ulil Albab).',
              'Yaitu orang-orang yang senantiasa mengingat Allah sambil berdiri, duduk, atau dalam keadaan berbaring, dan mereka memikirkan tentang penciptaan langit dan bumi seraya berkata: "Ya Tuhan kami, tiadalah Engkau menciptakan semua ini sia-sia; Maha Suci Engkau, maka peliharalah kami dari siksa neraka."',
              'Ayat ini menegaskan bahwa sains dan keimanan bukanlah dua hal yang bertentangan. Berpikir kritis atas fenomena alam adalah ibadah intelektual yang mengantarkan manusia pada pengakuan atas keagungan Sang Pencipta.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Bedah Tajwid & Refleksi Ciri Ulil Albab',
            petunjuk: '1. Tuliskan 3 hukum tajwid yang ditemukan pada Q.S. Ali Imran: 190-191 beserta alasannya!\n2. Jelaskan bagaimana cara menerapkan konsep dzikir dan pikir dalam rutinitas belajar sehari-hari!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi: Guru mengajak siswa mensyukuri akal budi sebagai karunia terbesar dari Allah SWT.',
            'Penugasan hafalan mandiri Q.S. Ali Imran: 190-191 dengan intonasi tartil.',
            'Doa kafaratul majelis dan salam penutup.'
          ]
        }
      }
    }
  ];

  await prisma.bahanAjarPreset.upsert({
    where: { id: 'preset-pai-fase-e-modul-1' },
    update: {
      kode_mapel_ref: 'PAI',
      nama_mapel_ref: 'Pendidikan Agama Islam dan Budi Pekerti',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Meraih Ketenteraman Hati dengan Berpikir Kritis (Q.S. Ali Imran: 190-191)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E Kelas 10 materi Berpikir Kritis, Mencintai Iptek, Ayat Kauniyah, Tajwid Tafkhim-Tarqiq, dan Karakter Ulil Albab.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Tadabbur Al-Quran)',
      sumber: 'Kemendikbudristek 2024 / Modulguruku',
      tags: ['PAI', 'Pendidikan Agama Islam', 'Fase E', 'Kelas 10', 'Ulil Albab', 'Kurikulum Merdeka'],
      konten_json: modulPaiContent as any,
      status: 'PUBLISHED'
    },
    create: {
      id: 'preset-pai-fase-e-modul-1',
      kode_mapel_ref: 'PAI',
      nama_mapel_ref: 'Pendidikan Agama Islam dan Budi Pekerti',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Meraih Ketenteraman Hati dengan Berpikir Kritis (Q.S. Ali Imran: 190-191)',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E Kelas 10 materi Berpikir Kritis, Mencintai Iptek, Ayat Kauniyah, Tajwid Tafkhim-Tarqiq, dan Karakter Ulil Albab.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Tadabbur Al-Quran)',
      sumber: 'Kemendikbudristek 2024 / Modulguruku',
      tags: ['PAI', 'Pendidikan Agama Islam', 'Fase E', 'Kelas 10', 'Ulil Albab', 'Kurikulum Merdeka'],
      konten_json: modulPaiContent as any,
      status: 'PUBLISHED'
    }
  });

  console.log(`SUCCESS: Seeded all multi-module presets (B. Indonesia & PAI Fase E & Fase F)!`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedBahanAjarPresets(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
      process.exit(1);
    });
}
