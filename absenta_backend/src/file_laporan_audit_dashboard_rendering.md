# Laporan Audit: Mekanisme Rendering Dashboard, State Aplikasi, RBAC, dan Alur Data

Ditujukan untuk: Pak Asep  
Ruang lingkup: Dashboard utama web (route `/dashboard`) dan seluruh mekanisme state/RBAC yang memengaruhi komposisi/visibilitas komponen dashboard + menu.

Referensi sumber utama:
- Frontend: [DashboardOverview.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/dashboard/DashboardOverview.tsx), [ProtectedRoute.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/auth/ProtectedRoute.tsx), [authStore.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/store/authStore.ts), [Sidebar.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/layout/Sidebar.tsx), [axiosInstance.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/lib/axiosInstance.ts)
- Backend: [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts), [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts), [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts), [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts), [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts), [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts), [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts)

---

## 1) State Aplikasi yang Memengaruhi Rendering Dashboard

### 1.1 State Autentikasi (session)
Sumber utama state:
- `useAuthStore` (Zustand + persist localStorage): [authStore.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/store/authStore.ts)

State kunci yang memengaruhi komposisi UI:
- `isAuthenticated`: diturunkan dari keberadaan `access_token` di localStorage saat startup.
- `isLoading`: menjadi gate utama rendering route terlindungi (spinner global).
- `user`: profil user hasil `/auth/me` atau hasil `/auth/login`. Jika `isAuthenticated` tetapi `user` null, UI menampilkan “Connection Error” (bukan redirect) di ProtectedRoute.
- `token` dan `refreshToken`: dipakai interceptor untuk Authorization header dan auto-refresh.
- `tenantId` (UI context): disimpan, tetapi backend otoritatif tetap dari JWT (ditulis eksplisit dalam store).

Local storage yang relevan:
- `access_token`, `refresh_token`, `tenant_id`, `tenant_domain`

### 1.2 State Tenant & Subscription (gating akses)
State kunci:
- `subscription` (di store) hasil `getActiveSubscription()` setelah login / loadUser.
- `subscription.status` memengaruhi:
  - Redirect hard gate di [ProtectedRoute.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/auth/ProtectedRoute.tsx):  
    - `PENDING_PAYMENT` → `/billing`  
    - `SUSPENDED` → `/suspended`  
    - `CANCELLED` → `/cancelled`
  - Disable interaktivitas item menu tertentu di [Sidebar.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/layout/Sidebar.tsx)
  - Tampilan “Langganan Tidak Aktif” (modal) di [DashboardOverview.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/dashboard/DashboardOverview.tsx)

State turunan tenant/plan yang memengaruhi menu:
- “Union Features” di Sidebar: gabungan dari `subscription.features`, `subscription.plan_snapshot.features_json`, dan `user.features` + default `CORE`. Ini mem-filter menu yang memiliki `required_features`.

### 1.3 State Permission/Capabilities (RBAC)
State kunci:
- `user.capabilities`: array string capability/action ID yang menjadi dasar:
  - akses route (ProtectedRoute `requiredCapability`)
  - penentuan “dashboard view” (role switcher) di DashboardOverview
  - visibilitas menu (backend sudah filter by capability; frontend tambah filter by features)

State turunan penting:
- `canOverview = caps.includes('dashboard.view.overview')` di DashboardOverview: memutuskan apakah dashboard mengambil data overview/chart/academic stats atau hanya mengambil data minimum.

Catatan “race condition mitigasi”:
- DashboardOverview memaksa `loadUser()` 1x untuk GURU/SISWA jika `capabilities` belum ada (agar tidak stuck 403/menu kosong).

### 1.4 State Spesifik Dashboard (UI composition)
Sumber utama: [DashboardOverview.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/dashboard/DashboardOverview.tsx)

Local UI state yang memengaruhi struktur tampilan:
- `loading`, `error` (state lokal fetch dashboard)
- `stats`, `chartData`, `academicStats`
- `trends` (dibentuk dari perbandingan hari ini vs kemarin)
- `activeView` (role switcher)
- `hasActiveTahunPelajaran` (hasil endpoint “tahun pelajaran aktif”)
- Onboarding & banners:
  - `showOnboarding`, `showTipsBanner`, `showTrialBanner`
  - `hasCompletedOnboarding` (store) dan `onboarding_seen_<userId>` (localStorage)
- Flag “aksi pertama”:
  - `first_action_done_session_<userId>` (localStorage) memengaruhi indikator onboarding/value banner
