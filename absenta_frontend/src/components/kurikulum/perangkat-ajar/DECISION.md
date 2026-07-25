# 📐 ARCHITECTURAL DECISIONS (ADR) — FRONTEND PERANGKAT AJAR

## ADR-001: 1-Click Direct Built-in PDF Opening
Tombol `Buka PDF` pada daftar Perangkat Ajar langsung memuat Blob PDF Stream dan membukanya di tab Built-in PDF Viewer browser (`blob:https://...`) secara langsung tanpa popup modal tambahan.

## ADR-002: Modular UI Architecture (< 800 Lines Max)
Halaman utama [PerangkatAjarPage.tsx](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/pages/kurikulum/PerangkatAjarPage.tsx) wajib dijaga di bawah 800 baris. Seluruh modal dialog & elemen kartu grid diekstrak menjadi subkomponen independen dan dimuat via `lazy()` + `Suspense`.

## ADR-003: Zod Schema Validation Guard
Seluruh bentuk masukan (form inputs) wajib melewati `schema.safeParse(formData)` menggunakan skema terpusat di `perangkatAjarSchemas.ts` untuk mencegah error tipe data dan injeksi tidak valid.
