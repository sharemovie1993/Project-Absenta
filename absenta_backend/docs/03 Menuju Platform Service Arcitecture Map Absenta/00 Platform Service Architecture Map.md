Platform Service Architecture Map – Absenta
1. Layer Arsitektur Platform

Platform Absenta sebaiknya dibagi menjadi 4 layer utama.

Platform Core
↓
Service Layer
↓
Domain Modules
↓
Infrastructure

Penjelasan:

Platform Core

Fungsi platform yang dipakai oleh semua service.

Auth
Tenant
Subscription
Capability
Permission
User Management
Audit Log

Ini tidak boleh berada di service tertentu.

Service Layer

Layer yang menentukan fitur SaaS yang dibeli tenant.

Contoh service:

ABSENSI
KOPERASI
PPDB
RAPOR
CBT
PERPUSTAKAAN
KEUANGAN

Service ini diaktifkan lewat:

TenantCapabilities
PlanFeatures
Subscription
Domain Modules

Ini adalah modul internal dari setiap service.

Contoh:

Service Absensi
tap-gerbang
sesi-pembelajaran
absensi-siswa
absensi-guru
rekap-kehadiran
Service Koperasi
produk
stok
transaksi
laporan
Service PPDB
pendaftaran
verifikasi
seleksi
pengumuman
Infrastructure

Layer teknis:

database
cache
queue
worker
realtime
storage

Contoh:

PostgreSQL
Redis
Queue Worker
Socket Realtime
File Storage