# DECISION LOG

2026-01: Single Database Multi-Tenant
- **Keputusan**: Menggunakan skema basis data tunggal dengan pemisahan field `tenant_id`.
- **Rasional**: Kemudahan pemeliharaan dan efisiensi biaya infrastruktur pada skala awal.

2026-02: Fastify over Express
- **Keputusan**: Migrasi engine web ke Fastify.
- **Rasional**: Performa throughput yang lebih tinggi dan dukungan native plugin/schema validation.

2026-03: Command Query Separation (CQS) for Core
- **Keputusan**: Implementasi pemisahan Command dan Query pada modul Siswa dan Guru.
- **Rasional**: Mengatasi kompleksitas logika bisnis yang terus bertambah pada entitas inti akademik.

2026-04: Hybrid Plan Sourcing
- **Keputusan**: Paket langganan (Plans) diresolusi dari License Server eksternal dengan fallback database lokal.
- **Rasional**: Sinkronisasi harga dan fitur terpusat lintas produk Absenta.

2026-05: Double-Entry Accounting Integration
- **Keputusan**: Setiap transaksi finansial di koperasi wajib menghasilkan jurnal otomatis di buku besar.
- **Rasional**: Menjamin akurasi neraca keuangan tenant dan transparansi SHU.

2026-06: Parent App Stateless Token
- **Keputusan**: Menggunakan token akses independen untuk aplikasi orang tua.
- **Rasional**: Keamanan isolasi antara akses administratif sekolah dan akses pantauan wali murid.

2026-07: Built-in Multi-Tenant WhatsApp Gateway (Baileys)
- **Keputusan**: Mengimplementasikan gateway WhatsApp langsung di dalam backend menggunakan library `@whiskeysockets/baileys` dengan pola pool koneksi dinamis per tenant.
- **Rasional**: Menekan biaya operasional pihak ketiga untuk tenant dan memberikan fleksibilitas penuh untuk integrasi notifikasi kehadiran serta BK.

2026-07: Multi-Driver Storage Service
- **Keputusan**: Mendukung AWS S3 / S3-compatible cloud storage sebagai driver penyimpanan umum platform berdampingan dengan Local Disk.
- **Rasional**: Skalabilitas penyimpanan berkas statis (seperti invoice PDF, unggahan siswa/guru) pada lingkungan cloud.

2026-07: Centralized Zod Validation Layer
- **Keputusan**: Mengimplementasikan layer validasi input terpusat menggunakan Zod schema pada seluruh core submodul di modul Academic dan Attendance.
- **Rasional**: Menjamin type-safety dan mencegah data kotor (*junk data*) masuk ke database, serta menyelaraskan penanganan error validasi HTTP secara konsisten di tingkat Controller.

2026-07: Real-time HUBIN Activity Monitoring & Zod Layer
- **Keputusan**: Mengintegrasikan pemancaran log aktivitas HUBIN secara real-time via Redis Pub/Sub dan Socket.IO ke room tenant, serta menerapkan skema validasi Zod untuk Mitra Industri dan Penempatan PKL.
- **Rasional**: Memberikan feedback instan pada dashboard admin sekolah (tenant) terhadap aktivitas HUBIN, serta menjaga integritas data penempatan PKL dan profil kemitraan industri.

2026-07: Centralized License Server Integration for Billing
- **Keputusan**: Mendelegasikan sepenuhnya data Invoice, Payment, dan siklus penagihan berkala ke License Server pusat, serta mem-proxy query pencarian invoice/pembayaran lokal dan memperketat validasi webhook sinkronisasi dengan Zod.
- **Rasional**: Menghindari kompleksitas pengelolaan data finansial dan payment gateway secara lokal di setiap instans platform/tenant, menyelaraskan state langganan secara andal melalui push webhook, serta menjaga integritas data callback.

2026-07: BPBK Calendar Integration, Dynamic EWS Weights, and AI Pattern Classifier
- **Keputusan**: Mengimplementasikan endpoint kalender BK terpadu (menggabungkan Pemanggilan Orang Tua dan Home Visit), menyimpan bobot parameter EWS kustom per tenant di tabel `Config` lokal tanpa migrasi DB, serta memperkenalkan mesin klasifikasi Pola Kasus AI sederhana (built-in statistik heuristik/regresi) untuk deteksi dini risiko siswa.
- **Rasional**: Memberikan visualisasi jadwal yang terintegrasi bagi guru BK, fleksibilitas kebijakan bobot risiko bagi masing-masing sekolah, serta deteksi preventif terhadap gejala penarikan diri (withdrawal) atau perilaku disruptif secara aman dan privat tanpa memanggil LLM eksternal.

2026-07: SARPRAS Zod Validation Layer & PDF QR Label Generator
- **Keputusan**: Mengimplementasikan layer validasi skema Zod terpusat pada seluruh endpoint modul inventaris/SARPRAS (Aset, Kategori, Lokasi, Peminjaman, Perbaikan) serta menyediakan generator label QR code PDF terintegrasi berbasis Puppeteer.
- **Rasional**: Mencegah data kotor masuk ke logistik dan inventori sekolah, serta memberikan kemudahan cetak label QR code fisik untuk kemudahan pemindaian inventaris ruang secara cepat.

