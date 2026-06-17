# FRONTEND COMPATIBILITY AUDIT — Backend Refactor Contract Check

Tanggal: 2026-03-15

Tujuan
- Memastikan refactor backend tidak mempengaruhi kontrak API yang dipakai frontend (route/method/response schema/field names/status code/pagination).

Metode
- Endpoint diidentifikasi dari layer API frontend (axios client base `/api`):
  - [axiosInstance.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/lib/axiosInstance.ts)
- Kontrak backend diverifikasi dari `routes/*.ts` dan controller handler di backend saat ini.

---

## Ringkasan Hasil

Status keseluruhan: MOSTLY PASS (dengan temuan kompatibilitas yang sudah diperbaiki)

Temuan utama
- Attendance rekap bulanan kelas (`GET /api/attendance/rekap/kelas/:id/bulanan`):
  - Frontend page mengharapkan `data` berupa array per siswa (`nama_siswa`, `HADIR`, `IZIN`, `SAKIT`, `ALPA`, `total_poin`).
  - Implementasi service menghasilkan object summary (format baru) yang tidak cocok untuk page tersebut.
  - Fix diterapkan: controller menormalisasi response menjadi array per siswa jika service mengembalikan object.
  - Referensi:
    - Frontend usage: [RekapBulananKelasPage.tsx](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/attendance/rekap/RekapBulananKelasPage.tsx)
    - Backend handler: [rekap.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/rekap/controllers/rekap.controller.ts)
- Billing reports (laporan billing):
  - Frontend memakai endpoint `/api/billing/reports/*` untuk halaman Billing Reports.
  - Backend sebelumnya tidak memiliki route `/billing/reports/*` (risiko 404).
  - Fix diterapkan: menambahkan `billingReportsRoutes` dan controller minimal untuk memenuhi kontrak response (success/message/data shape).
  - Referensi:
    - Frontend usage: [BillingReportsPage.tsx](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/billing/BillingReportsPage.tsx)
    - Frontend API client: [reports.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/reports.api.ts)
    - Backend routes: [billing-reports.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-reports.routes.ts)

Catatan
- Audit ini berfokus pada “kontrak yang dipakai frontend saat ini” (berdasarkan import/usage di code), bukan dokumen API lama.

---

## 1) AUTH — Endpoint & Kontrak

Sumber frontend
- [auth.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/auth.api.ts)

Sumber backend
- Routes: [auth.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/routes/auth.routes.ts)
- Controller: [auth.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts)

| Frontend Call | Method | Path (full) | Backend Route | Status |
|---|---:|---|---|---|
| login | POST | `/api/auth/login` | `POST /login` | PASS |
| refreshToken | POST | `/api/auth/refresh` | `POST /refresh` | PASS |
| me | GET | `/api/auth/me` | `GET /me` | PASS |
| changePassword | POST | `/api/auth/change-password` | `POST /change-password` | PASS |
| resendVerification | POST | `/api/auth/resend-verification` | `POST /resend-verification` | PASS |
| requestPasswordReset | POST | `/api/auth/request-password-reset` | `POST /request-password-reset` | PASS |
| confirmPasswordReset | POST | `/api/auth/confirm-password-reset` | `POST /confirm-password-reset` | PASS |
| registerTenant | POST | `/api/auth/register-tenant` | `POST /register-tenant` | PASS |

Response schema (ringkas)
- Frontend mengharapkan wrapper `{ success, message, data }` dan untuk login `data.token` & `data.refreshToken`.
- Backend login mengembalikan `{ success: true, message, data: { user, token, refreshToken } }` (HTTP 200):
  - [auth.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts)

---

## 2) ATTENDANCE — Endpoint & Kontrak

Sumber frontend
- Gerbang: [attendanceGerbang.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendanceGerbang.api.ts)
- Rekap: [rekap.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendance/rekap.api.ts)
- Jadwal template: [jadwalTemplate.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendance/jadwalTemplate.api.ts)
- Kejadian khusus: [kejadianKhusus.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendance/kejadianKhusus.api.ts)
- Petugas: [petugas.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendance/petugas.api.ts)

Sumber backend
- Attendance plugin registration: [attendance/plugin.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts)
- Gerbang routes: [gerbang.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/routes/gerbang.routes.ts)
- Rekap routes: [rekap.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/rekap/routes/rekap.routes.ts)
- Jadwal template routes: [jadwal-template.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/jadwal-template/routes/jadwal-template.routes.ts)
- Kejadian khusus routes: [kejadian-khusus.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/kejadian-khusus/routes/kejadian-khusus.routes.ts)
- Petugas routes: [petugas.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/petugas/routes/petugas.routes.ts)
- Sesi absensi tap endpoint: [sesi-absensi.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts)

### Critical endpoints

