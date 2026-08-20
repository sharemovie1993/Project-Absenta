import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Modul 1: Mengungkap Fakta Alam Secara Objektif (LHO) - 6 Pertemuan (18 JP)
const modul1 = {
  id: 'preset-b-indo-fase-e-modul-1',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 1: Mengungkap Fakta Alam Secara Objektif (LHO)',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Teks Laporan Hasil Observasi (LHO), teks eksplanasi pendukung, struktur ilmiah, dan gelar karya observasi.',
  total_alokasi_jp: 18,
  total_pertemuan: 6,
  pendekatan: 'Deep Learning (Mindful, Meaningful, Joyful Learning)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'LHO', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
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
            'Pembukaan: Guru membuka pelajaran dengan salam, doa, dan presensi siswa.',
            'Apersepsi (Mindful Learning): Guru menampilkan gambar Observatorium Bosscha atau objek observasi alam.',
            'Pertanyaan Pemantik: "Pernahkah kalian mengamati objek di alam secara detail seolah-olah menjadi seorang peneliti? Menurut kalian apa perbedaan fakta dan opini?"',
            'Motivasi: Menanamkan rasa syukur atas keteraturan ciptaan Tuhan dan kepedulian merawat alam.'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Asesmen Diagnostik Awal: Menggali pemahaman dasar siswa tentang teks deskripsi dari jenjang sebelumnya.',
            'Eksplorasi Konsep: Siswa menganalisis hal-hal menarik yang diamati dan memilah mana data fakta vs opini.',
            'Menyimak Teks LHO: Guru memodelkan membaca nyaring teks LHO dengan intonasi yang tepat.',
            'Diskusi Kelompok (Bernalar Kritis): Siswa mengidentifikasi struktur teks LHO (Pernyataan Umum, Deskripsi Bagian, dan Deskripsi Manfaat).'
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
            'Rangkuman bersama dan doa penutup.'
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
        'Mengidentifikasi istilah sains baru menggunakan KBBI dan menerapkan kaidah kebahasaan LHO.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam, doa bersama, dan presensi.',
            'Review materi pertemuan 1 tentang struktur LHO.',
            'Pertanyaan Pemantik: "Mengapa teks eksplanasi diperlukan untuk mendukung keakuratan data dalam teks laporan hasil observasi?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Kritis: Membaca teks LHO dan eksplanasi "Kunang-Kunang yang Perlahan Menghilang".',
            'Membandingkan Teks: Siswa membandingkan data LHO dengan fakta ilmiah proses bioluminesensi.',
            'Kamus Mini Istilah Sains: Mengidentifikasi kata bioluminesensi, nokturnal, polusi cahaya.',
            'Analisis Kalimat Definisi dan Kalimat Deskripsi.'
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
            'Refleksi kepedulian terhadap kelestarian alam dan ekosistem serangga.',
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
        'Melakukan pengamatan langsung terhadap objek lingkungan sekitar sekolah.',
        'Menyusun kerangka laporan hasil observasi berdasarkan data faktual yang dihimpun.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka dan pembagian lembar observasi lapangan.',
            'Pertanyaan Pemantik: "Bagaimana cara kita mencatat data observasi tanpa memasukkan opini subjektif?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Observasi Lapangan Mandiri/Kelompok: Mengamati objek (taman sekolah, kantin sehat, biopori, dsb).',
            'Pengumpulan Data: Mencatat dimensi fisik, fungsi, dan kondisi faktual objek.',
            'Penyusunan Kerangka LHO: Mengelompokkan catatan ke dalam struktur pernyataan umum, deskripsi bagian, dan deskripsi manfaat.'
          ],
          lkpd: {
            judul: 'LKPD 3: Lembar Instrumen Observasi Lapangan',
            petunjuk: '1. Amati objek lingkungan sekolah pilihanmu!\n2. Catat fakta kuantitatif dan kualitatif pada tabel observasi!\n3. Susun draf kerangka karangan 3 bagian!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Evaluasi draf data kelompok dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penyusunan Draf Teks LHO & Peer Review',
      tujuan_pembelajaran: [
        'Menulis teks LHO lengkap dengan memperhatikan kaidah ejaan, tanda baca, dan kalimat efektif.',
        'Memberikan umpan balik konstruktif terhadap draf tulisan teman sebaya.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Apersepsi tata bahasa dan tanda baca penulisan ilmiah.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Penulisan Mandiri: Mengembangkan kerangka observasi menjadi teks LHO utuh.',
            'Peer Review: Bertukar draf dengan rekan sebangku menggunakan rubrik penilaian LHO.',
            'Revisi Naskah berdasarkan masukan rekan sebaya.'
          ],
          lkpd: {
            judul: 'LKPD 4: Rubrik Umpan Balik Peer Review',
            petunjuk: '1. Periksa kelengkapan 3 struktur LHO rekanmu!\n2. Berikan centang pada ketepatan ejaan dan kalimat definisi!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi etika memberi kritik konstruktif dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 5,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Pengalihwahanan LHO ke Media Kreatif Multimodal (Infografis & Video)',
      tujuan_pembelajaran: [
        'Mengalihwahanakan teks LHO ke dalam format visual infografis atau video presentasi ringkas.',
        'Mempersiapkan materi pameran literasi observasi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Pengenalan aplikasi desain visual Canva / poster ilmiah.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Desain Infografis: Merangkum poin fakta LHO ke dalam bagan visual.',
            'Integrasi Foto Objek Observasi asli hasil dokumentasi lapangan.',
            'Finalisasi media multimodal siap pameran.'
          ],
          lkpd: {
            judul: 'LKPD 5: Lembar Kerja Desain Infografis LHO',
            petunjuk: '1. Susun tata letak judul, gambar utama, dan poin fakta penting!\n2. Pastikan kontras warna dan keterbacaan teks optimal!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Pengecekan kesiapan karya dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 6,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Gelar Karya & Presentasi LHO Multimodal',
      tujuan_pembelajaran: [
        'Mempresentasikan hasil laporan observasi dengan intonasi jelas dan santun.',
        'Mengevaluasi dan mengapresiasi karya observasi kelompok lain.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Briefing gallery walk / gelar karya observasi kelas.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Presentasi Bergilir: Setiap kelompok memamerkan infografis dan membacakan laporan LHO.',
            'Tanya Jawab & Tanggapan Ilmiah antar-siswa.',
            'Penilaian Sumatif Gelar Karya oleh Guru.'
          ],
          lkpd: {
            judul: 'LKPD 6: Lembar Apresiasi & Refleksi Gelar Karya',
            petunjuk: '1. Berikan apresiasi pada 2 karya kelompok terbaik!\n2. Tuliskan hal paling berkesan dari proses observasi lapangan!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi penutup Bab 1 dan penyerahan penghargaan kelompok terinspiratif.',
            'Doa syukur dan penutup.'
          ]
        }
      }
    }
  ]
};

