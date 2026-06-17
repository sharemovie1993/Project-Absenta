Instruksi Implementasi – RBAC Baseline Reconstruction (SaaS Canonical Model)

Tujuan instruksi ini adalah membangun ulang baseline RBAC pada platform Absenta berdasarkan **Action Catalog canonical** yang sudah dibersihkan.

Tahap sebelumnya telah menyelesaikan:

* Capability Naming Cleanup
* Action Catalog Cleanup
* Capability Domain Classification
* Refactor capability di seluruh kode aplikasi

Sekarang sistem sudah memiliki **satu sumber kebenaran capability** yaitu:

```
docs/action_catalog_canonical_futureproof.md
```

Langkah berikutnya adalah merekonstruksi baseline capability untuk setiap role agar:

* tidak ada capability redundan
* tidak ada capability yang hilang
* tidak ada capability platform yang bocor ke tenant
* authorization konsisten di seluruh sistem

---

1. Prinsip Arsitektur RBAC Absenta

RBAC Absenta terdiri dari 3 layer:

```
Role Baseline
+
Organizational Capability
+
Capability Guard
```

Role baseline hanya memberikan capability umum.

Capability spesifik jabatan diberikan melalui:

```
Organizational Position
```

contoh:

```
WALIKELAS
PETUGAS_KELAS
GERBANG
```

Sehingga role tetap sederhana.

---

2. Domain Capability yang Digunakan

Gunakan file:

```
capability-domains.generated.ts
```

untuk mengetahui domain capability.

Domain capability:

```
PLATFORM
TENANT
SHARED
ORGANIZATIONAL
```

Aturan distribusi capability:

```
SUPERADMIN = PLATFORM + SHARED
ADMIN = TENANT + SHARED
GURU = subset TENANT
SISWA = minimal TENANT
```

Capability domain ORGANIZATIONAL tidak dimasukkan ke baseline role.

---

3. Rekonstruksi Baseline Role

TRAE (ANDA) diminta memperbarui file:

```
prisma/seed_policies.ts
```

tepatnya bagian:

```
ROLE_CAPABILITIES
```

Baseline role harus dibangun ulang.

---

4. Baseline SUPERADMIN

SUPERADMIN adalah operator platform.

Capability baseline:

```
semua capability dengan domain PLATFORM
+
semua capability dengan domain SHARED
```

Contoh:

```
superadmin.tenants.manage
superadmin.revenue.view.overview
billing.plans.create
billing.plans.update
billing.plans.delete
billing.plans.view.list
billing.subscriptions.view.analytics
core.tenants.view.list
core.tenants.view.detail
```

SUPERADMIN tidak memerlukan organizational capability.

---

5. Baseline ADMIN

ADMIN adalah administrator tenant.

Capability baseline:

semua capability dengan domain:

```
TENANT
+
SHARED
```

kecuali capability yang bersifat operasional guru atau siswa.

Contoh:

```
dashboard.view.overview
academic.students.create
academic.students.update
academic.students.delete
academic.students.view.list
academic.subjects.create
academic.subjects.update
academic.subjects.delete
academic.subjects.view.list
attendance.sessions.view.list
attendance.sessions.view.detail
attendance.recap.view.daily
attendance.recap.view.monthly
documents.upload
documents.delete
documents.view.list
reports.financial.view.list
reports.financial.generate
reports.financial.export
notify.view.logs
notify.view.stats
```

ADMIN tidak mendapatkan capability:

```
attendance.gate.tap.entry
attendance.sessions.update.attendance
```

karena capability tersebut berasal dari organizational role.

---

6. Baseline GURU

Role GURU adalah role operasional pengajar.

Baseline capability:

```
dashboard.view.overview
academic.teaching.view
academic.teaching.rekap
attendance.sessions.create
attendance.sessions.view.list
attendance.sessions.view.detail
attendance.recap.view.daily
attendance.recap.view.monthly
documents.upload
documents.view.list
notify.view.my
notify.update.preferences
```

Capability seperti:

```
attendance.sessions.update.attendance
```

diberikan melalui posisi:

```
PETUGAS_KELAS
```

bukan melalui role GURU.

---

7. Baseline SISWA

Role SISWA memiliki capability minimal.

Contoh:

```
dashboard.view.overview
attendance.recap.view.daily
attendance.recap.view.monthly
documents.view.list
notify.view.my
notify.update.preferences
```

---

8. Generate Baseline Otomatis

TRAE (ANDA) diminta membuat script:

```
scripts/audit/rbac-baseline-generator.ts
```

Script ini harus:

1. membaca Action Catalog
2. membaca capability domain
3. membangun baseline role sesuai aturan domain
4. menghasilkan baseline capability baru

---

9. Generate File Baseline

Script harus menghasilkan file:

```
RBAC_BASELINE_RECONSTRUCTION_REPORT.md
```

Isi laporan:

Total capability catalog

Jumlah capability per role:

```
SUPERADMIN
ADMIN
GURU
SISWA
```

Contoh:

```
SUPERADMIN: 110
ADMIN: 182
GURU: 34
SISWA: 8
```

---

10. Validasi Baseline

Setelah baseline dibuat, lakukan validasi:

A. Semua capability endpoint harus dimiliki minimal oleh satu role.

B. Capability platform tidak boleh muncul pada role tenant.

C. Capability organizational tidak boleh muncul pada role baseline.

Jika ditemukan pelanggaran, script harus menampilkan error.

---

11. Update Seeder

TRAE (ANDA) harus memperbarui:

```
prisma/seed_policies.ts
```

agar menggunakan baseline capability baru.

Seeder harus menghasilkan:

```
RolePermission
```

yang konsisten dengan Action Catalog.

---

12. Verifikasi Sistem

Setelah baseline selesai lakukan:

```
npm run build
npm run test
```

dan lakukan pengujian endpoint utama:

```
/auth/me
/api/menu/sidebar
/api/attendance/*
```

Pastikan tidak ada error:

```
Missing Capability
Forbidden
```

---

13. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. Baseline role capability baru
2. File yang diubah dalam refactor RBAC
3. RBAC_BASELINE_RECONSTRUCTION_REPORT.md
4. Hasil build dan test
5. Konfirmasi bahwa authorization berjalan tanpa error

---

Setelah tahap ini selesai, sistem Absenta akan memiliki:

```
Canonical Capability Catalog
+
Canonical RBAC Baseline
+
Organizational Capability
```

yang merupakan fondasi authorization untuk platform SaaS multi-tenant.
