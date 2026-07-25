# Fase 1.1: Perubahan Rencana & Konsep Aplikasi Operasional Mobile

## 📌 Latar Belakang Perubahan Rencana
Pada awalnya, `absenta_android` direncanakan sebagai duplikasi lengkap (mirip ERP Desktop) dari web frontend `absenta_frontend`. Namun, disepakati perubahan arah strategis:

> **Keputusan Strategis**: Aplikasi Android `absenta_android_new` difokuskan **KHUSUS sebagai Alat / UI Operasional Lapangan saja** (Lean Mobile Tool, ukuran < 8 MB), bukan duplikasi seluruh ERP Web.

Proyek lama `absenta_android` telah diubah namanya menjadi **`absenta_android_old`** untuk arsip, dan **`absenta_android_new`** dibangun murni dari nol.

---

## 🎯 Target Pengguna & Ruang Lingkup Operasional

Aplikasi Android hanya menyediakan layar-layar operasional CRUD ringkas:

1. **Siswa**: My Profile, Update Profile, Upload Berkas, Lihat Dashboard Absensi Diri, Rekap Absensi, Lihat Poin, Lihat Jadwal Pelajaran.
2. **Orang Tua / Wali**: Multi-Child Selector, Live Gate Status Alert (Jam Datang & Pulang Real-time), Rekap & Poin Ananda, FCM Push Notification.
3. **Petugas Kelas / Guru / Wali Kelas**: Sesi Kelas Manager, CRUD Sesi, Checklist Massal Presensi Teman Sekelas, Presensi Guru Sesi.
4. **Petugas Gerbang / Guru Piket**: Continuous CameraX + ML Kit 17.3.0 QR Scanner Terminal (Datang & Pulang) dengan Vibration Haptics & 3s Cooldown.
5. **Pejabat Eksekutif (Kepsek / Wakasek / Pengawas)**: Executive Summary KPI Matrix (% Kehadiran Siswa, % Guru, Stat Izin/Sakit/Alpa, Gate) + System Anomaly Alerts.
