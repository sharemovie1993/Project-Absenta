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
