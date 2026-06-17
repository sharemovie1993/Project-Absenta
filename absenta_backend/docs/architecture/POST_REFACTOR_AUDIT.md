# POST REFACTOR AUDIT — Architecture Verification

Tanggal: 2026-03-15

Ringkasan
- Total modules audited: 33
- Total services: 154
- Total controllers: 51
- Circular dependency count: 0
- Services >1000 lines: 0
- Controller boundary violations: 0
- Repository pattern violations: 87

Catatan Lingkup
- Modul yang diminta pada instruksi audit namun tidak ditemukan di src/modules: invoice (ADA), payment (ADA), finance (ADA), kesiswaan (ADA), kurikulum (ADA), sekolah (ADA), jadwal (ADA), backup (ADA), upload (ADA), consent (ADA), activity (ADA), dashboard (ADA), analytics (ADA), observability (ADA), document-center (ADA), menu (ADA), system-config (ADA), upgrade-intelligence (ADA), risk (ADA), revenue (ADA), tenant (ADA), auth (ADA), user (ADA), attendance (ADA), academic (ADA), billing (ADA), notification (ADA), parent-app (ADA), superadmin (ADA)
- Modul yang ada di src/modules namun di luar daftar instruksi audit: audit, cooperative, pdf, reporting

---

## 1) Platform Summary
- Total module folders (src/modules): 33
- Total service files (*/services/*.ts): 154
- Total controller files (*/controllers/*.ts): 51
- Domain events (emitDomainEvent): 38 call sites, 12 unique event_type

---

## 2) Circular Dependency Status
Status: PASS
- Cycle count: 0
- Dependency edges (cross-module via @/modules/* imports): 16
- Dependency edges ringkas:
  - academic -> parent-app
  - academic -> user
  - attendance -> system-config
  - auth -> activity
  - auth -> sekolah
  - auth -> system-config
  - backup -> audit
  - billing -> audit
  - billing -> observability
  - billing -> system-config
  - dashboard -> auth
  - invoice -> observability
  - invoice -> system-config
  - menu -> auth
  - notification -> parent-app
  - notification -> system-config

---

## 3) Service Size Verification
Status: PASS
- Target: 0 service files >1000 lines
- Ditemukan: 0

---

## 4) Controller Boundary Verification
Status: PASS
- Aturan: controller tidak boleh menggunakan prisma/PrismaClient secara langsung
- Ditemukan: 0

---

## 5) Repository Pattern Compliance
Status: FAIL
- Aturan: akses database hanya lewat repositories/
- Temuan:
  - Total service files: 154
  - Service yang memakai prisma.* / PrismaClient di luar repositories/: 87
- Distribusi violation per module (teratas):
  - academic (15)
  - payment (13)
  - superadmin (12)
  - attendance (5)
  - billing (5)
  - observability (4)
  - invoice (3)
  - notification (3)
  - parent-app (3)

---

## 6) Domain Structure Compliance
Status: PARTIAL COMPLIANCE (platform-level)
- Aturan struktur: services/, commands/, queries/, repositories/, event-handlers/
- COMPLIANT (5):
  - academic, attendance, billing, invoice, payment
- PARTIAL (28):
  - activity, analytics, audit, auth, backup, consent, cooperative, dashboard, document-center, finance, jadwal, kesiswaan, kurikulum, menu, notification, observability, parent-app, pdf, reporting, revenue, risk, sekolah, superadmin, system-config, tenant, upgrade-intelligence, upload, user

---

## 7) Event Architecture Compliance
Status: PASS
- Aturan: event harus lowercase dot-case (tanpa underscore)
- emitDomainEvent:
  - Total call sites: 38
  - Unique event_type: 12
- Event naming violations: 0
- Catatan duplikasi literal:
  - billing.invoice.requested (9)
  - attendance.tap (8)
  - payment.succeeded (4)
  - payment.failed (3)
  - invoice.pdf.requested (3)

---

## 8) Worker / Event Alignment
Status: PASS
- Aturan: event consumer berada di event-handlers/ (bukan consumers/ atau service besar)
- Consumer file yang berada di luar event-handlers/: 0

---

## 9) Remaining Refactor Candidates
- Pecah service >1000 lines: DONE (0 file)
- Hilangkan prisma langsung di controller: DONE (0 violation)
- Pindahkan consumer dari consumers/ ke event-handlers/: DONE (0 violation)
- Kurangi repository pattern violation: fokus modul academic, payment, superadmin sebagai prioritas
- Standarisasi event_type agar dot-case tanpa underscore: DONE (notification.email.send-requested, notification.whatsapp.send-requested)
