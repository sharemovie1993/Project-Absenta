## Authorization Pre-Refactor Baseline (Safeguard)

Tanggal: 2026-03-15

Tujuan dokumen ini: baseline & safeguard sebelum implementasi Phase 1 (Service Feature Guard), tanpa perubahan behavior production.

### 1) Route Baseline Snapshot
- Snapshot endpoint disimpan di: `docs/audit/route_baseline_snapshot.md`
- Snapshot ini menjadi referensi tetap selama refactor berlangsung.

### 2) Service Feature Mapping
- Mapping module -> service feature disimpan di: `src/config/service-feature-map.ts`
- Mapping ini akan menjadi sumber kebenaran untuk ServiceFeatureGuard pada Phase 1.

### 3) Tenant Entitlement Resolver (Design Baseline)
- Skeleton resolver disiapkan di: `src/modules/billing/services/tenant-entitlement.service.ts`
- Interface utama: `resolveTenantFeatures(tenantId)` menghasilkan daftar feature tenant dari agregasi subscription aktif.

### 4) Cache Strategy (Baseline)
- Cache key: `tenant:features:{tenantId}`
- TTL: 60 detik
- Invalidation disiapkan via method `invalidateTenantFeaturesCache(tenantId)` untuk dipanggil oleh workflow perubahan subscription pada fase implementasi.

### 5) Public Endpoint Definition
- Endpoint publik resmi diberi flag `config.skipAuth=true` (existing) dan distandarkan dengan `config.public=true` untuk kebutuhan bypass pada ServiceFeatureGuard Phase 1.
- Cakupan publik utama:
  - Auth (login/register/refresh/verify/reset)
  - Payment webhook
  - Invoice public link (token-based)
  - Document download token (token-based)
  - System config GET

