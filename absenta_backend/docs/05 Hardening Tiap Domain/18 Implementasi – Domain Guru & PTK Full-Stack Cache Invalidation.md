# 📑 Implementasi – Domain Guru & PTK Full-Stack Multi-Channel Cache Invalidation

## 📌 Ringkasan Implementasi
Dokumen ini mencatat penerapan arsitektur Dual-Layer Cache Invalidation untuk **Domain 1: Guru & PTK**, mencakup seluruh channel mutasi di backend (Form UI, Impor Excel, Batch Status, dan Akses WA) serta invalidasi memori client di frontend React Query.

---

## 🔍 1. Backend Multi-Channel Audit & Invalidation (`guru.service.ts`)
- **Service**: `GuruService` (`absenta_backend/src/modules/academic/guru/services/guru.service.ts`)
- **Method Invalidation**: `cacheInvalidationService.invalidateAcademicCache(tenantId)`
- **Pintu Mutasi Tercover**:
  1. `createGuru`: Membuat profil guru baru & auto-generate akun user.
  2. `updateGuru`: Memperbarui data profil guru, pasfoto, jenis PTK (`PENDIDIK` / `TENAGA_KEPENDIDIKAN`), atau status akun.
  3. `deleteGuru`: Menghapus guru beserta cascading user account.
  4. `importFromExcel`: Impor massal data guru via berkas Excel.
  5. `assignWaliKelasBulk`: Penugasan massal Wali Kelas di struktur organisasi.

---

## ⚡ 2. Frontend Installation & React Query Invalidation
- **Komponen Target**:
  - `GuruForm.tsx` (`absenta_frontend/src/components/academic/guru/GuruForm.tsx`)
  - `GuruList.tsx` (`absenta_frontend/src/components/academic/guru/GuruList.tsx`)
- **Invalidated Query Keys**:
  - `['guru-options-list']`
  - `['wali-kelas-options-list']`
  - `['teacher-discipline-leaderboard-modal']`
  - `['academic-stats']`

---

## 🧪 3. Pengujian Otomatis & Kompilasi (`verify_domain1_guru_invalidation.py`)
- **Automated Verification Script**: Passed 100% (4/4 checks passed).
- **TypeScript Strict Compile**: `npx tsc --noEmit` ➔ **0 Error** (Backend & Frontend).
- **Git Commit**: `1c3285b3` ter-push ke `origin/main`.
