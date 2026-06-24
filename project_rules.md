# Project Rules & Workflow Absenta

Dokumen ini berisi aturan kerja dan workflow wajib bagi AI Assistant saat mengerjakan pengembangan, debugging, maupun refaktoring di repositori Project Absenta (khususnya penyelarasan `absenta_android` terhadap `absenta_frontend`).

---

## 🚨 Aturan Utama: Alur Kerja Berbasis Kode Frontend (Frontend-Driven Alignment)

### 1. Dikte Kode Webapp Terlebih Dahulu
Sebelum membuat atau mengubah file kode apa pun di sisi Android native (`absenta_android`), AI **WAJIB** membaca dan menganalisis kode yang bersangkutan di sisi React webapp (`absenta_frontend`). 
- Pahami skema API, parameter request/response, penanganan state, dan pembatasan akses (RBAC).
- Jangan menulis kode di Android berdasarkan asumsi atau perkiraan pribadi.

### 2. Logika Harus Eksplisit (Bebas Tebak-Tebakan / "Atau")
- Semua aturan logika perizinan, hak akses (capabilities), validasi data, dan rendering UI harus didefinisikan secara konkret dan eksplisit mengikuti aturan di webapp.
- Hindari penggunaan kondisi alternatif yang bersifat menebak-nebak (`atau`, `jika tidak yakin, maka...`). Jika logika di webapp menggunakan kapabilitas `x`, Android harus menggunakan kapabilitas `x`.

### 3. Proaktif & Mandiri (Jangan Menunggu Kritik)
- AI harus mandiri menyelaraskan model data, flow autentikasi, penanganan error, dan visualisasi layout.
- Lakukan penelusuran mandiri ke seluruh file yang terdampak (misalnya: saat merubah skema otorisasi, pastikan data layer, local persistence, view model, dan UI screen disesuaikan serentak).
- Jangan menyajikan pekerjaan setengah matang yang memaksa pengguna melakukan review berulang kali untuk hal-hal dasar.

### 4. Estetika Premium & High-Fidelity
- Antarmuka Android Jetpack Compose harus dirancang dengan visual premium (gradient warna modern, shadow halus, status pulse, micro-animations) yang sepadan dengan visualisasi modern di Web.
- Terapkan penanganan status loading dan fallback error yang elegan secara menyeluruh di setiap layar.

---

## 🛠️ Langkah Kerja Standar Sebelum Eksekusi Tugas
1. **Membaca file ini (`project_rules.md`)** di awal turn.
2. **Mencari file terkait di `absenta_frontend`** (misal: mencari komponen dashboard, api request, dsb.) dan membedahnya.
3. **Menyusun Implementation Plan** yang mendokumentasikan pemetaan logika web-ke-mobile secara presisi dan eksplisit.
4. **Meminta persetujuan pengguna** (di Planning Mode) sebelum melakukan perubahan.

---

## 🏛️ Konstitusi Resmi: Batas Domain BPBK vs Kesiswaan (Student Affairs vs Counseling Domain)

Batas fungsional dan keamanan antara modul **Bimbingan Konseling (BPBK)** dan **Kesiswaan (Student Affairs)** resmi ditetapkan sebagai aturan arsitektural wajib berdasarkan dokumen [Laporan Audit Lanjutan](file:///C:/Users/SERVER-DELL/.gemini/antigravity/brain/2c718421-8ab2-45e3-9351-04ee6043cd41/wakasis_bk_access_audit.md):

### 1. Pembagian Kepemilikan Domain (Domain Ownership)
* **Kesiswaan (Student Affairs)**: SoT (Source of Truth) mutlak untuk data operasional ketertiban harian siswa yang meliputi:
  - Pelanggaran & Jenis Pelanggaran (`PelanggaranSiswa`, `JenisPelanggaran`)
  - Prestasi & Jenis Prestasi (`PrestasiSiswa`, `JenisPrestasi`)
  - Piket & Izin Keluar Sekolah (`IzinKeluarSiswa`)
* **BPBK (Counseling Domain)**: SoT untuk data klinis dan pendampingan rahasia yang meliputi:
  - Kasus BK (`KasusBK`)
  - Detail Konseling/Wawancara (`KonselingSiswa` - kolom `masalah` dan `solusi`)
  - Pemanggilan Orang Tua/Summons (`PemanggilanOrangTua`)
  - Kunjungan Rumah (`HomeVisit`)
  - Asesmen Psikologis (`AsesmenSiswa`)
  - Rujukan Kasus (`RujukanKasus`)

### 2. Aturan Hak Akses Data BK (Confidentiality Rule)
* **Data Klinis Bersifat Eksklusif**: Deskripsi masalah konseling, log home visit, catatan asesmen psikologis, dan berkas klinis rujukan bersifat rahasia medis/psikologis. Data ini **HANYA** boleh diakses (write/read) oleh personil dengan jabatan **Guru BK** (`bpbk.*` / `bk.*`).
* **Pembatasan Wakasek Kesiswaan (Wakasis)**: Jabatan Wakasek Kesiswaan (Student Affairs) **DILARANG** memiliki hak akses langsung (`bk.counseling.view.detail`, dll) untuk membaca detail wawancara kasus konseling individual atau asesmen psikologis individual.
* **Data Koordinasi (Shared Metadata)**: Wakasis diperbolehkan membaca metadata koordinasi umum (melalui kapabilitas `kesiswaan.bk.*` yang akan diatur di Fase 6):
  - Status Penanganan Kasus (apakah siswa A sedang ditangani aktif oleh BK atau tidak, tanpa melihat catatan masalah).
  - Jadwal Pemanggilan Wali Murid (untuk koordinasi kehadiran di pos piket gerbang).
  - Dasbor Analitik Sekolah (statistik jumlah kasus bulanan tanpa membedah detail individu) dan Indeks Early Warning System (EWS).

### 3. Aliran Dependensi Database (Database Dependency Rule)
* Modul Kesiswaan adalah modul independen; **DILARANG** memiliki dependensi impor kode atau API langsung terhadap modul BPBK.
* Modul BPBK diperbolehkan membaca data agregat pelanggaran dan prestasi dari modul Kesiswaan (misal: untuk kalkulasi EWS dan statistik risiko), namun status konsumsinya adalah **Read-Only Consumer** (kueri langsung ke tabel DB bersama). BPBK dilarang melakukan operasi write/manipulasi terhadap data pelanggaran atau prestasi.