2026-07: SARPRAS Overdue WA Notification, straight-line Depreciation Report, and Consumables Tracker
- **Keputusan**: Mengimplementasikan background cron job `sarprasOverdueReminder` untuk notifikasi jatuh tempo WhatsApp harian bagi peminjam aset, menyusun algoritma depresiasi metode garis lurus (Straight-line) dinamis per kategori barang, serta membuat sub-modul barang habis pakai (Consumables) lengkap dengan alert stok minimum berbasis Config DB tenant.
- **Rasional**: Menekan tingkat keterlambatan pengembalian inventori sekolah secara proaktif, menyajikan laporan depresiasi nilai buku aset untuk pelaporan TU, dan mencegah kehabisan stok barang operasional vital secara otomatis.

2026-07: SARPRAS Real-Time Dashboard Monitoring
- **Keputusan**: Mengimplementasikan endpoint `GET /assets/dashboard/realtime` untuk visualisasi instan status aset/perbaikan per ruangan, serta memancarkan event `sarpras_dashboard_update` secara real-time via Redis Pub/Sub ke client Socket.IO saat aset atau perbaikan mengalami modifikasi.
- **Rasional**: Memastikan guru logistik dan manajemen sekolah mendapatkan visibilitas instan atas status ketersediaan barang dan kemajuan perbaikan fisik tanpa perlu memuat ulang halaman secara manual.

2026-07: SARPRAS Low-Priority Features (Mobile Scanner, Stock Opname, Repairs Calendar, and Damage Photos)
- **Keputusan**: Melakukan sinkronisasi database untuk menyertakan field `foto_kerusakan` pada model `SarprasAssetRepair`, membuat endpoint scanner `GET /assets/scan/:code` dan stock opname `POST /assets/opname` untuk integrasi barcode/QR seluler, serta menambahkan query kalender perbaikan `GET /repairs/calendar`.
- **Rasional**: Membuka jalan bagi integrasi aplikasi seluler inventaris sekolah untuk stock opname mandiri dan pencatatan bukti fisik kerusakan barang secara langsung.

2026-07: Reporting Engine PDF Generator
- **Keputusan**: Membuat file generator PDF `pdf-generator.service.ts` terpisah untuk me-render HTML ke PDF menggunakan Puppeteer secara headless. Mendukung 3 jenis dokumen standar: Sertifikat Siswa, Invoice Tagihan Lisensi Pusat, dan Hasil Supervisi Akademik Guru.
- **Rasional**: Menyediakan antarmuka cetak laporan resmi berpenampilan premium, terstandardisasi, dan ramah cetak fisik secara instan.

2026-07: Kurikulum Zod Validation Layer
- **Keputusan**: Mengimplementasikan layer validasi payload menggunakan Zod pada modul Kurikulum, memvalidasi input Struktur Kurikulum (`StrukturKurikulum`) dan Supervisi Guru (`SupervisiGuru`). Mengintegrasikan penanganan `ZodError` untuk mengembalikan respons HTTP 400.
- **Rasional**: Mencegah masuknya data kotor (seperti tingkat kelas atau nilai supervisi di luar rentang valid) sebelum masuk ke database relasional Prisma.

2026-07: Academic Validation Layer Sweep
- **Keputusan**: Melakukan audit dan menambahkan layer validasi Zod untuk seluruh sub-modul Academic yang tersisa, yaitu Wali Kelas, Kenaikan Kelas & Transisi, Struktur Organisasi, serta Student Card Config.
- **Rasional**: Memastikan 100% data payload masuk pada level Academic divalidasi dan ditranslasikan dengan aman (mengonversi null ke undefined), menghapuskan potensi adanya data kotor pada modul inti sekolah.

2026-07: Kesiswaan Validation Layer Sweep
- **Keputusan**: Mengimplementasikan layer validasi payload menggunakan Zod pada modul Kesiswaan untuk sub-modul Pelanggaran, Prestasi, dan Piket (Izin Keluar Siswa).
- **Rasional**: Menjamin integritas data masukan poin pelanggaran/prestasi dan perizinan keluar siswa secara ketat pada layer HTTP controller, mencegah type-mismatch atau data kotor masuk ke database Prisma.

2026-07: Billing Resiliency and Licensing Server Dynamic Queries
- **Keputusan**: Mendelegasikan query data billing/invoicing sepenuhnya ke Server Lisensi pusat (axios) secara dinamis, mengamankan callback webhook lisensi dengan HMAC-SHA256 signature verification, menerapkan 7-day grace period fallback untuk validasi subscription lokal, langsung meng-invalidate cache fitur setelah sync, dan mendaftarkan cron job `licensePullSync` mingguan.
- **Rasional**: Mencegah data tagihan lokal mengalami desinkronisasi atau pemalsuan callback webhook (spoofing), memastikan hak akses fitur baru ter-apply instan tanpa menunggu TTL redis berakhir, serta menyediakan pull fallback jika push webhook sempat gagal.