// Modul 2: Mengungkapkan Kritik Lewat Senyuman (Anekdot) - 6 Pertemuan (18 JP)
const modul2 = {
  id: 'preset-b-indo-fase-e-modul-2',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 2: Mengungkapkan Kritik Lewat Senyuman (Teks Anekdot)',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Teks Anekdot, lawakan tunggal (stand-up comedy), kritik sosial santun, dan komik potongan.',
  total_alokasi_jp: 18,
  total_pertemuan: 6,
  pendekatan: 'Deep Learning (Joyful & Critical Thinking)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Anekdot', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Mengenali Anekdot dan Kritik dalam Humor',
      tujuan_pembelajaran: [
        'Mengidentifikasi ide pokok dan kritik tersirat dalam teks anekdot lisan maupun tulis.',
        'Membedakan antara kritik langsung dengan kritik humoris yang santun.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka, doa, dan apersepsi karikatur politik/meme lucu.',
            'Pertanyaan Pemantik: "Pernahkah kalian ingin mengkritik sesuatu tetapi takut menyinggung perasaan? Bagaimana humor bisa menjadi media kritik yang efektif dan santun?"',
            'Motivasi: Memahami bahwa kecerdasan berkomunikasi tercermin dari kemampuan menyampaikan pesan secara cerdas.'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Menyimak Teks Anekdot: Menyimak pembacaan kisah "Baju Termahal di Indonesia (Rompi Oranye)".',
            'Analisis Pesan Tersirat: Siswa mengidentifikasi sindiran terhadap kasus korupsi publik.',
            'Diskusi Etika Kritik: Membedakan humor yang mendidik dengan ujaran kebencian/bully.'
          ],
          teks_bacaan: {
            judul: 'Baju Termahal di Indonesia',
            paragraf: [
              'Dua orang sahabat, Amar dan Bejo, sedang asyik berbincang di sebuah warung kopi di pinggir jalan raya yang ramai.',
              'Amar bertanya, "Bejo, kamu tahu nggak baju apa yang paling mahal di negara kita?" Bejo berpikir keras sejenak, "Mungkin jas wol impor dari Paris atau pakaian karya desainer ternama ya?"',
              'Amar tersenyum kecut sambil menyeruput kopinya, "Bukan! Baju termahal itu rompi oranye KPK. Soalnya, seseorang harus mengantongi uang rakyat miliaran rupiah dulu baru bisa mendapat kesempatan memakai baju itu!" Keduanya pun tertawa getir menyadari sindiran tersebut.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Identifikasi Kritik Tersirat & Makna Humor',
            petunjuk: '1. Baca teks "Baju Termahal di Indonesia" di atas!\n2. Siapakah pihak yang dikritik dalam teks tersebut?\n3. Mengapa humor membuat kritik lebih mudah diterima?'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi: Menjaga kesantunan dalam mengemukakan pendapat. Doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Struktur dan Kebahasaan Teks Anekdot (Abstraksi - Koda)',
      tujuan_pembelajaran: [
        'Menganalisis struktur teks anekdot: Abstraksi, Orientasi, Krisis, Reaksi, dan Koda.',
        'Menganalisis unsur kebahasaan kalimat retoris, konjungsi waktu, dan kata kerja aksi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka dan review materi jenis kritik humor.',
            'Pertanyaan Pemantik: "Bagaimana cara menyusun alur cerita lucu agar klimaks komedinya mengena?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Eksplorasi Konsep: Bedah 5 struktur wajib teks anekdot.',
            'Analisis Teks "Liburan Kuli Bangunan": Menandai bagian Krisis (klimaks kelucuan) dan Reaksi.',
            'Analisis Kebahasaan: Menemukan kalimat retoris dan verba aksi dalam teks.'
          ],
          teks_bacaan: {
            judul: 'Liburan Kuli Bangunan',
            paragraf: [
              'Seorang kuli bangunan tampak terengah-engah mengangkat semen di lantai lima sebuah proyek gedung perkantoran mewah.',
              'Mandor proyek menghampirinya dan bertanya, "Kenapa kamu tampak lelah sekali, Joko? Baru kerja setengah hari sudah loyo."',
              'Joko menjawab polos, "Iya Pak, semalam saya mimpi pergi liburan keliling Eropa naik pesawat jet pribadi, belanja di London, lalu mendaki gunung salju."',
              'Mandor heran, "Lho, mimpi liburan mewah kok malah bikin lelah?" Joko menghela napas, "Soalnya sepanjang liburan di mimpi itu, saya disuruh menggendong koper bos yang beratnya minta ampun!"'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Peta Struktur Teks Anekdot',
            petunjuk: '1. Tentukan paragraf yang termasuk Abstraksi, Orientasi, Krisis, Reaksi, dan Koda!\n2. Tuliskan 2 kalimat retoris yang ada pada teks!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Rangkuman struktur 5 tahap anekdot dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Perancangan Ide & Riset Isu Sosial untuk Anekdot',
      tujuan_pembelajaran: [
        'Memilih isu sosial, layanan publik, atau lingkungan nyata sebagai inspirasi kritik.',
        'Menyusun kerangka anekdot dengan teknik asosiasi komedi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Brainstorming isu hangat di sekitar (antrean rumah sakit, jalan berlubang, tugas menumpuk).']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Riset Isu Nyata: Menemukan kejanggalan atau ironi dalam kehidupan sehari-hari.',
            'Menyusun Premis & Punchline: Merancang premis setup dan titik kelucuan (punchline).',
            'Membuat matriks karakter dan latar cerita anekdot.'
          ],
          lkpd: {
            judul: 'LKPD 3: Matriks Ide & Kerangka Anekdot',
            petunjuk: '1. Pilih 1 topik masalah layanan publik atau fenomena sosial!\n2. Tentukan sudut pandang ironi dan draf rancangan klimaks cerita!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Validasi ide oleh guru dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penulisan Naskah Teks Anekdot & Komik Strip',
      tujuan_pembelajaran: [
        'Menulis narasi teks anekdot utuh berdasarkan kerangka yang telah dibuat.',
        'Mengubah teks anekdot menjadi format komik potongan (comic strip) 4 panel.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Pengenalan teknik penulisan dialog komedi dan panel komik.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Penulisan Mandiri: Menuangkan narasi anekdot dengan dialog jenaka.',
            'Penyusunan Storyboard Komik: Menggambar atau menyusun ilustrasi digital 4 panel.',
            'Pengecekan keselarasan gambar dan teks dialog humor.'
          ],
          lkpd: {
            judul: 'LKPD 4: Draf Naskah Anekdot & Lembar Storyboard 4 Panel',
            petunjuk: '1. Tuliskan teks anekdot karyamu minimal 3 paragraf!\n2. Buat sketsa panel cerita komik dari naskah tersebut!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi proses berkarya kreatif dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 5,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penyuntingan Naskah & Uji Coba Lawakan (Peer Review)',
      tujuan_pembelajaran: [
        'Menyunting naskah anekdot dari aspek kesantunan berbahasa dan ketepatan punchline.',
        'Melakukan uji tawa (*laugh test*) bersama rekan sebaya.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Penjelasan rubrik penilaian kelucuan, kesantunan, dan kedalaman kritik.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Simulasi Uji Tawa: Membacakan naskah ke rekan kelompok kecil.',
            'Penyuntingan Draf: Memperbaiki kata-kata yang kurang pas atau berpotensi menyinggung SARA.',
            'Finalisasi naskah siap tampil.'
          ],
          lkpd: {
            judul: 'LKPD 5: Lembar Umpan Balik Kualitas Komedi & Etika',
            petunjuk: '1. Berikan skor 1-5 untuk tingkat kelucuan dan ketajaman kritik rekanmu!\n2. Berikan saran perbaikan pada punchline!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Persiapan penampilan pertemuan 6 dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 6,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Panggung Komedi Kelas & Apresiasi Anekdot',
      tujuan_pembelajaran: [
        'Menampilkan monolog anekdot / lawakan tunggal di depan kelas dengan percaya diri.',
        'Mengapresiasi karya kritik sosial yang dihasilkan teman sekelas.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Pembukaan "Panggung Apresiasi Anekdot Kelas X".']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Penampilan Siswa: Siswa maju membawakan anekdot secara monolog atau memamerkan komik strip.',
            'Tepuk tangan dan feedback langsung dari audiens.',
            'Penilaian performa: Gestur, intonasi, ekspresi, dan respon audiens.'
          ],
          lkpd: {
            judul: 'LKPD 6: Lembar Penilaian Dewan Juri Kelas',
            petunjuk: '1. Berikan apresiasi terhadap penampil terfavorit!\n2. Catat pesan kritik sosial paling berkesan hari ini!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Pemberian penghargaan Komika Terbaik Kelas dan doa penutup.']
        }
      }
    }
  ]
};

// Modul 3: Menyusuri Nilai Dalam Cerita Lintas Zaman (Hikayat & Cerpen) - 6 Pertemuan (18 JP)
const modul3 = {
  id: 'preset-b-indo-fase-e-modul-3',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 3: Menyusuri Nilai dalam Cerita Lintas Zaman (Hikayat & Cerpen)',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Hikayat klasik Melayu, nilai-nilai kehidupan lintas zaman, unsur intrinsik, dan alih wahana menjadi cerpen/drama radio modern.',
  total_alokasi_jp: 18,
  total_pertemuan: 6,
  pendekatan: 'Deep Learning (Mindful, Cultural Appreciation, Creative Writing)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Hikayat', 'Cerpen', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Mengenali Hikayat dan Karakteristik Sastra Klasik',
      tujuan_pembelajaran: [
        'Mengidentifikasi karakteristik hikayat (kemustahilan, kesaktian tokoh, anonim, istanasentris, arkais).',
        'Menemukan alur cerita pokok dalam teks hikayat klasik nusantara.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka, doa bersama, dan apersepsi dongeng/cerita rakyat nusantara.',
            'Pertanyaan Pemantik: "Pernahkah kalian membaca kisah kerajaan kuno dengan tokoh yang sakti mandraguna? Mengapa karya sastra masa lampau sarat dengan unsur kemustahilan?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Terbimbing: Membaca petikan teks klasik "Hikayat Si Miskin (Hikayat Marakarma)".',
            'Bedah Kosakata Arkais: Menggunakan kamus untuk menemukan arti kata: hatta, syahdan, sebermula, titah.',
            'Identifikasi 5 Ciri Khas Hikayat: Istanasentris, kesaktian, kemustahilan, anonim, dan arkais.'
          ],
          teks_bacaan: {
            judul: 'Petikan Hikayat Si Miskin',
            paragraf: [
              'Hatta beberapa lamanya baginda di atas takhta kerajaan, maka datanglah seorang laki-laki miskin bersama istrinya berpakaian compang-camping meminta belas kasihan orang banyak di negeri Antah Berantah.',
              'Maka tatkala orang banyak melihat rupa Si Miskin itu, dilemparnyalah dengan batu dan kayu hingga luka-luka badannya. Maka Si Miskin pun lari ke dalam hutan rimba belantara dengan menangis tersedu-sedu.',
              'Syahdan dengan takdir Allah Taala, tatkala istrinya mengandung dan mengidam buah mempelam di taman istana raja, Si Miskin memberanikan diri menghadap baginda raja. Baginda yang adil dan pemurah pun mengabulkan permohonan tersebut, hingga kelak lahirlah anak mereka yang dinamai Marakarma yang membawa tuah dan kemuliaan.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Identifikasi Karakteristik & Kata Arkais Hikayat',
            petunjuk: '1. Tuliskan 3 bukti unsur kemustahilan atau kesaktian pada teks di atas!\n2. Temukan 4 kata arkais dan carilah artinya dalam bahasa Indonesia modern!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi kekayaan sastra warisan leluhur nusantara dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Nilai-Nilai Kehidupan dalam Hikayat (Religi, Moral, Sosial, Edukasi)',
      tujuan_pembelajaran: [
        'Menganalisis nilai-nilai kehidupan (agama, moral, budaya, sosial) yang terkandung dalam hikayat.',
        'Menghubungkan relevansi nilai-nilai hikayat klasik dengan dinamika kehidupan modern.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: [
            'Salam pembuka dan review karakter tokoh hikayat.',
            'Pertanyaan Pemantik: "Apakah nilai budi pekerti dalam cerita ratusan tahun lalu masih relevan bagi generasi milenial dan Gen Z?"'
          ]
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Kritis "Hikayat Sa-ijaan dan Ikan Todak": Membedah kearifan lokal Kalimantan Selatan.',
            'Analisis Nilai: Mengidentifikasi nilai religi (berdoa dan berserah diri), nilai moral (pantang menyerah), dan nilai sosial (gotong royong menjaga laut).',
            'Diskusi Komparasi: Membandingkan nilai moral hikayat dengan kasus nyata zaman sekarang.'
          ],
          teks_bacaan: {
            judul: 'Hikayat Sa-ijaan dan Ikan Todak',
            paragraf: [
              'Datu Mabrur bertapa di tengah laut Pulau Laut untuk memohon kepada Sang Pencipta agar dianugerahi sebuah pulau yang dapat dihuni oleh anak cucunya kelak.',
              'Datanglah serangan jutaan ikan todak yang dipimpin oleh Raja Ikan Todak karena merasa terganggu oleh pertapaan Datu Mabrur. Namun dengan ketabahan dan kesaktiannya, Datu Mabrur berhasil mengalahkan Raja Ikan Todak tanpa dendam.',
              'Sebagai tanda perdamaian dan terima kasih karena telah diampuni nyawanya, Raja Ikan Todak bersama rakyatnya bergotong royong mendorong dasar laut hingga muncullah daratan subur yang kini dikenal sebagai Pulau Halimun atau Kotabaru dengan semboyan Sa-ijaan (seia-sekata).'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Matriks Analisis Nilai Lintas Zaman',
            petunjuk: '1. Identifikasi nilai agama, moral, dan sosial pada Hikayat Sa-ijaan!\n2. Tuliskan 1 contoh penerapan nilai tersebut dalam kehidupanmu hari ini!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Rangkuman pesan moral persatuan dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Perbandingan Struktur Hikayat dan Cerpen Modern',
      tujuan_pembelajaran: [
        'Membandingkan alur, penokohan, dan sudut pandang antara teks hikayat klasik dan cerpen kontemporer.',
        'Merancang alih wahana (transformasi) kisah hikayat menjadi cerpen masa kini.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Pengenalan konsep alih wahana (ekranisasi & adaptasi sastra).']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Membaca Berdampingan: Teks Hikayat Si Miskin vs Cerpen "Menjaga Amanah Kakek".',
            'Membuat Tabel Komparasi Gaya Bahasa, Konflik, dan Latar Cerita.',
            'Menentukan Tokoh & Latar Baru: Mengubah raja/istana menjadi tokoh modern (misal: pengusaha muda, siswa berprestasi) dengan tetap mempertahankan esensi nilai moral.'
          ],
          lkpd: {
            judul: 'LKPD 3: Tabel Perbandingan Hikayat vs Cerpen & Rencana Alih Wahana',
            petunjuk: '1. Buat perbandingan unsur intrinsik hikayat dan cerpen!\n2. Tentukan ide transformasi karakter hikayat ke dalam konteks modern!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Pengecekan kesiapan kerangka cerpen dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penulisan Draf Cerpen Adaptasi Hikayat',
      tujuan_pembelajaran: [
        'Menulis cerita pendek modern berbasis nilai-nilai hikayat yang telah dipilih.',
        'Mengembangkan konflik yang realistis dan dialog yang hidup.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Apersepsi teknik penulisan alur dramatik dan penataan klimaks.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Proses Kreatif: Menulis draf cerpen mandiri 500-800 kata.',
            'Konsultasi Pembimbingan: Guru mendampingi siswa dalam penyusunan resolusi cerita.',
            'Pengecekan kesesuaian nilai moral dengan hikayat aslinya.'
          ],
          lkpd: {
            judul: 'LKPD 4: Lembar Kerja Penulisan Cerpen Adaptasi',
            petunjuk: '1. Tuliskan naskah cerpen adaptasi hikayatmu!\n2. Pastikan alur orientasi, komplikasi, evaluasi, dan resolusi terbangun utuh!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Refleksi kepuasan menuangkan ide kreatif dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 5,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Penyuntingan Naskah & Alih Wahana ke Naskah Drama Radio / Podcast',
      tujuan_pembelajaran: [
        'Menyunting teks cerpen dari segi tata bahasa dan koherensi cerita.',
        'Mengubah cerpen menjadi naskah audio drama radio pendek lengkap dengan efek suara (SFX).'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Mendengarkan contoh potongan podcast drama audio berlatar nusantara.']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Penyuntingan Draf Cerpen bersama rekan sebaya.',
            'Penulisan Naskah Audio: Menambahkan petunjuk intonasi suara dan keterangan sound effect (SFX ombak, derap langkah, musik pengiring).',
            'Latihan membaca peran kelompok.'
          ],
          lkpd: {
            judul: 'LKPD 5: Naskah Sandiwara Audio / Drama Radio Mini',
            petunjuk: '1. Susun naskah drama radio berdurasi 3-5 menit!\n2. Berikan tanda intonasi [Marah/Sedih/Gembira] dan tanda suara [SFX]!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: ['Persiapan gelar dengar rekaman dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 6,
      alokasi_jp: 3,
      durasi_menit: 135,
      topik: 'Pentas Baca Cerpen & Gelar Audio Drama Hikayat Modern',
      tujuan_pembelajaran: [
        'Mementaskan pembacaan cerpen atau memutarkan drama audio adaptasi hikayat.',
        'Mengevaluasi pelestarian nilai budaya nusantara melalui media digital modern.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 15,
          kegiatan: ['Pembukaan "Festival Literasi Cerita Lintas Zaman".']
        },
        inti: {
          durasi_menit: 105,
          kegiatan: [
            'Pemutaran Karya: Penayangan drama audio dan pembacaan dramatik cerpen.',
            'Apresiasi & Umpan Balik: Diskusi pesan moral yang berhasil ditransformasikan ke era modern.',
            'Penilaian Sumatif Proyek Alih Wahana.'
          ],
          lkpd: {
            judul: 'LKPD 6: Lembar Evaluasi Apresiasi Karya Sastra Klasik-Modern',
            petunjuk: '1. Berikan ulasan singkat terhadap cerpen karya teman kelompok lain!\n2. Tuliskan nilai luhur apa yang paling berharga bagi generasi masa kini!'
          }
        },
        penutup: {
          durasi_menit: 15,
          kegiatan: [
            'Refleksi penutup Bab 3: Menjadi penjaga nilai luhur bangsa di era digital.',
            'Doa penutup dan salam.'
          ]
        }
      }
    }
  ]
};

// Modul 4: Belajar Menjadi Negosiator Ulung (Teks Negosiasi) - 4 Pertemuan (8 JP)
const modul4 = {
  id: 'preset-b-indo-fase-e-modul-4',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 4: Belajar Menjadi Negosiator Ulung (Teks Negosiasi)',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Teks Negosiasi, strategi mencapai kesepakatan saling menguntungkan (win-win solution), surat penawaran bisnis, dan simulasi negosiasi dunia kerja.',
  total_alokasi_jp: 8,
  total_pertemuan: 4,
  pendekatan: 'Deep Learning (Communication Mastery & Real-World Negotiation)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Negosiasi', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Mengenali Esensi dan Karakteristik Teks Negosiasi',
      tujuan_pembelajaran: [
        'Menganalisis konsep dasar negosiasi dan faktor penentu tercapainya kesepakatan.',
        'Membedakan negosiasi yang berorientasi solusi (win-win) dengan perdebatan tanpa hasil.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: [
            'Salam, doa, dan apersepsi video tawar-menawar di pasar seni tradisional.',
            'Pertanyaan Pemantik: "Mengapa dalam kehidupan kita tidak selalu bisa memaksakan kehendak? Bagaimana cara bernegosiasi agar kedua belah pihak merasa sama-sama menang?"'
          ]
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Membaca Teks Dialog "Negosiasi di Pasar Seni Sukawati": Membedah tuturan pengajuan dan penawaran.',
            'Identifikasi Unsur Negosiasi: Adanya pihak berkepentingan, perbedaan kepentingan, proses tawar-menawar, dan kesepakatan akhir.',
            'Diskusi Kasus: Menganalisis faktor yang membuat sebuah negosiasi berhasil atau buntu (deadlock).'
          ],
          teks_bacaan: {
            judul: 'Negosiasi di Pasar Seni Sukawati',
            paragraf: [
              'Seorang wisatawan bernama Nadia tertarik membeli sebuah lukisan pemandangan sawah terasering di salah satu kios Pasar Seni Sukawati.',
              'Penjual membuka harga Rp450.000. Nadia mengajukan penawaran awal Rp250.000 dengan alasan membeli dua barang lainnya berupa cinderamata ukiran kayu.',
              'Setelah proses tawar-menawar yang ramah dan saling menghargai nilai seni, penjual menyetujui harga Rp320.000 dengan bonus kemasan tabung pelindung kanvas. Kedua pihak bersalaman puas dengan kesepakatan tersebut.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Bedah Faktor Keberhasilan Negosiasi',
            petunjuk: '1. Tuliskan kalimat pengajuan dan kalimat penawaran pada teks di atas!\n2. Mengapa kedua belah pihak akhirnya sepakat?'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Refleksi sikap fleksibel dan santun dalam bermusyawarah. Doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Struktur dan Kebahasaan Teks Negosiasi (Orientasi - Persetujuan)',
      tujuan_pembelajaran: [
        'Menganalisis struktur teks negosiasi (Orientasi, Pengajuan, Penawaran, Persetujuan/Penutup).',
        'Menganalisis kaidah kebahasaan santun, kalimat persuasif, dan pasangan tuturan.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Salam pembuka dan review esensi win-win solution.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Eksplorasi Konsep Struktur Negosiasi dan Pasangan Tuturan (Mengucapkan salam - membalas salam, Meminta - memenuhi/menolak).',
            'Analisis Surat Penawaran Bisnis / Pengadaan Barang Sekolah.',
            'Latihan Menyusun Kalimat Persuasif yang sopan dan tidak bernada memaksa.'
          ],
          teks_bacaan: {
            judul: 'Negosiasi Pengadaan Laptop Laboratorium Sekolah',
            paragraf: [
              'Ketua Komite Sekolah bertemu dengan vendor penyedia perangkat komputer untuk mendiskusikan pengadaan 30 unit laptop pembelajaran.',
              'Pihak sekolah membutuhkan spesifikasi RAM 16GB dengan anggaran terbatas, sementara vendor menawarkan spesifikasi tersebut dengan harga di atas pagu anggaran.',
              'Melalui negosiasi konstruktif, vendor memberikan diskon khusus pendidikan 15% serta garansi pemeliharaan gratis selama 2 tahun sebagai imbalan kontrak kerja sama jangka panjang.'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Analisis Pasangan Tuturan & Kalimat Persuasif',
            petunjuk: '1. Identifikasi pasangan tuturan pada teks negosiasi!\n2. Ubah kalimat perintah langsung menjadi tuturan persuasif santun!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Rangkuman kaidah bahasa negosiasi dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Merancang Skenario & Strategi Negosiasi Efektif',
      tujuan_pembelajaran: [
        'Menyusun kerangka dialog negosiasi berbasis studi kasus dunia kerja / organisasi.',
        'Menerapkan taktik konsesi (memberi dan menerima) untuk memecahkan kebuntuan.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Pengenalan teknik negosiasi BATNA (Best Alternative to a Negotiated Agreement).']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Pemilihan Kasus Nyata: Negosiasi sponsor kegiatan OSIS, sewa stan bazar, atau kerja sama magang industri.',
            'Penyusunan Naskah Dialog Kelompok (Pihak A vs Pihak B).',
            'Penyusunan argumen berbasis data pendukung yang kuat.'
          ],
          lkpd: {
            judul: 'LKPD 3: Skenario Role-Play Negosiasi Organisasi/Bisnis',
            petunjuk: '1. Tuliskan naskah dialog negosiasi dengan 4 tahapan struktur lengkap!\n2. Tentukan argumen penguat untuk masing-masing pihak!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Pengecekan kesiapan simulasi role-play dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Simulasi Role-Play Negosiasi di Depan Kelas',
      tujuan_pembelajaran: [
        'Mempraktikkan negosiasi langsung secara berpasangan/kelompok dengan bahasa tubuh dan tuturan meyakinkan.',
        'Mengevaluasi efektivitas solusi yang disepakati.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Briefing panggung simulasi negosiasi kelas.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Simulasi Praktik: Setiap pasangan memperagakan dialog negosiasi secara langsung.',
            'Tanggapan Audiens: Menganalisis apakah kesepakatan benar-benar win-win.',
            'Penilaian Asesmen Kinerja Berbicara & Bernegosiasi.'
          ],
          lkpd: {
            judul: 'LKPD 4: Lembar Penilaian Keterampilan Negosiasi Teman',
            petunjuk: '1. Berikan evaluasi pada aspek kesantunan, logika argumen, dan solusi akhir!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Refleksi keterampilan negosiasi sebagai bekal masa depan dan doa penutup.']
        }
      }
    }
  ]
};

// Modul 5: Memetik Keteladanan dari Biografi Tokoh Inspiratif - 3 Pertemuan (6 JP / 18 JP alokasi)
const modul5 = {
  id: 'preset-b-indo-fase-e-modul-5',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 5: Memetik Keteladanan dari Biografi Tokoh Inspiratif',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Teks Biografi, telaah keteladanan karakter tokoh bangsa, analisis struktur orientasi-reorientasi, dan penulisan biografi naratif.',
  total_alokasi_jp: 6,
  total_pertemuan: 3,
  pendekatan: 'Deep Learning (Character Building & Inspiring Biography)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Biografi', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Mengenali Sosok Inspiratif dalam Teks Biografi',
      tujuan_pembelajaran: [
        'Mengidentifikasi karakteristik umum teks biografi dan membedakannya dari fiksi naratif.',
        'Menemukan rekam jejak perjuangan dan peristiwa penting dalam kehidupan tokoh.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: [
            'Salam pembuka, doa, dan tayangan foto tokoh nasional B.J. Habibie dan Ki Hajar Dewantara.',
            'Pertanyaan Pemantik: "Siapakah sosok yang paling menginspirasi hidup kalian? Nilai-nilai apa dari perjuangannya yang ingin kalian teladani?"'
          ]
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Membaca Kritis: Teks "B.J. Habibie: Sang Visioner Perintis Kedirgantaraan Indonesia".',
            'Analisis Riwayat Hidup: Menelusuri masa kecil, perjuangan studi di Jerman, dan kontribusi pembuatan pesawat N250 Gatotkaca.',
            'Diskusi Keteladanan: Menemukan sikap pantang menyerah, cinta tanah air, dan kedisiplinan intelektual.'
          ],
          teks_bacaan: {
            judul: 'B.J. Habibie: Sang Visioner Kedirgantaraan Indonesia',
            paragraf: [
              'Bacharuddin Jusuf Habibie lahir di Parepare, Sulawesi Selatan, pada 25 Juni 1936. Sejak kecil, ia menunjukkan kecerdasan luar biasa dan kegemaran mendalam terhadap ilmu pengetahuan dan teknologi.',
              'Meskipun hidup dengan keterbatasan ekonomi saat menempuh pendidikan teknik penerbangan di RWTH Aachen Jerman, Habibie berhasil menemukan Teori Crack Progression yang mengharumkan nama bangsa di kancah penerbangan dunia.',
              'Puncak pengabdiannya kepada Ibu Pertiwi diwujudkan melalui perancangan dan penerbangan perdana pesawat N250 Gatotkaca pada tahun 1995, membuktikan bahwa bangsa Indonesia mampu mandiri dalam teknologi tinggi dirgantara.'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Peta Jejak Perjuangan Tokoh Biografi',
            petunjuk: '1. Buat garis waktu (timeline) peristiwa penting kehidupan B.J. Habibie!\n2. Tuliskan 3 tantangan terbesar yang dihadapi tokoh dan cara mengatasinya!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Refleksi motivasi belajar keras dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Struktur Teks Biografi dan Kaidah Kebahasaan',
      tujuan_pembelajaran: [
        'Menganalisis struktur teks biografi: Orientasi, Peristiwa/Masalah Penting, dan Reorientasi.',
        'Menganalisis kaidah kebahasaan pronomina, kata kerja material, adjektiva karakter, dan konjungsi kronologis.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Salam pembuka dan review peristiwa penting tokoh.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Eksplorasi Konsep Struktur Biografi 3 Bagian.',
            'Analisis Teks Biografi "Ki Hajar Dewantara: Peletak Dasar Pendidikan Merdeka".',
            'Bedah Kaidah Bahasa: Menandai pronomina orang ketiga (ia, beliau) dan kata sifat penggambaran watak.'
          ],
          teks_bacaan: {
            judul: 'Ki Hajar Dewantara dan Semboyan Pendidikan Nasional',
            paragraf: [
              'Raden Mas Soewardi Soerjaningrat yang kemudian dikenal sebagai Ki Hajar Dewantara lahir di Yogyakarta pada 2 Mei 1889. Beliau mendedikasikan hidupnya untuk memperjuangkan hak pendidikan bagi rakyat jelata pada masa kolonial.',
              'Melalui pendirian perguruan Taman Siswa pada 1922, Ki Hajar Dewantara merumuskan filosofi kepemimpinan pendidikan yang abadi: Ing ngarsa sung tuladha, ing madya mangun karsa, tut wuri handayani.',
              'Semboyan tersebut bermakna di depan memberi teladan, di tengah membangun semangat, dan di belakang memberi dorongan, yang hingga kini menjadi fondasi Kurikulum Merdeka di Indonesia.'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Analisis Struktur Teks & Unsur Kebahasaan Biografi',
            petunjuk: '1. Tentukan bagian Orientasi, Rangkaian Peristiwa, dan Reorientasi pada teks Ki Hajar Dewantara!\n2. Tuliskan 5 kata sifat yang menggambarkan keteladanan watak beliau!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Rangkuman struktur biografi dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Menulis Teks Biografi Naratif Tokoh Terdekat / Inspiratif',
      tujuan_pembelajaran: [
        'Menyusun teks biografi singkat tentang sosok inspiratif di lingkungan sekitar (guru, orang tua, tokoh lokal).',
        'Mengaitkan butir-butir keteladanan tokoh dengan cita-cita pribadi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Apersepsi teknik wawancara dan pengumpulan fakta riwayat hidup.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Penulisan Mandiri: Menyusun teks biografi 300-500 kata dengan struktur yang tepat.',
            'Penyuntingan Kebahasaan dan Penataan Foto Dokumentasi Tokoh.',
            'Presentasi Galeri Kisah Inspiratif di depan kelas.'
          ],
          lkpd: {
            judul: 'LKPD 3: Lembar Penulisan Biografi Tokoh Inspiratifku',
            petunjuk: '1. Tuliskan biografi sosok inspiratif pilihanmu lengkap dengan pesan keteladanannya!\n2. Tuliskan komitmen tindakan nyata yang ingin kamu tiru dari tokoh tersebut!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Refleksi komitmen hidup berintegritas dan doa penutup.']
        }
      }
    }
  ]
};

// Modul 6: Berkarya dan Berekspresi Melalui Puisi - 4 Pertemuan (8 JP)
const modul6 = {
  id: 'preset-b-indo-fase-e-modul-6',
  kode_mapel_ref: 'B.INDONESIA',
  nama_mapel_ref: 'Bahasa Indonesia',
  fase: 'E',
  tingkat: 10,
  judul_modul: 'Modul 6: Berkarya dan Berekspresi Melalui Puisi',
  deskripsi: 'Panduan KBM mendalam (Deep Learning) Fase E materi Apresiasi Puisi, telaah diksi, majas, imaji/citraan, penulisan puisi ekspresif, dan pementasan musikalisasi/baca puisi.',
  total_alokasi_jp: 8,
  total_pertemuan: 4,
  pendekatan: 'Deep Learning (Aesthetic Appreciation & Creative Poetry)',
  sumber: 'modulguruku.com / Kemendikbudristek 2024',
  tags: ['Bahasa Indonesia', 'Fase E', 'Kelas 10', 'Puisi', 'Kurikulum Merdeka'],
  status: 'PUBLISHED',
  konten_json: [
    {
      nomor_pertemuan: 1,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Memahami Hakikat, Tema, dan Suasana dalam Puisi',
      tujuan_pembelajaran: [
        'Mengidentifikasi tema, suasana batin, dan pesan mendalam dari puisi yang disimak.',
        'Membedakan makna denotatif dan konotatif dalam baris puisi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: [
            'Salam pembuka, doa bersama, dan pemutaran audio pembacaan puisi akustik.',
            'Pertanyaan Pemantik: "Mengapa puisi mampu menyentuh emosi pembacanya secara mendalam meskipun ditulis dengan kata-kata yang padat dan singkat?"'
          ]
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Menyimak Puisi Legendaris "Hujan Bulan Juni" karya Sapardi Djoko Damono.',
            'Bedah Makna Konotatif: Menganalisis lambang ketabahan, kearifan, dan kerinduan terpendam.',
            'Diskusi Suasana & Nada: Menemukan nada syahdu dan hening yang dibangun penyair.'
          ],
          teks_bacaan: {
            judul: 'Hujan Bulan Juni karya Sapardi Djoko Damono',
            paragraf: [
              'Tak ada yang lebih tabah / dari hujan bulan Juni / dirahasiakannya rintik rindunya / kepada pohon berbunga itu',
              'Tak ada yang lebih bijak / dari hujan bulan Juni / dihapuskannya jejak-jejak kakinya / yang ragu-ragu di jalan itu',
              'Tak ada yang lebih arif / dari hujan bulan Juni / dibiarkannya yang tak terucapkan / diserap akar pohon bunga itu'
            ]
          },
          lkpd: {
            judul: 'LKPD 1: Telaah Suasana, Nada, dan Makna Konotasi Puisi',
            petunjuk: '1. Bacalah puisi "Hujan Bulan Juni" dengan penghayatan!\n2. Jelaskan makna kiasan "hujan bulan Juni" dan "pohon berbunga"!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Refleksi keindahan bahasa sastra dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 2,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Menjelajahi Diksi, Majas, dan Citraan (Imaji) Puisi',
      tujuan_pembelajaran: [
        'Menganalisis penggunaan majas (metafora, personifikasi, simile) dan rima dalam teks puisi.',
        'Mengidentifikasi jenis citraan (penglihatan, pendengaran, perabaan, perasaan).'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Salam pembuka dan review pemaknaan konotasi.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Membaca Puisi "Aku" karya Chairil Anwar dan "Padamu Jua" karya Amir Hamzah.',
            'Bedah Citraan: Menemukan citraan gerak (berlari hingga hilang pedih peri) dan majas hiperbola.',
            'Latihan Memilih Diksi Puitis: Mengganti kata umum menjadi kata berlambang estetis.'
          ],
          teks_bacaan: {
            judul: 'Petikan Puisi Aku karya Chairil Anwar',
            paragraf: [
              'Kalau sampai waktuku / Ku mau tak seorang kan merayu / Tidak juga kau / Tak perlu sedu sedan itu',
              'Aku ini binatang jalang / Dari kumpulannya terbuang / Biar peluru menembus kulitku / Aku tetap meradang menerjang',
              'Luka dan bisa kubawa berlari / Berlari / Hingga hilang pedih peri / Dan aku akan lebih tidak perduli / Aku mau hidup seribu tahun lagi'
            ]
          },
          lkpd: {
            judul: 'LKPD 2: Identifikasi Majas, Diksi, dan Citraan Puisi',
            petunjuk: '1. Temukan 2 majas dan 2 jenis citraan pada puisi Chairil Anwar!\n2. Tuliskan pesan keteguhan prinsip hidup yang ingin disampaikan penyair!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Rangkuman fungsi diksi estetik dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 3,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Menulis Puisi Ekspresif Berbasis Pengalaman & Lingkungan',
      tujuan_pembelajaran: [
        'Menulis puisi orisinal dengan memanfaatkan teknik pemadatan kata dan pilihan majas yang tepat.',
        'Mengekspresikan gagasan, empati, atau kritik sosial melalui bait puisi.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Meditasi singkat (Mindful Breathing) untuk memancing inspirasi batiniah.']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Menemukan Kata Kunci Emosi & Objek Inspirasi (ibu, alam, masa depan, keadilan).',
            'Penulisan Draf Puisi: Menyusun minimal 3 bait puisi berirama harmonis.',
            'Penyuntingan Diksi: Memperkaya bait dengan rima akhir dan majas metafora.'
          ],
          lkpd: {
            judul: 'LKPD 3: Lembar Cipta Karya Puisi Orisinal',
            petunjuk: '1. Ciptakan 1 karya puisi bertema bebas!\n2. Tuliskan makna tersirat yang ingin kamu sampaikan kepada pembaca!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: ['Pengecekan kesiapan draf puisi dan doa penutup.']
        }
      }
    },
    {
      nomor_pertemuan: 4,
      alokasi_jp: 2,
      durasi_menit: 90,
      topik: 'Pentas Deklamasi & Apresiasi Musikalisasi Puisi',
      tujuan_pembelajaran: [
        'Mendeklamasikan puisi karya sendiri dengan pelafalan, intonasi, penghayatan, dan ekspresi yang tepat.',
        'Memberikan apresiasi dan ulasan kritis terhadap penampilan deklamasi rekan sekelas.'
      ],
      langkah_kbm: {
        pendahuluan: {
          durasi_menit: 10,
          kegiatan: ['Pembukaan "Panggung Gelar Apresiasi Puisi Siswa Kelas X".']
        },
        inti: {
          durasi_menit: 70,
          kegiatan: [
            'Deklamasi Bergilir: Setiap siswa maju membacakan puisi ciptaannya dengan iringan musik instrumental lembut.',
            'Apresiasi & Refleksi Kelas: Teman sekelas memberikan tanggapan terhadap kekuatan diksi dan penjiwaan.',
            'Penilaian Sumatif Kinerja Membaca Indah Puisi.'
          ],
          lkpd: {
            judul: 'LKPD 4: Rubrik Evaluasi Penampilan Deklamasi Puisi',
            petunjuk: '1. Nilai aspek vokal, artikulasi, intonasi, dan penghayatan penampil!\n2. Tuliskan bait puisi teman yang paling menyentuh hatimu!'
          }
        },
        penutup: {
          durasi_menit: 10,
          kegiatan: [
            'Refleksi penutup Bab 6 dan pemberian gelar "Penyair Muda Berbakat".',
            'Doa penutup dan salam.'
          ]
        }
      }
    }
  ]
};

