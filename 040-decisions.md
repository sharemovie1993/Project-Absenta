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
- **Keputusan**: Memasukkan perintah `pm2 kill || true` dan `systemctl stop caddy || true` di awal Fase 2 pada skrip deployment remote (`deploy-absenta-remote.ps1`).
- **Rasional**: Membebaskan memori server, kunci berkas (*file locks*) pada modul node, dan port `80/443` sebelum proses penarikan git, instalasi dependensi, dan kompilasi proyek dimulai kembali, menghindari kegagalan kompilasi akibat file sedang sibuk.













