# Fase 4.2: Navigation Registry & Dashboard Persona Screens

## 🧭 Dynamic Navigation (`NavGraph.kt` & `ScreenRoutes.kt`)

`ScreenRoutes.kt` mendefinisikan rute dan pemetaan capability backend ke screen Composable:

```kotlin
val CAPABILITY_ROUTE_MAP = mapOf(
    "attendance.scan" to CAMERA_SCANNER,
    "attendance.sessions.create" to SESI_KELAS_MANAGER,
    "attendance.view.my" to MY_ATTENDANCE,
    "academic.schedules.view.list" to MY_SCHEDULE,
    "academic.profile.update" to MY_PROFILE,
    "kesiswaan.pelanggaran.view" to MY_POIN,
    "dashboard.view.kepsek" to EXECUTIVE_DASHBOARD
)
```

---

## 📊 3 Layar Dashboard Utama (`com.absenta.app.ui.dashboard`)

1. **`DynamicMenuDashboard.kt`**:
   - Dipanggil untuk user non-eksekutif.
   - Meminta menu dari `GET /api/menu` dan merender kartu menu operasional secara dinamis.

2. **`ExecutiveDashboardScreen.kt`**:
   - Dipanggil untuk pengguna dengan capability `dashboard.view.kepsek`.
   - Menampilkan 4 KPI Card Eksekutif (% Kehadiran Siswa, % Guru, Stat Izin/Sakit/Alpa, Gate) + Anomaly Alert Cards.

3. **`ParentDashboardScreen.kt`**:
   - Dipanggil untuk wali murid (`isParent = true`).
   - Menampilkan Multi-Child Selector, Live Gate Status Alert (Jam Datang & Pulang Real-time), dan Rekap Kehadiran.
