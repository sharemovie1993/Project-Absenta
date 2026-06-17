## Authorization Phase 4 – Implementation Report

Tanggal: 2026-03-15

- Centralize capability resolution ke `AuthorizationService.resolveUserCapabilities(userId)` dan `AuthorizationService.isUserAuthorized(userId, requiredCaps)`.
- Simplifikasi `requireCapability(...)`: seluruh keputusan akses hanya mengacu ke AuthorizationService; logging event `CAPABILITY_ACCESS_DENIED` tetap konsisten.
- Migrasi/pembersihan role-based authorization legacy: seluruh pemakaian `authorize(role)` dihapus, middleware legacy dihapus.
- Hardcoded fallback untuk ADMIN dipindahkan dari middleware ke AuthorizationService (tetap mempertahankan behavior: fallback capability + denylist + group fallback).
- Perbaikan pemanggilan capability resolution yang sebelumnya memakai id non-user (contoh: guruId) menjadi userId yang benar.
- Guard domain `SesiGuard` tidak lagi melakukan bypass berbasis role; jika user bukan Guru/Siswa maka keputusan akses murni dari capability enforcement.
- Verification: build TypeScript sukses.

