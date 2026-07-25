# Dokumentasi Struktur Project Absenta.id

Dokumen ini memetakan arsitektur direktori dan struktur file dari ekosistem **Absenta.id** secara terperinci untuk backend, frontend, dan aplikasi Android native.

---

## 🗺️ Peta Global Repositori (Global Directory Map)

Di tingkat root `Project Absenta`, terdapat tiga repositori/proyek utama yang berjalan sebagai satu kesatuan monorepo logis, ditambah berkas konfigurasi *deployment* dan infrastruktur:

```
Project Absenta/
├── absenta_backend/          # Layanan REST API & Worker (Node.js/Fastify)
├── absenta_frontend/         # Dashboard Web Aplikasi Admin/Guru/Siswa (React/Vite)
├── absenta_android/          # Aplikasi Mobile Pendukung (Kotlin/Jetpack Compose)
├── docs/                     # Dokumentasi spesifikasi, audit, dan panduan teknis
├── supabase_temp/            # Salinan repositori Supabase (sementara)
├── tunnels/                  # Konfigurasi Easy Tunnel (WireGuard VPN)
├── Caddyfile                 # Konfigurasi reverse proxy SSL tingkat lokal/pusat
├── deploy-onprem-windows.ps1 # Skrip otomatisasi deployment lokal Windows
├── ecosystem.config.js       # Konfigurasi PM2 Process Manager
└── quick-update.ps1          # Skrip pembaharuan cepat backend & frontend
```

---

## 🗄️ 1. Struktur Backend (`absenta_backend`)

Backend dibangun menggunakan **Fastify (TypeScript)** dan **Prisma ORM** dengan pola CQS (*Command Query Separation*) serta pemisahan concern modular.

### 📁 Struktur Folder Utama Backend
```
absenta_backend/
├── prisma/
│   ├── schema.prisma         # Skema database PostgreSQL & relasi tabel
│   └── seeds/                # Script seeder data awal dan kebijakan default
├── src/
│   ├── main.ts               # Entry point server web Fastify
│   ├── worker.ts             # Entry point pemrosesan background queue (BullMQ)
│   ├── config/               # Konfigurasi lingkungan (Env, DB, Redis, Mail, S3)
│   ├── database/             # Inisialisasi Prisma client dan helper transaksi
│   ├── infra/                # Routing sentral, plugin HTTP, error handler
│   ├── middleware/           # Middleware global (auth, tenant, capabilities, rate limit)
│   └── modules/              # Modul-modul fitur backend (35 Modul)
```

### 📦 Detail Modul Fitur (`src/modules/`)
Setiap folder di bawah `src/modules/` mengisolasi domain bisnis tertentu dengan pola subdirektori seragam (misal: `controllers/`, `services/`, `schemas/`, `routes.ts`, `business-rules.md`, dan `todo.md`):

* **`academic`**: Mengelola tahun pelajaran, semester, data master siswa, guru, kelas, rombel, dan transisi kenaikan kelas.
* **`attendance`**: Logika mesin absensi hybrid (IoT RFID, Face Liveness, kueri rekapitulasi massal).
* **`bpbk`**: Bimbingan Konseling (EWS/Early Warning System, riwayat kasus sensitif, Home Visit, pemanggilan wali).
* **`cooperative`**: ERP Koperasi Sekolah (Unit Toko POS retail, simpan pinjam anggota, RFID cashless payment, jurnal akuntansi).
* **`kurikulum`**: Manajemen KBM, jadwal pelajaran mingguan, supervisi guru, pengarsipan RPP/Modul Ajar.
* **`rapor`**: Modul penilaian akademik (KKM, pembobotan nilai, kalkulasi leger kelas, rapor projek P5, impor/ekspor Excel).
* **`sarpras`**: Manajemen aset sarana prasarana, sirkulasi peminjaman, perbaikan barang (repair), barang habis pakai (*consumables*), dan cetak QR Code.
* **`billing`**: Manajemen subscription tenant, integrasi gateway, proxying ke License Server pusat.
* **`whatsapp`**: Pool koneksi engine Baileys WA gateway per tenant.