- Flag petugas:
  - `petugas_active_<userId>` (localStorage) sebagai hint (UI) dan dipakai di modal onboarding

### 1.5 State Layout/Menu (membentuk “dashboard shell”)
Sumber utama: [Sidebar.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/layout/Sidebar.tsx)

State yang memengaruhi tampilan sidebar:
- `menuTree` dari backend `/menu/tree` (React Query)
- `visibleTree` hasil filter:
  - backend sudah memfilter by capability & petugas_active (khusus SISWA)
  - frontend memfilter lagi by:
    - `required_features` (CORE/ABSENSI/KOPERASI)
    - heuristik legacy “KOPERASI” berdasarkan path/capability prefix
    - `is_active` menu dan “group header without children”
- `subscription.status` memblok klik menu non-billing tertentu (disable state).

---

## 2) RBAC / Permission Matrix yang Digunakan (SUPERADMIN, ADMIN, GURU, SISWA)

### 2.1 Model RBAC aktual (hybrid)
Model yang berjalan adalah “Hybrid Role + Struktur Organisasi” berbasis capability/action ID:
- Role permissions (role → permission/action ID): disimpan di tabel `rolePermission`.
- Struktur organisasi permissions (struktur → permission/action ID): disimpan di tabel `strukturPermission`.
- User effective capabilities dihitung oleh backend: [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts)
  - RolePermissions + (GuruStrukturOrganisasi aktif) + (SiswaStrukturOrganisasi aktif)

Akses endpoint dijaga oleh:
- Middleware `requireCapability(...)`: [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts)
  - SUPERADMIN bypass
  - ADMIN memakai baseline `ADMIN_CAPABILITIES` (hardcoded) + optional merge `role.permissions` bila ada
  - Role lain: cek cepat dari request.user.role.permissions / request.user.capabilities, lalu fallback cek DB via AuthorizationService

Visibilitas menu di backend:
- `/menu/tree` → `menuService.treeForUser(...)` memfilter menu berbasis:
  - SUPERADMIN: semua visible (tetap tunduk `is_active`)
  - selain SUPERADMIN:
    - jika menu punya `required_capability` → visible jika capability ada
    - jika tidak punya `required_capability` → fallback ke `menuRole.can_view`
    - `requires_petugas_active` berlaku hanya untuk SISWA: jika tidak aktif → hidden

### 2.2 Baseline capabilities per role (untuk SUPERADMIN/ADMIN/GURU/SISWA)
Sumber: “Policy Engine Seeding” [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts)

Ringkasan baseline (tingkat modul):
- SUPERADMIN:
  - baseline = seluruh Permission ID di DB (full access) + bypass tenant scope jika `tenant_id` null / “system”.
- ADMIN:
  - baseline “admin operasional tenant”: akademik, absensi, billing tenant, dokumen, dashboard overview, user management, sekolah profile.
  - tetap ada “explicit deny” untuk kapabilitas global tertentu pada middleware (defense in depth).
- GURU:
  - baseline: view akademik terbatas + rekap/view absensi + dashboard guru + akses data master tertentu.
  - bisa bertambah lewat Struktur Organisasi (mis. Kepala Sekolah/Kurikulum/Kesiswaan/Wali Kelas/Gerbang/TU/Sarpras/Hubin).
- SISWA:
  - baseline: dashboard siswa + rekap pribadi + preferensi notifikasi + beberapa view terbatas.
  - bisa bertambah lewat Struktur Organisasi siswa (mis. PETUGAS_KELAS) yang memberi capability operasional absensi.

### 2.3 Permission Matrix (menu/modul/widget) untuk acceptance testing
Catatan penting untuk membaca matrix:
- “Menu Visible” = hasil kombinasi backend `/menu/tree` (capability + petugas_active) dan frontend (required_features + subscription gating).
- “Route Access” = ditentukan oleh ProtectedRoute (frontend) + requireCapability (backend endpoint).

Tabel A — Akses Modul Dashboard & Menu Utama

| Area | Path/UI | Gate Utama | SUPERADMIN | ADMIN | GURU | SISWA |
|---|---|---:|---:|---:|---:|---:|
| Dashboard utama | `/dashboard` | `dashboard.view.overview` | YA | YA | YA | YA |
| Sidebar menu tree | `/menu/tree` | token valid + capability filter | YA (semua, kecuali `is_active=false`; masih bisa terpotong oleh feature filter UI) | YA (berdasarkan baseline) | YA (berdasarkan baseline + struktur) | YA (berdasarkan baseline + struktur + petugas_active) |
| Settings tenant | `/settings` | `core.sekolah.view.profile` (menu) + ProtectedRoute per page | YA | YA | bergantung cap/seed | TIDAK |
| Billing / Subscription | `/billing/...` | route-level caps per page + “subscription bypass for billing endpoints” | YA | YA | umumnya view | view terbatas |
| Superadmin pages | `/superadmin/...` | `requiredRole=SUPERADMIN` + capability tertentu | YA | TIDAK | TIDAK | TIDAK |

