# 📑 Implementasi – Domain Mapel Full-Stack Multi-Channel Cache Invalidation

## 📌 Ringkasan Implementasi
Dokumen ini mencatat penerapan arsitektur Dual-Layer Cache Invalidation untuk **Domain 2: Mata Pelajaran (Mapel)**, mencakup mutasi data mapel manual, wizard preset kurikulum, dan impor Excel di backend serta pembersihan cache di frontend React Query.

---

## 🔍 1. Backend Multi-Channel Audit & Invalidation (`mapel.service.ts`)
- **Service**: `mapelService` (`absenta_backend/src/modules/academic/mapel/services/mapel.service.ts`)
- **Method Invalidation**: `cacheInvalidationService.invalidateAcademicCache(tenantId)`
- **Pintu Mutasi Tercover**:
  1. `createMapel`: Pembuatan mata pelajaran baru per tingkat/jurusan.
  2. `updateMapel`: Perubahan nama mapel, kode mapel, atau tingkat.
  3. `deleteMapel`: Penghapusan mata pelajaran (dengan validasi relasi).
  4. `importFromExcel`: Impor massal berkas Excel mata pelajaran.
  5. `applyPresetKurikulum`: Penerapan massal wizard preset kurikulum standar nasional.

---

## ⚡ 2. Frontend Installation & React Query Invalidation
- **Komponen Target**:
  - `MapelForm.tsx` (`absenta_frontend/src/components/academic/mapel/MapelForm.tsx`)
  - `MapelList.tsx` (`absenta_frontend/src/components/academic/mapel/MapelList.tsx`)
  - `PresetWizardModal.tsx` (`absenta_frontend/src/components/academic/mapel/PresetWizardModal.tsx`)
- **Invalidated Query Keys**:
  - `['mapel-options-list']`
  - `['beban-guru-list']`
  - `['academic-stats']`

---

## 🧪 3. Pengujian Otomatis & Kompilasi (`verify_domain2_mapel_invalidation.py`)
- **Automated Verification Script**: Passed 100% (5/5 checks passed).
- **TypeScript Strict Compile**: `npx tsc --noEmit` ➔ **0 Error** (Backend & Frontend).
- **Git Commit**: `0458dccd` ter-push ke `origin/main`.