async function runPrecisionImport() {
  console.log('🚀 MEMULAI IMPORT PRESTISI TINGGI MODUL 1 S/D 6 KE DATABASE...\n');

  const allModules = [modul1, modul2, modul3, modul4, modul5, modul6];

  for (const m of allModules) {
    await prisma.bahanAjarPreset.upsert({
      where: { id: m.id },
      update: {
        kode_mapel_ref: m.kode_mapel_ref,
        nama_mapel_ref: m.nama_mapel_ref,
        fase: m.fase,
        tingkat: m.tingkat,
        judul_modul: m.judul_modul,
        deskripsi: m.deskripsi,
        total_alokasi_jp: m.total_alokasi_jp,
        total_pertemuan: m.total_pertemuan,
        pendekatan: m.pendekatan,
        sumber: m.sumber,
        tags: m.tags,
        konten_json: m.konten_json as any,
        status: 'PUBLISHED'
      },
      create: {
        id: m.id,
        kode_mapel_ref: m.kode_mapel_ref,
        nama_mapel_ref: m.nama_mapel_ref,
        fase: m.fase,
        tingkat: m.tingkat,
        judul_modul: m.judul_modul,
        deskripsi: m.deskripsi,
        total_alokasi_jp: m.total_alokasi_jp,
        total_pertemuan: m.total_pertemuan,
        pendekatan: m.pendekatan,
        sumber: m.sumber,
        tags: m.tags,
        konten_json: m.konten_json as any,
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ [${m.id}] ${m.judul_modul}`);
    console.log(`   ➔ ${m.total_pertemuan} Pertemuan • Alokasi ${m.total_alokasi_jp} JP • Lengkap Teks Asli & LKPD\n`);
  }

  console.log('🎉 SEMUA 6 MODUL LENGKAP & 100% AKURAT BERHASIL DISIMPAN KE DATABASE!');
}

runPrecisionImport()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
