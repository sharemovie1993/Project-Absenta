## Authorization Phase 1 – Implementation Report

Tanggal: 2026-03-15

- Implementasi ServiceFeatureGuard dan integrasi ke pipeline `/api` protected routes sebelum CapabilityGuard.
- Integrasi TenantEntitlementResolver (tenantEntitlementService) untuk membaca entitlement dari subscription/plan dengan cache TTL 60 detik.
- Penggunaan `src/config/service-feature-map.ts` sebagai sumber kebenaran mapping module -> feature (default CORE).
- Bypass endpoint publik melalui `config.public=true` (tanpa mengubah endpoint yang memang sudah public/skipAuth).
- Penambahan baseline/observability event saat access ditolak: `SERVICE_FEATURE_NOT_ENABLED`.
- Git: commit dan push.

