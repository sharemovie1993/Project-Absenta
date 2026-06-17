# Laporan Dashboard Bootstrap Contract Refactor (Absenta SaaS)

**Tanggal:** 2026-03-16  
**Status:** SELESAI  
**Build:** SUCCESS  
**Errors Remaining:** NO  

## Perubahan

- Menambahkan endpoint tenant-context `GET /api/me/subscription`.
- Memperbarui baseline role agar GURU/SISWA bisa mengakses endpoint bootstrap tenant (`/api/me/tenant` dan `/api/me/subscription`).
- Memperbarui frontend bootstrap agar tidak memakai endpoint PLATFORM (`/api/tenants/:id`, `/api/billing/subscriptions/active`, `/api/notifications/status`) dan menggunakan Promise.allSettled.
- Menghasilkan laporan kontrak bootstrap: `DASHBOARD_BOOTSTRAP_CONTRACT_REFACTOR.md`.
- Menjalankan build dan test backend serta frontend sampai sukses.