2026-07: Cooperative ERP Validation Layer Sweep
- **Keputusan**: Mengimplementasikan layer validasi payload menggunakan Zod pada modul Koperasi (Cooperative ERP) untuk sub-modul Pinjaman, Simpanan, Kategori Simpanan, Toko/POS, Opname, RFID Payment, dan PPOB.
- **Rasional**: Menjamin integritas data transaksi keuangan koperasi, pembelian retail POS toko, validasi saldo simpanan, rujukan rfid, dan pencatatan PPOB secara ketat pada layer HTTP Fastify routes, menapis input data kotor sebelum diproses oleh database Prisma dan accounting double-entry journaling.

2026-07: Event Gateway & Push Notifications (Fase 5)
- **Keputusan**: Menghubungkan kalkulasi EWS (Early Warning System) dengan system notifikasi in-app kepada guru BK, membuat model dan API whistleblower perundungan anonim (`BullyingReport`), dan mengimplementasikan batch offline sync logbook PKL Hubin beserta kalkulasi geofencing radius area PKL.
- **Rasional**: Memastikan guru BK sigap dalam pencegahan dini kasus siswa berisiko tinggi, memberikan jalur pengaduan perundungan yang aman dan anonim, serta memfasilitasi logbook dan absensi siswa PKL di area minim sinyal tanpa kehilangan kepatuhan geofencing.

2026-07: Wildcard Fallback & SSL Error Prevention in Central License Server Caddyfile
- **Keputusan**: Mengonfigurasi blok tangkapan wildcard `*.absenta.id` pada Caddyfile server lisensi pusat yang menunjuk langsung ke berkas sertifikat wildcard (`wildcard_.absenta.id.crt` dan `.key`), serta menyaring aset statis menggunakan pencocokan `@notAssets` agar tidak terpengaruh oleh rewrite ke `blocked.html`.
- **Rasional**: Mencegah kegagalan jabat tangan SSL (`ERR_SSL_PROTOCOL_ERROR`) saat subdomain sekolah (tenant) yang belum memiliki tunnel aktif diakses secara publik melalui internet, serta memastikan file CSS/JS statis pada halaman pemblokiran dapat termuat secara normal.

2026-07: Dynamic Wildcard Certificate Mapping on download-ssl API
- **Keputusan**: Memperbarui endpoint `/api/public/download-ssl` pada Server Lisensi agar mendeteksi permintaan domain tenant secara dinamis dan menyajikan berkas sertifikat wildcard `wildcard_.absenta.id` yang tersimpan pada penyimpanan internal Caddy.
- **Rasional**: Menghilangkan error sertifikat tidak valid (`NET::ERR_CERT_COMMON_NAME_INVALID`) pada server lokal target karena sebelumnya server lisensi secara kaku menyajikan sertifikat non-wildcard domain utama.

2026-07: Non-Technical GUI Wizard Deployer UX Overhaul
- **Keputusan**: Merestrukturisasi istilah jargon teknis (seperti "Deployment Scenario", "Target OS", "Database URL") pada GUI Wizard menjadi bahasa awam (seperti "Registrasi Server & Pasang Platform", "Pilih Server", "Mode Akses", "Penyimpanan", "Pemeriksaan"), serta menambahkan panduan pasca-instalasi yang detail (konfigurasi DNS Static di router Mikrotik sekolah dan inisialisasi menu Daftar Sekolah).
- **Rasional**: Mempermudah operator sekolah dan teknisi awam memahami alur instalasi, serta memberikan kejelasan batas operasional jaringan lokal intranet dengan akses publik Easy Tunnel.

2026-07: PM2 and Caddy Stopping prior to Remote Redeployment (Resiliency)
- **Keputusan**: Memasukkan perintah `pm2 kill || true` and `systemctl stop caddy || true` di awal Fase 2 pada skrip deployment remote (`deploy-absenta-remote.ps1`).
- **Rasional**: Membebaskan memori server, kunci berkas (*file locks*) pada modul node, dan port `80/443` sebelum proses penarikan git, instalasi dependensi, dan kompilasi proyek dimulai kembali, menghindari kegagalan kompilasi akibat file sedang sibuk.

2026-07: BPBK Premium Gating Integration
- **Keputusan**: Mengubah status modul BP/BK (Bimbingan Konseling) menjadi modul premium, menetapkan struktur lisensi berbayar setara dengan modul SARPRAS (Micro, Small, Medium, Large, Enterprise), dan menerapkan banner uji coba/gating (`PremiumFeatureGate`) pada seluruh 12 halaman frontend modul BPBK.
- **Rasional**: Meningkatkan monetisasi produk dengan mengonversi fitur BPBK menjadi premium, sembari mempertahankan fleksibilitas akses trial (maksimal penyimpanan 10 data kasus di tingkat backend) agar tenant dapat mencoba sebelum berlangganan.

2026-07: Relocation of Academic History & Deletion of Class Division Menu
- **Keputusan**: Memindahkan visual tombol aksi Riwayat Akademik siswa (modal `SiswaHistory`) langsung ke halaman utama list Data Siswa (`SiswaPage.tsx`), menghapus route & halaman fisik `RegistrasiSiswaPage.tsx`, serta menghapus menu navigasi seeder "Pembagian Kelas" (`/academic/registrasi-siswa`).
- **Rasional**: Operasional pembagian kelas akademik (ke tabel `SiswaAkademik`) sudah 100% ditangani secara otomatis (Auto-Sync) di backend saat penambahan profil siswa baru, import excel, maupun saat eksekusi Kenaikan Kelas (Transition). Pemindahan aksi riwayat ke menu utama Data Siswa meniadakan redundansi menu yang membingungkan admin sekolah, sekaligus merampingkan antarmuka sistem.