---

## 💻 2. Struktur Frontend Webapp (`absenta_frontend`)

Frontend berupa aplikasi satu halaman (SPA) berbasis **React**, **Vite**, **TypeScript**, dan **TailwindCSS**.

### 📁 Struktur Folder Utama Frontend
```
absenta_frontend/
├── index.html                # Dokumen HTML utama
├── vite.config.ts            # Konfigurasi Vite bundler
├── src/
│   ├── main.tsx              # Entry point inisialisasi React DOM
│   ├── App.tsx               # Konfigurasi React Router global dan proteksi rute
│   ├── api/                  # Klien API terpusat berbasis Axios/React Query
│   ├── components/           # UI kit umum reusable (Button, Modal, Card, Table)
│   ├── contexts/             # Context provider (Auth, Theme, Socket, Tenant)
│   ├── hooks/                # Custom React hooks penunjang logika state
│   ├── index.css             # Desain sistem CSS utama
│   └── pages/                # Folder halaman aplikasi (terorganisir per modul)
```

### 📄 Detail Halaman Modul (`src/pages/`)
Halaman diatur berdasarkan workspace/peran pengguna dan sub-modul yang selaras dengan backend:
* **`superadmin/`**: Dashboard manajemen tenant, manajemen lisensi, dan config platform global.
* **`academic/`**: CRUD siswa, guru, rombel, dan wizard import excel.
* **`attendance/`**: Live photo stream dashboard absensi, pengaturan gerbang IoT.
* **`bpbk/`**: Kalender BK, klasifikasi kasus, checklist EWS.
* **`cooperative/`**: Point of Sale (POS) koperasi, dashboard simpan pinjam.
* **`kurikulum/`**: Jadwal KBM Builder, halaman perangkat ajar RPP.
* **`rapor/`**: Entry nilai siswa, cetak e-Rapor PDF, evaluasi P5.
* **`sarpras/`**: Dashboard visual ketersediaan ruang/aset, form repair & opname.

---

## 📱 3. Struktur Aplikasi Android (`absenta_android`)

Aplikasi mobile berbasis Android Native ditulis menggunakan **Kotlin** dan **Jetpack Compose** untuk render antarmuka modern.

### 📁 Struktur Folder Utama Android
```
absenta_android/
├── app/
│   ├── build.gradle.kts      # Dependensi Gradle modul aplikasi
│   └── src/main/
│       ├── AndroidManifest.xml # Manifes aplikasi, izin hardware (Kamera, Internet)
│       ├── res/              # Sumber daya non-kode (Icon launcher, string statis)
│       └── java/com/absenta/app/ # Kode sumber Kotlin utama (com.absenta.app)
│           ├── MainApplication.kt # Inisialisasi library global (FCM, dll.)
│           ├── MainActivity.kt    # Entry point aktivitas, Router, Jetpack Compose
│           ├── data/              # Repositori dan sinkronisasi data
│           │   ├── api/           # Klien HTTP (Retrofit/OkHttp) untuk REST API backend
│           │   └── local/         # Penyimpanan lokal (Room DB/Preferences)
│           ├── fcm/               # Firebase Cloud Messaging service receiver
│           └── ui/                # Modul antarmuka Jetpack Compose
│               ├── auth/          # Layanan login & sinkronisasi token
│               ├── components/    # Widget mobile reusable
│               ├── dashboard/     # Dasbor mobile per-peran
│               ├── features/      # Fitur spesifik (scan QR, absensi IoT, foto BK)
│               └── navigation/    # Skema navigasi bottom bar/drawer
```

---

> [!TIP]
> **Prinsip Frontend-Driven**: Seluruh pembaruan format data, kapabilitas perizinan (CBAC), dan parameter HTTP pada aplikasi Android wajib selalu berkaca dan diselaraskan secara sinkron dengan antarmuka yang ada pada `absenta_frontend` dan endpoint di `absenta_backend` untuk mencegah inkonsistensi.
