# ⛔ RULES & STANDARDS — FRONTEND PERANGKAT AJAR

1. **Strict Zod Guard**: DILARANG KERAS memproses handler submit tanpa melalui `schema.safeParse(formData)`.
2. **Subcomponent Size**: Setiap subkomponen UI di folder ini DILARANG KERAS melebihi 500 baris.
3. **Strict Lazy Loading**: Seluruh modal dialog wajib diimpor menggunakan `lazy(() => import(...))` dan dibungkus `Suspense`.
4. **Single Source Kop Surat**: Kop Surat instansi wajib menggunakan komponen global `<PrintHeader />`.
