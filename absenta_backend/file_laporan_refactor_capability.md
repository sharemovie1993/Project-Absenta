# Laporan Refactor Capability Naming - Projek Absenta

**Tanggal:** 2026-03-16
**Status:** SELESAI
**Build:** SUCCESS
**Errors Remaining:** NO

## Deskripsi Pekerjaan

Tujuan dari tugas ini adalah untuk menstandarisasi seluruh penamaan capability di dalam codebase backend "Projek Absenta" agar mengikuti format canonical `domain.resource.action`.

### Langkah-langkah yang Telah Dilakukan:

1.  **Analisis Mapping:** Menggunakan `capability_alias_map.json` sebagai referensi utama untuk pemetaan nama capability lama ke nama canonical baru.
2.  **Eksekusi Refactor Otomatis:** Menjalankan script `scripts/audit/capability-naming-refactor-exec.ts` (yang telah diperbarui) untuk melakukan *bulk find-and-replace* pada:
    *   Seluruh file di `src/modules`, `src/controllers`, `src/services`, `src/routes`, dan `src/middlewares` (terutama pada fungsi `requireCapability`).
    *   File konfigurasi menu `prisma/seed.ts` (`required_capability`).
    *   File kebijakan role `prisma/seed_policies.ts` (`ROLE_CAPABILITIES`).
    *   File konfigurasi capability `src/config/capabilities.ts`.
    *   Dokumen Action Catalog `docs/action_catalog_canonical_futureproof.md`.
3.  **Pembaruan Action Catalog:** Menambahkan 17 capability yang sebelumnya terdeteksi "Missing from Catalog" ke dalam `docs/action_catalog_canonical_futureproof.md` untuk memastikan sinkronisasi antara kode dan dokumentasi.
4.  **Audit Verifikasi:**
    *   Menjalankan `scripts/audit/capability-naming-audit.ts`: Hasil menunjukkan **0 Issues Found** (seluruh penamaan sudah canonical).
    *   Menjalankan `scripts/audit/action-catalog-cleanup.ts`: Hasil menunjukkan seluruh capability yang digunakan di aplikasi sudah terdaftar di catalog (kecuali beberapa entri sampah dari test).
5.  **Verifikasi Build & Test:**
    *   `npm run build`: **SUCCESS**
    *   `npm run test`: **SUCCESS** (20 test suites passed, 57 tests passed).

## File yang Diubah:

1.  `docs/action_catalog_canonical_futureproof.md` (Update ke nama canonical & tambah missing caps)
2.  `prisma/seed.ts` (Update required_capability)
3.  `prisma/seed_policies.ts` (Update ROLE_CAPABILITIES)
4.  `src/config/capabilities.ts` (Update STRUKTUR_CAPABILITIES)
5.  `src/modules/*/routes/*.ts` (Berbagai file route yang menggunakan requireCapability)
6.  `src/middlewares/__tests__/requireCapability.test.ts` (Update test case)
7.  `scripts/audit/capability-naming-refactor-exec.ts` (Penambahan fitur scan Catalog & folder middleware)

## Hasil Audit Akhir:

*   **Missing From Catalog:** 0 (Setelah pembersihan manual)
*   **Invalid Naming:** 0
*   **Alias Capability:** 0

Sistem sekarang memiliki penamaan capability yang konsisten di seluruh codebase dan siap untuk tahap selanjutnya yaitu **RBAC Baseline Reconstruction**.

---
**Laporan ini dibuat secara otomatis oleh Trae Assistant.**
