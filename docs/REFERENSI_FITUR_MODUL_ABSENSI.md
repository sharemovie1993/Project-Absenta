# 📚 KATALOG & REFERENSI FITUR: MODUL ABSENSI & PRESENSI KBM
## Platform Absenta.id — Panduan Fitur Utama & Fitur Pendukung

> **Tujuan Dokumen:**  
> Dokumen ini memuat pembedahan mendalam mengenai seluruh fitur di dalam **Modul Absensi (Smart Attendance & Session Propagation Module)** Platform Absenta. Disusun secara terstruktur, menggunakan bahasa yang sederhana, mudah dipahami pimpinan sekolah, dan siap disalin (*copy-paste*) ke dalam proposal resmi atau dokumen presentasi.

---

## 📌 APA ITU MODUL ABSENSI?
Modul Absensi adalah **sistem pengawasan kedisiplinan dan kehadiran dua lapis (Dual-Layer Attendance)** di SMKN 1 Plered:
1. **Lapisan 1 (Gerbang Depan):** Memastikan siswa dan guru benar-benar telah sampai di lingkungan sekolah sejak pagi.
2. **Lapisan 2 (Sesi KBM Kelas & Bengkel):** Memastikan siswa yang sudah masuk gerbang benar-benar mengikuti kegiatan belajar mengajar di ruang teori maupun bengkel praktik di setiap jam pergantian pelajaran.

Modul ini menghilangkan kebiasaan buruk "titip absen", fenomena "hadir pagi tapi raib siang", serta membebaskan guru dari rutinitas memanggil absen manual yang membuang waktu mengajar.

---

## 🌟 1. FITUR UTAMA (CORE FEATURES)
*Fitur inti wajib yang bekerja otomatis setiap hari untuk mengawal kedisiplinan siswa dan kehadiran mengajar guru.*

| No | Nama Fitur | Penjelasan Sederhana | Manfaat Nyata di Sekolah |
| :-: | :--- | :--- | :--- |
| **A** | **Presensi Gerbang Cepat (*High-Speed Gate In*)** | Siswa menempelkan kartu RFID / scan barcode di gerbang masuk dalam waktu < 0,5 detik tanpa sentuh (*contactless*). | Antrean pagi di gerbang tidak mengular ke jalan raya; jam kedatangan siswa tercatat akurat hingga satuan detik. |
| **B** | **Aliran Data Otomatis ke Jam Pelajaran (*KBM Auto-Propagation*)** | Siswa yang sudah tap di gerbang otomatis muncul dengan status "Hadir" di aplikasi HP guru yang mengajar di jam pertama, kedua, dan seterusnya. | Guru mapel tidak perlu memanggil 36 nama siswa satu per satu; guru cukup melihat bangku kosong selama 10 detik. |
| **C** | **Detektor Celah Bolos Antar-Jam KBM** | Sistem langsung memberi tanda merah jika ada siswa yang tercatat "Hadir di Gerbang Pagi", namun "Tidak Ada di Kelas/Bengkel pada Jam Pelajaran Siang". | Menutup total celah siswa yang kabur ke kantin, nongkrong di sudut sekolah, atau membolos setelah jam istirahat. |
| **D** | **Penguncian Sesi Otomatis (*Smart Lockout Session*)** | Jam pelajaran yang telah selesai otomatis terkunci (*read-only*) dan tidak bisa diedit sembarangan oleh siswa maupun guru. | Mencegah manipulasi absensi tanggal mundur atau rekayasa data kehadiran yang tidak sah; integritas data sekolah 100% terjaga. |
| **E** | **Monitoring Guru Mengajar Real-Time** | Menampilkan status kehadiran guru di setiap jam KBM: `Hadir Mengajar`, `Terlambat`, `Izin`, `Tugas Luar`, `Digantikan (Inval)`, atau `Alpa`. | Pimpinan sekolah dan Waka Kurikulum mengetahui kelas mana saja yang sedang ada gurunya dan kelas mana yang membutuhkan guru pengganti. |
| **F** | **Buku Jurnal Mengajar Digital Guru** | Saat menutup sesi absensi kelas, guru langsung mengisi materi pokok yang diajarkan, catatan kejadian kelas, dan melampirkan foto suasana belajar. | Menggantikan buku jurnal kertas kelas; laporan keterlaksanaan kurikulum otomatis tersusun rapi setiap hari. |
| **G** | **Presensi Kepulangan (*Gate Out Tracking*)** | Siswa melakukan tap kepulangan saat jam sekolah berakhir untuk mencatat waktu keluar gerbang secara sah. | Memastikan siswa tidak pulang sebelum bel akhir berbunyi dan memberi bukti waktu pulang yang valid bagi orang tua. |

