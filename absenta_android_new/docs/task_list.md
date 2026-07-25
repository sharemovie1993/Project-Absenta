# Task List — Pembangunan `absenta_android_new` dari Nol

## Layer 1: Fondasi Proyek (Gradle, Manifest, Theme)
- [x] Buat `settings.gradle.kts`
- [x] Buat `build.gradle.kts` (root)
- [x] Buat `gradle.properties`
- [x] Buat `app/build.gradle.kts` (dependencies: Compose BOM, CameraX, ML Kit, Retrofit, DataStore, FCM, Accompanist, Coil)
- [x] Buat `app/src/main/AndroidManifest.xml` (Camera, Internet, Vibrate, NFC permissions)
- [x] Buat `proguard-rules.pro`
- [x] Copy Gradle Wrapper (`gradlew`, `gradlew.bat`, `gradle/wrapper/`) dari absenta_android_old
- [x] Buat `res/values/strings.xml` & `res/values/themes.xml`

## Layer 2: Design System (Dark-First Theme)
- [x] Buat `ui/theme/Color.kt` (Dark-First palette: Slate-950, Blue-500, Emerald-500)
- [x] Buat `ui/theme/Type.kt` (Typography Material 3)
- [x] Buat `ui/theme/Theme.kt` (AbsentaTheme dengan darkColorScheme)

## Layer 3: Data Layer (Models, TokenManager, ApiClient)
- [x] Buat `data/model/Models.kt` (Seluruh data class Request/Response)
- [x] Buat `data/local/TokenManager.kt` (DataStore: token, refreshToken, capabilities, userRole)
- [x] Buat `data/api/ApiClient.kt` (OkHttp + Auto-Refresh Interceptor + Retrofit)

## Layer 4: API Services
- [x] Buat `data/api/AuthService.kt`
- [x] Buat `data/api/MenuService.kt` (GET /api/menu)
- [x] Buat `data/api/ProfileService.kt`
- [x] Buat `data/api/AttendanceService.kt`
- [x] Buat `data/api/SesiKelasService.kt`
- [x] Buat `data/api/AcademicService.kt`
- [x] Buat `data/api/KesiswaanService.kt`
- [x] Buat `data/api/DashboardService.kt`
- [x] Buat `data/api/ParentService.kt`

## Layer 5: Shared UI Components (DRY)
- [x] Buat `ui/components/AbsentaTopBar.kt`
- [x] Buat `ui/components/KpiCard.kt`
- [x] Buat `ui/components/AnomalyAlertCard.kt`
- [x] Buat `ui/components/StatusBadge.kt`
- [x] Buat `ui/components/LoadingOverlay.kt`
- [x] Buat `ui/components/EmptyState.kt`
- [x] Buat `ui/components/ErrorState.kt`

## Layer 6: Navigation (Dynamic Screen Registry)
- [x] Buat `ui/navigation/ScreenRoutes.kt`
- [x] Buat `ui/navigation/NavGraph.kt` (Dynamic Screen Registry Map)

## Layer 7: Auth
- [x] Buat `ui/auth/LoginScreen.kt`
- [x] Buat `MainApplication.kt`
- [x] Buat `MainActivity.kt`

## Layer 8: Dashboard (API-Driven Dynamic Menu)
- [x] Buat `ui/dashboard/DynamicMenuDashboard.kt`
- [x] Buat `ui/dashboard/ExecutiveDashboardScreen.kt`
- [x] Buat `ui/dashboard/ParentDashboardScreen.kt`

## Layer 9: Feature Screens
- [x] Buat `ui/features/profile/MyProfileScreen.kt`
- [x] Buat `ui/features/profile/EditProfileScreen.kt`
- [x] Buat `ui/features/profile/UploadBerkasScreen.kt`
- [x] Buat `ui/features/attendance/MyAttendanceScreen.kt`
- [x] Buat `ui/features/attendance/SesiKelasManagerScreen.kt`
- [x] Buat `ui/features/attendance/CameraScannerScreen.kt`
- [x] Buat `ui/features/academic/MyScheduleScreen.kt`
- [x] Buat `ui/features/kesiswaan/MyPoinScreen.kt`

## Layer 10: FCM & App Entrypoint
- [x] Buat `ui/fcm/AbsentaFirebaseService.kt` (FCM Deep Link Handler)

## Layer 11: Verifikasi
- [x] Jalankan `./gradlew assembleDebug` → 0 error (BUILD SUCCESSFUL in 3m 31s)
- [x] Tambahkan `google-services.json` (Firebase) ke `app/`
- [x] Tambahkan icon launcher ke `res/mipmap-*/` (Adaptive SVG Vector)