Tabel B — Dashboard “Role Views” (komposisi panel di DashboardOverview)

| View Dashboard | Muncul jika | SUPERADMIN | ADMIN | GURU | SISWA |
|---|---|---:|---:|---:|---:|
| Default Overview (Admin-style) | `availableViews` kosong → fallback | YA | YA | bisa (jika views kosong) | bisa (jika views kosong) |
| Guru Dashboard | role mengimplikasikan guru atau punya cap `dashboard.view_guru`/`dashboard.view_kepsek` | bisa (punya cap, tapi tidak otomatis karena roleName SUPERADMIN tidak termasuk “impliesGuru”) | biasanya TIDAK | YA | tidak default |
| Siswa Dashboard | `roleName === 'SISWA'` | tidak default | tidak default | tidak default | YA |
| Petugas Kelas | cap `attendance.sessions.update.attendance` | YA (full cap) | YA (admin cap) | bisa (jika diberi cap) | YA jika petugas |
| Petugas Gerbang | cap `attendance.gate.tap.entry/exit/face.verify` | YA | YA | YA jika struktur gerbang | YA jika struktur gerbang |
| Kepala Sekolah | roleName `KEPALA_SEKOLAH` atau cap `dashboard.view_kepsek` | YA (full cap) | tidak default | YA jika struktur | tidak |
| Kurikulum | roleName `KURIKULUM/WAKAKUR` atau cap `dashboard.view_kurikulum` | YA | tidak default | YA jika struktur | tidak |
| Kesiswaan | roleName `KESISWAAN/WAKASIS` atau cap `dashboard.view_kesiswaan` | YA | tidak default | YA jika struktur | tidak |
| Wali Kelas | cap `dashboard.view_walikelas` | YA | tidak default | YA jika struktur | tidak |
| Hubin/Sarpras/TU | cap “hubin/sarpras/tu” tertentu | YA | tidak default | YA jika struktur | tidak |

---

## 3) Conditional Rendering Logic (berdasarkan kombinasi state + struktur + role)

### 3.1 Gate di level route (paling atas)
Urutan keputusan (ringkas) di ProtectedRoute:
1) Jika `isLoading` → tampilkan spinner fullscreen
2) Jika `!isAuthenticated` → redirect `/login`
3) Jika authenticated tapi `user` null → tampilkan layar error koneksi (tanpa redirect)
4) Subscription gating:
   - `PENDING_PAYMENT` → redirect `/billing`
   - `SUSPENDED` → redirect `/suspended`
   - `CANCELLED` → redirect `/cancelled`
5) RBAC:
   - `requiredRole(s)` → “Access Denied” jika mismatch
   - `requiredCapability` → “Access Denied” jika tidak punya capability

### 3.2 Gate di level menu/layout (Sidebar)
Pola filter menu yang aktif:
- Backend sudah menghapus item yang tidak lolos capability/petugas_active (untuk SISWA).
- Frontend melakukan filter tambahan:
  - `required_features` (CORE/ABSENSI/KOPERASI)
  - heuristik “KOPERASI” berbasis path/capability prefix
  - `is_active` dan “parent group tanpa child”
- Interaktivitas item menu:
  - saat status subscription non-aktif tertentu, item menu non-billing di-disable (UI), meski terlihat.

### 3.3 Gate di level DashboardOverview (komposisi panel)
Urutan keputusan (ringkas):
1) Jika auth store masih loading (`isAuthLoading`) → loader section
2) Jika `loading` lokal fetch dashboard → loader section
3) Jika `error`:
   - jika dideteksi sebagai “subscription issue” → modal khusus (dan CTA ke halaman billing)
   - else → tampilkan error umum
4) Jika `availableViews.length > 0`:
   - tampilkan role switcher jika view >= 2
   - render `currentView.component` (lazy + suspense)
5) Jika `availableViews` kosong:
   - render Default Overview (Admin-style) + onboarding modal + banners + cards + chart, dsb.

