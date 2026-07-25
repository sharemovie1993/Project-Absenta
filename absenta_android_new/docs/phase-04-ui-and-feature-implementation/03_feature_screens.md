# Fase 4.3: Implementasi Feature Screens

## 📱 8 Screen Modul Operasional (`com.absenta.app.ui.features`)

1. **`CameraScannerScreen.kt`** (Scanner Gerbang):
   - Preview Kamera CameraX 30 FPS + ML Kit 17.3.0 QR Scanning.
   - Sakelar Arah `GERBANG_DATANG` vs `GERBANG_PULANG`.
   - Haptic vibration + 3s Cooldown Anti-Looping saat berhasil scan.

2. **`SesiKelasManagerScreen.kt`** (Manajemen Sesi Kelas):
   - List sesi kelas berjalan & aktif.
   - Buka sesi baru (FAB) & Tutup sesi.
   - Presensi guru pengajar sesi.

3. **`MyAttendanceScreen.kt`** (Rekap Absensi Saya):
   - Ringkasan KPI Hadir, Izin, Sakit, Alpa, & % Kehadiran.
   - List riwayat presensi harian dengan `StatusBadge`.

4. **`MyScheduleScreen.kt`** (Jadwal Pelajaran):
   - Daftar mata pelajaran per hari & jam ke-.

5. **`MyPoinScreen.kt`** (Poin Pelanggaran & Prestasi):
   - Total poin pelanggaran, poin prestasi, dan net saldo poin.

6. **`MyProfileScreen.kt`** (Profil Saya):
   - Foto profil, data diri, NIP/NISN, role, dan menu aksi edit/upload.

7. **`EditProfileScreen.kt`** (Edit Profil):
   - Form perbarui nama, nomor telepon/WA, dan alamat.

8. **`UploadBerkasScreen.kt`** (Upload Berkas):
   - Gallery & Camera Picker untuk foto profil dan dokumen PDF/KTP/KK via Multipart HTTP API.
