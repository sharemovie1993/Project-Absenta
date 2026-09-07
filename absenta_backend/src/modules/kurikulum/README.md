# MODULE KURIKULUM — ABSENTA PLATFORM

## Deskripsi
Modul Kurikulum adalah pusat pengaturan struktur pendidikan, Kurikulum Merdeka (Permendikbudristek No. 12 Tahun 2024), repositori administrasi KBM guru, dan penjaminan mutu pengajaran di Absenta.id. Modul ini bertanggung jawab untuk memetakan beban mengajar guru, struktur mata pelajaran per tingkat, generasi Perangkat Ajar AI, serta evaluasi kinerja guru melalui sistem supervisi akademik.

---

## Aktor & Peran
- **Wakasek Kurikulum**: Pengelola utama struktur kurikulum, pemetaan mata pelajaran, verifikator Perangkat Ajar, dan koordinator supervisi.
- **Kepala Sekolah**: Peninjau hasil supervisi akademik, penandatangan legalitas Perangkat Ajar, dan pengambil keputusan mutu pendidikan.
- **Guru**: Subjek supervisi, pembuat/pengunggah Perangkat Ajar (Modul Ajar, ATP, PROTA, PROMES, KKTP, P5), dan pengampu mata pelajaran.

---

## Sub-Modul & Fitur Terimplementasi

### 1. Perangkat Ajar & Generator AI (Kurikulum Merdeka)
- **Generasi AI Automatic**: Pembuatan otomatis Modul Ajar, ATP, PROTA, PROMES, KKTP, dan Modul Projek P5 Kurikulum Merdeka secara kontekstual berbasis Gemini AI.
- **Pure Vector PDF Stream Engine**: Generasi berkas PDF resmi 5 Halaman A4 Utuh ber-Kop Surat terpusat instansi (`PrintHeader`) secara *Cloud-Native / On-the-Fly* via Puppeteer. Zero physical file storage waste (0 Bytes Disk Storage).
- **Multi-Format Export**: Dukungan pembukaan langsung ke **Built-in PDF Viewer (1-Klik)** dan **Ekspor Microsoft Word (.doc)**.
- **Bank Template Nasional (Katalog Platform)**: Fitur klaim/adopsi perangkat ajar terverifikasi secara idempoten.

### 2. Struktur Kurikulum (Curriculum Mapping)
- **Pemetaan Mapel**: Mengatur mata pelajaran yang diajarkan pada tingkat tertentu (1-12) dan jurusan tertentu.
- **Beban Belajar (JP)**: Pengaturan Jam Pelajaran (JP) per minggu untuk setiap mata pelajaran dalam struktur.
- **Smart Upsert Logic**: Mekanisme cerdas untuk memperbarui data struktur tanpa duplikasi berdasarkan kombinasi tahun ajaran, tingkat, dan jurusan.

### 3. Supervisi Akademik (Teacher Observation)
- **Penjadwalan Supervisi**: Perencanaan observasi kelas dengan detail waktu (Jam Ke), mata pelajaran, dan kelas.
- **Evaluasi Kinerja**: Pencatatan catatan observasi dan nilai kuantitatif hasil kinerja guru di kelas.

### 4. Jadwal KBM (Jadwal Pelajaran)
- **Slot Index Mapping**: Jadwal pelajaran dipetakan menggunakan `slot_index` (Jam Ke-1, Ke-2, dst.) alih-alih waktu absolut.
- **Excel Import**: Mendukung import jadwal massal dari Excel dengan Smart Match untuk mapping otomatis Guru, Mapel, dan Kelas.
- **Auto Session Sync**: Setiap perubahan jadwal memicu penyesuaian sesi absensi secara organik untuk hari yang sedang berjalan.

### 5. Kalender Akademik (Academic Calendar)
- **Kalkulasi Minggu Efektif (RPE)**: Menghitung jumlah minggu efektif riil per semester & tahunan.
- **Integrasi iCal Subscription**: Feed data kalender dalam format standar iCalendar (`.ics` RFC 5545) bebas OAuth.

### 6. Jadwal Piket Guru & Otomatisasi Notifikasi WhatsApp
- **Distribusi Penugasan Piket**: Pengaturan guru piket harian (Piket Umum & Piket Jurusan) berbasis Tahun Pelajaran & Semester aktif.
- **SaaS Dynamic Minute Dispatcher**: Pengiriman pesan otomatis pengingat piket guru ke Grup WhatsApp sekolah berbasis timezone lokal tenant (WIB/WITA/WIT).
- **Idempotency Outbox**: Proteksi anti-duplikasi pengiriman pesan berbasis `NotificationLog`.

---

## API ENDPOINTS UTAMA

### Perangkat Ajar & Supervisi
- `GET /api/kurikulum/perangkat` — List Perangkat Ajar Guru.
- `POST /api/kurikulum/perangkat` — Unggah Berkas Perangkat Ajar.
- `POST /api/kurikulum/perangkat/generate-ai` — Hasilkan Naskah Perangkat Ajar dengan AI.
- `POST /api/kurikulum/perangkat/save-editor` — Simpan Naskah AI ke Repositori.
- `GET /api/kurikulum/perangkat/:id/download` — Stream PDF Murni 5 Halaman A4 On-the-Fly.
- `POST /api/kurikulum/perangkat/:id/review` — Verifikasi Perangkat Ajar (APPROVED / REJECTED).

### Jadwal Piket Guru & Notifikasi WhatsApp
- `GET /api/kurikulum/jadwal-piket` — Ambil daftar jadwal piket guru (dengan filter semester, TP, hari).
- `GET /api/kurikulum/jadwal-piket/hari-ini` — Ambil daftar guru piket yang bertugas hari ini.
- `POST /api/kurikulum/jadwal-piket` — Buat penugasan piket single guru.
- `POST /api/kurikulum/jadwal-piket/bulk` — Buat penugasan piket massal (*Bulk Assign*).
- `PUT /api/kurikulum/jadwal-piket/:id` — Perbarui data penugasan piket.
- `DELETE /api/kurikulum/jadwal-piket/:id` — Hapus penugasan piket.
- `GET /api/kurikulum/jadwal-piket/notif-config` — Ambil konfigurasi notifikasi WA group & daftar grup terdeteksi.
- `POST /api/kurikulum/jadwal-piket/notif-config` — Simpan konfigurasi pengingat WA (jam pagi/malam, status aktif, target grup).
- `POST /api/kurikulum/jadwal-piket/test-notif` — Uji coba pengiriman pesan instan ke Grup WA.
