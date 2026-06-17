Instruksi Implementasi – Capability Domain Classification (PLATFORM vs TENANT)

Tujuan instruksi ini adalah mengklasifikasikan seluruh capability dalam Action Catalog Absenta menjadi domain:

* PLATFORM
* TENANT
* SHARED
* ORGANIZATIONAL

Hal ini diperlukan agar RBAC baseline tidak tercampur antara capability platform console dan tenant application.

Saat ini Action Catalog memiliki ±318 capability dan belum memiliki domain classification. Tanpa klasifikasi ini audit RBAC akan menghasilkan baseline yang terlalu besar dan mencampur akses SUPERADMIN dengan ADMIN tenant.

---

1. Prinsip Arsitektur Capability Domain

Setiap capability harus memiliki domain.

Definisi domain:

PLATFORM
Capability hanya boleh digunakan oleh SUPERADMIN pada Platform Console.

TENANT
Capability digunakan oleh ADMIN/GURU/SISWA di Tenant Application.

SHARED
Capability dapat digunakan di kedua domain.

ORGANIZATIONAL
Capability diberikan melalui OrganizationalPosition (WALIKELAS, GERBANG, dll).

Capability tidak boleh berada di lebih dari satu domain.

---

2. Lokasi Implementasi

TRAE (ANDA) diminta membuat modul baru:

```
src/config/capability-domains.ts
```

File ini akan menjadi mapping canonical:

```
CAPABILITY_DOMAIN
```

Struktur:

```
export type CapabilityDomain =
  | "PLATFORM"
  | "TENANT"
  | "SHARED"
  | "ORGANIZATIONAL";

export const CAPABILITY_DOMAIN_MAP: Record<string, CapabilityDomain> = {};
```

Mapping ini nantinya akan di-generate oleh script audit.

---

3. Scanner Capability Catalog

TRAE (ANDA) harus membaca:

```
docs/action_catalog_canonical_futureproof.md
```

Ambil semua capability yang berbentuk:

```
xxx.xxx.xxx
```

Kumpulkan sebagai:

```
catalogCapabilities[]
```

---

4. Rule Classification (Automatic)

Capability harus diklasifikasikan berdasarkan prefix.

Rule berikut harus diterapkan.

A. PLATFORM Domain

Jika capability memiliki prefix:

```
superadmin.*
core.tenants.*
platform.*
system.*
billing.plans.*
billing.revenue.*
```

maka domain:

```
PLATFORM
```

Contoh:

```
superadmin.tenants.manage
superadmin.revenue.view.overview
core.tenants.view.list
system.logs.view
```

Semua capability ini hanya boleh digunakan oleh SUPERADMIN.

---

B. TENANT Domain

Jika capability memiliki prefix:

```
academic.*
attendance.*
cooperative.*
documents.*
reports.*
sarpras.*
hubin.*
tu.*
affairs.*
curriculum.*
```

maka domain:

```
TENANT
```

Contoh:

```
academic.students.view.list
attendance.sessions.create
cooperative.members.view.list
```

Capability ini digunakan oleh ADMIN/GURU/SISWA.

---

C. SHARED Domain

Jika capability memiliki prefix:

```
dashboard.*
notify.*
core.auth.*
core.users.*
core.menu.*
billing.my_subscription.*
```

maka domain:

```
SHARED
```

Contoh:

```
dashboard.view.overview
notify.view.my
core.auth.logout
core.users.view.list
```

Capability ini digunakan di tenant tetapi juga dapat muncul di platform context.

---

D. ORGANIZATIONAL Domain

Jika capability ditemukan dalam:

```
src/config/capabilities.ts
```

pada:

```
STRUKTUR_CAPABILITIES
```

maka domain:

```
ORGANIZATIONAL
```

Contoh:

```
attendance.gate.tap.entry
attendance.sessions.update.attendance
```

Capability ini hanya muncul melalui:

```
organizationalPosition
```

---

5. Script Classification

TRAE (ANDA) harus membuat script:

```
scripts/audit/capability-domain-classifier.ts
```

Script ini harus:

1. membaca action catalog
2. membaca STRUKTUR_CAPABILITIES
3. menerapkan rule classification
4. menghasilkan mapping capability → domain

---

6. Generate Domain Mapping

Script harus menghasilkan file:

```
src/config/capability-domains.generated.ts
```

Contoh output:

```
export const CAPABILITY_DOMAIN_MAP = {
  "superadmin.tenants.manage": "PLATFORM",
  "superadmin.revenue.view.overview": "PLATFORM",

  "academic.students.view.list": "TENANT",
  "attendance.sessions.create": "TENANT",

  "dashboard.view.overview": "SHARED",
  "notify.view.my": "SHARED",

  "attendance.gate.tap.entry": "ORGANIZATIONAL"
};
```

---

7. Validation Rules

Script harus melakukan validasi berikut.

A. Capability tanpa domain

Jika capability tidak cocok dengan rule manapun, tampilkan:

```
UNCLASSIFIED CAPABILITY
```

B. Capability multi domain

Jika capability muncul dalam lebih dari satu domain rule, tampilkan:

```
DOMAIN CONFLICT
```

C. Organizational capability tidak boleh berada di PLATFORM.

---

8. Generate Classification Report

TRAE (ANDA) harus membuat laporan:

```
CAPABILITY_DOMAIN_CLASSIFICATION_REPORT.md
```

Isi laporan:

Total capability di catalog

Jumlah capability per domain

```
PLATFORM
TENANT
SHARED
ORGANIZATIONAL
UNCLASSIFIED
```

Contoh:

```
Total Catalog: 318

PLATFORM: 42
TENANT: 221
SHARED: 33
ORGANIZATIONAL: 22
UNCLASSIFIED: 0
```

---

9. Output Dataset

Script juga harus menghasilkan:

```
capability_domain_map.json
```

Struktur:

```
{
  "superadmin.tenants.manage": "PLATFORM",
  "academic.students.view.list": "TENANT",
  "dashboard.view.overview": "SHARED",
  "attendance.gate.tap.entry": "ORGANIZATIONAL"
}
```

---

10. Tujuan Akhir

Setelah classification selesai:

1. Capability tidak tercampur antara platform dan tenant
2. RBAC baseline dapat dibuat berdasarkan domain
3. SUPERADMIN hanya mendapat capability PLATFORM + SHARED
4. ADMIN hanya mendapat TENANT + SHARED
5. Organizational capability hanya diberikan melalui posisi organisasi

Dengan demikian RBAC Absenta akan memiliki arsitektur:

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

Ini memastikan tidak ada lagi kebocoran capability antara Platform Console dan Tenant Application.

---

11. Output Yang Harus Diberikan TRAE

TRAE (ANDA) diminta menghasilkan:

1. Script capability-domain-classifier.ts
2. capability-domains.generated.ts
3. capability_domain_map.json
4. CAPABILITY_DOMAIN_CLASSIFICATION_REPORT.md
5. Ringkasan hasil klasifikasi capability
