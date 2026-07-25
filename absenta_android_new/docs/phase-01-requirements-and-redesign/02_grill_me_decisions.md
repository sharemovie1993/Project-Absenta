# Fase 1.2: Keputusan Wawancara (/grill-me) & Dynamic Capability Matrix

Melalui sesi wawancara mendalam (*grill-me*), telah disepakati **9 Keputusan Kunci** yang melandasi seluruh arsitektur proyek `absenta_android_new`:

---

## 📑 9 Keputusan Kunci Wawancara

| # | Bidang | Keputusan Disepakati | Rationale / Alasan |
|:--|:---|:---|:---|
| 1 | **Login Flow** | Single Login Screen dengan auto-detect persona | Memudahkan pengguna tanpa perlu memilih role manual saat mau masuk |
| 2 | **Dynamic Routing** | API-Driven (`GET /api/menu`) berdasarkan `user.capabilities` | Menghindari hardcoding 35+ modul backend di Android |
| 3 | **Auth & Session** | Encrypted DataStore Preferences + OkHttp Auto 401 Refresh | Keamanan tinggi & tidak perlu re-login saat token kedaluwarsa |
| 4 | **Sesi Kelas Input** | Multi-Input: Checklist Massal + Quick Search RFID/NISN + Mini QR Camera | Fleksibilitas tinggi bagi petugas kelas/guru di kelas |
| 5 | **Scanner Gerbang** | Continuous CameraX + ML Kit 17.3.0 + Haptics + 3s Cooldown | Kecepatan scan hingga 30 FPS untuk ribuan siswa di gerbang sekolah |
| 6 | **Color Theme** | **Dark-First** (Slate-950 Navy) | Kontras tinggi agar mudah dibaca di bawah sinar matahari langsung |
| 7 | **Offline Mode** | Online-First + Graceful Degradation (cache read-only saat offline) | Menjaga konsistensi data real-time dengan server |
| 8 | **Push Notification**| Firebase Cloud Messaging (FCM) dengan Deep Link Routing | Alert instan untuk orang tua (gate) & petugas kelas (sesi) |
| 9 | **UI Engine** | 100% Jetpack Compose Material 3 Native (0 WebView) | Performa 60 FPS mulus & APK super slim |

---

## 🔑 Pemetaan Capability Backend (`position-capabilities.ts`)

Aplikasi Android mengonsumsi file `position-capabilities.ts` dari `absenta_backend/src/config/position-capabilities.ts`:

- `attendance.scan` ➔ Terminal Scanner Gerbang (`CameraScannerScreen.kt`)
- `attendance.sessions.create` ➔ Manajemen Sesi Kelas (`SesiKelasManagerScreen.kt`)
- `attendance.view.my` ➔ Rekap Absensi Saya (`MyAttendanceScreen.kt`)
- `academic.schedules.view.list` ➔ Jadwal Pelajaran (`MyScheduleScreen.kt`)
- `kesiswaan.pelanggaran.view` ➔ Poin Pelanggaran & Prestasi (`MyPoinScreen.kt`)
- `dashboard.view.kepsek` ➔ Dashboard Eksekutif (`ExecutiveDashboardScreen.kt`)
- Role `PARENT` (modul `parent-app`) ➔ Dashboard Orang Tua (`ParentDashboardScreen.kt`)
