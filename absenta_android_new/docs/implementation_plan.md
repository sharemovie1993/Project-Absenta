# Implementation Plan — Spesifikasi FINAL LENGKAP `absenta_android_new`

Dokumen ini berisi **spesifikasi arsitektur dan fungsionalitas FINAL & LENGKAP** untuk pembangunan proyek `absenta_android_new` dari nol. Seluruh keputusan desain telah disepakati bersama melalui sesi wawancara mendalam (*grill-me*).

---

## 🏛️ Keputusan Desain Final (Disepakati via /grill-me)

| Parameter | Keputusan Final |
| :--- | :--- |
| **Navigasi Menu** | API-Driven (`GET /api/menu`) — backend memfilter 35+ modul berdasarkan capabilities |
| **Screen Routing** | Dynamic Screen Registry Map di `NavGraph.kt` |
| **Auth & Session** | DataStore Encrypted + OkHttp Auto Refresh Token Interceptor |
| **Color Theme** | **Dark-First** (Navy/Slate-950 background, teks putih) |
| **Offline Mode** | Online-First + Graceful Degradation (cache read-only saat offline) |
| **FCM Notification** | Lengkap: Gate Alert (Ortu) + Sesi Dibuka (Petugas) + Pengumuman (Deep Link) |
| **UI Engine** | 100% Jetpack Compose Material 3 Native (0 WebView) |
| **Min SDK** | 26 (Android 8.0) — Target SDK 35 (Android 15) |

---

## 🎭 Matriks 5 Persona Operasional (Dynamic Role Routing)

### 👦 Persona 1: SISWA
Capability trigger: `academic.profile.update`, `academic.schedules.view.list`, `kesiswaan.pelanggaran.view`
- Dashboard Kehadiran Personal Hari Ini.
- Rekap Presensi & Jadwal Pelajaran Saya.
- Ringkasan Poin Pelanggaran & Prestasi Saya.
- My Profile, Edit Data Diri, & Upload Berkas/Foto Native (Camera/Gallery Picker).

### 👨‍👩‍👧 Persona 2: ORANG TUA / WALI SISWA
Auth via: modul `parent-app` (token orang tua terpisah)
- **Multi-Child Selector**: Pilih anak jika memiliki >1 anak.
- **Live Gate Status**: Jam datang & pulang ananda hari ini.
- Rekap Absensi & Poin Ananda.
- FCM Deep Link Notification saat anak tap gerbang.

### ⏱️ Persona 3: PETUGAS KELAS / GURU / WALIKELAS
Capability trigger: `attendance.sessions.create`, `attendance.sessions.update.attendance`
- CRUD Sesi Absensi Kelas (Buka/Edit/Tutup Sesi).
- Presensi Multi-Input: Checklist Massal + Quick Search NISN/RFID + Mini QR Camera Scan.
- Pencatatan kehadiran Guru Pengajar Sesi.

### 🚪 Persona 4: PETUGAS GERBANG / GURU PIKET
Capability trigger: `attendance.scan`
- Continuous CameraX + ML Kit 17.3.0 QR Scanner Terminal (30 FPS).
- Sakelar `GERBANG_DATANG` vs `GERBANG_PULANG`.
- Haptic Vibration, Audio Beep, 3-Second Cooldown Guard.

### 📊 Persona 5: PEJABAT EKSEKUTIF / KEPSEK / WAKASEK / PENGAWAS
Capability trigger: `dashboard.view.kepsek`, `dashboard.view.overview`
- Executive Summary KPI Matrix (% Kehadiran Siswa, % Guru Mengajar, Stat Izin/Sakit/Alpa, Status Gerbang).
- System Anomaly Alert Card (Sesi Belum Dibuka, Lonjakan Alpa).

---

## 🎨 UI Design System (`Dark-First`)

- **Background Utama**: `Color(0xFF0F172A)` (Slate-950 Navy)
- **Surface Card**: `Color(0xFF1E293B)` (Slate-800)
- **Primary Accent**: `Color(0xFF3B82F6)` (Blue-500)
- **Success**: `Color(0xFF10B981)` (Emerald-500)
- **Error/Danger**: `Color(0xFFEF4444)` (Red-500)
- **Typography**: Material 3 Default (Roboto) + FontWeight.Bold untuk data kritikal
- **Animasi**: Jetpack Compose `AnimatedVisibility`, `animateColorAsState`

---

## 🔍 Verification Plan & Build Results

- `./gradlew.bat assembleDebug` → **BUILD SUCCESSFUL in 3m 31s** (0 Error)
- Output APK Debug: `app/build/outputs/apk/debug/app-debug.apk`
