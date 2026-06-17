Instruksi Implementasi – Action Catalog Cleanup (Single Source of Truth)

Tujuan instruksi ini adalah membersihkan **Action Catalog** dari capability yang tidak pernah digunakan di aplikasi sehingga Absenta memiliki **satu sumber kebenaran capability** yang bersih dan konsisten.

Selama berbagai refactor RBAC sebelumnya, Action Catalog mengalami beberapa migrasi yang tidak tuntas sehingga masih terdapat capability legacy yang:

* tidak dipakai endpoint
* tidak dipakai menu
* tidak dipakai role baseline
* tidak dipakai organizational capability

Capability tersebut harus dihapus agar **Action Catalog hanya berisi capability yang benar-benar digunakan oleh sistem**.

Dengan demikian sistem Absenta akan memiliki prinsip:

```
One Pattern
One Capability Catalog
One Source of Truth
```

---

1. Prinsip Cleanup Action Catalog

Action Catalog harus memenuhi aturan berikut:

1. Setiap capability di catalog **harus dipakai minimal oleh satu komponen sistem**.
2. Capability yang tidak dipakai di kode aplikasi dianggap **dead capability**.
3. Dead capability harus dihapus dari Action Catalog.

Komponen yang dianggap sebagai penggunaan capability adalah:

```
Endpoint requireCapability()
Menu.required_capability
ROLE_CAPABILITIES
STRUKTUR_CAPABILITIES
```

Jika capability tidak ditemukan pada keempat sumber ini maka capability dianggap:

```
UNUSED_CAPABILITY
```

---

2. Scanner Capability Usage

TRAE (ANDA) diminta membuat script audit:

```
scripts/audit/action-catalog-cleanup.ts
```

Script ini harus memindai capability dari beberapa sumber.

A. Endpoint Capability

Scan seluruh penggunaan:

```
requireCapability("...")
requireCapability('...')
```

pada folder backend:

```
src/modules
src/controllers
src/services
src/routes
src/middleware
```

B. Menu Capability

Scan semua:

```
required_capability
```

di file:

```
seed.ts
```

C. Role Baseline Capability

Scan capability dari:

```
seed_policies.ts
```

tepatnya:

```
ROLE_CAPABILITIES
```

D. Organizational Capability

Scan capability dari:

```
src/config/capabilities.ts
```

tepatnya:

```
STRUKTUR_CAPABILITIES
```

---

3. Parse Action Catalog

Script harus membaca:

```
docs/action_catalog_canonical_futureproof.md
```

Ambil seluruh capability yang ada di catalog.

Simpan sebagai:

```
catalogCapabilities[]
```

---

4. Tentukan Capability Yang Digunakan

Gabungkan semua capability yang ditemukan di aplikasi:

```
endpointCapabilities
menuCapabilities
roleCapabilities
organizationalCapabilities
```

menjadi:

```
usedCapabilities
```

---

5. Deteksi Dead Capability

Bandingkan:

```
catalogCapabilities
```

dengan:

```
usedCapabilities
```

Capability yang berada di catalog tetapi tidak ada di usedCapabilities harus dimasukkan ke:

```
unusedCapabilities
```

Capability ini dianggap **legacy capability**.

---

6. Generate Cleanup Report

Script harus menghasilkan laporan:

```
ACTION_CATALOG_CLEANUP_REPORT.md
```

Isi laporan:

Total capability di catalog

Total capability digunakan

Total capability tidak digunakan

Kemudian tampilkan daftar:

```
Unused Capability
```

---

7. Generate Clean Action Catalog

Script harus menghasilkan file baru:

```
action_catalog_cleaned.md
```

Isi file ini adalah:

Action Catalog yang **sudah dibersihkan dari capability yang tidak dipakai**.

Format capability harus tetap mengikuti format canonical.

---

8. Generate Diff Mapping

Script juga harus membuat file:

```
action_catalog_removed_capabilities.json
```

Struktur:

```
{
  "removed": [
    "old.capability.1",
    "old.capability.2"
  ]
}
```

File ini digunakan untuk dokumentasi perubahan catalog.

---

9. Validasi Konsistensi

Setelah cleanup dilakukan, script harus melakukan validasi berikut:

1. Semua capability di endpoint harus ada di catalog
2. Semua capability di menu harus ada di catalog
3. Semua capability di role baseline harus ada di catalog
4. Semua capability organizational harus ada di catalog

Jika ada capability yang tidak ada di catalog, script harus menghasilkan error:

```
CAPABILITY_NOT_IN_CATALOG
```

---

10. Tujuan Akhir Cleanup

Setelah proses ini selesai:

1. Action Catalog hanya berisi capability yang benar-benar digunakan
2. Tidak ada capability legacy
3. Tidak ada capability duplikat
4. Tidak ada capability alias
5. Action Catalog menjadi satu-satunya sumber capability

Dengan demikian arsitektur RBAC Absenta menjadi:

```
Action Catalog
      ↓
Capability Domain
      ↓
Role Baseline
      ↓
Organizational Capability
      ↓
Authorization Guard
```

---

11. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. Script action-catalog-cleanup.ts
2. ACTION_CATALOG_CLEANUP_REPORT.md
3. action_catalog_cleaned.md
4. action_catalog_removed_capabilities.json
5. Ringkasan capability yang dihapus dari catalog

Setelah Action Catalog bersih, barulah RBAC Baseline Reconstruction dapat dilakukan dengan aman.
