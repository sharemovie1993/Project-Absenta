## Authorization Architecture Blueprint (Target Refactor)

Tanggal: 2026-03-15

Dokumen ini adalah blueprint desain arsitektur authorization final untuk platform Absenta (multi-tenant SaaS, multi-service platform) berdasarkan hasil audit:
- Platform Service Access Audit
- Capability Enforcement Audit

Tidak ada perubahan kode pada tahap ini.

---

## 1) Current Authorization Architecture

### 1.1 Pipeline request saat ini (observasi implementasi)
- Request masuk melewati logging global + error handler.
- AuthMiddleware global memverifikasi JWT dan menempelkan konteks user pada request.
- Pada group `/api` protected routes: TenantMiddleware menjalankan resolusi tenant + tenant status check + core subscription check.
- Service access layer (tenant entitlements) dijalankan oleh CapabilityGuard yang aktif hanya bila route/module memiliki `route config capability` (ModuleCapability).
- Capability enforcement (action permission) dilakukan per-route via `requireCapability(...)` dan sebagian via `authorize(...)`.

### 1.2 Model otorisasi yang berjalan
- Role:
  - Role system (mis. SUPERADMIN) memiliki bypass untuk sebagian check.
  - Role lain menjadi basis untuk capability/action permission (langsung atau via resolusi AuthorizationService).
- Capability (action permission):
  - Dipakai oleh `requireCapability` untuk izin per endpoint.
  - Sumber izin kombinasi: hardcoded untuk ADMIN, cache/attachment di user object, dan fallback query DB via AuthorizationService.
- Subscription (core platform):
  - Dicek oleh `subscriptionGuard` (dipanggil dari TenantMiddleware) untuk menahan akses non-billing.
- Service feature / module entitlements:
  - Dicek oleh CapabilityGuard (ModuleCapability) menggunakan agregasi `Plan.features_json` dari subscription tenant yang aktif.

---

## 2) Problem Analysis (berdasarkan audit)

### 2.1 Service access tidak konsisten
- Service access enforcement bergantung pada apakah module menetapkan `route config capability`.
- Sebagian module/service tidak menetapkan guard service sehingga service access berpotensi hanya tergantung UI/menu atau hanya tergantung permission per endpoint.

### 2.2 Endpoint tanpa capability guard (action permission)
- Banyak endpoint tidak memakai `requireCapability` karena mengandalkan pola lain (authorize role-only, atau tidak ada guard per-route).
- Hal ini membuat konsistensi auditability dan governance capability menjadi lemah.

### 2.3 Role based authorization masih tersisa
- Terdapat endpoint yang memakai `authorize(...)` tanpa mapping capability per endpoint (role-centric).
- Pola ini tidak kompatibel dengan target “role hanya container capability”.

### 2.4 Capability tidak valid terhadap Action Catalog
- Ditemukan capability yang dipakai di route tetapi tidak terdaftar di Action Catalog canonical.
- Ini mengakibatkan mismatch antara policy model dan enforcement runtime.

### 2.5 Subscription guard belum kuat
- Core subscription enforcement masih memiliki celah (status tertentu tidak diblok secara tegas untuk non-billing).
- Risiko: akses core tetap berjalan walaupun subscription tidak memenuhi kebijakan governance.

---

## 3) Target Authorization Architecture (Final)

### 3.1 Pipeline final yang diinginkan
Request
→ Logging Middleware
→ Auth Middleware
→ Tenant Resolver
→ Tenant Status Guard
→ Subscription Guard (Core)
→ Service Feature Guard (ModuleCapability)
→ Capability Guard (Action Permission)
→ Data Scope Guard (row-level / domain scope)
→ Controller

### 3.2 Fungsi tiap layer
- Logging Middleware: correlation-id, audit trace, error boundary aman.
- Auth Middleware: verifikasi token, mengisi user context, melarang request tanpa auth untuk protected routes.
- Tenant Resolver: sumber kebenaran tenant dari token; header/host hanya konteks.
- Tenant Status Guard: menahan tenant suspended/deleted (dengan pengecualian flow tertentu).
- Subscription Guard (Core): memastikan akses platform core hanya jika subscription core valid (non-billing).
- Service Feature Guard: memastikan tenant memiliki entitlement untuk module service (ABSENSI/KOPERASI/REPORTING/dll).
- Capability Guard (Action Permission): memastikan user punya capability sesuai Action Catalog untuk endpoint yang diminta.
- Data Scope Guard: membatasi data yang terlihat/diubah sesuai struktur organisasi (guru/wali kelas/petugas) dan konteks tenant.

---

## 4) Service Feature Governance Model

### 4.1 Model layanan platform
Layanan platform dipetakan menjadi entitlements level-module:
- CORE_PLATFORM (CORE)
- ABSENSI
- KOPERASI
- REPORTING
- PPDB (future)
- RAPOR (future)
- PERPUSTAKAAN (future)