### 3.4 Interaksi struktur organisasi → UI
Struktur organisasi memengaruhi UI melalui “capabilities” yang diberikan:
- Guru yang punya tugas tambahan (KEPALA_SEKOLAH/KURIKULUM/KESISWAAN/WALIKELAS/GERBANG/TU/SARPRAS/HUBIN) akan mendapat view tambahan dan/atau menu tambahan.
- Siswa yang menjadi PETUGAS_KELAS:
  - mendapat capability `attendance.sessions.update.attendance`
  - UI Siswa menampilkan panel tambahan “PETUGAS KELAS”
  - backend menu menampilkan item yang memerlukan `requires_petugas_active` hanya bila petugas aktif.

---

## 4) Flow Data dari Backend (API, WebSocket, Local Storage)

### 4.1 API utama yang memasok state dashboard
Autentikasi & profil:
- POST `/auth/login` → mengembalikan `{ user, token, refreshToken }` (user dapat membawa `capabilities`)  
  Sumber: [auth.api.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/auth.api.ts)
- GET `/auth/me` → memuat profil user dan `capabilities` terkini

Subscription & tenant features:
- GET `/subscription/active` (melalui `getActiveSubscription`) → `subscription.status` + features

Menu:
- GET `/menu/tree` → menu tree yang sudah terfilter capability (+ petugas_active untuk SISWA)  
  Backend: [menu.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/controllers/menu.controller.ts), [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts)  
  Frontend: [menu.api.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/menu.api.ts), [Sidebar.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/layout/Sidebar.tsx)

Dashboard data (overview & widget):
- GET `/dashboard/overview` (cap: `dashboard.view.overview`)
- GET `/dashboard/grafik/siswa/:bulan` (cap: `attendance.reports.view`)
- GET `/dashboard/statistik/kelas/:tanggal` (cap gabungan: `attendance.reports.view` + `academic.structures.view.list` + `academic.teaching.rekap`)
- GET `/dashboard/guru/attendance` (cap: `dashboard.view.teacher_attendance`)
- GET `/dashboard/kesiswaan/violations` (cap: `dashboard.view.violation_stats`)
- GET `/dashboard/kurikulum/supervision` (cap: `curriculum.supervision.view.schedule`)
- GET `/dashboard/kepsek/escalations` (cap: `dashboard.view.overview`)

### 4.2 Header & tenant-scoping (anti cross-tenant)
Frontend interceptor:
- Menambahkan Authorization `Bearer <token>` untuk non-public endpoint.
- Untuk “system superadmin”, menambahkan `X-Skip-Tenant: true` dan menghapus `X-Tenant-ID`.
- Menyertakan metadata host/subdomain untuk observabilitas.
Sumber: [axiosInstance.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/lib/axiosInstance.ts)

Backend guard:
- `authMiddleware` memverifikasi JWT dan menolak mismatch tenant header vs tenant di token.
- `tenantMiddleware` memastikan tenant context dan menerapkan `subscriptionGuard`.
Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)

### 4.3 WebSocket events yang relevan untuk state/monitoring
Infrastruktur real-time tersedia, terutama untuk:
- update absensi siswa (room `siswa:<id>`, event `attendance_update`)
- feed absensi (event `attendance_feed_update`)
- update tenant metrics/activities/logs/attendance/billing/users (event `tenant_*_update`)
Sumber: [socket.events.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/realtime/socket.events.ts), [socket.rooms.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/realtime/socket.rooms.ts)

Catatan: DashboardOverview saat ini dominan berbasis HTTP fetch; mekanisme WS lebih banyak dipakai oleh halaman tenant-detail/superadmin dan feed tertentu.

### 4.4 Local storage sebagai sumber state UI
Key yang memengaruhi komposisi/CTA:
- `onboarding_seen_<userId>`: menahan onboarding modal
- `onboarding_completed_<tenantId>`: menandai onboarding selesai (store)
- `first_action_done_session_<userId>`: sinyal “aksi pertama sudah dilakukan”
- `petugas_active_<userId>`: hint status petugas untuk onboarding & dashboard siswa
- `tenant_domain`: dipakai untuk header observabilitas

---

## 5) Dokumentasi untuk Acceptance Testing & Audit Keamanan

### 5.1 Diagram State-Transition (Dashboard Screen)
Legenda:
- Event ditulis di atas panah
- Kondisi ditulis dalam tanda kurung

STATE DIAGRAM A — Session & Route Gate

S0: START
  → (localStorage has access_token) → S1: AUTH_LOADING
  → (no token) → S2: UNAUTHENTICATED

S2: UNAUTHENTICATED
  → (user login success) → S1: AUTH_LOADING

