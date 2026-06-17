# Laporan Refaktor — Superadmin Tenant Detail Service (Prisma Standardization)

Tanggal: 2026-03-15

## Ringkasan
Refaktor pada modul **superadmin/tenant-detail** dilakukan untuk menstandarkan akses database agar **tidak membuat instance PrismaClient baru per service**, serta memindahkan logic akses data ke layer yang lebih tepat (query/command). Tujuannya selaras dengan pola arsitektur yang dipakai di modul lain: controller → service → query/command/repository.

Hasil utama:
- `TenantDetailService` tidak lagi membuat `new PrismaClient()`.
- Akses DB menggunakan **shared prisma instance** lewat repository `tenantDetailDb`.
- Beberapa method besar dipisah menjadi `queries/` dan `commands/` sehingga lebih mudah dirawat dan dites.

## Masalah Sebelumnya
- `TenantDetailService` menginisialisasi `PrismaClient` sendiri (`new PrismaClient()`), berpotensi:
  - menambah koneksi DB berlebih pada runtime,
  - menyulitkan observability (pooling/trace),
  - inkonsisten dengan utilitas `src/utils/prisma.ts` yang sudah ada.
- Method service berisi query panjang + mapping besar sehingga sulit direview/diubah tanpa risiko.

## Tujuan Refaktor
- Menggunakan 1 jalur akses Prisma yang konsisten (shared prisma).
- Mengurangi beban service dengan memindahkan detail query/mapping ke file query/command yang spesifik.
- Mempermudah pemeliharaan untuk endpoint superadmin tenant detail (detail, metrics, users, academic, user management).

## Perubahan Teknis
### 1) Prisma repository untuk tenant-detail
Menambahkan repository:
- `src/modules/superadmin/tenant-detail/services/repositories/tenant-detail.db.ts`

Isinya mengekspor prisma bersama sebagai `tenantDetailDb`, lalu dipakai sebagai `prisma` di query/command.

### 2) Ekstraksi Query/Command
Beberapa fungsi dipindahkan dari `TenantDetailService` menjadi modul terpisah:

**Queries**
- `src/modules/superadmin/tenant-detail/services/queries/get-tenant-detail.query.ts`
- `src/modules/superadmin/tenant-detail/services/queries/get-tenant-metrics.query.ts`
- `src/modules/superadmin/tenant-detail/services/queries/get-recent-activities.query.ts`
- `src/modules/superadmin/tenant-detail/services/queries/get-tenant-users.query.ts`
- `src/modules/superadmin/tenant-detail/services/queries/get-user-statistics.query.ts`
- `src/modules/superadmin/tenant-detail/services/queries/get-academic-data.query.ts`

**Commands**
- `src/modules/superadmin/tenant-detail/services/commands/create-tenant-user.command.ts`
- `src/modules/superadmin/tenant-detail/services/commands/update-tenant-user.command.ts`
- `src/modules/superadmin/tenant-detail/services/commands/delete-tenant-user.command.ts`

### 3) TenantDetailService menjadi “orchestrator”
`TenantDetailService` sekarang memanggil query/command di atas untuk operasi yang sudah dipindahkan:
- `getTenantDetail()` → `getTenantDetailQuery()`
- `getTenantMetrics()` → `getTenantMetricsQuery()`
- `getRecentActivities()` → `getRecentActivitiesQuery()`
- `getTenantUsers()` → `getTenantUsersQuery()`
- `createTenantUser()` → `createTenantUserCommand()`
- `updateTenantUser()` → `updateTenantUserCommand()`
- `deleteTenantUser()` → `deleteTenantUserCommand()`
- `getUserStatistics()` → `getUserStatisticsQuery()`
- `getAcademicData()` → `getAcademicDataQuery()`

File utama:
- `src/modules/superadmin/tenant-detail/services/tenant-detail.service.ts`

## Dampak & Kompatibilitas
- Response shape dan kontrak endpoint di `tenant-detail.controller` tetap mengikuti output sebelumnya (service hanya diganti implementasinya).
- Tidak ada perubahan pada routing.
- Refaktor ini menurunkan risiko koneksi DB berlebih karena `PrismaClient` tidak dibuat ulang di service.

## Verifikasi
Build backend berhasil:
- `npm run build` (Prisma generate + `tsc` + `tsc-alias`): **SUCCESS**

## Catatan Lanjutan (Opsional)
Masih ada file lain di codebase yang membuat `new PrismaClient()` (di luar modul superadmin). Jika ingin konsistensi penuh, refaktor serupa dapat diterapkan ke service-service tersebut dengan pola repository yang sama.

