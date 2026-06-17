## Authorization Phase 1 – Validation Report

Tanggal: 2026-03-15

### 1) Feature Gating Validation
- ServiceFeatureGuard aktif pada pipeline `/api` protected routes sebelum CapabilityGuard.
- Service dengan feature non-CORE akan ditolak jika tenant tidak memiliki entitlement yang dibutuhkan, dengan response 403 `SERVICE_FEATURE_NOT_ENABLED`.

### 2) CORE Module Validation
- Module yang tidak memiliki mapping feature spesifik menggunakan default `CORE` dan tidak terblokir oleh ServiceFeatureGuard.

### 3) Public Endpoint Validation
- Endpoint publik yang memang sudah bypass auth tetap bypass ServiceFeatureGuard melalui `config.skipAuth=true` dan/atau `config.public=true`.

### 4) Subscription Edge Case (Observasi)
- Subscription Guard tetap berjalan lebih dulu di TenantMiddleware untuk protected routes.
- TenantEntitlementResolver membaca subscription aktif dan mengembalikan feature agregat dari plan aktif.

### 5) Module Coverage Validation
- Mapping module -> feature menggunakan `src/config/service-feature-map.ts`.
- Module yang belum dimapping akan diperlakukan sebagai `CORE` (default).

### 6) Route Baseline Comparison
- Perbandingan snapshot baseline vs kondisi saat ini: tidak ada endpoint yang hilang/bertambah, dan tidak ada perubahan status PUBLIC/PROTECTED.
- Total endpoint (baseline): 360
- Total endpoint (current): 360

### 7) Observability Check
- Ketika service tidak diaktifkan: 403 dengan payload `SERVICE_FEATURE_NOT_ENABLED`.
- Event observability ditulis dengan event name `SERVICE_FEATURE_NOT_ENABLED`.

### Hasil Akhir
- Tidak ditemukan issue/regression dari baseline comparison.
- Phase 1 dinyatakan stabil untuk lanjut ke Phase 2 (Subscription Guard Hardening).