---

## 🛠️ 2. FITUR TAMBAHAN & PENDUKUNG (SMART TOOLS)
*Alat bantu pintar untuk mendukung penanganan komplain, pengawasan lobi, dan rekapitulasi nilai sikap siswa.*

| No | Nama Fitur | Penjelasan Sederhana | Manfaat Nyata di Sekolah |
| :-: | :--- | :--- | :--- |
| **1** | **Layar TV Monitor Presensi Lobi (*Attendance TV Mode*)** | Layar TV di ruang lobi utama dan ruang piket yang menyiarkan secara langsung persentase kehadiran sekolah hari ini, daftar kelas lengkap, dan siswa yang terlambat. | Wajah sekolah tampak modern dan transparan di mata tamu dinas, pengawas, maupun orang tua yang berkunjung. |
| **2** | **Alur Koreksi Absensi Berjenjang (*Same-Day Override & Dispute SOP*)** | Jika siswa lupa bawa kartu atau alat terkendala, guru piket memiliki wewenang memverifikasi dan mengubah status siswa pada hari yang sama dengan catatan resmi. | Masalah presensi di lapangan selesai dengan cepat di meja piket tanpa harus mengganggu pihak manajemen sekolah. |
| **3** | **Peringatan Otomatis Guru Belum Buka Kelas (*Session Reminder*)** | Sistem otomatis mengirim pesan pengingat ke guru pengampu jika jam pelajaran sudah berjalan 10 menit namun guru belum membuka sesi kelas. | Mencegah kelas terbengkalai dan memastikan guru masuk kelas tepat waktu. |
| **4** | **Pencatat Kejadian Khusus & UKS (*Special Incidents*)** | Mencatat siswa yang mendadak sakit saat jam KBM dan dirawat di ruang UKS, sehingga statusnya otomatis berubah dari "Hadir di Kelas" menjadi "Izin di UKS". | Guru mapel tidak salah mencatat siswa alpa ketika siswa sebenarnya sedang dirawat oleh tim PMR/UKS. |
| **5** | **Surat Izin Keluar Gerbang Digital (*Dispensasi Ber-Barcode*)** | Siswa yang harus keluar gerbang (karena tugas lomba dinas atau urusan keluarga mendesak) dibekali tiket izin digital yang dapat di-scan oleh satpam gerbang. | Satpam memiliki pedoman pasti dan tidak ada siswa yang bisa menyelinap keluar gerbang dengan alasan izin palsu. |
| **6** | **Pelacak Jejak Siswa (*Student Timeline Tracking*)** | Riwayat pergerakan kehadiran siswa dalam satu hari: Masuk Gerbang (06.42) $\rightarrow$ Mapel 1 (07.05) $\rightarrow$ Bengkel Praktik (09.15) $\rightarrow$ Istirahat $\rightarrow$ Mapel 4 $\rightarrow$ Pulang (15.30). | Mempermudah Wali Kelas dan Guru BK mengidentifikasi di jam pelajaran mana seorang siswa mulai menghilang. |
| **7** | **Rekap Kehadiran Khusus per Mata Pelajaran** | Menghitung persentase kehadiran siswa khusus pada tiap-tiap mata pelajaran (misal: Kehadiran Matematika 95%, Kehadiran Praktik Otomotif 70%). | Menjadi dasar penilaian kehadiran objektif untuk syarat mengikuti Ujian Sumatif Akhir Semester dan nilai rapor. |
| **8** | **Presensi Kegiatan Non-KBM & Ekstrakurikuler** | Mencatat daftar hadir untuk kegiatan Upacara Bendera Senin, Senam Pagi, Sholat Berjamaah, serta kegiatan Ekstrakurikuler (Pramuka, Olahraga, Paskibra). | Pembinaan karakter di luar jam kelas terpantau lengkap dan nilai ekstrakurikuler di rapor memiliki bukti fisik. |
| **9** | **Pengawasan Status Alat Scanner (*Device Management*)** | Memantau apakah alat pembaca kartu RFID, tablet kiosk, atau kamera gerbang di tiap pos dalam status *Online* (aktif) atau *Offline* (terputus kabel/jaringan). | Teknisi sekolah dapat segera memperbaiki alat yang kendala sebelum jam kedatangan siswa dimulai. |
| **10**| **Pusat Cetak Berkas Rekapitulasi Ber-Kop Resmi** | Mencetak lembar rekap absensi bulanan per kelas, rekap kehadiran guru untuk tunjangan kinerja, dan blanko darurat ber-Kop resmi SMKN 1 Plered. | Menghemat waktu staf TU dalam menyiapkan laporan administrasi bulanan ke Kepala Sekolah dan Dinas Pendidikan. |
| **11**| **Notifikasi Kepastian untuk Orang Tua (*Notify System*)** | Kanal informasi otomatis yang mengirimkan kabar kedatangan dan kepulangan anak ke portal akun orang tua murid. | Meningkatkan kepercayaan orang tua terhadap keamanan dan pengawasan anak di SMKN 1 Plered. |
| **12**| **Perekaman Template Biometrik Wajah (*Face Template Backup*)** | Fitur cadangan untuk mengenali wajah siswa melalui kamera gawai jika suatu saat kartu pelajar fisik hilang atau tertinggal di rumah. | Siswa tetap bisa melakukan presensi sah tanpa alasan terhambat karena kartu fisik tertinggal. |

