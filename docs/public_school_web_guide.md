# Panduan Teknis & Arsitektur: Ekosistem Web Sekolah Publik Terpadu Multi-Tenant & Multi-Jenjang

Dokumen ini merangkum arsitektur, spesifikasi endpoint, mekanisme routing domain, serta panduan operasional integrasi data lintas divisi menjadi website sekolah konsumsi publik pada platform Absenta.

---

## 1. Ringkasan Arsitektur

Web Sekolah Publik Absenta mengadopsi model **Decoupled Headless Public Core**:
- **Core Platform (Backend)**: Fastify + Prisma + PostgreSQL + Redis bertindak sebagai *Single Source of Truth*. Seluruh data olahan divisi (Kurikulum, Hubin/BKK, Kesiswaan, Sarpras, Rapor) diagregasikan melalui submodul `public-portal`.
- **Public Cache Engine**: Semua data publik di-cache di Redis (`pub:*`) dengan TTL 15–60 menit. Update di CMS atau penerbitan dokumen memicu *invalidation signal* otomatis.
- **Security & Privacy Boundary**: Kontak pribadi guru (nomor HP, NIK, alamat rumah), riwayat pelanggaran siswa, rekaman BPBK, dan data finansial koperasi **sepenuhnya diisolasi dan di-strip** dari proyeksi data publik.
- **Public Renderer**: Dapat diakses langsung melalui portal terintegrasi di `/portal/:tenantSlug` maupun dideploy sebagai standalone engine SSR (Astro / Next.js) tanpa membebani sistem absensi atau KBM sekolah.

---

## 2. Resolusi Multi-Tenant & Multi-Jenjang

### A. Resolusi Domain (Tenant Resolver)
Engine mengenali tenant secara otomatis dengan urutan prioritas:
1. **URL Parameter**: `/portal/:tenantSlug` atau `/p/:tenantSlug`
2. **HTTP Header**: `X-Tenant-Host` atau `X-Tenant-Slug`
3. **HTTP Host Header**: Subdomain `*.absenta.id` atau domain kustom resmi sekolah (`*.sch.id`).

Hasil pemetaan tenant di-cache dalam memori Redis (`pub:tenant_resolve:<slug>`) untuk respon super instan ($\le 0.05\text{ ms}$).

### B. Adaptasi Multi-Jenjang (Feature Flags)
Setiap jenjang sekolah mendapatkan antarmuka yang disesuaikan secara dinamis:
- **SMK / Vokasi**: Menonjolkan daftar **Kompetensi Keahlian (9 Jurusan)**, informasi **Bursa Kerja Khusus (BKK)**, **Mitra Industri DUDI**, unit **Teaching Factory (TEFA)**, dan verifikasi **Sertifikat UKK**.
- **SMA / MA**: Menonjolkan Program Peminatan, prestasi akademik/olimpiade, jalur seleksi PTN (SNBP/SNBT), dan ekstrakurikuler.
- **SMP / MTs & SD**: Sederhana dan ramah anak; menyembunyikan modul kejuruan, fokus pada pembiasaan karakter (Dhuha/literasi), profil pendidik, sarana ramah anak, dan info PPDB.

---

## 3. Spesifikasi Kontrak API Publik (`/api/public/portal`)

Semua endpoint berikut bersifat **Read-Only**, tidak memerlukan token JWT (`skipAuth: true`), dan dilindungi oleh rate-limiter ketat (120 req/menit):

| Endpoint | Metode | Deskripsi |
| :--- | :---: | :--- |
| `/api/public/portal/:tenantSlug/profile` | `GET` | Profil sekolah, akreditasi, kontak resmi, konfigurasi CMS web, dan ringkasan statistik siswa/guru/jurusan/lab. |
| `/api/public/portal/:tenantSlug/programs` | `GET` | Daftar konsentrasi keahlian/jurusan, durasi studi, warna identitas, dan jumlah rombel aktif. |
| `/api/public/portal/:tenantSlug/staff` | `GET` | Direktori guru & tenaga kependidikan (nama, foto, NIP, jabatan, mapel yang diampu) tanpa mengekspos data pribadi. |
| `/api/public/portal/:tenantSlug/achievements`| `GET` | Hall of fame prestasi siswa terbaru dari modul Kesiswaan (akademik, seni, olahraga). |
| `/api/public/portal/:tenantSlug/hubin` | `GET` | Khusus SMK: Data mitra industri aktif, lowongan kerja BKK terbuka, dan proyek TEFA. |
| `/api/public/portal/:tenantSlug/facilities` | `GET` | Galeri sarana dan prasarana (laboratorium komputer, bengkel praktek, perpustakaan). |
| `/api/public/portal/:tenantSlug/articles` | `GET` | Warta, berita, pengumuman resmi, dan agenda sekolah (mendukung filter kategori & pagination). |
| `/api/public/portal/:tenantSlug/articles/:slug` | `GET` | Konten lengkap warta beserta penghitung jumlah pembaca (*views count*). |
| `/api/public/portal/:tenantSlug/verify/:docType/:code` | `GET` | Mesin validasi otentikasi SKL dan Sertifikat UKK berbasis nomor seri / scan QR Code. |

---

## 4. Pusat Manajemen CMS Web Sekolah (Internal Dashboard)

Staf Humas atau Administrator Sekolah dapat mengelola konten website publik melalui rute internal:
**`/management/web-sekolah`**

Fitur manajemen mencakup:
1. **Branding & Tema**: Penyesuaian warna aksen utama, judul headline hero, subjudul, dan slider gambar banner.
2. **Sambutan & Pimpinan**: Pengunggahan foto resmi kepala sekolah, penyuntingan teks sambutan resmi, visi, dan misi.
3. **PPDB & Media Sosial**: Saklar status pembukaan PPDB, tautan pendaftaran online, dan akun resmi (Instagram, Facebook, YouTube, TikTok).
4. **Warta & Publikasi**: Editor penulisan berita, pemilihan kategori warta, unggah gambar sampul, serta pratinjau langsung ke web publik.

---

## 5. Protokol Verifikasi Dokumen Digital (SKL & Sertifikat UKK)

Untuk mengantisipasi pemalsuan ijazah dan sertifikat kejuruan:
1. Dokumen resmi yang dicetak melalui Absenta dilengkapi QR Code verifikasi unik.
2. Saat QR Code di-scan oleh HRD industri atau orang tua, sistem mengarahkan ke modal verifikasi portal sekolah:
   ```
   https://[domain-sekolah]/portal/[slug]?verify=UKK&code=[nomor-sertifikat]
   ```
3. Backend memvalidasi integritas data pada tabel `SertifikatUkk` atau `KelulusanSiswa` dan mengembalikan kartu verifikasi ber-badge hijau **TERVERIFIKASI SAH** dengan mencantumkan nama siswa, NISN, predikat nilai, dan nama industri penguji resmi.
