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
- **Perangkat Ajar Kurikulum Merdeka & Penyimpanan Fisik**: Mengganti input URL perangkat ajar menjadi unggahan berkas fisik (PDF/DOCX/XLSX) yang disimpan secara aman via `DocumentStorageService`. Membatasi kategori berkas khusus Kurikulum Merdeka (`MODUL_AJAR`, `ATP`, `MODUL_PROJEK`, `PROTA`, `PROMES`, `KKTP`). Memperketat hak akses API (Guru hanya melihat & mengunggah dokumen miliknya sendiri, Kurikulum/Admin memiliki akses kontrol penuh). Merancang antarmuka visual premium dengan tab status verifikasi, statistik kepatuhan dokumen, dan progress bar pengunggahan.
- **Migrasi Jadwal Kegiatan ke Modul Kesiswaan (Gratis)**: Memindahkan Jadwal Kegiatan Eskul/Non-KBM dari namespace Attendance (`/api/attendance/jadwal-kegiatan`) ke namespace Kesiswaan (`/api/kesiswaan/jadwal-kegiatan`). Fitur ini kini bersifat **gratis** dan tidak terkunci lisensi Absensi. Menu sidebar "Jadwal Kegiatan" ditampilkan di workspace KESISWAAN.
- **Pemisahan Domain Capability Jadwal (Kosmetik RBAC)**: Pemecahan capability `attendance.schedules.*` menjadi `academic.schedules.*` (Jadwal KBM / Modul Kurikulum, gratis) dan `kesiswaan.schedules.*` (Jadwal Kegiatan / Modul Kesiswaan, gratis). Total catalog permission: **442** (sebelumnya 433). Seluruh route guards, position-capabilities, seed_policies, dan frontend guard diperbarui.

In Progress:
- None

Current Focus:
- Pemeliharaan performa dan pemantauan kestabilan worker.

Open Issues:
- **Query Optimization**: Performa rekap kehadiran pada tenant skala besar (>1000 siswa).
- **Offline Sync**: Keandalan protokol rekon-otomatis sinkronisasi data perangkat IoT saat gangguan koneksi internet.

Next Task:
- Monitoring log heartbeat telemetri di server pusat.



