## Authorization Phase 3 – Implementation Report

Tanggal: 2026-03-15

- Standarisasi capability enforcement: seluruh endpoint non-publik kini memiliki capability guard (`requireCapability(...)`) dan tidak lagi bergantung pada role-based authorization.
- Migrasi endpoint yang sebelumnya memakai `authorize(...)` menjadi capability-based (superadmin analytics/risk/revenue/platform intelligence, reporting owner summary, sekolah routes, observability).
- Penambahan capability baru pada Action Catalog canonical untuk menutup gap coverage (billing subscription flows, billing payments, reports financial, core menu/tenant/user policies, consent logs, cooperative tickets/announcements/financial reports, notify view.my, superadmin analytics/platform intelligence, dll).
- Penambahan logging event `CAPABILITY_ACCESS_DENIED` saat authorization failure.
- Coverage validation: 100% endpoint non-publik terproteksi capability guard (450/450).
- Git: commit dan push.

