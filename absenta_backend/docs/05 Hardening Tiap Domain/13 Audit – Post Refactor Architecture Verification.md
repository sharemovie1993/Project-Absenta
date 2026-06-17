Instruksi Audit – Post Refactor Architecture Verification

Audit ini bertujuan memverifikasi bahwa seluruh refactor yang dilakukan berdasarkan DOMAIN_REFACTOR_BLUEPRINT.md telah benar-benar diterapkan di seluruh codebase.

Audit ini adalah audit akhir setelah implementasi Phase 1–7 Domain Hardening.

LINGKUP AUDIT

Audit seluruh module pada:

src/modules

Module yang harus diperiksa:

auth
tenant
user
attendance
academic
billing
payment
invoice
notification
parent-app
superadmin
analytics
observability
document-center
menu
system-config
upgrade-intelligence
risk
revenue
finance
kesiswaan
kurikulum
sekolah
jadwal
backup
upload
consent
activity
dashboard

---

1. CIRCULAR DEPENDENCY VERIFICATION

Scan dependency graph antar module.

Pastikan:

* tidak ada circular dependency antar module
* tidak ada import silang yang membentuk cycle

Laporkan:

cycle count
dependency edges
dependency graph ringkasan

---

2. SERVICE SIZE VERIFICATION

Scan semua service file.

Laporkan:

service files yang melebihi 1000 lines.

Target setelah refactor:

0 service files >1000 lines.

---

3. CONTROLLER BOUNDARY VERIFICATION

Scan semua controller.

Pastikan tidak ada penggunaan langsung:

prisma
PrismaClient

di dalam controller.

Jika ditemukan, laporkan:

file path
query yang dilakukan.

---

4. REPOSITORY PATTERN VERIFICATION

Periksa setiap module.

Pastikan akses database hanya melalui:

repositories/

Laporkan jika terdapat:

service yang langsung menggunakan prisma.

---

5. DOMAIN STRUCTURE CONSISTENCY

Periksa apakah module memiliki struktur berikut:

services/
commands/
queries/
repositories/
event-handlers/

Jika tidak ada, tandai sebagai:

PARTIAL COMPLIANCE.

---

6. EVENT ARCHITECTURE CONSISTENCY

Scan seluruh penggunaan:

emitDomainEvent

Pastikan:

* event menggunakan lowercase dot-case
* tidak ada event uppercase
* tidak ada duplicate semantic event

---

7. WORKER & EVENT ALIGNMENT

Verifikasi bahwa event consumer berada di:

event-handlers/

bukan di service besar.

---

OUTPUT LAPORAN

Hasil audit harus dibuat pada:

docs/architecture/POST_REFACTOR_AUDIT.md

FORMAT LAPORAN

1. Platform Summary
2. Circular Dependency Status
3. Service Size Verification
4. Controller Boundary Verification
5. Repository Pattern Compliance
6. Domain Structure Compliance
7. Event Architecture Compliance
8. Worker / Event Alignment
9. Remaining Refactor Candidates

Tambahkan ringkasan di awal laporan:

Total modules audited
Total services
Total controllers
Circular dependency count
Services >1000 lines
Controller boundary violations
Repository pattern violations