2026-07: Integrated Bulk Actions for Mutation & Graduation
- **Keputusan**: Mengintegrasikan antarmuka Mutasi Massal dan Kelulusan Massal langsung ke dalam Toolbar Aksi Terpilih di halaman utama Data Siswa (`SiswaList.tsx`), serta menghapus rute navigasi `/academic/mutation` dan menu sidebar terkait.
- **Rasional**: Mempermudah admin sekolah dalam mengelola transisi status akademik siswa secara langsung dari daftar siswa utama tanpa perlu membuka menu khusus, serta menyederhanakan arsitektur navigasi.

2026-07: Student Account Status & Security Business Rules
- **Keputusan**: Menerapkan aturan otomatisasi pembekuan akun login siswa (`User.status = INACTIVE`) saat status akademiknya diubah menjadi mutasi keluar (seperti `PINDAH`, `KELUAR`, `DO`). Namun, akun siswa dengan status `AKTIF` dan `LULUS` (Alumni) tetap dipertahankan aktif (`ACTIVE`).
- **Rasional**: Mencegah potensi celah keamanan akses platform dari mantan siswa yang sudah keluar, sembari memastikan alumni tetap memiliki hak akses login untuk kebutuhan pelacakan lulusan pada modul HUBIN Tracer Study.

2026-07: Clear Separation of Global Notifications & Attendance Feed
- **Keputusan**: Memisahkan tanggung jawab hook `useNotifications.ts` agar hanya mem-poll endpoint `/api/notifications/my` untuk notifikasi/alert sistem global. Menghapus semua chain query transaksional absensi (seperti status sesi belajar harian/mingguan dan alert guru) dari hook global tersebut.
- **Rasional**: Mengurangi beban query database (database overhead) secara masif akibat polling berkelanjutan dari client (khususnya akun Guru/Admin), serta mencegah kegagalan pemuatan notifikasi global akibat terhalang oleh *subscription check* modul Absensi.

2026-07: Public DNS Resolution & Deployment Scenario Adaptability
- **Keputusan**: Mengimplementasikan resolusi DNS publik menggunakan `dns.promises.Resolver` dengan konfigurasi server DNS terpercaya (`1.1.1.1` dan `8.8.8.8`) di backend untuk mendeteksi IP publik Server Lisensi asli secara dinamis, menyelaraskan penamaan penentu mode deployment dari `deploy_mode` menjadi `deploy_scenario` sesuai dengan variabel `.env` (`DEPLOY_SCENARIO` / `VITE_DEPLOY_SCENARIO`) yang ditulis oleh skrip installer (`saas` / `hybrid`), serta menyembunyikan/menampilkan kartu Custom Domain di frontend berdasarkan status keaktifan Easy Tunnel.
- **Rasional**: Menghindari kesalahan resolusi domain utama sekolah (split-brain DNS) pada jaringan lokal yang menghasilkan IP intranet lokal (`10.10.10.99`) alih-alih IP publik server lisensi (`103.196.155.87`), meniadakan inkonsistensi penamaan variabel yang dapat menghentikan fungsi kondisional tab Akses Online, serta meminimalkan kebingungan admin sekolah dengan menyembunyikan instruksi konfigurasi domain sebelum tunnel terverifikasi aktif.

2026-07: Kurikulum & Jadwal Gap Optimization and Assessment Database Schema
- **Keputusan**: 
  1. Menutup gap pada API Struktur Kurikulum dengan mengekspos endpoint `GET /grouped` serta memperketat keamanan (RBAC) seluruh rute struktur kurikulum menggunakan middleware `requireCapability('academic.structure.manage')`.
  2. Mengintegrasikan logika **Max Hours Guard** (maksimal mengajar guru 8 JP / 360 menit per hari) langsung di dalam `JadwalValidationService` serta mengekspos API validasi konflik jadwal via endpoint `POST /api/jadwal/validate` dengan pengaman `requireCapability('academic.manage.kbm')`.
  3. Mengimplementasikan 4 tabel model baru di database (`Kkmp`, `JenisNilaiMaster`, `NilaiSiswa`, dan `RaporSiswa`) ke dalam file `schema.prisma` dan menyelaraskannya secara instan ke database PostgreSQL menggunakan `prisma db push`.
- **Rasional**: Meningkatkan keamanan data kurikulum dari modifikasi tanpa izin, menyempurnakan otomatisasi validasi beban mengajar guru (mencegah kelelahan mengajar guru dan jadwal tumpang tindih), serta meletakkan fondasi model data yang andal untuk modul penilaian akademik dan e-Rapor yang akan dibangun ke depan.

