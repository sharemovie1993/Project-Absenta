Instruksi Implementasi – Tenant Context Integrity Audit (SaaS Security Hardening)

Tujuan audit ini adalah memastikan seluruh endpoint tenant di platform Absenta selalu menggunakan **tenant context dari middleware**, bukan dari input request.

Audit ini merupakan tahap hardening terakhir setelah:

* RBAC Capability Canonicalization
* RBAC Baseline Reconstruction
* Endpoint Context Separation
* Repository Artifact Cleanup

Tujuan utamanya adalah memastikan **tenant isolation benar-benar aman**.

---

1. Prinsip Tenant Isolation

Dalam arsitektur SaaS multi-tenant, semua operasi tenant harus menggunakan:

```text
tenant_id dari middleware context
```

bukan dari:

```text
request parameter
request body
request query
```

Karena jika tenant_id diambil dari request, maka akan memungkinkan skenario seperti:

```text
tenant A membaca data tenant B
tenant A mengubah data tenant B
tenant A melihat billing tenant lain
```

Hal ini merupakan **critical security risk**.

---

2. Sumber Tenant Context Yang Benar

Tenant context harus selalu berasal dari middleware:

```text
req.tenant.id
```

atau

```text
req.context.tenant_id
```

bergantung pada implementasi middleware tenant di Absenta.

Contoh penggunaan yang benar:

```ts
const tenantId = req.tenant.id;

await prisma.student.findMany({
  where: { tenant_id: tenantId }
});
```

---

3. Pola Yang Tidak Boleh Ada

TRAE (ANDA) harus mencari pola seperti ini di seluruh backend.

❌ Contoh tidak aman:

```ts
const tenantId = req.params.tenantId
```

atau

```ts
const tenantId = req.body.tenant_id
```

atau

```ts
const tenantId = req.query.tenant_id
```

atau endpoint seperti:

```text
GET /api/students?tenant_id=...
```

Ini harus dikategorikan sebagai:

```text
TENANT CONTEXT VIOLATION
```

---

4. Scan Seluruh Endpoint Tenant

TRAE (ANDA) harus memindai seluruh folder:

```text
src/modules
src/controllers
src/services
src/routes
```

dan mencari pola berikut:

```text
tenant_id
tenantId
req.params.tenant
req.query.tenant
req.body.tenant
```

---

5. Klasifikasi Temuan

Setiap temuan harus diklasifikasikan:

```text
SAFE
TENANT_CONTEXT_VIOLATION
REVIEW_REQUIRED
```

Kriteria:

SAFE

Endpoint mengambil tenant dari middleware context.

TENANT_CONTEXT_VIOLATION

Endpoint menerima tenant_id dari request.

REVIEW_REQUIRED

Endpoint platform yang memang membutuhkan tenant_id parameter.

---

6. Contoh Endpoint Yang Aman

Endpoint tenant harus seperti ini:

```text
GET /api/students
GET /api/attendance/sessions
GET /api/academic/classes
```

Query harus selalu:

```ts
where: { tenant_id: req.tenant.id }
```

---

7. Contoh Endpoint Platform Yang Dikecualikan

Endpoint platform boleh menggunakan tenantId parameter.

Contoh:

```text
GET /api/superadmin/tenants/:tenantId
GET /api/superadmin/tenants/:tenantId/users
GET /api/superadmin/tenants/:tenantId/metrics
```

Karena ini hanya dipakai oleh:

```text
SUPERADMIN
```

---

8. Buat Script Audit

TRAE (ANDA) diminta membuat script:

```text
scripts/audit/tenant-context-integrity-audit.ts
```

Script harus:

1. memindai seluruh endpoint
2. mencari penggunaan tenantId dari request
3. memverifikasi penggunaan tenant context middleware
4. menghasilkan laporan audit

---

9. Laporan Audit

Script harus menghasilkan file:

```text
TENANT_CONTEXT_INTEGRITY_AUDIT.md
```

Isi laporan:

Total endpoint tenant yang dipindai

Jumlah endpoint SAFE

Jumlah TENANT_CONTEXT_VIOLATION

Jumlah REVIEW_REQUIRED

Contoh laporan:

```text
Total endpoints scanned: 168

SAFE: 150
TENANT_CONTEXT_VIOLATION: 4
REVIEW_REQUIRED: 14
```

---

10. Refactor Jika Ditemukan Pelanggaran

Jika ditemukan pelanggaran seperti:

```ts
const tenantId = req.params.tenantId
```

maka harus direfactor menjadi:

```ts
const tenantId = req.tenant.id
```

---

11. Verifikasi Sistem

Setelah audit selesai lakukan verifikasi:

```bash
npm run build
npm run test
```

Pastikan tidak ada error.

---

12. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta memberikan:

1. TENANT_CONTEXT_INTEGRITY_AUDIT.md
2. Daftar endpoint yang diperbaiki
3. Daftar endpoint yang membutuhkan review
4. Konfirmasi bahwa tenant isolation aman

---

Setelah audit ini selesai, platform Absenta akan memiliki:

```text
RBAC Authorization Hardening
+
Endpoint Context Separation
+
Tenant Context Integrity
```

yang merupakan **standar keamanan arsitektur SaaS multi-tenant**.