---

## 📋 3. VERSI RINGKAS UNTUK DIMASUKKAN KE PROPOSAL
*(Bagian di bawah ini bisa langsung Anda salin ke bab penjelasan fitur absensi pada lembar proposal untuk Kepala Sekolah)*

> ### Ringkasan Modul Absensi & Presensi KBM Platform Absenta
> 
> Modul Absensi menerapkan sistem pengawasan kehadiran dua lapis (*Dual-Layer System*) yang terintegrasi penuh antara gerbang sekolah dan ruang belajar:
> 
> 1. **Fondasi Utama:**
>    - **Presensi Gerbang Cepat (< 0,5 Detik):** Dukungan kartu RFID/Barcode, anti-antrean macet di gerbang pagi.
>    - **Propagasi Otomatis ke Jam KBM:** Siswa hadir gerbang otomatis masuk daftar hadir guru mapel; guru cukup verifikasi 10 detik.
>    - **Deteksi Otomatis Celah Bolos:** Menutup fenomena "hadir di gerbang pagi, hilang di jam pelajaran siang".
>    - **Penguncian Sesi (*Smart Lockout*):** Sesi KBM terkunci otomatis saat jam selesai guna mencegah manipulasi data susulan.
>    - **Pemantauan Guru Mengajar (*Live Teacher Locator*):** Status mengajar guru di tiap kelas terpantau transparan.
>    - **Buku Jurnal Mengajar Digital:** Pengisian materi pokok dan foto bukti KBM pengganti buku kertas.
>    - **Presensi Kepulangan Siswa:** Kepastian waktu pulang sekolah yang sah.
> 
> 2. **Otomasi & Nilai Tambah:**
>    - **TV Monitor Presensi Lobi:** Tampilan data kehadiran sekolah modern secara langsung (*live*).
>    - **SOP Koreksi Berjenjang di Meja Piket:** Penyelesaian komplain lupa kartu pada hari yang sama secara akuntabel.
>    - **Tiket Dispensasi Ber-Barcode:** Kontrol ketat izin keluar gerbang sekolah via pos satpam.
>    - **Pelacak Linimasa Siswa (*Student Timeline*):** Rekam jejak keberadaan siswa dari pagi sampai sore.
>    - **Rekap Kehadiran per Mata Pelajaran:** Perhitungan persentase kehadiran untuk syarat ujian dan rapor.
>    - **Presensi Kegiatan Non-KBM & Ekskul:** Pencatatan upacara, sholat berjamaah, dan kegiatan ekstrakurikuler.
>    - **Cetak Laporan Bulanan 1-Klik:** Format cetak resmi ber-Kop SMKN 1 Plered untuk arsip dinas.

---
*Dokumen ini disusun sebagai materi rujukan resmi Platform Absenta.*
