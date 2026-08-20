import { PrismaClient } from '@prisma/client';

export async function seedBahanAjarPresets(prisma: PrismaClient) {
  console.log('--- SEEDING BAHAN AJAR PRESET (DIGITAL TEACHING READER) ---');

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
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Praktik Observasi Lapangan & Perencanaan Laporan',
      tujuan_pembelajaran: [
        'Menentukan objek observasi lingkungan sekitar yang menarik dan aman.',
        'Menyusun kerangka rencana observasi, pedoman pengamatan lapangan, dan instrumen pencatatan data faktual.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam, doa, dan penyampaian keselamatan kerja observasi lapangan.',
            'Pertanyaan Pemantik: "Bagaimana cara mencatat data observasi agar tidak tercampur dengan asumsi pribadi?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Pembagian Kelompok Kerja & Penentuan Objek: Taman sekolah, kantin sehat, bank sampah sekolah, atau tanaman obat keluarga.',
            'Observasi Langsung: Siswa turun ke lapangan melakukan pengamatan fisik, mencatat data kuantitatif & kualitatif.',
            'Verifikasi Data: Kelompok mengonsolidasikan catatan hasil observasi dan mencocokkan dengan sumber referensi.'
          ],
          lkpd: {
            judul: 'LKPD 3: Lembar Pengamatan Lapangan & Pengumpulan Fakta',
            petunjuk: 'Catat objek yang diamati: nama objek, lokasi, waktu pengamatan, ciri-ciri fisik terukur, perilaku, dan manfaat lingkungan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Cek rekapitulasi data lapangan tiap kelompok.',
            'Instruksi penyusunan draf awal teks LHO pada pertemuan berikutnya.',
            'Doa dan penutup.'
          ]
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penyusunan Draf Teks LHO & Peer Review',
      tujuan_pembelajaran: [
        'Menulis draf teks LHO secara sistematis, runtut, logis, dan etis.',
        'Melakukan uji silang (peer review) draf antarkelompok menggunakan rubrik evaluasi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam, doa, dan motivasi kerja tim.',
            'Meninjau rubrik standar penulisan LHO ilmiah populer.'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Penulisan Draf LHO Mandiri-Kelompok: Mengembangkan kerangka menjadi teks utuh 3 struktur.',
            'Penerapan Kaidah Bahasa: Memastikan penggunaan ejaan, huruf kapital, tanda baca, dan konjungsi yang tepat.',
            'Peer Review Silang: Saling menukar draf dengan kelompok lain dan memberi masukan perbaikan konstruktif.'
          ],
          lkpd: {
            judul: 'LKPD 4: Lembar Penulisan Draf & Rubrik Peer-Assessment LHO',
            petunjuk: 'Nilai kelengkapan struktur (Pernyataan Umum, Deskripsi Bagian, Manfaat) dan kejelasan data fakta pada draf kelompok rekan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi proses penulisan dan komitmen revisi final draf.',
            'Doa dan salam penutup.'
          ]
        }
      }
    },
    {
      nomor_pertemuan: 5,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Pengalihwahanaan LHO ke Media Kreatif Multimodal',
      tujuan_pembelajaran: [
        'Mengalihwahanakan teks LHO menjadi format kreatif digital (infografis Canva, poster, video singkat, podcast, atau slide interaktif).'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam, doa, dan apresiasi karya draf siswa.',
            'Pertanyaan Pemantik: "Media visual apa yang paling menarik bagi generasi sekarang untuk membaca laporan ilmiah?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Workshop Pengalihwahanaan: Siswa mendesain infografis atau slide presentasi interaktif menggunakan tools digital.',
            'Penyusunan Narasi & Elemen Visual: Menyelaraskan teks fakta dengan diagram, foto asli observasi, dan ikon pendukung.',
            'Uji Coba Presentasi Mini: Gladi bersih penyampaian materi di dalam kelompok.'
          ],
          lkpd: {
            judul: 'LKPD 5: Lembar Kerja Desain Produk Kreatif Multimodal',
            petunjuk: 'Buatlah media kreatif infografis / slide visual berbasis hasil laporan observasi kelompok Anda!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Finalisasi file karya dan persiapan urutan presentasi kelas pertemuan ke-6.',
            'Doa dan salam penutup.'
          ]
        }
      }
    },
    {
      nomor_pertemuan: 6,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Gelar Karya & Presentasi LHO Multimodal',
      tujuan_pembelajaran: [
        'Mempresentasikan laporan hasil observasi multimodal di depan kelas dengan intonasi, metode, dan etika komunikasi yang tepat.',
        'Menanggapi dan memberikan feedback kritis-apresiatif terhadap presentasi kelompok lain.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam, doa pembuka, dan pengundian urutan presentasi.',
            'Penjelasan tata tertib dan rubrik penilaian presentasi kelas.'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Sesi Presentasi Kelompok: Tiap kelompok menayangkan media kreatif di proyektor kelas dan memaparkan hasil observasi (10 menit per kelompok).',
            'Sesi Tanya Jawab Interaktif: Audiens mengajukan pertanyaan kritis dan tanggapan objektif.',
            'Umpan Balik Guru: Guru memberikan apresiasi, penguatan konsep kebahasaan, dan catatan penilaian sumatif.'
          ],
          lkpd: {
            judul: 'LKPD 6: Lembar Evaluasi & Rubrik Asesmen Sumatif Presentasi LHO',
            petunjuk: 'Format penilaian mencakup: Penguasaan materi observasi, kejelasan intonasi berbicara, kualitas media visual, dan kemampuan menjawab pertanyaan.'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi Penutup Bab 1: Menyimpulkan pencapaian seluruh materi LHO.',
            'Pemberian apresiasi kelompok terfavorit dan karya infografis terbaik.',
            'Doa penutup bab dan salam.'
          ]
        }
      }
    }
  ];

  // Upsert preset ke database
  const preset = await prisma.bahanAjarPreset.upsert({
    where: { id: 'preset-b-indo-fase-e-modul-1' },
    update: {
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Mengungkap Fakta Alam Secara Objektif',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) materi Teks Laporan Hasil Observasi (LHO), teks eksplanasi, kaidah kebahasaan, observasi lapangan, dan gelar karya multimodal.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'LHO', 'Kurikulum Merdeka', 'Deep Learning'],
      konten_json: modul1Content as any,
      status: 'PUBLISHED'
    },
    create: {
      id: 'preset-b-indo-fase-e-modul-1',
      kode_mapel_ref: 'B.INDONESIA',
      nama_mapel_ref: 'Bahasa Indonesia',
      fase: 'E',
      tingkat: 10,
      judul_modul: 'Modul 1: Mengungkap Fakta Alam Secara Objektif',
      deskripsi: 'Panduan KBM mendalam (Deep Learning) materi Teks Laporan Hasil Observasi (LHO), teks eksplanasi, kaidah kebahasaan, observasi lapangan, dan gelar karya multimodal.',
      total_alokasi_jp: 18,
      total_pertemuan: 6,
      pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
      sumber: 'modulguruku.com / Kemendikbudristek 2024',
      tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'LHO', 'Kurikulum Merdeka', 'Deep Learning'],
      konten_json: modul1Content as any,
      status: 'PUBLISHED'
    }
  });

  console.log(`SUCCESS: Seeded Bahan Ajar Preset: ${preset.judul_modul} (${preset.total_pertemuan} Pertemuan, ${preset.total_alokasi_jp} JP)`);
}

// Support direct CLI execution
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
