# Absenta Mobile Operational App (`absenta_android_new`)

Aplikasi Android Native Operasional Lean untuk Sistem Absensi Sekolah **Absenta**.  
Dibangun 100% menggunakan **Jetpack Compose Material 3 Native** (0 WebView), terintegrasi langsung dengan `absenta_backend` REST API.

---

## 🚀 Fitur Utama & 5 Persona Operasional

Aplikasi ini menggunakan **API-Driven Dynamic Navigation (`GET /api/menu`)** yang secara otomatis menyajikan layar dan menu operasional sesuai `user.capabilities` dari backend `position-capabilities.ts`:

1. 👦 **Persona Siswa (Student View)**:
   - Dashboard Kehadiran Personal
   - Jadwal Pelajaran Saya
   - Ringkasan Poin Pelanggaran & Prestasi Saya
   - Profil Saya, Edit Data Diri, & Upload Berkas/Foto Native

2. 👨‍👩‍👧 **Persona Orang Tua / Wali Siswa (Parent App)**:
   - **Multi-Child Selector**: Alih anak jika orang tua memiliki >1 anak di sekolah
   - **Live Gate Status Alert**: Tampilan real-time jam datang & pulang ananda
   - **Rekap & Poin Ananda**: Laporan absensi & poin prestasi/pelanggaran anak
   - **FCM Real-time Push Notification**: Notifikasi otomatis bunyi saat anak tap di gerbang

3. ⏱️ **Persona Petugas Kelas / Guru (Class Operator)**:
   - **Sesi Kelas Manager**: CRUD Sesi Absensi Kelas (Buka/Edit/Tutup Sesi)
   - **Multi-Input Attendance**: Checklist Massal + Quick Search NISN/RFID + Mini QR Camera Scan
   - **Presensi Guru Sesi**: Pencatatan kehadiran guru pengajar pada sesi kelas berjalan

4. 🚪 **Persona Petugas Gerbang / Guru Piket (Gate Operator)**:
   - Continuous CameraX + ML Kit 17.3.0 QR Scanner Terminal (30 FPS)
   - Sakelar Arah `GERBANG_DATANG` vs `GERBANG_PULANG`
   - Vibration Haptics, Audio Beep, & 3-Second Cooldown Guard (Anti-Looping)

5. 📊 **Persona Pejabat Eksekutif / Kepsek / Wakasek / Pengawas (Executive View)**:
   - **Executive Summary KPI Matrix**: 4 Card KPI Eksekutif (% Kehadiran Siswa Real-time, % Kehadiran Guru Mengajar, Stat Izin/Sakit/Alpa, & Status Gerbang)
   - **System Anomaly Alerts Card**: Peringatan dini otomatis jika ada sesi kelas belum dibuka atau lonjakan siswa alpa

---

## 🎨 UI Design System (`Dark-First`)

- **Background Utama**: `Color(0xFF0F172A)` (Slate-950 Navy)
- **Surface Card**: `Color(0xFF1E293B)` (Slate-800)
- **Primary Accent**: `Color(0xFF3B82F6)` (Blue-500)
- **Success / Hadir**: `Color(0xFF10B981)` (Emerald-500)
- **Danger / Alpa**: `Color(0xFFEF4444)` (Red-500)
- **Warning / Sakit**: `Color(0xFFF59E0B)` (Amber-500)
- **Izin**: `Color(0xFF3B82F6)` (Blue-500)

---

## 📁 Struktur Direktori & Dokumentasi

Dokumentasi lengkap perancangan dan hasil verifikasi proyek tersimpan rapi pada folder `docs/`:

```text
absenta_android_new/
├── README.md                           ← Panduan Utama Proyek
├── docs/
│   ├── implementation_plan.md          ← Spesifikasi Arsitektur & Final Decision
│   ├── task_list.md                    ← Daftar Task Layer-by-Layer Selesai
│   └── walkthrough.md                  ← Indeks File & Hasil Verifikasi Build
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── local.properties
└── app/
    ├── build.gradle.kts
    ├── google-services.json
    ├── AndroidManifest.xml
    └── src/main/java/com/absenta/app/
        ├── MainApplication.kt
        ├── MainActivity.kt
        ├── data/
        │   ├── api/                     ← 9 Retrofit API Services + ApiClient
        │   ├── local/                   ← DataStore TokenManager
        │   └── model/                   ← Request/Response Models
        └── ui/
            ├── theme/                   ← Dark-First Design System
            ├── components/              ← 7 Shared DRY Components
            ├── navigation/              ← Dynamic NavGraph & ScreenRoutes
            ├── auth/                    ← LoginScreen
            ├── dashboard/               ← 3 Dashboard (Dynamic Menu, Executive, Parent)
            ├── fcm/                     ← AbsentaFirebaseService (FCM Handler)
            └── features/                ← Feature Screens (Profile, Attendance, Scanner, Schedule, Poin)
```

---

## 🛠️ Cara Menjalankan Proyek

1. Buka folder ini di **Android Studio** (Jellyfish / Koala / Newest).
2. Pastikan file `app/google-services.json` dan `local.properties` sudah ada di lokasi (sudah disalin otomatis).
3. Jalankan kompilasi:
   ```bash
   ./gradlew assembleDebug
   ```
4. Hubungkan HP Android atau emulator dan tekan **Run** (`Shift + F10`).