S1: AUTH_LOADING
  → (loadUser success) → S3: AUTHENTICATED_READY
  → (loadUser 401/403) → S2: UNAUTHENTICATED (logout)
  → (loadUser network/5xx) → S4: AUTHENTICATED_BUT_PROFILE_MISSING

S4: AUTHENTICATED_BUT_PROFILE_MISSING
  → (reload success) → S3
  → (token invalid) → S2

S3: AUTHENTICATED_READY
  → (subscription=PENDING_PAYMENT) → S5: BILLING_REDIRECT
  → (subscription=SUSPENDED) → S6: SUSPENDED_PAGE
  → (subscription=CANCELLED) → S7: CANCELLED_PAGE
  → (subscription ok) → S8: DASHBOARD_ROUTE_ALLOWED

STATE DIAGRAM B — DashboardOverview Rendering

S8: DASHBOARD_ROUTE_ALLOWED
  → (caps missing for GURU/SISWA) → S9: CAPABILITY_REFRESH (trigger loadUser once)
  → (caps include dashboard.view.overview) → S10: FETCH_DASHBOARD_FULL
  → (caps missing dashboard.view.overview) → S11: FETCH_DASHBOARD_MINIMAL

S10: FETCH_DASHBOARD_FULL
  → (success) → S12: RENDER
  → (error subscription issue heuristic) → S13: SUBSCRIPTION_ISSUE_MODAL
  → (other error) → S14: ERROR_SCREEN

S11: FETCH_DASHBOARD_MINIMAL
  → (success) → S12: RENDER (tanpa overview cards/chart)
  → (error) → S14: ERROR_SCREEN

S12: RENDER
  → (availableViews.length > 0) → S15: RENDER_ROLE_VIEW (Role switcher optional)
  → (availableViews.length === 0) → S16: RENDER_DEFAULT_OVERVIEW

S16: RENDER_DEFAULT_OVERVIEW
  → (shouldOnboard && !onboarding_seen_<userId> && (!hasCompletedOnboarding || emptyState)) → S17: ONBOARDING_MODAL_OPEN

### 5.2 Permission Matrix (untuk audit dan kriteria acceptance)

Matrix inti (paket minimal yang wajib diuji):
- Dashboard view: `dashboard.view.overview`
- Menu tree: `/menu/tree` harus menampilkan item sesuai capability + features + petugas_active
- Subscription gating: redirect dan disable menu sesuai status
- “Struktur organisasi menambah capability”: role GURU/SISWA yang diberi struktur harus memunculkan view/menu tambahan

Checklist Acceptance Test (per role):
- SUPERADMIN:
  - Bisa membuka `/dashboard` dan tetap tidak terikat tenant jika system-level (header `X-Skip-Tenant` aktif).
  - Bisa mengakses halaman superadmin yang memiliki guard `requiredRole=SUPERADMIN`.
- ADMIN:
  - Bisa membuka `/dashboard` dan melihat Default Overview (bukan role switcher).
  - Menu tampil sesuai `required_features` plan tenant (mis. KOPERASI hanya jika feature ada).
  - Saat `PENDING_PAYMENT`, redirect otomatis ke `/billing` dan menu non-allowed di-disable.
- GURU:
  - Bisa membuka `/dashboard` dan melihat Guru Dashboard sebagai view tersedia.
  - Jika diberi struktur (mis. KURIKULUM/KESISWAAN/WALIKELAS/GERBANG), role switcher menampilkan view tambahan dan endpoint terkait tidak 403.
- SISWA:
  - Bisa membuka `/dashboard` dan melihat Siswa Dashboard.
  - Jika menjadi PETUGAS_KELAS (capability `attendance.sessions.update.attendance`), panel “PETUGAS KELAS” muncul dan menu item yang mensyaratkan `requires_petugas_active` muncul hanya bila petugas aktif.

### 5.3 Temuan audit keamanan (ringkas, actionable)
- Security boundary utama untuk akses data adalah “capability check” pada backend (`requireCapability`) dan tenant isolation pada `authMiddleware` + `tenantMiddleware`.
- Visibilitas menu berbasis `required_features` saat ini dilakukan di frontend (client-side). Wajib dipastikan semua endpoint sensitif tetap diproteksi di backend (capability + tenant scope), karena menu hide tidak sama dengan authorization.
- Dashboard UI melakukan heuristik “subscription issue” berbasis pesan error; untuk audit, kriteria harus berbasis status subscription dari backend (single source of truth), bukan string-matching.

---

## Ringkasan Perubahan
- Membuat laporan audit ini.