### 4.2 Sumber entitlements layanan
- Sumber kebenaran entitlements layanan: `Plan.features_json` pada subscription yang aktif.
- Entitlements tenant = agregasi `features_json` dari semua subscription aktif dalam tenant (multi-subscription compatible).

### 4.3 Cara backend menentukan akses service
- Setiap module service wajib menetapkan `route config capability` (ModuleCapability) pada level module.
- Service Feature Guard wajib memblokir request ke module service bila tenant tidak memiliki entitlement sesuai ModuleCapability.
- Pengecualian hanya untuk endpoint publik resmi (token-based/webhook) yang memang tidak memerlukan tenant subscription.

### 4.4 Snapshot vs mutable plan
- Untuk konsistensi governance dan audit trail, entitlement enforcement idealnya membaca snapshot subscription (immutable) untuk request historical correctness.
- Penggunaan Plan mutabel sebagai sumber runtime harus memiliki kebijakan perubahan plan yang aman (atau migrasi menuju penggunaan snapshot sebagai sumber entitlements).

---

## 5) Capability Model (Action Permission)

### 5.1 Sumber capability
- Action Catalog canonical adalah sumber kebenaran capability.
- Format capability: `domain.resource.action` (dot-separated).

### 5.2 Hubungan capability dengan endpoint
- Setiap endpoint non-publik wajib memiliki mapping capability yang eksplisit.
- Mapping harus konsisten: satu endpoint → satu capability utama (atau daftar capability alternatif bila diperlukan).

### 5.3 Aturan validasi capability
- Capability yang dipakai pada enforcement harus:
  - terdaftar di Action Catalog canonical
  - mengikuti format yang benar
  - tidak memakai capability legacy/alias tanpa mapping resmi

---

## 6) RBAC Model (Role sebagai container capability)

### 6.1 Prinsip
- Role bukan sumber keputusan akses; role hanya container capability.
- Semua keputusan endpoint-level harus berbasis capability.

### 6.2 Role utama (konseptual)
- SUPERADMIN: operator platform, bisa bypass layer tertentu secara terkontrol (system scope).
- ADMIN: admin tenant, default capability luas sesuai kebijakan governance tenant.
- GURU: capability terbatas sesuai struktur organisasi/assignment.
- SISWA: capability minimal, sebagian berbasis petugas/assignment untuk fitur tertentu.

### 6.3 Kebijakan akses
- Tidak ada endpoint yang hanya mengandalkan role check tanpa capability mapping.
- Endpoint role-only yang diperlukan untuk operasi platform harus dimodelkan kembali sebagai capability khusus (dan masuk Action Catalog).

---

## 7) Data Scope Model (Tenant & Struktur Organisasi)

### 7.1 Prinsip scope
- Tenant scope adalah boundary utama: semua data tenant-scoped harus dibatasi oleh tenant resolver.
- User scope diturunkan dari struktur organisasi:
  - guru hanya akses kelas yang ditugaskan
  - wali kelas akses kelas binaan
  - petugas akses hanya area yang ditugaskan (mis. scope attendance)

### 7.2 Implementasi target
- DataScope middleware menjadi layer standar setelah capability pass.
- DataScope harus konsisten di semua domain yang menyajikan data tenant (academic, attendance, kesiswaan, kurikulum, dll).

---

## 8) Migration Strategy (bertahap, aman)

### 8.1 Tujuan migrasi
- Menambahkan service feature guard yang konsisten di seluruh module service.
- Menguatkan subscription guard core dan menyatukan kebijakan status.
- Menormalkan capability enforcement di seluruh endpoint non-publik.
- Menghapus role based authorization yang tersisa.
- Menyelaraskan capability yang tidak valid dengan Action Catalog.

### 8.2 Prinsip migrasi
- Bertahap per module dan per kategori endpoint (read, write, admin-only).
- Setiap fase harus menjaga backward compatibility (dengan fallback sementara) sebelum hard cut.
- Setiap perubahan capability harus disertai update Action Catalog canonical (atau mapping resmi), bukan membuat string baru sembarangan.

---

## 9) Refactor Phases (proposal)

### Phase 1 – Service Feature Guard
- Menetapkan ModuleCapability secara konsisten untuk semua module service yang tergolong layanan terpisah.
- Menetapkan pengecualian endpoint publik yang resmi.

### Phase 2 – Subscription Guard Hardening
- Menegaskan kebijakan status subscription core untuk seluruh endpoint non-billing.
- Menghilangkan celah status yang seharusnya tidak boleh mengakses core.

### Phase 3 – Capability Enforcement Normalization
- Menambahkan `requireCapability` untuk endpoint yang belum punya mapping capability.
- Menyelaraskan endpoint yang memakai authorize role-only menjadi capability-based.

### Phase 4 – RBAC Simplification
- Menghapus logika role-centric di middleware/route yang tidak lagi diperlukan.
- Menyatukan sumber capability user (mengurangi hardcoded/fallback yang tidak perlu).

### Phase 5 – Action Catalog Cleanup
- Memperbaiki capability yang tidak valid dan memastikan semua enforcement merujuk ke Action Catalog canonical.

