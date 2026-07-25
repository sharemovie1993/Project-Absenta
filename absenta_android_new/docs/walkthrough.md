# Walkthrough & Hasil Verifikasi — `absenta_android_new`

Proyek **`absenta_android_new`** telah berhasil dibangun dari nol dengan 100% arsitektur Jetpack Compose Native, 5 Persona Operasional Mobile, API-Driven Dynamic Navigation, Dark-First Design System, dan verifikasi kompilasi Gradle **SUCCESSFUL!**

---

## 🎯 Hasil Kompilasi Gradle (`assembleDebug`)

```text
BUILD SUCCESSFUL in 3m 31s
36 actionable tasks: 34 executed, 2 up-to-date
```

APK Debug berhasil diproduksi di:
`d:/BarayaProject/Project Absenta/absenta_android_new/app/build/outputs/apk/debug/app-debug.apk`

---

## 📁 Ringkasan 50 File yang Diproduksi

### 1. Build & Configuration Layer
- `build.gradle.kts`: Root build script (Kotlin 1.9, AGP 8.2.2)
- `settings.gradle.kts`: Root project settings
- `gradle.properties`: AndroidX, Non-transitive R, suppress SDK 35 warning
- `app/build.gradle.kts`: App module dependencies (Compose BOM 2024.02.00, CameraX 1.3.1, ML Kit 17.3.0, Retrofit 2.9, DataStore, FCM, Coil, 16 KB Page Alignment)
- `AndroidManifest.xml`: Permissions (Camera, Internet, Vibrate, NFC, Post Notifications) + FCM Service + Deep Link Intent Filters
- `google-services.json`: Konfigurasi Firebase disalin dari proyek lama

### 2. Design System Layer (`Dark-First`)
- `Color.kt`: Slate-950 Navy background, Blue-500 primary, Emerald/Amber/Red status colors
- `Type.kt`: Material 3 Typography Scale dengan Roboto bold font
- `Theme.kt`: AbsentaTheme darkColorScheme setup

### 3. Data & Networking Layer
- `Models.kt`: Seluruh data class Request/Response (Auth, Profile, Menu, Attendance, Session, Academic, Kesiswaan, Dashboard, Parent)
- `TokenManager.kt`: Encrypted DataStore Preferences untuk simpan token, refresh token, user role, & capabilities JSON
- `ApiClient.kt`: Retrofit + OkHttp client dengan AuthInterceptor & TokenAuthenticator auto 401 refresh

### 4. API Services (9 Files)
- `AuthService.kt`: Login, refresh token, logout, parent login
- `MenuService.kt`: `GET /api/menu` dynamic menu
- `ProfileService.kt`: Profil, edit, photo upload, document upload
- `AttendanceService.kt`: Tap gerbang, rekap absensi saya
- `SesiKelasService.kt`: CRUD Sesi, checklist absensi siswa, absen guru sesi
- `AcademicService.kt`: Jadwal pelajaran
- `KesiswaanService.kt`: Ringkasan poin pelanggaran & prestasi
- `DashboardService.kt`: Executive overview KPIs & system anomalies
- `ParentService.kt`: Children list, live gate status, child attendance

### 5. Shared DRY Components Layer (7 Files)
- `AbsentaTopBar.kt`: Top Bar universal Dark-First
- `KpiCard.kt`: Kartu KPI dengan gradient & icon
- `AnomalyAlertCard.kt`: Kartu peringatan anomali eksekutif
- `StatusBadge.kt`: Badge status kehadiran (Hadir/Izin/Sakit/Alpa)
- `LoadingOverlay.kt`: Circular progress indicator di tengah layar
- `EmptyState.kt`: Tampilan data kosong
- `ErrorState.kt`: Tampilan error koneksi dengan tombol retry

### 6. Navigation Layer
- `ScreenRoutes.kt`: Map rute navigasi & capability-to-route mapping
- `NavGraph.kt`: Dynamic screen registry mapping semua rute ke Compose screens

### 7. Auth & Main Entry Point
- `LoginScreen.kt`: Screen login universal dengan auto-detect persona routing
- `MainApplication.kt`: Application class dengan pendaftaran FCM Notification Channels
- `MainActivity.kt`: Single Activity entry point dengan dynamic start destination

### 8. Dashboards & Feature Screens (11 Files)
- `DynamicMenuDashboard.kt`: Dashboard utama API-Driven menu cards
- `ExecutiveDashboardScreen.kt`: 4 KPI Cards + System Anomaly Alerts
- `ParentDashboardScreen.kt`: Multi-Child selector + Live Gate Status
- `CameraScannerScreen.kt`: Continuous CameraX + ML Kit 17.3.0 QR Scanner, haptics, 3s cooldown
- `SesiKelasManagerScreen.kt`: Manajemen sesi kelas, buka/tutup sesi, absensi guru
- `MyAttendanceScreen.kt`: Rekap absensi harian siswa
- `MyScheduleScreen.kt`: Jadwal pelajaran mingguan
- `MyPoinScreen.kt`: Poin pelanggaran & prestasi
- `MyProfileScreen.kt`: Tampilan profil & foto
- `EditProfileScreen.kt`: Edit nama, telepon, alamat
- `UploadBerkasScreen.kt`: Photo & document gallery/camera picker + multipart upload
- `AbsentaFirebaseService.kt`: FCM Push notification handler & deep link

---

## 🚀 Langkah Menjalankan Aplikasi

1. Buka proyek **`d:/BarayaProject/Project Absenta/absenta_android_new`** di Android Studio.
2. Hubungkan HP Android atau jalankan Emulator.
3. Jalankan aplikasi (`Shift + F10` / Run).
