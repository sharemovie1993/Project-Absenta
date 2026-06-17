Tujuan audit ini adalah memetakan dan mengevaluasi layer middleware pada backend Absenta Platform yang saat ini telah berevolusi dari single-product SaaS Absensi menjadi SaaS Platform Sekolah multi-service.

Audit ini tidak bertujuan langsung melakukan refactor, tetapi untuk:

1. Mengidentifikasi middleware yang saat ini digunakan.
2. Memetakan urutan middleware pada setiap endpoint utama.
3. Menemukan duplikasi atau inkonsistensi middleware.
4. Memastikan kesiapan arsitektur untuk SaaS multi-service.

Output audit harus berupa laporan struktural yang akan digunakan sebagai dasar refactor.

---

## 1. Identifikasi Seluruh Middleware

Lakukan pencarian global pada project backend untuk semua middleware yang ada.

Cari pada:

* folder middleware
* kernel / middleware registry
* route groups
* custom guard
* interceptors

Laporkan daftar middleware berikut:

Nama Middleware
Lokasi File
Tujuan Middleware
Dependency Middleware lain

Contoh format laporan:

Middleware: AuthMiddleware
File: src/middleware/auth.middleware.ts
Tujuan: validasi JWT token
Digunakan pada: hampir seluruh endpoint API

Middleware: TenantResolverMiddleware
File: src/middleware/tenant.middleware.ts
Tujuan: resolve tenant dari user context

---

## 2. Audit Pipeline Middleware

Petakan pipeline middleware yang dijalankan pada request.

Untuk endpoint berikut:

* /dashboard
* /academic/*
* /master/*
* /attendance/*
* /cooperative/*
* /subscription/*
* /billing/*
* /admin/*

Laporkan:

Endpoint
Middleware yang dijalankan
Urutan middleware

Contoh output yang diharapkan:

Endpoint: /attendance/session

Pipeline:

1. AuthMiddleware
2. TenantMiddleware
3. ServiceSubscriptionMiddleware (absensi)
4. RoleMiddleware (guru/admin)

---

## 3. Audit Validasi Tenant

Pastikan sistem memiliki middleware yang:

* memuat tenant berdasarkan user
* memastikan tenant aktif
* memastikan tenant tidak suspended

Laporkan:

* apakah middleware tenant sudah ada
* apakah semua endpoint menggunakan tenant context
* apakah ada endpoint yang bypass tenant check

---

## 4. Audit Subscription System

Karena platform sekarang menjadi SaaS multi-service, audit harus menemukan bagaimana subscription diverifikasi.

Cari implementasi untuk:

* core_platform subscription
* service subscription (absensi, koperasi, dll)

Laporkan:

Apakah validasi subscription dilakukan di:

middleware
controller
service layer
atau bercampur

Identifikasi endpoint yang:

tidak melakukan validasi subscription
atau melakukan validasi langsung di controller

---

## 5. Audit Role & Permission

Cari semua implementasi berikut:

role check
permission check
position check

Contoh:

isAdmin
isGuru
isSuperAdmin
hasRole
hasPermission

Laporkan:

apakah role check dilakukan melalui middleware atau langsung di controller

---

## 6. Audit Multi-Role / Position Guru

Karena guru dapat memiliki banyak jabatan:

wali kelas
kurikulum
kesiswaan
kepala sekolah
hubin
sarpras

Audit apakah:

* posisi guru disimpan di database
* posisi digunakan untuk kontrol akses
* posisi diverifikasi melalui middleware

---

## 7. Audit Endpoint Tanpa Proteksi

Cari endpoint yang hanya menggunakan:

auth saja

atau bahkan tidak menggunakan middleware sama sekali.

Laporkan endpoint tersebut.

---

## 8. Audit Feature / Service Access

Karena sistem menjadi platform multi layanan, audit juga harus menemukan:

bagaimana fitur berikut diaktifkan:

absensi
koperasi
ppdb
rapor

Laporkan:

apakah fitur ini dikontrol melalui:

subscription
feature flag
hardcoded route
atau role check

---

## 9. Buat Diagram Middleware Saat Ini

Buat diagram pipeline middleware aktual sistem.

Contoh:

Request
↓
Auth
↓
Tenant
↓
Role
↓
Controller

atau pipeline lain yang ditemukan.

---

## 10. Gap Analysis

Bandingkan hasil audit dengan arsitektur middleware ideal SaaS platform:

Auth
Tenant Resolver
Core Subscription
Service Subscription
Role
Permission

Laporkan gap berikut:

middleware yang belum ada
middleware yang bercampur
middleware yang perlu dipisah

---

## 11. Deliverable

Output audit harus berisi:

1. Daftar middleware
2. Pipeline middleware per endpoint
3. Endpoint tanpa proteksi
4. Sistem subscription saat ini
5. Sistem role/permission saat ini
6. Diagram middleware eksisting
7. Gap analysis

Audit ini hanya bertujuan memetakan kondisi sistem saat ini.

Refactor tidak dilakukan sampai laporan audit selesai.