2026-07: WhatsApp Chatbot Modular Architecture & Finite State Machine (FSM) Engine
- **Keputusan**: Mengubah struktur modul WhatsApp Chatbot dari pola *monolithic handler* (`wa-chatbot-commands.ts`) menjadi arsitektur modular berbasis **Command Registry, Dynamic Context, dan Finite State Machine (FSM)** di folder `src/modules/whatsapp/chatbot/`. Menyiapkan handler terpisah per domain (`handlers/guru/`, `handlers/siswa/`, `handlers/ortu/`, `handlers/common/`) serta menyusun dokumen arsitektur teknis `chatbot-architecture.md`.
- **Rasional**: Menyiapkan fondasi sistem chatbot agar mampu mengakomodasi puluhan fitur/layanan sekolah baru di masa depan secara rapi, memisahkan logika sesi dialog interaktif (*form multi-step*) agar bebas dari efek samping (*regression free*), serta memberikan kejelasan standar pengembangan (*3-step guide*) bagi pengembang platform.

2026-07: Advanced Assessment Modules & KBM Direct Relation (UKK, SKL, Leger, & Sesi KBM Link)
- **Keputusan**:
  1. Menambahkan model database `SertifikatUkk`, `KelulusanSiswa`, `P5Projek`, dan `P5NilaiSiswa` ke `schema.prisma` dan menyinkronkannya ke PostgreSQL via `npx prisma db push`.
  2. Membangun REST API lengkap untuk pengisian Rapor Siswa, rekapitulasi data Leger Nilai Kelas (mendukung perhitungan total, rata-rata, dan ranking kelas otomatis), serta sertifikat UKK dan SKL.
  3. Mengimplementasikan e-Rapor Kemendikbud Excel Export Engine berbasis biner (`xlsx`) yang secara dinamis menyusun matriks nilai dan deskripsi capaian kompetensi sesuai interval KKM.
  4. Menambahkan field **`sesi_absensi_id`** pada model `NilaiSiswa` untuk menghubungkan perolehan nilai harian siswa secara langsung dengan jurnal harian mengajar (`SesiAbsensi` / `ProgresMateri`) guru.
  5. Membangun Excel Import Engine untuk mempermudah guru mengentri nilai massal secara offline.
  6. Mengimplementasikan cetakan dokumen PDF premium untuk e-Rapor, SKL, UKK, dan PKL menggunakan Puppeteer.
  7. Membangun modul Projek P5 untuk merekam penilaian profil pelajar Pancasila Kurikulum Merdeka.
- **Rasional**: Melengkapi seluruh modul akhir masa pendidikan sekolah umum & kejuruan (SMK) di backend, memudahkan Tata Usaha (TU) mengarsipkan leger kelas dan mencetak SKL, serta menyatukan data absensi, jurnal KBM harian, dan nilai harian menjadi satu alur integrasi hulu-ke-hilir yang padu.
2026-07: Decoupling Modul Rapor dari Kurikulum
- **Keputusan**: Memisahkan modul Rapor sepenuhnya dari modul Kurikulum di tingkat backend (di bawah prefiks baru `/api/rapor`) dan frontend. Seluruh file penilaian, leger kelas, projek P5, dan dokumen kelulusan dikelompokkan di dalam folder modul tersendiri.
- **Rasional**: Menyelaraskan arsitektur backend dengan antarmuka frontend (sesuai mockup dashboard menu "Rapor"). Meminimalkan overhead dan memisahkan isolasi concern antara modul master setup akademik kurikulum dengan data transaksi nilai/rapor harian siswa.

2026-07: Modul RPP & Perangkat Ajar (Kurikulum)
- **Keputusan**: Menambahkan model database `PerangkatAjar` untuk mengarsipkan berkas RPP/Modul Ajar guru, membangun REST API upload/review berhak-akses (capability guarded), serta menyediakan antarmuka terintegrasi `PerangkatAjarPage.tsx` di frontend.
- **Rasional**: Menyelesaikan gap backlog untuk repositori administrasi persiapan mengajar guru serta proses penjaminan mutu pengajaran oleh Wakasek Kurikulum sekolah.

2026-07: Global Presets, 2-Step Wizard & Adaptive School Levels (useJenjang)
- **Keputusan**:
  1. Menambahkan model `GlobalProgramPreset` dan `GlobalJurusanPreset` di database schema, serta memuat seeder standar nasional program/konsentrasi kejuruan untuk superadmin.
  2. Merancang ulang modul "Tambah Massal Jurusan" menjadi alur 2 langkah (Langkah 1: Pilih Program Keahlian, Langkah 2: Pilih Jurusan spesifik terfilter) dengan auto-checklist default.
  3. Mengubah properti `jurusan_id` di model `Kelas` database menjadi opsional (nullable), serta secara dinamis menyembunyikan kolom, filter pencarian, form input pilihan Jurusan di CRUD kelas, dan menu navigasi Jurusan di sidebar bagi sekolah dengan jenjang SD/MI/SMP/MTs.
- **Rasional**: Menyediakan preset referensi data nasional program keahlian secara global dari level platform untuk kemudahan tenant sekolah, menyederhanakan alur pemilihan wizard bagi admin sekolah, serta memfasilitasi sekolah dasar dan menengah pertama (SD/SMP) agar platform dapat digunakan secara relevan tanpa memaksakan struktur penjurusan SMK/SMA.