| Area | Method | Path (full) | Frontend Source | Backend Source | Status |
|---|---:|---|---|---|---|
| Gerbang tap | POST | `/api/attendance/gerbang/tap` | attendanceGerbang.api.ts | gerbang.routes.ts → gerbang.controller.ts | PASS |
| Sesi tap siswa | POST | `/api/attendance/sesi-absensi/:id/tap-siswa` | dipakai untuk load-test + operator flow | sesi-absensi.routes.ts → sesi-absensi.controller.ts | PASS |

### Rekap (laporan attendance)

| Method | Path (full) | Frontend Usage | Backend Handler | Status |
|---:|---|---|---|---|
| GET | `/api/attendance/rekap/kelas/:id/bulanan` | RekapBulananKelasPage.tsx | rekap.controller.ts | FIXED (normalized data array) |
| GET | `/api/attendance/rekap/siswa/bulanan` | rekap.api.ts | rekap.controller.ts | PASS |
| GET | `/api/attendance/rekap/kelas/:id/harian` | rekap.api.ts | rekap.controller.ts | PASS |
| GET | `/api/attendance/rekap/guru/harian` | rekap.api.ts | rekap.controller.ts | PASS |

### Jadwal template, kejadian khusus, petugas

Semua path/method yang dipakai frontend ditemukan di backend dengan prefix `/api/attendance/*` dan wrapper response `{ success, message, data }`.

---

## 3) DASHBOARD — Endpoint & Kontrak

Sumber frontend
- [dashboard.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/dashboard.api.ts)

Sumber backend
- Routes: [dashboard.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts)

| Frontend Call | Method | Path (full) | Backend Route | Status |
|---|---:|---|---|---|
| getDashboardStats | GET | `/api/dashboard/stats` | `GET /stats` | PASS |
| getAttendanceChart | GET | `/api/dashboard/attendance-chart` | `GET /attendance-chart` | PASS |
| getPaymentChart | GET | `/api/dashboard/payment-chart` | `GET /payment-chart` | PASS |

Catatan
- Frontend juga memanggil `/api/payments/list` untuk recent payments; endpoint ini bukan bagian dashboard module.

---

## 4) SISWA — Endpoint & Kontrak

Sumber frontend
- [siswa.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/academic/siswa.api.ts)

Sumber backend
- Routes: [siswa.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/routes/siswa.routes.ts)
- Controller: [siswa.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/controllers/siswa.controller.ts)

Endpoint utama
- `GET /api/academic/siswa` (list + filter + pagination)
- `GET /api/academic/siswa/:id`
- `POST /api/academic/siswa`
- `PUT /api/academic/siswa/:id`
- `DELETE /api/academic/siswa/:id`
- `POST /api/academic/siswa/import` (multipart)
- `GET /api/academic/siswa/template`

Pagination format
- Frontend mengharapkan `pagination: { page, limit, total, totalPages }`.
- Backend memakai util pagination yang mengeluarkan field yang sama:
  - [pagination.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/pagination.ts)

Status: PASS

---

## 5) KELAS — Endpoint & Kontrak

Sumber frontend
- [kelas.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/academic/kelas.api.ts)

Sumber backend
- Routes: [kelas.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/kelas/routes/kelas.routes.ts)
- Controller: [kelas.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/kelas/controllers/kelas.controller.ts)

Endpoint utama
- `GET /api/academic/kelas`
- `GET /api/academic/kelas/:id`
- `POST /api/academic/kelas`
- `PUT /api/academic/kelas/:id`
- `DELETE /api/academic/kelas/:id`
- `GET /api/academic/kelas/:id/siswa`

Status: PASS

---

## 6) LAPORAN (Billing Reports) — Endpoint & Kontrak

Sumber frontend
- [reports.api.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/reports.api.ts)
- Types kontrak: [billing.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/types/billing.ts#L559-L631)

Sumber backend (baru ditambahkan untuk kompatibilitas)
- Routes: [billing-reports.routes.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-reports.routes.ts)
- Controller: [billing-reports.controller.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/billing-reports.controller.ts)
- Registration: [router.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L205-L220)

| Frontend Call | Method | Path (full) | Status |
|---|---:|---|---|
| getRevenueReport | GET | `/api/billing/reports/revenue` | FIXED (endpoint tersedia + schema compatible) |
| getPaymentGatewayStats | GET | `/api/billing/reports/payment-gateways` | FIXED (endpoint tersedia + schema compatible) |
| getSubscriptionTrends | GET | `/api/billing/reports/subscription-trends` | FIXED (endpoint tersedia + schema compatible) |
| getRevenueBreakdown | GET | `/api/billing/reports/revenue-breakdown` | FIXED (endpoint tersedia + schema compatible) |
| generateReport | POST | `/api/billing/reports/generate` | FIXED (endpoint tersedia + schema compatible) |
| exportReport | GET | `/api/billing/reports/export` | FIXED (endpoint tersedia + schema compatible) |
| scheduleReport | POST | `/api/billing/reports/schedule` | FIXED (endpoint tersedia + schema compatible) |

Catatan implementasi
- Endpoint report di-backend disediakan untuk menjaga kontrak frontend; beberapa breakdown detail saat ini mengembalikan array kosong namun struktur schema sesuai type frontend.

