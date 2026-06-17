Instruksi Implementasi – Capability Naming Refactor di Kode Aplikasi

Tujuan instruksi ini adalah membenarkan seluruh penggunaan capability di kode aplikasi agar mengikuti pola canonical Action Catalog.

Saat ini sistem Absenta telah memiliki:

* Action Catalog canonical
* Capability Domain classification
* Capability Naming Audit
* Action Catalog Cleanup

Namun masih ditemukan capability di kode aplikasi yang menggunakan pola penamaan lama seperti:

snake_case
verb-first
bahasa indonesia
alias capability

Contoh:

```
dashboard.view_overview
attendance.create_session
academic.view_siswa
documents.manage_documents
```

Semua pola tersebut harus direfactor agar sesuai dengan format canonical capability.

---

1. Prinsip Canonical Capability Naming

Semua capability harus mengikuti format:

```
<domain>.<resource>.<action>
```

atau jika diperlukan:

```
<domain>.<resource>.<action>.<scope>
```

Contoh canonical capability:

```
dashboard.view.overview
academic.students.view.list
attendance.sessions.create
attendance.sessions.update.attendance
billing.subscriptions.view.list
```

---

2. Gunakan Mapping Alias

Gunakan file berikut sebagai referensi refactor:

```
capability_alias_map.json
```

File ini berisi mapping capability lama ke capability canonical.

Contoh:

```
dashboard.view_overview → dashboard.view.overview
attendance.create_session → attendance.sessions.create
view_siswa → academic.students.view
```

Semua capability lama harus diganti menggunakan mapping ini.

---

3. Scan Seluruh Penggunaan requireCapability

TRAE (ANDA) harus memindai seluruh kode backend yang menggunakan:

```
requireCapability("...")
```

Lokasi utama:

```
src/modules
src/controllers
src/services
src/routes
src/middleware
```

Setiap capability yang ditemukan harus dicek apakah ada di:

```
action_catalog_cleaned.md
```

Jika tidak ada di catalog maka capability harus diperbaiki.

---

4. Refactor Capability di Endpoint

Setiap penggunaan capability lama harus diganti.

Contoh:

sebelum:

```
requireCapability("dashboard.view_overview")
```

sesudah:

```
requireCapability("dashboard.view.overview")
```

Contoh lain:

sebelum:

```
requireCapability("attendance.create_session")
```

sesudah:

```
requireCapability("attendance.sessions.create")
```

Contoh lain:

sebelum:

```
requireCapability("academic.view_siswa")
```

sesudah:

```
requireCapability("academic.students.view")
```

---

5. Refactor Capability di Service Layer

Selain endpoint, capability juga dapat muncul di:

```
authorization guards
service logic
middleware
```

Semua capability harus diperiksa dan direfactor menggunakan catalog canonical.

---

6. Refactor Capability di Menu Configuration

Periksa file berikut:

```
seed.ts
```

Pastikan seluruh field:

```
required_capability
```

menggunakan capability canonical yang ada di Action Catalog.

---

7. Refactor Capability di Role Baseline

Periksa file:

```
seed_policies.ts
```

tepatnya bagian:

```
ROLE_CAPABILITIES
```

Pastikan capability yang digunakan sudah sesuai dengan Action Catalog.

---

8. Validasi Konsistensi Capability

Setelah refactor selesai lakukan validasi berikut.

A. Semua capability di endpoint harus ada di catalog.

B. Semua capability di menu harus ada di catalog.

C. Semua capability di role baseline harus ada di catalog.

Jika ada capability yang tidak ada di catalog maka proses build harus gagal.

---

9. Jalankan Capability Audit Ulang

Setelah refactor selesai jalankan kembali script:

```
scripts/audit/capability-naming-audit.ts
scripts/audit/action-catalog-cleanup.ts
```

Pastikan hasil audit menunjukkan:

```
Missing From Catalog = 0
Invalid Naming = 0
Alias Capability = 0
```

---

10. Verifikasi Sistem

Setelah refactor selesai lakukan:

```
npm run build
npm run test
```

Pastikan tidak ada error authorization atau capability mismatch.

---

11. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. Daftar capability yang direfactor di kode aplikasi
2. File yang diubah selama refactor capability
3. Hasil audit capability setelah refactor
4. Konfirmasi bahwa semua capability di kode aplikasi sudah sesuai dengan Action Catalog

Setelah tahap ini selesai, sistem Absenta akan memiliki **capability naming yang konsisten di seluruh codebase** dan siap untuk tahap **RBAC Baseline Reconstruction**.