2026-07: Hardware Telemetry and Automated Specification Diagnostics
- **Keputusan**: Mengintegrasikan utilitas pengambil spesifikasi hardware (CPU model & core, RAM total, dan disk space utama) ke dalam payload heartbeat telemetri (`osType`) yang dikirim dari klien Easy Tunnel dan backend Absenta ke server lisensi pusat (`https://api.absenta.id`).
- **Rasional**: Memungkinkan dasbor admin pusat memantau kelayakan hardware mesin lokal/SaaS klien secara real-time tanpa perlu menambahkan skema kolom database baru di VPS atau melakukan perubahan yang merusak kompatibilitas data. Penggunaan parsing visual dinamis di sisi frontend memisahkan rincian hardware tersebut secara transparan.

2026-07: Scoped Class Uniqueness and PPDB Calon Students with Bulk Rombel Mapping
- **Keputusan**:
  1. Mengubah uniqueness constraint Kelas dari tingkat-only menjadi `tenant_id + nama_kelas + tingkat + jurusan_id`, mengizinkan duplikasi nama kelas antar jurusan.
  2. Mengubah field `kelas_id` di model `Siswa` menjadi nullable (`String?`), menambahkan field `jurusan_id` (nullable) langsung di model `Siswa` untuk menampung data jurusan siswa calon PPDB berstatus `CALON`.
  3. Membangun API bulk-mapping `POST /siswa/ppdb/map` untuk memetakan siswa `CALON` ke rombel dengan mengaktifkannya (`status = AKTIF`), mengisi `kelas_id`, `tahun_pelajaran_id`, `semester_id` yang aktif, dan menulis data registrasi ke `SiswaAkademik`.
  4. Merancang antarmuka terintegrasi Pemetaan PPDB di frontend pada rute `/academic/ppdb-mapping` untuk memfasilitasi bulk mapping tersebut.
- **Rasional**: Memenuhi kebutuhan realistis sekolah kejuruan (SMK) yang memiliki kelas dengan nama sama lintas jurusan, memfasilitasi administrasi siswa baru dari jalur PPDB sebelum penentuan rombel secara efisien tanpa membuat data sampah (dummy classes), dan memastikan siklus hidup data akademik siswa (SiswaAkademik) tetap konsisten.

2026-07: Resilient Cascade Delete and Sequential Raw SQL Transaction for Siswa with Order-Based NIS Generation Wizard
- **Keputusan**:
  1. Mengoptimalkan query `deleteAllSiswa` dari chained ORM `deleteMany` lambat menjadi satu transaksi PostgreSQL tunggal (`$transaction` dengan batas waktu 2 menit) menggunakan raw SQL `$executeRawUnsafe` yang secara eksplisit menghapus data relasi berurutan dari 12 tabel (khususnya tabel `AsesmenSiswa`, `AbsenGerbangSiswa`, dan `AbsenSiswa` berdasarkan `siswa_akademik_id` serta `siswa_id`).
  2. Mengalihkan alur generate NIS resmi dari otomatis saat pemetaan kelas PPDB menjadi proses manual di halaman siswa setelah kelas stabil (sesuai masukan pengguna).
  3. Membangun **Wizard Generate NIS Massal (3-Step)** di frontend dan endpoint preview/eksekusi di backend untuk memetakan NIS secara teratur berurutan: Jurusan (A→Z) → Tingkat Kelas (10→11→12) → Nama Rombel (e.g. X TKJ 1 sebelum X TKJ 2) → Nama Siswa (A→Z) serta mendukung pengaturan urutan kelas manual (drag & drop/urutkan via tombol) oleh operator.
- **Rasional**: Mencegah kegagalan *foreign key constraint* (violation) dan *timeout* HTTP request saat melakukan penghapusan massal data siswa, serta memberikan kendali penuh kepada staf Tata Usaha untuk mengatur nomor induk siswa secara terurut dan valid sesuai standar penomoran registrasi sekolah.

2026-07: Pemisahan Domain Capability Jadwal — `academic.schedules` & `kesiswaan.schedules`
- **Keputusan**: Memecah capability domain `attendance.schedules.*` menjadi dua domain baru yang lebih mencerminkan kepemilikan modul:
  1. `academic.schedules.*` (view.list, create, update, delete, manage) → untuk **Jadwal KBM** di bawah Modul Kurikulum (`/api/kurikulum/jadwal`).
  2. `kesiswaan.schedules.*` (view.list, create, update, delete) → untuk **Jadwal Kegiatan / Eskul** di bawah Modul Kesiswaan (`/api/kesiswaan/jadwal-kegiatan`).
