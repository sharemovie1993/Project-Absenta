# Fase 2.1: Arsitektur Sistem & Dynamic Routing Map

## 🏗️ Arsitektur Aplikasi (Layered Clean Architecture)

Proyek `absenta_android_new` menerapkan 4 layer arsitektur utama yang terpisah secara tegas:

```text
com.absenta.app/
├── data/
│   ├── api/         ← Network Layer (Retrofit 2.9 + OkHttp 4.12)
│   ├── local/       ← Local Storage Layer (DataStore Preferences TokenManager)
│   └── model/       ← Domain Data Models (Request/Response DTOs)
├── ui/
│   ├── theme/       ← Design System (Color, Typography, Theme)
│   ├── components/  ← Shared DRY UI Components
│   ├── navigation/  ← Navigation Registry & Dynamic NavGraph
│   ├── auth/        ← Authentication Flow
│   ├── dashboard/   ← Dynamic & Role-based Dashboards
│   ├── fcm/         ← FCM Push Notification Handler
│   └── features/    ← Feature Modules (Profile, Attendance, Academic, Kesiswaan)
├── MainActivity.kt  ← Single Activity Entry Point
└── MainApplication.kt ← Application Class (FCM Channels Setup)
```

---

## 🔄 Dynamic Navigation Flow (`GET /api/menu`)

```mermaid
graph TD
    A[Pengguna Launch App] --> B{Apakah Sudah Login?}
    B -- Belum -- C[Render LoginScreen.kt]
    C --> D[POST /api/auth/login]
    D --> E[Simpan Token & Capabilities ke DataStore]
    B -- Sudah -- E
    E --> F{Cek Capabilities / Role}
    F -- Role PARENT -- G[Render ParentDashboardScreen.kt]
    F -- Cap dashboard.view.kepsek -- H[Render ExecutiveDashboardScreen.kt]
    F -- Cap Lainnya -- I[GET /api/menu]
    I --> J[Render DynamicMenuDashboard.kt]
    J --> K[Klik Menu Card] --> L[Navigasi via NavGraph.kt]
```

---

## 🔐 Auto-Refresh Token & Security Flow

`ApiClient.kt` mengonfigurasi `OkHttpClient` dengan dua komponen keamanan:

1. **`AuthInterceptor`**: Meng-inject `Authorization: Bearer <access_token>` pada setiap HTTP request secara otomatis.
2. **`TokenAuthenticator`**: Menangkap HTTP `401 Unauthorized`. Jika access token expired, secara otomatis memanggil `POST /api/auth/refresh` dengan refresh token. Jika refresh token berhasil, request original diulangi transparan tanpa disadari pengguna.
