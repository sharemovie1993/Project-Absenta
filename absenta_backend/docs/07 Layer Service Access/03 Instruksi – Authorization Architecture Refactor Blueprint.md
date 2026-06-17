Instruksi – Authorization Architecture Refactor Blueprint

Platform Absenta telah melalui dua tahap audit authorization:

1 Platform Service Access Audit
2 Capability Enforcement Audit

Audit menemukan beberapa masalah pada layer authorization:

* service feature enforcement belum konsisten
* subscription guard belum kuat
* capability enforcement tidak merata
* beberapa endpoint masih menggunakan role based authorization
* terdapat capability yang tidak valid

Sebelum melakukan refactor pada sistem authorization, diperlukan dokumen blueprint arsitektur yang menjelaskan desain authorization final untuk platform Absenta.

Tujuan blueprint ini adalah menjadi panduan refactor agar perubahan dapat dilakukan secara aman tanpa merusak sistem yang sudah berjalan.

Tidak boleh ada perubahan kode pada tahap ini.

Hanya analisis arsitektur dan desain blueprint.

---

TUJUAN BLUEPRINT

Blueprint harus menjelaskan desain akhir authorization system pada platform Absenta yang mendukung:

* multi tenant SaaS
* multi service platform
* capability based authorization
* scalable service governance

Blueprint ini akan menjadi referensi untuk seluruh refactor authorization berikutnya.

---

LANGKAH 1 – Current Authorization Architecture

Dokumentasikan arsitektur authorization yang berjalan saat ini.

Jelaskan pipeline request saat ini:

Request
↓
AuthMiddleware
↓
TenantMiddleware
↓
CapabilityGuard (optional)
↓
Controller

Jelaskan bagaimana role, capability, dan subscription digunakan pada sistem saat ini.

---

LANGKAH 2 – Problem Analysis

Gunakan hasil audit sebelumnya untuk menjelaskan masalah pada sistem saat ini.

Minimal harus mencakup:

Service access tidak konsisten
Endpoint tanpa capability guard
Role based authorization yang masih tersisa
Capability yang tidak valid
Subscription guard yang belum kuat

---

LANGKAH 3 – Target Authorization Architecture

Desain arsitektur authorization yang menjadi target sistem.

Pipeline final yang diinginkan:

Request
↓
Logging Middleware
↓
Auth Middleware
↓
Tenant Resolver
↓
Subscription Guard
↓
Service Feature Guard
↓
Capability Guard
↓
Controller

Jelaskan fungsi dari setiap layer.

---

LANGKAH 4 – Service Feature Governance Model

Deskripsikan model layanan platform.

Contoh layanan:

CORE_PLATFORM
ABSENSI
KOPERASI
REPORTING
PPDB
RAPOR

Jelaskan bagaimana feature layanan disimpan pada subscription.

Contoh:

Plan.features_json

Jelaskan bagaimana backend menentukan apakah tenant memiliki akses terhadap suatu service.

---

LANGKAH 5 – Capability Model

Jelaskan model capability yang digunakan.

Capability berasal dari Action Catalog dengan format:

domain.resource.action

Contoh:

attendance.sessions.create
academic.students.view.list
billing.invoices.view.list

Jelaskan bagaimana capability dihubungkan dengan endpoint.

---

LANGKAH 6 – RBAC Model

Jelaskan hubungan antara:

role
capability
user

Role hanya berfungsi sebagai container capability.

Contoh:

ADMIN → banyak capability
GURU → subset capability
SISWA → minimal capability

---

LANGKAH 7 – Data Scope Model

Jelaskan pembatasan data berdasarkan konteks user.

Contoh:

guru hanya melihat kelasnya
wali kelas hanya melihat kelas binaannya
admin sekolah melihat seluruh tenant

---

LANGKAH 8 – Migration Strategy

Blueprint harus menjelaskan strategi migrasi.

Tujuan migrasi:

menambahkan service feature guard
menormalkan capability enforcement
menghapus role based authorization

Migrasi harus dilakukan secara bertahap tanpa merusak endpoint yang sudah ada.

---

LANGKAH 9 – Refactor Phases

Blueprint harus mendefinisikan fase refactor.

Contoh fase:

Phase 1 – Service Feature Guard
Phase 2 – Subscription Guard Hardening
Phase 3 – Capability Enforcement Normalization
Phase 4 – RBAC Simplification

---

OUTPUT DOKUMEN

Blueprint harus disimpan pada:

docs/architecture/AUTHORIZATION_ARCHITECTURE_BLUEPRINT.md

Dokumen harus cukup lengkap sehingga refactor authorization dapat dilakukan berdasarkan blueprint tersebut.