- **Rasional**: Capability `attendance.schedules.*` sebelumnya digunakan oleh dua fitur berbeda domain (Jadwal KBM & Jadwal Kegiatan) yang keduanya tidak termasuk dalam modul Absensi berbayar. Pemisahan ini membuat authorization lebih mudah di-audit, mencegah kebocoran lisensi, dan memastikan posisi RBAC jabatan (seperti Wakasek Kesiswaan vs Wakasek Kurikulum) dapat diberi akses yang presisi tanpa overlap.
- **Dampak Teknis**:
  - 9 capability baru ditambahkan ke `docs/action_catalog.md` (catalog canonical).
  - `src/config/position-capabilities.ts` diperbarui untuk KURIKULUM, KESISWAAN, WALIKELAS, PETUGAS_KELAS, PEMBINA_ESKUL, HUBIN.
  - `src/database/seeds/seed_policies.ts` diperbarui: ADMIN, GURU, SISWA baseline, dan whitelist `ensureNoOrganizationalInBaseline`.
  - Seluruh route guards di `jadwal-kbm.routes.ts`, `jadwal-kegiatan.routes.ts`, `anggota-kegiatan-eskul.routes.ts`, `pembina-kegiatan-eskul.routes.ts` diperbarui.
  - Frontend: `App.tsx`, `JadwalKBMList.tsx`, `JadwalPelajaranPage.tsx`, `PetugasRoute.tsx`, `AttendanceOpsPage.tsx` diperbarui.
  - Catalog permission: 433 → **442 permissions**.

2026-07: Migrasi Jadwal Kegiatan ke Namespace Kesiswaan (Gratis)
- **Keputusan**: Memindahkan registrasi rute API Jadwal Kegiatan dari modul Attendance (`plugin.ts`, prefix `/api/attendance/jadwal-kegiatan`) ke router utama (`infra/router.ts`, prefix `/api/kesiswaan/jadwal-kegiatan`).
- **Rasional**: Jadwal Kegiatan Eskul/Pembiasaan adalah fitur operasional Kesiswaan, bukan fitur inti Absensi berbayar. Penempatan di bawah namespace `/api/attendance/...` sebelumnya menyebabkan fitur ini ikut terkunci oleh `subscription.guard.ts` yang memvalidasi lisensi modul `ABSENSI`. Dengan memindahkannya ke `/api/kesiswaan/...`, guard lisensi otomatis dilewati karena namespace tersebut dikecualikan dari pengecekan subscription berbayar.
- **Dampak Teknis**:
  - `src/infra/router.ts` → registrasi baru `/kesiswaan/jadwal-kegiatan`.
  - `src/modules/attendance/plugin.ts` → hapus registrasi lama.
  - `src/database/seeds/seed.ts` → menu "Jadwal Kegiatan" ditambahkan ke children sidebar KESISWAAN.
  - Frontend: `jadwalKegiatan.api.ts` endpoint diubah, `JadwalKegiatanPage.tsx` `isLocked=false` & `moduleName='KESISWAAN'`, `App.tsx` route dipindah ke `/kesiswaan/jadwal-kegiatan`.

2026-07: Component-Level RBAC Hardening, Dynamic Lock States & Graceful Dashboard Gating
- **Keputusan**:
  1. Menerapkan proteksi antarmuka (UI) berbasis kapabilitas di tingkat komponen (*Component-Level RBAC*) untuk halaman Struktur Kurikulum (`MasterStrukturPage` & `StrukturKurikulumTable`) dan Pengaturan Jam KBM (`JamKBMPage` & panel sub-komponennya) dengan memanfaatkan properti `readOnly`. Jika pengguna tidak memegang hak manajer (`academic.manage.academic` / `academic.schedules.manage`), antarmuka akan menonaktifkan input waktu, menyembunyikan kotak centang pengeditan, serta menghilangkan tombol simpan/tambah/hapus.
  2. Mengimplementasikan pemuatan widget terisolasi (*Fail-safe Widget Loading*) pada **Dashboard Kurikulum** (`Dashboard.tsx` & `DashboardComponents.tsx`) dengan membatasi kueri supervisi (`enabled: hasSupervisiAccess`) dan menampilkan widget *Lock Screen* lokal pada modul Progress Supervisi bagi peran seperti `TU_KEPEGAWAIAN` yang tidak memegang hak supervisi. Langkah ini mencegah terjadinya pemblokiran akses global (403 Forbidden screen) pada halaman dashboard.
  3. Mengubah mekanisme pengurutan menu lintas modul (*Cross-Module Navigation*) pada komponen navigasi utama (`Sidebar.tsx`) dari pengurutan alfabetis/kustom menjadi pewarisan langsung dari urutan *canonical* basis data (`order` dari seeder menu), guna mempertahankan alur logis pengisian data master (Struktur -> Guru Mapel -> Kalender -> Jam KBM -> Jadwal).
- **Rasional**: Memastikan penerapan prinsip *Least Privilege* dan *Separation of Duties* secara konsisten tanpa merusak pengalaman pengguna (UX) dengan memblokir halaman secara keseluruhan, serta menjaga agar alur pengisian data akademik tetap intuitif dan teratur bagi seluruh peran administrasi sekolah.

