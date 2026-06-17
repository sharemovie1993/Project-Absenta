Instruksi – Authorization Refactor Implementation Plan

Platform Absenta telah melalui beberapa tahap penting sebelum refactor authorization dimulai:

1. Hardening middleware pipeline
2. Platform Service Access Audit
3. Capability Enforcement Audit
4. Authorization Architecture Blueprint

Blueprint arsitektur authorization telah dikunci sebagai desain final.

Refactor harus mengikuti blueprint tersebut secara bertahap dan aman tanpa merusak sistem yang sudah berjalan.

Dokumen ini mendefinisikan rencana implementasi refactor authorization untuk platform Absenta.

Tidak semua fase harus selesai dalam satu iterasi.
Setiap fase harus dapat diuji dan diverifikasi sebelum melanjutkan ke fase berikutnya.

---

## Tujuan Refactor

Refactor ini bertujuan untuk:

* Menstandarkan enforcement authorization di seluruh platform
* Memastikan service access governance pada platform multi-service
* Menormalkan capability enforcement di semua endpoint
* Menghilangkan role-based authorization yang tidak sesuai blueprint
* Menyelaraskan capability dengan Action Catalog canonical

Refactor harus menjaga kompatibilitas dengan sistem yang sudah berjalan.

---

# Phase 1 – Service Feature Guard

## Tujuan

Menjamin bahwa setiap module service hanya dapat diakses jika tenant memiliki entitlement layanan yang sesuai.

Contoh:

Tenant tanpa feature `ABSENSI` tidak boleh mengakses module attendance.

Tenant tanpa feature `KOPERASI` tidak boleh mengakses module cooperative.

---

## Task 1 – Define Feature Guard Middleware

Buat middleware baru:

ServiceFeatureGuard

Lokasi:

src/infra/guards/service-feature.guard.ts

Fungsi middleware:

* membaca entitlement tenant
* memeriksa apakah tenant memiliki feature yang dibutuhkan oleh module
* menolak request jika feature tidak dimiliki

Contoh interface:

requireFeature('ABSENSI')

---

## Task 2 – Tenant Entitlement Resolver

Buat service:

TenantEntitlementResolver

Lokasi:

src/modules/billing/services/tenant-entitlement.service.ts

Fungsi service:

* mengambil subscription aktif tenant
* mengagregasi features_json dari semua plan aktif
* menghasilkan daftar feature tenant

Contoh output:

['CORE','ABSENSI','KOPERASI']

Service ini harus memiliki caching agar tidak query database di setiap request.

---

## Task 3 – Module Feature Mapping

Setiap module service harus menetapkan feature requirement.

Contoh mapping:

attendance module → ABSENSI
cooperative module → KOPERASI
reporting module → REPORTING
academic module → CORE

Mapping harus dilakukan pada level module plugin atau route configuration.

Contoh:

routeOptions.config.feature = 'ABSENSI'

---

## Task 4 – Integrasi Feature Guard pada Pipeline

Pipeline `/api` protected routes harus diperbarui:

Request
→ Logging Middleware
→ Auth Middleware
→ Tenant Resolver
→ Tenant Status Guard
→ Subscription Guard
→ Service Feature Guard
→ Capability Guard
→ Controller

ServiceFeatureGuard harus dijalankan sebelum CapabilityGuard.

---

## Task 5 – Define Public Endpoint Exception

Beberapa endpoint tidak boleh melewati feature guard.

Contoh:

payment webhook
invoice public link
document download token

Endpoint ini harus diberi flag:

routeOptions.config.public = true

ServiceFeatureGuard harus melewati endpoint tersebut.

---

## Task 6 – Verification

Setelah implementasi selesai lakukan pengujian:

Tenant tanpa ABSENSI mencoba akses attendance → harus ditolak.

Tenant dengan ABSENSI → harus berhasil.

Tenant tanpa KOPERASI mencoba akses cooperative → harus ditolak.

---

# Phase 2 – Subscription Guard Hardening

## Tujuan

Memastikan tenant dengan subscription tidak valid tidak dapat mengakses platform core.

---

## Task 1 – Subscription Status Policy

Definisikan status subscription yang diizinkan mengakses core platform.

Contoh status valid:

ACTIVE
TRIAL

Status yang harus diblok:

EXPIRED
CANCELLED
SUSPENDED

---

## Task 2 – Update Subscription Guard

Perbarui:

subscriptionGuard

Agar memblok semua endpoint non-billing ketika subscription tidak valid.

Pengecualian:

billing endpoints
subscription renewal
payment flow

---

## Task 3 – Verification

Tenant expired mencoba akses dashboard → harus ditolak.

Tenant expired mencoba akses billing → harus diizinkan.

---

# Phase 3 – Capability Enforcement Normalization

## Tujuan

Memastikan setiap endpoint non-publik memiliki capability mapping yang eksplisit.

---

## Task 1 – Endpoint Capability Audit

Gunakan hasil audit sebelumnya untuk mengidentifikasi endpoint tanpa capability.

Tambahkan:

requireCapability(...)

pada endpoint tersebut.

---

## Task 2 – Role Based Authorization Migration

Endpoint yang menggunakan:

authorize(role)

harus dimigrasi menjadi capability based.

Contoh:

ADMIN access → capability khusus seperti:

system.admin.access

---

## Task 3 – Standardize Capability Usage

Setiap endpoint hanya boleh menggunakan capability yang berasal dari Action Catalog canonical.

---

## Task 4 – Verification

Coba akses endpoint tanpa capability user → harus ditolak.

Coba akses endpoint dengan capability → harus berhasil.

---

# Phase 4 – RBAC Simplification

## Tujuan

Membersihkan logika role-centric yang tidak sesuai blueprint.

---

## Task 1 – Remove Role Only Guards

Hapus guard yang hanya memeriksa role tanpa capability.

---

## Task 2 – Centralize Capability Resolution

Sumber capability user harus berasal dari satu service:

AuthorizationService

Hilangkan fallback atau hardcoded capability yang tidak diperlukan.

---

# Phase 5 – Action Catalog Cleanup

## Tujuan

Menyelaraskan semua capability enforcement dengan Action Catalog canonical.

---

## Task 1 – Identify Invalid Capabilities

Gunakan laporan audit untuk menemukan capability yang tidak valid.

---

## Task 2 – Fix Capability Mapping

Capability yang tidak ada di catalog harus:

* diperbaiki
* atau ditambahkan secara resmi ke catalog

---

## Task 3 – Catalog Validation

Tambahkan validasi agar capability yang tidak ada di catalog tidak dapat digunakan.

---

# Refactor Safety Rules

Selama refactor berlangsung:

* Tidak boleh mengubah API contract existing.
* Tidak boleh memecah endpoint yang digunakan frontend.
* Perubahan authorization harus backward compatible selama fase migrasi.
* Setiap fase harus diuji sebelum melanjutkan ke fase berikutnya.

---

# Output

Dokumen ini harus disimpan pada:

docs/architecture/AUTHORIZATION_REFACTOR_PLAN.md

Refactor harus mengikuti fase yang telah ditentukan dalam dokumen ini.
