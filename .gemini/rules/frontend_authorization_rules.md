# Rule: Frontend Authorization Verification & DRY Standard

## Mandatory Rules for Frontend Authorization Work:
1. **Double-Pass Verification**: Every authorization / capability migration task MUST be verified twice:
   - Pass 1: Automated project-wide regex/script scan.
   - Pass 2: Manual line-by-line inspection of target files.
2. **Centralized `useCapabilities()` Hook**: NEVER write ad-hoc role checks or repetitive capability `||` expressions in individual components. ALWAYS consume the centralized `useCapabilities()` hook (`src/hooks/useCapabilities.ts`).
3. **Empirical Build Verification**: ALWAYS run `npx tsc --noEmit` and `npm run build` to prove 0 compilation errors before declaring task completion.

---

## Rule: Capability String Enforcement (Wajib Diterapkan)

### 4. Gunakan HANYA CapabilityCode yang terdaftar
Setiap pemanggilan `can('...')` di seluruh Frontend **WAJIB menggunakan string yang terdaftar** di:
- `absenta_backend/docs/action_catalog.md` ← sumber kebenaran utama (406+ caps)
- `absenta_backend/src/config/position-capabilities.ts` ← yang aktif di-assign ke role

String capability di Frontend **TIDAK BOLEH dikarang sendiri**. Selalu verifikasi dengan Backend.

### 5. Canonical Type Safety via `CapabilityCode`
- Semua `can()` calls di komponen HARUS melewati `useCapabilities()` dari `src/hooks/useCapabilities.ts`
- Hook tersebut mengekspos `can: (permission: CapabilityCode) => boolean`
- Type `CapabilityCode` didefinisikan di `src/types/capabilities.ts` — **update file ini** setiap kali Backend menambah capability baru

### 6. Wajib Jalankan Cross-Check Sebelum Push
Setiap kali menambah atau mengubah `can('...')` call di Frontend, jalankan:
```bash
# Di dalam absenta_frontend/
node scripts/cross_check_capabilities.cjs
```
**Hasil yang diharapkan:**
```
❌ Capability TIDAK TERDAFTAR  : 0
🎉 SEMUA CAPABILITY VALID! Tidak ada penyimpangan.
```
Jika ada ❌, perbaiki dulu sebelum commit. **Jangan bypass.**

### 7. Update Ground Truth Saat Backend Berubah
Setiap kali Backend menambah capability baru di `action_catalog.md` atau `position-capabilities.ts`:
```bash
# Regenerate ground truth JSON
node scripts/extract_backend_ground_truth.cjs

# Lalu tambahkan ke types/capabilities.ts sesuai domain:
# AcademicCapability | AttendanceCapability | ... | SystemAndDashboardCapability
```

### 8. Pemetaan Alias Kanonik yang Sudah Terdefinisi
`useCapabilities()` mengekspor alias-alias berikut — gunakan alias ini di komponen, JANGAN buat cek ulang:

| Alias Ekspor | Arti | Jangan pakai ini |
|---|---|---|
| `isKepalaSekolah` | Kepala Sekolah | `isKepsek` (deprecated) |
| `isHomeroomTeacher` | Wali Kelas | cek manual `can(...)` |
| `isTuHead` | Kepala TU | cek manual `can(...)` |
| `isAdmin` | Super Admin | `user?.role === 'ADMIN'` ❌ |
| `isKurikulum`, `isKesiswaan`, `isHubin`, dst. | Persona Level 4-5 | string role hardcoded ❌ |

### 9. Forbidden Patterns (Dilarang Keras)
```tsx
// ❌ DILARANG - string role hardcoded
if (user?.role === 'ADMIN') { ... }
if (user?.jabatan === 'KEPALA_SEKOLAH') { ... }

// ❌ DILARANG - capability dikarang sendiri
can('academic.student.create')   // typo, harusnya students
can('system.platform.full_access') // tidak ada di backend
can('billing.license.activate')    // tidak ada di backend

// ✅ BENAR - gunakan CapabilityCode + useCapabilities
const { can, isKepalaSekolah, isAdmin } = useCapabilities();
can('academic.students.create')   // terdaftar di backend
```

### 10. Lokasi File Penting Capability System
| File | Peran |
|---|---|
| `src/types/capabilities.ts` | Union type `CapabilityCode` — 271+ caps terdaftar |
| `src/hooks/useCapabilities.ts` | Hook terpusat — SATU-SATUNYA cara akses capability |
| `scripts/cross_check_capabilities.cjs` | Audit tool — jalankan sebelum push |
| `scripts/backend_caps_groundtruth.json` | Snapshot backend caps — regenerate jika backend berubah |
| `scripts/extract_backend_ground_truth.cjs` | Script regenerasi ground truth dari backend |
