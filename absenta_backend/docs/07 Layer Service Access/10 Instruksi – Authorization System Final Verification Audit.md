Instruksi – Authorization System Final Verification Audit

Platform Absenta telah menyelesaikan refactor authorization hingga Phase 4:

Service Feature Guard
Subscription Guard Hardening
Capability Enforcement Normalization
RBAC Simplification

Sebelum sistem dinyatakan stabil, perlu dilakukan verifikasi menyeluruh untuk memastikan tidak ada authorization bypass atau regression.

Tahap ini hanya melakukan audit dan pengujian.

Tidak boleh ada perubahan kode kecuali ditemukan bug.

---

# Tujuan Audit

Audit ini bertujuan memastikan:

* semua endpoint non-publik terlindungi capability guard
* service feature guard bekerja dengan benar
* subscription guard tidak dapat dibypass
* tidak ada privilege escalation
* tidak ada endpoint yang terbuka tanpa authorization

---

# Task 1 – Endpoint Authorization Coverage Scan

Scan seluruh route backend.

Verifikasi bahwa setiap endpoint non-publik memiliki:

requireCapability(...)

Output laporan:

Total endpoint
Public endpoint
Protected endpoint
Endpoint dengan capability guard

Expected result:

100% endpoint protected memiliki capability guard.

---

# Task 2 – Service Feature Enforcement Test

Uji akses module service dengan tenant yang tidak memiliki feature.

Contoh:

Tenant tanpa ABSENSI mencoba:

/api/attendance/*

Expected:

HTTP 403
SERVICE_FEATURE_NOT_ENABLED

Lakukan juga untuk:

cooperative module
reporting module

---

# Task 3 – Subscription Enforcement Test

Uji akses tenant dengan status subscription berbeda.

Test case:

ACTIVE
TRIAL
EXPIRED
CANCELLED
SUSPENDED

Expected:

ACTIVE → access allowed
TRIAL → access allowed
EXPIRED → 403 SUBSCRIPTION_NOT_ACTIVE

Pastikan endpoint billing tetap dapat diakses.

---

# Task 4 – Capability Enforcement Test

Uji user tanpa capability mencoba endpoint.

Contoh:

User tanpa capability:

attendance.sessions.create

mencoba:

POST /api/attendance/sessions

Expected:

HTTP 403
CAPABILITY_ACCESS_DENIED

---

# Task 5 – Privilege Escalation Test

Uji apakah user biasa dapat mengakses endpoint admin.

Contoh:

Guru mencoba akses:

/api/superadmin/*

Expected:

403

Uji juga apakah user bisa mengakses data tenant lain.

---

# Task 6 – Cross-Tenant Isolation Test

Pastikan tenant tidak dapat mengakses data tenant lain.

Simulasikan:

tenantId A mencoba akses resource tenantId B

Expected:

access denied

---

# Task 7 – Logging Verification

Pastikan event berikut tercatat:

SERVICE_FEATURE_NOT_ENABLED
SUBSCRIPTION_NOT_ACTIVE
CAPABILITY_ACCESS_DENIED

Log harus mencatat:

tenantId
userId
endpoint
timestamp

---

# Output

Simpan laporan pada:

docs/audit/AUTHORIZATION_FINAL_VERIFICATION_REPORT.md

Dokumen harus berisi:

* hasil endpoint coverage scan
* hasil service feature test
* hasil subscription test
* hasil capability enforcement test
* hasil privilege escalation test
* hasil cross-tenant isolation test
* daftar issue jika ditemukan

Jika tidak ada issue maka authorization system dianggap fully verified.
