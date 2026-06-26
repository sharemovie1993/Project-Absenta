# FRONTEND SARPRAS HARDENING CHECKLIST

- `[x]` **Fase 1: Audit & Hardening SARPRAS Frontend Components (Part 1)**
  - `[x]` AssetList.tsx: Memoisasi columns via useMemo, getConditionColor via useCallback, tambahkan id & htmlFor pada elemen filter.
  - `[x]` AssetForm.tsx: Memoisasi category/location options via useMemo, callbacks untuk generateLocalCode & handleSubmit, tambahkan id & htmlFor pada modal fields.
  - `[x]` QuickScanLoanModal.tsx: Callbacks untuk resetScan & lookup params, cast error catch block ke unknown, bersihkan any types.
  - `[x]` CategoryLocationManager.tsx: Callbacks untuk resetForm & handleSubmit, defensive chaining items?.map, bersihkan any types.
  - `[x]` AssetImportModal.tsx: Callbacks untuk file change, upload, download, & reset, defensive chaining errors?.map, bersihkan any.

- `[x]` **Fase 2: Audit & Hardening SARPRAS Frontend Components (Part 2)**
  - `[x]` LoanRequestForm.tsx: Memoisasi assetOptions via useMemo, callback untuk handleSubmit, tambahkan id & htmlFor pada modal fields, bersihkan any.
  - `[x]` AssetDetailModal.tsx: Memoisasi loan/repair columns via useMemo, bersihkan any.
  - `[x]` AssetPrintLabelModal.tsx: Callback untuk handlePrint, defensive chaining assetsToPrint?.map.
  - `[x]` LoanStatusActions.tsx: Callbacks untuk handleAction & handleReturn, memoize output renderActions, tambahkan id & htmlFor pada modal return.

- `[x]` **Fase 3: Verifikasi & Kompilasi**
  - `[x]` Jalankan `npx tsc --noEmit` di `absenta_frontend` untuk memastikan 0 error tipe.
  - `[x]` Jalankan static audit engine `node ./scripts/audit-pages.cjs` untuk memastikan seluruh halaman SARPRAS lolos audit (`✅ TERSTANDARISASI`).
