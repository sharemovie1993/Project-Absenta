# CURRENT STATE

Completed:
- **Core SaaS Infrastructure**: Multi-tenancy isolation, JWT auth, and Entitlement Engine.
- **Academic Core**: Kurikulum, Manajemen Guru/Siswa, Transisi Tahun Ajaran, dan Struktur Organisasi.
- **Smart Attendance**: Gerbang RFID, Sesi KBM, integrasi IoT Heartbeat, Auto-close worker, Face Liveness Detection, Offline Sync, dan Zod Validation Layer untuk endpoint Gerbang/Sesi/Devices.
- **Cooperative ERP**: Simpan Pinjam, Unit Toko (POS), E-Wallet RFID Integration, dan Distribusi SHU otomatis.
- **Student Care (BPBK)**: Konseling, Early Warning System (EWS), Quick Approval WhatsApp, Executive Dashboard Analytics, Zod Validation Layer, dan optimasi Visibility Filter.
- **Academic Enhancements**: Bulk Import Siswa dengan Smart Match, Zod Validation Layer untuk seluruh submodul (Siswa, Guru, Kelas, Jurusan, Mapel, Tahun Pelajaran, Semester, Jenis Kegiatan, Wali Kelas, Kenaikan Kelas, Struktur Organisasi, Student Card Config), Prorata Penugasan Struktural, dan Template Kartu Pelajar.
- **Attendance Optimization**: Optimasi query rekap skala besar, Real-time Photo Stream Dashboard V2, Gamifikasi Kehadiran, dan Integrasi Smart Lock.
- **HUBIN Storage & Real-Time Enhancements**: Migrasi penyimpanan PKL/MoU ke `storageService`, Zod Validation Layer pada Mitra & Penempatan PKL, serta Dashboard Monitoring PKL Real-time (melalui Redis Pub/Sub & WebSockets).
- **Centralized Billing & License Server Integration**: Pembersihan sisa arsitektur billing lokal, proxying query invoice & pembayaran dinamis ke server lisensi pusat, proteksi push webhook dengan validation layer Zod & HMAC-SHA256 signature verification, serta grace period subscription fallback.
- **Cooperative ERP Validation Sweep**: Integrasi Zod validation layer pada submodul Pinjaman, Simpanan, Kategori Simpanan, Toko/POS, Opname, RFID Payment, dan PPOB untuk memastikan integritas data transaksi keuangan koperasi.
- **Event Gateway & Push Notifications (Fase 5)**: Notifikasi EWS berisiko tinggi kepada guru BK secara instan, whistleblowing pengaduan bullying anonim (`BullyingReport`), dan batch offline sync logbook PKL Hubin dengan geofencing check.
- **Student Care (BPBK) Enhancements**: Integrasi kalender BK terpadu (Pemanggilan & Home Visit), kustomisasi bobot kalkulasi EWS per tenant (Config DB), klasifikasi Pola Kasus AI sederhana (built-in regresi tren & pola perilaku siswa), serta relasi lampiran cloud storage S3.
- **SARPRAS Core Validation & QR Generator**: Integrasi Zod validation layer pada semua endpoint inventaris/SARPRAS (Aset, Kategori, Lokasi, Peminjaman, Perbaikan), serta generator label cetak QR Code PDF terpadu per aset (tunggal & massal).
- **SARPRAS Overdue WA Notification, Depreciation & Consumables**: Cron job `sarprasOverdueReminder` untuk notifikasi jatuh tempo peminjaman WA otomatis harian, kalkulator laporan depresiasi garis lurus (Straight-line) dinamis per kategori, dan tracker sub-modul barang habis pakai (Consumables) lengkap dengan alert stok minimum berbasis Config DB tenant.
- **SARPRAS Real-Time Dashboard & Mobile Integration**: Pembuatan endpoint visualisasi statistik perbaikan per lokasi, pemancaran event real-time `sarpras_dashboard_update` via Redis Pub/Sub, API scanner mobile (`GET /assets/scan/:code`), pencatatan Stock Opname (`POST /assets/opname`), kalender perbaikan (`GET /repairs/calendar`), serta dokumentasi kerusakan berbasis foto lampiran (`foto_kerusakan`).
- **Reporting Engine PDF Generator**: Pembuatan modul generator PDF premium berbasis Puppeteer untuk Sertifikat Penghargaan Siswa, Invoice Tagihan central, dan Laporan Hasil Supervisi Akademik Guru.
- **Kurikulum Zod Validation Layer**: Integrasi layer validasi Zod untuk Struktur Kurikulum (`StrukturKurikulum`) dan Supervisi Guru (`SupervisiGuru`) guna menyeleksi input data dan parameter kotor di level API.
- **Kesiswaan Zod Validation Layer**: Integrasi layer validasi Zod untuk sub-modul Pelanggaran Siswa, Jenis Pelanggaran, Prestasi Siswa, Jenis Prestasi, dan Piket (Izin Keluar Siswa) guna menjamin integritas tipe data input.
- **Pemisahan Modul Rapor (Decoupled)**: Pemisahan modul Rapor sepenuhnya dari modul Kurikulum di tingkat backend (di bawah prefix `/api/rapor`) dan frontend.
- **Penilaian, Leger Kelas & Excel Impor/Ekspor**: Penambahan sistem KKM, pembobotan jenis penilaian, kalkulasi leger dinamis sekelas (rata-rata, total, ranking 1..N), ekspor Excel Leger (.xlsx), serta generator template nilai kosong & parser impor massal nilai via Excel toleran kesalahan baris.
- **Rapor Projek P5 & Kualitatif**: CRUD Projek P5 master dan perekaman kualitatif checklist karakter profil pelajar Pancasila (`BB`, `MB`, `BSH`, `SB`) beserta catatan prosesnya per siswa.
- **Generator PDF Premium Puppeteer**: Lembar e-Rapor resmi semester, Rapor Projek P5, Surat Keterangan Lulus (SKL), Sertifikat UKK Kejuruan (border emas landscape), dan Rapor PKL.
- **Manajemen Perangkat Ajar & RPP**: Repositori berkas administrasi guru (RPP, silabus, dll.) lengkap dengan workflow persetujuan (APPROVED/REJECTED) dan umpan balik Wakasek Kurikulum.
- **Frontend Pages Modul Rapor & RPP**: Halaman `InputNilaiPage.tsx`, `CetakRaporPage.tsx`, `P5Page.tsx` di modul Rapor, dan halaman `PerangkatAjarPage.tsx` di modul Kurikulum lengkap dengan integrasi Axios & React Query.
- **Global & Module Documentation**: Seluruh modul backend (39 subdirektori modul) dan dokumentasi global telah terdokumentasi (Deep Verified & Cross-Synced) dengan standar Context Engineering AI.
- **Global Program & Jurusan Presets**: CRUD dan model data global untuk preset Program Keahlian dan Konsentrasi Keahlian (Jurusan) tingkat superadmin/platform, serta seeder standar nasional Kurikulum Merdeka.
- **Wizard Tambah Massal Jurusan (2-Step)**: Wizard tambah massal jurusan di level tenant/sekolah yang dibagi menjadi 2 langkah (langkah 1: Program Keahlian, langkah 2: Jurusan terfilter).
- **Adaptasi Jenjang Sekolah (useJenjang)**: Halaman CRUD Kelas, tabel kelas, filter kelas, dan menu sidebar Jurusan otomatis disembunyikan/disederhanakan untuk sekolah jenjang SD/SMP/MI/MTs yang tidak menerapkan penjurusan. Properti `jurusan_id` di database kini opsional/nullable.
- **Hardware Telemetry Heartbeat**: Pengiriman otomatis spesifikasi perangkat keras host (CPU Model & core count, RAM total, dan disk storage utama) dalam string `osType` telemetri ke server lisensi pusat setiap 2 menit.
- **Kurikulum Enhancements (Capping JP, Analitik Supervisi, & Self-Assessment)**: Pengenalan batasan JP mengajar mingguan guru dengan alert warning di Schedule Builder, modal input target pra-observasi guru, serta dashboard analitik tren kompetensi pedagogik untuk Kepala Sekolah/Wakasek.
- **Rekomendasi & Automasi Penjadwalan Supervisi**: Sistem pencari slot mengajar guru otomatis berdasarkan tanggal pilihan serta rekomendasi supervisor bebas bentrok (tidak mengajar & tidak sedang mensupervisi di slot waktu yang sama).
- **Resilient Cascade Delete for Siswa**: Penulisan ulang `deleteAllSiswa` menggunakan satu transaksi PostgreSQL raw SQL (`$executeRawUnsafe`) berdurasi 2 menit untuk membersihkan secara berurutan data relasi pada 12 tabel (menyelesaikan error foreign key constraint dan limitasi timeout HTTP request).
- **Wizard Generate NIS Massal**: Penambahan endpoint dan interface 3-step wizard untuk generate NIS massal terurut berdasar Jurusan (A→Z) → Tingkat Kelas → Rombel → Nama Siswa dengan opsi pengaturan urutan kelas dinamis.
- **Perangkat Ajar Kurikulum Merdeka & Penyimpanan Fisik**: Mengganti input URL perangkat ajar menjadi unggahan berkas fisik (PDF/DOCX/XLSX) yang disimpan secara aman via `DocumentStorageService`. Membatasi kategori berkas khusus Kurikulum Merdeka. Merancang antarmuka visual premium dengan tab status verifikasi, statistik kepatuhan dokumen, dan progress bar pengunggahan.
- **Migrasi Jadwal Kegiatan ke Modul Kesiswaan (Gratis)**: Memindahkan Jadwal Kegiatan Eskul/Non-KBM dari namespace Attendance ke namespace Kesiswaan (`/api/kesiswaan/jadwal-kegiatan`). Fitur ini kini bersifat **gratis** dan tidak terkunci lisensi Absensi.
- **Pemisahan Domain Capability Jadwal (Kosmetik RBAC)**: Pemecahan capability `attendance.schedules.*` menjadi `academic.schedules.*` dan `kesiswaan.schedules.*`. Total catalog permission: **442**.
- **RBAC Hardening Halaman Kurikulum & Akses Workspace TU Kepegawaian**: Penerapan batasan `readOnly` di tingkat komponen untuk Struktur Kurikulum dan Jam KBM bagi peran non-manajer. Penyelarasan menu lintas modul secara berurutan sesuai alur aliran pengisian data master di database.
- **Unifikasi Foto Profil & Single Source of Truth**: Penyelarasan fitur upload & ambil pasfoto (Guru & Siswa) di 3 lokasi dengan kategori `'FOTO'` di Document Center. Backend menyinkronkan data ini dengan kolom `foto` di tabel utama.
- **Optimasi & Hardening Arsitektur Multi-Tenant Level Enterprise** (Modul Guru Mapel, Jadwal KBM, Rekap Presensi, Monitoring KBM, Tracking Siswa, Rekap KBM, Struktur Organisasi, Absensi Gerbang & Sesi KBM, Dashboard Utama, Piket Kesiswaan): Composite indexing PostgreSQL, Redis Multi-Tenant Caching, Auto-Invalidation Signals, Automated Test Suites. Speedup terverifikasi **213x – 4155.9x lebih cepat (<0.06ms HIT)**.
- **Implementasi Ekosistem Penilaian, Leger, Rapor Kurikulum Merdeka, & e-Rapor Exporter**: Skema penilaian Kurikulum Merdeka, Leger Akademik sebagai Single Source of Truth, 1-click Exporter `.xlsx` siap import ke aplikasi e-Rapor resmi Kemendikbud.
- **Implementasi Modul Rapor PKL & Enterprise Hardening 4 Pilar**: Alur input penilaian PKL, Modal Preview/Cetak Sertifikat Resmi PKL 2 Halaman, Enterprise Hardening (Composite Indexing, Redis Cache, Auto-Invalidation, Automated Test 100% PASSED).
- **Audit & Google-Standard Enterprise Hardening Modul Input Nilai & Rapor**: Hardening 4 pilar (Indexing, Redis Caching HIT 350.9x, Auto-Invalidation, Security Boundary), Engine Referensi Presensi 1 Semester, Transkrip Nilai Multi-Semester, Dinamisasi Render PDF Multi-Jenjang.
- **Dokumentasi Full-Stack & System Knowledge-Base Expansion**: Sinkronisasi seluruh dokumentasi teknis, API contracts, dan arsitektur database ke dalam sistem living-documentation berbasis Markdown terpadu.
- **Unified Staff Dashboard — Dual Mode (Portal Apps 📱 / Desktop 🖥️)** *(2026-08)*: Implementasi dua mode tampilan dashboard staf yang dapat di-toggle. Mode disimpan di `localStorage` (`absenta_dashboard_mode`) dan disinkronkan secara global via Custom Event `absenta-dashboard-mode-change`. Tombol Switch Mode terpusat di `Topbar.tsx` sebagai single proxy handler (tidak ada duplikasi tombol). Tombol `[📱 Launcher Apps]` muncul kontekstual di Topbar saat pengguna berada di halaman sub-menu.
- **Portal App Launcher — 3-Block Unique Menu Architecture** *(2026-08)*: `StaffPortalAppLauncher.tsx` distrukturisasi menjadi 3 blok unik terdeduplikasi: (1) ⚡ Aksi Cepat Diri, (2) 🏫 Ruang Kerja Guru & Wali Kelas, (3) 🏛️ Ruang Kerja Jabatan & Informasi Lintas Modul. Setiap blok mengecek blok prioritas lebih tinggi dan menyembunyikan menu duplikat secara otomatis via normalisasi `path`/`title`. Seluruh menu sepenuhnya dinamis dari API (tidak ada hardcoded menu).
- **Centralized Workspace Navigation Filter (`workspaceNavFilter.ts`)** *(2026-08)*: Ekstraksi logika penyaringan menu workspace ke helper terpusat `src/helpers/workspaceNavFilter.ts` sebagai Single Source of Truth. Mengekspor `isAdminUser()`, `filterNavByWorkspace()`, `normalizeFlatMenu()`. Diimport oleh `StaffPortalAppLauncher.tsx` (Blok 3), sehingga AppLauncher dan Sidebar kini berbagi logika filtering yang identik tanpa duplikasi kode. Build `tsc --noEmit` + `vite build` **0 errors**.
- **Full-Stack Dual-Layer Cache Invalidation & Multi-Channel Hardening (Domain Siswa, Guru & PTK, Mapel, Jadwal KBM)** *(2026-08)*: Penerapan penyegaran cache multi-channel (Form UI, Excel Import, Cron Sync, WA Chatbot) di Backend Redis (`CacheInvalidationService`) dan Frontend React Query Memory Purge (`queryClient.invalidateQueries`) per-domain bertahap. Diuji dengan script verifikasi otomatis (`scratch/verify_domain*_invalidation.py`) 100% PASSED. Dokumen teknis modul tersimpan pada `absenta_backend/docs/05 Hardening Tiap Domain/17-20`.


In Progress:
- None

Current Focus:
- Pemeliharaan performa dan pemantauan kestabilan worker.
- Refactor `Sidebar.tsx` untuk mengimpor logika filtering dari `workspaceNavFilter.ts` (menggantikan logika inline yang ada saat ini — prioritas rendah, sistem sudah fungsional).

Open Issues:
- **Query Optimization**: Performa rekap kehadiran pada tenant skala besar (>1000 siswa).
- **Offline Sync**: Keandalan protokol rekon-otomatis sinkronisasi data perangkat IoT saat gangguan koneksi internet.
- **Sidebar Refactor Pending**: `Sidebar.tsx` masih menggunakan logika penyaringan workspace secara inline. Kandidat untuk dipindahkan ke `workspaceNavFilter.ts` pada iterasi berikutnya agar arsitektur fully centralized.

Next Task:
- Monitoring log heartbeat telemetri di server pusat.
- Refactor `Sidebar.tsx` — gunakan `filterNavByWorkspace()` dari `workspaceNavFilter.ts` menggantikan fungsi `getFilteredNavigation()` inline.