2026-08: Unified Staff Dashboard — Portal App Launcher Mode & Dual Mode Architecture
- **Keputusan**:
  1. Mengimplementasikan **Dual Mode Dashboard** pada `UnifiedStaffDashboard.tsx` dengan dua mode tampilan yang dapat di-toggle:
     - **Mode Portal Apps 📱**: Tampilan grid ikon smartphone (Android/iOS style) — squircle icon box + label kecil di bawah.
     - **Mode Desktop 🖥️**: Tampilan dashboard multi-kolom dengan widget, info, dan quick stats.
  2. Mode aktif disimpan di `localStorage` (`absenta_dashboard_mode`) dan disinkronkan secara global via custom event `absenta-dashboard-mode-change` yang didengarkan oleh `MainLayout.tsx`, `UnifiedStaffDashboard.tsx`, dan `Topbar.tsx` secara simultan.
  3. Tombol Switch Mode ditempatkan sebagai **single centralized toggle di `Topbar.tsx` (kanan header)** sehingga berfungsi sebagai proxy — memicu handler yang sama persis dengan tombol di dalam dashboard. Tidak ada duplikasi tombol.
  4. Tombol **`[📱 Launcher Apps]`** ditampilkan secara kontekstual di sebelah logo Topbar hanya saat pengguna berada di halaman sub-menu (bukan dashboard), agar navigasi kembali selalu tersedia.
- **Rasional**: Memberikan fleksibilitas tampilan bagi guru yang lebih nyaman dengan ikon aplikasi smartphone (familiar) vs. pengguna yang butuh tampilan ringkasan desktop informatif, tanpa memisahkan dua halaman berbeda yang membebani routing.

2026-08: Portal App Launcher — 3-Block Structure dengan Deduplication
- **Keputusan**:
  Launcher Portal Apps distrukturisasi menjadi **3 Blok Unik Terdeduplikasi**:
  1. **⚡ Blok 1 — Aksi Cepat Diri**: Pintasan aksi cepat kontekstual dari `quickActions` di `UnifiedStaffDashboard.tsx` (dinamis berdasarkan role/PTK type). Berfungsi sebagai **Prioritas Pertama** — item di blok ini tidak akan muncul lagi di blok berikutnya.
  2. **🏫 Blok 2 — Ruang Kerja Guru & Wali Kelas**: Aksi operasional harian pengajaran & rombel (Jadwal Mengajar, Jurnal KBM, Presensi Guru, Catat Pelanggaran, Tindak Masal, + Khusus Wali Kelas: Live KBM, Rekap Absensi, Input Nilai Rapor, Cetak e-Rapor, Risikolog Siswa). Menu di blok ini mengecek Blok 1 dan tidak menampilkan duplikat.
  3. **🏛️ Blok 3 — Ruang Kerja Jabatan & Informasi Lintas Modul**: Menu struktural backend berbasis RBAC (dari `useSmartMenu` / `getSidebarMenu` API). Mengecek Blok 1 & 2 dan hanya menampilkan menu yang belum tampil di keduanya.
  **Aturan Deduplikasi**: normalisasi berdasarkan `path` dan `title` (lowercase, strip whitespace & special chars), sehingga menu yang path atau judulnya identik antar blok otomatis disembunyikan di blok dengan prioritas lebih rendah.
- **Rasional**: Menghindari redundansi menu yang membingungkan pengguna dalam satu layar launcher, sambil mempertahankan hierarki prioritas (Aksi Cepat > Operasional Harian > Jabatan Struktural).

2026-08: Centralized Workspace Navigation Filter — `workspaceNavFilter.ts`
- **Keputusan**:
  Membuat **helper terpusat** `src/helpers/workspaceNavFilter.ts` yang mengekstrak dan mengenkapsulasi seluruh logika penyaringan menu berbasis workspace dari `Sidebar.tsx`:
  - `isAdminUser(user)`: Memeriksa apakah pengguna adalah admin/superadmin yang mendapat akses penuh.
  - `filterNavByWorkspace(allItems, user, activeWorkspaceId)`: Fungsi penyaringan menu inti untuk semua 10+ workspace role (TEACHER, WALIKELAS, KURIKULUM, KESISWAAN, SARPRAS, HUBIN, BPBK, KEPSEK, TU_KEPEGAWAIAN, TU_KEUANGAN, TU_SARPRAS, STUDENT), menghasilkan `{ primaryItems, crossModuleItems, allAllowedItems }`.
  - `normalizeFlatMenu(backendGroupedMenu)`: Normalisasi data grouped-menu dari `useSmartMenu()` ke flat `FlatMenuItem[]` yang dapat dikonsumsi oleh helper filter.
  Helper ini diimpor oleh `StaffPortalAppLauncher.tsx` (Blok 3) dan **siap diimpor oleh `Sidebar.tsx`** sebagai langkah refactor berikutnya.
- **Rasional**: **Single Source of Truth** untuk logika penyaringan workspace. Setiap perubahan logika filter (penambahan workspace baru, penyesuaian crossModulePaths, dll.) cukup dilakukan di **1 file**, dan seluruh consumer (Sidebar + AppLauncher) otomatis sinkron tanpa risiko divergensi.
- **Dampak Teknis**:
  - File baru: `absenta_frontend/src/helpers/workspaceNavFilter.ts`
  - `StaffPortalAppLauncher.tsx` Blok 3 diubah dari inline filter → `import { filterNavByWorkspace, normalizeFlatMenu }`.
  - Sidebar.tsx masih menggunakan logika inline (kandidat untuk dipindahkan ke helper ini di iterasi berikutnya).

