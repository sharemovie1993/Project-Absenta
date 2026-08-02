# 🔀 Context-Aware Tab Routing & Role-Based Tab Visibility Documentation

## 📌 Ringkasan Implementasi
Dokumen ini mencatat standar navigasi kontekstual (`?tab=...`) dan visibilitas tab berbasis peran pada halaman Operasional Presensi (`/attendance/ops`) dan Jurnal KBM.

---

## 🎯 1. Context-Aware Tab Routing (`?tab=...`)

Untuk memfasilitasi pengguna yang memegang beberapa peran sekaligus (seperti Guru Mapel + Wali Kelas), halaman Operasional Presensi (`ModeMultiSesiView.tsx`) dikendalikan secara presisi melalui URL query parameter:

1. **`/attendance/ops?tab=manual` (Menu "Belum Hadir")**:
   - Menampilkan **Tab Cek Manual Presensi**.
   - Digunakan oleh Wali Kelas untuk mengecek dan memperbarui status kehadiran siswa rombel binaannya secara cepat.
2. **`/attendance/ops?tab=sesi` (Menu "Absensi Kelas")**:
   - Menampilkan **Tab Manajemen Sesi KBM**.
   - Digunakan oleh Guru Mapel untuk membuka/menutup sesi mengajar dan mengisi jurnal KBM.

---

## 🔒 2. Visibilitas Tab Berbasis Peran (`Role-Based Tab Visibility`)

Untuk menjaga fokus operasional dan mencegah kesalahan akses di lapangan, tab pada `/attendance/ops` dibatasi secara ketat berdasarkan peran pengguna:

| Peran Pengguna | Tab Cek Manual | Tab Manajemen Sesi | Tab Scan Gerbang | Keterangan Navigasi |
| :--- | :---: | :---: | :---: | :--- |
| **Wali Kelas** | ✅ Tampil | ❌ Tersembunyi | ❌ Tersembunyi | Bar switcher tab otomatis disembunyikan (Direct Mode Cek Manual). |
| **Petugas Kelas** | ✅ Tampil | ✅ Tampil | ❌ Tersembunyi | Hanya mengelola sesi KBM & cek manual kelas. |
| **Guru Mapel** | ✅ Tampil | ✅ Tampil | ❌ Tersembunyi | Mengelola sesi KBM & cek manual. |
| **Satpam / Gerbang / Admin** | ✅ Tampil | ✅ Tampil | ✅ Tampil | Akses penuh ke seluruh tab operasional. |

---

## 🧭 3. Guided Flow Jurnal KBM Tanpa Sesi Aktif

Apabila seorang Guru mengeklik menu **Jurnal KBM** di dashboard namun belum memiliki sesi mengajar yang sedang aktif pada hari tersebut:
- Sistem tidak lagi menampilkan error mati atau pesan buntu.
- Sistem **secara ramah mengarahkan pengguna secara otomatis ke `/attendance/ops?tab=sesi`** disertai pesan panduan: *"Silakan aktifkan sesi mengajar Anda terlebih dahulu di Manajemen Sesi."*

---

## 🚀 Status Verifikasi
- **Frontend & Backend TypeScript Check**: `npx tsc --noEmit` ➔ **0 Error (PASS)**.
- **Git Commit**: `96018afb`, `11e1bfd5`, `a1826372`.
