Instruksi Implementasi – RBAC Canonical Capability Audit & Catalog Consolidation

Tujuan instruksi ini adalah melakukan audit menyeluruh terhadap sistem RBAC Absenta untuk memastikan bahwa seluruh capability berasal dari satu sumber kebenaran (Single Source of Truth) yaitu **Action Catalog**, tanpa redundansi mapping capability di berbagai tempat.

Audit ini akan:

1. Memindai seluruh penggunaan `requireCapability()` di backend
2. Memindai seluruh `menu.required_capability` pada seed menu
3. Membandingkan dengan baseline `ROLE_CAPABILITIES`
4. Menghasilkan baseline permission yang lengkap tanpa redundansi
5. Menjadikan **Action Catalog sebagai satu-satunya sumber capability**

Instruksi ini tidak boleh mengubah perilaku sistem saat ini sebelum audit selesai. Fokus tahap ini hanya **audit dan laporan konsistensi capability**.

---

1. Prinsip Arsitektur Capability Absenta

Capability hanya boleh didefinisikan di satu tempat:

```
docs/action_catalog_canonical_futureproof.md
```

Semua komponen lain harus mengacu pada catalog ini:

```
Endpoint Guard
Menu.required_capability
ROLE_CAPABILITIES
STRUKTUR_CAPABILITIES
```

Jika ada capability di luar catalog, itu dianggap **invalid capability**.

Dengan demikian struktur canonical menjadi:

```
Action Catalog
     ↓
Permission Table
     ↓
RolePermission
OrganizationalCapability
Menu.required_capability
Endpoint requireCapability()
```

---

2. Scanner Endpoint Capability

TRAE (ANDA) diminta membuat script audit:

```
scripts/audit/rbac-capability-audit.ts
```

Scanner harus mencari seluruh penggunaan:

```
requireCapability("...")
requireCapability('...')
```

pada folder backend berikut:

```
src/modules
src/controllers
src/services
src/routes
src/middleware
```

Gunakan regex:

```
requireCapability\(['"`]([^'"`]+)['"`]\)
```

Semua capability yang ditemukan harus dikumpulkan menjadi:

```
endpointCapabilities[]
```

---

3. Scanner Menu Capability

TRAE (ANDA) harus memindai file berikut:

```
seed.ts
```

Ambil semua nilai:

```
required_capability
```

pada objek menu.

Contoh:

```
required_capability: 'academic.students.view.list'
```

Kumpulkan menjadi:

```
menuCapabilities[]
```

---

4. Scanner Role Baseline

TRAE (ANDA) harus membaca baseline capability dari:

```
seed_policies.ts
```

tepatnya objek:

```
ROLE_CAPABILITIES
```

Contoh:

```
ROLE_CAPABILITIES.ADMIN
ROLE_CAPABILITIES.GURU
ROLE_CAPABILITIES.SISWA
```

Gabungkan semua capability menjadi:

```
roleBaselineCapabilities[]
```

---

5. Scanner Organizational Capability

TRAE (ANDA) harus memindai file:

```
src/config/capabilities.ts
```

tepatnya:

```
STRUKTUR_CAPABILITIES
```

Semua capability yang ditemukan dikumpulkan menjadi:

```
organizationalCapabilities[]
```

---

6. Parse Action Catalog

TRAE (ANDA) harus membaca file:

```
docs/action_catalog_canonical_futureproof.md
```

Ambil semua capability yang berbentuk:

```
- xxx.xxx.xxx
```

dan kumpulkan sebagai:

```
catalogCapabilities[]
```

---

7. Konsolidasi Capability

Gabungkan seluruh capability yang ditemukan dari:

```
endpointCapabilities
menuCapabilities
roleBaselineCapabilities
organizationalCapabilities
```

menjadi:

```
allUsedCapabilities
```

Kemudian bandingkan dengan:

```
catalogCapabilities
```

---

8. Validasi Konsistensi Capability

Audit harus menghasilkan 4 kategori.

A. Capability digunakan tetapi tidak ada di catalog

```
missingFromCatalog
```

Contoh:

```
core.users.view.detail
```

tetapi tidak ada di action catalog.

B. Capability ada di catalog tetapi tidak pernah digunakan

```
unusedCatalogCapabilities
```

Ini bisa menjadi kandidat penghapusan.

C. Capability digunakan endpoint tetapi tidak ada di role baseline

```
missingRoleBaseline
```

Ini menyebabkan error:

```
403 missing capability
```

D. Capability digunakan di menu tetapi tidak ada di endpoint

```
menuOrphanCapabilities
```

Ini biasanya terjadi karena menu lama.

---

9. Generate RBAC Audit Report

TRAE (ANDA) harus menghasilkan file laporan:

```
RBAC_CAPABILITY_AUDIT_REPORT.md
```

Isi laporan harus mencakup:

1. Total capability di Action Catalog
2. Total capability digunakan endpoint
3. Total capability di menu
4. Total capability di role baseline
5. Total capability di organizational capability

Kemudian tampilkan:

```
Missing From Catalog
Unused Catalog Capability
Missing Role Baseline
Menu Orphan Capability
```

---

10. Generate Canonical Baseline Role

Setelah audit selesai, TRAE (ANDA) harus membuat file tambahan:

```
RBAC_BASELINE_SUGGESTION.md
```

File ini harus berisi baseline role yang disarankan:

Contoh:

```
ADMIN
------
dashboard.view.overview
core.users.view.list
core.users.view.detail
core.users.create
core.users.update
```

Baseline ini harus mencakup seluruh capability yang dibutuhkan endpoint.

---

11. Output Dataset Audit

Selain laporan markdown, script audit harus menghasilkan JSON berikut:

```
rbac_audit_result.json
```

Struktur:

```
{
  catalogCapabilities: [],
  endpointCapabilities: [],
  menuCapabilities: [],
  roleBaselineCapabilities: [],
  organizationalCapabilities: [],
  missingFromCatalog: [],
  missingRoleBaseline: [],
  unusedCatalogCapabilities: [],
  menuOrphanCapabilities: []
}
```

---

12. Tujuan Akhir Audit

Setelah audit selesai, sistem RBAC Absenta harus memenuhi prinsip berikut:

1. Semua capability berasal dari **Action Catalog**
2. Tidak ada capability di endpoint yang tidak ada di catalog
3. Tidak ada capability di menu yang tidak ada di catalog
4. Role baseline hanya berisi capability yang digunakan
5. Tidak ada redundansi mapping capability

Dengan demikian **Action Catalog menjadi satu-satunya sumber capability dalam sistem**.

---

13. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. Script audit capability
2. RBAC_CAPABILITY_AUDIT_REPORT.md
3. RBAC_BASELINE_SUGGESTION.md
4. rbac_audit_result.json
5. Ringkasan hasil audit capability
