Instruksi Audit Platform Architecture – Absenta Backend

Tujuan audit ini adalah memetakan kondisi arsitektur backend Absenta saat ini untuk menilai kesiapan sistem sebagai SaaS Platform Sekolah multi-service.

Audit ini tidak melakukan refactor atau perubahan kode.

---

# 1. Audit Struktur Modul Backend

Tujuan:
memetakan modul backend berdasarkan domain service.

Langkah:

1. Buat daftar seluruh module backend yang ada di folder src/modules atau struktur serupa.

Contoh:

attendance
cooperative
academic
billing
notification
report
document-center
user
dashboard

2. Kelompokkan modul tersebut menjadi kategori berikut:

Platform Core
Service Modules
Shared Modules
Infrastructure

Contoh output:

Platform Core:
auth
tenant
subscription
capability
permission

Service Modules:
attendance
cooperative

Shared Modules:
notification
document-center
report

Infrastructure:
database
cache
queue
realtime

---

# 2. Audit Dependency Antar Modul

Tujuan:
melihat apakah module saling bergantung terlalu kuat.

Langkah:

Untuk setiap module service (attendance, cooperative, dll), identifikasi:

* service apa yang diimport
* module apa yang dipanggil langsung

Contoh laporan:

attendance module menggunakan:

* prisma
* tenant middleware
* notification service

cooperative module menggunakan:

* prisma
* user module

Laporkan jika ada kondisi:

module A memanggil langsung module B tanpa melalui service abstraction.

---

# 3. Audit Service Capability Integration

Tujuan:
memastikan service modules menggunakan capability system platform.

Langkah:

Periksa apakah module berikut menggunakan:

config.capability
ModuleCapability enum
CapabilityGuard

Module yang harus dicek:

attendance
cooperative
reporting
billing
document-center
notification

Laporkan:

module mana yang sudah menggunakan capability system
module mana yang belum.

---

# 4. Audit Route Structure

Tujuan:
memastikan routing backend sudah mengikuti pola service domain.

Langkah:

Buat daftar route prefix utama.

Contoh:

/api/attendance/*
/api/cooperative/*
/api/academic/*
/api/billing/*
/api/notifications/*
/api/documents/*

Laporkan apakah semua service memiliki route prefix sendiri.

---

# 5. Audit Worker / Background Process

Tujuan:
mengetahui apakah backend sudah memiliki worker architecture.

Langkah:

Cari implementasi berikut:

queue worker
cron jobs
background processing

Contoh yang mungkin ada:

attendance recap
notification sending
report generation
document export

Laporkan proses yang berjalan di:

API thread
worker thread

---

# 6. Audit Event / Realtime System

Tujuan:
memetakan komunikasi antar service.

Langkah:

Cari penggunaan:

socket.io
event emitter
queue event
pub/sub

Contoh event:

attendance tap
payment success
notification push

Laporkan bagaimana event dikirim dan service mana yang mengonsumsi event tersebut.

---

# 7. Audit Database Domain Separation

Tujuan:
melihat apakah tabel database sudah mengikuti domain service.

Langkah:

Kelompokkan tabel database berdasarkan service.

Contoh:

Attendance domain:
attendance_sessions
attendance_logs
attendance_devices

Cooperative domain:
cooperative_products
cooperative_transactions

Academic domain:
students
teachers
classes

Laporkan jika ada tabel yang digunakan oleh banyak service tanpa abstraction.

---

# 8. Audit Multi-Tenant Isolation

Tujuan:
memastikan semua domain service mendukung multi-tenant.

Langkah:

Periksa apakah tabel domain service memiliki:

tenant_id

Contoh tabel yang harus dicek:

attendance_sessions
attendance_logs
cooperative_transactions
ppdb_applications

Laporkan tabel yang belum memiliki tenant isolation.

---

# 9. Audit API Coupling

Tujuan:
melihat apakah service logic terlalu bercampur.

Langkah:

Cari controller yang menangani lebih dari satu domain service.

Contoh yang harus dicatat:

attendance controller memanggil cooperative logic
billing controller memanggil attendance logic

Jika ada, tandai sebagai coupling.

---

# 10. Output Audit

Output audit harus berisi:

1. daftar module backend
2. dependency antar module
3. service capability usage
4. route domain mapping
5. worker architecture
6. event / realtime architecture
7. database domain grouping
8. multi-tenant isolation check
9. API coupling analysis

Audit ini hanya memetakan kondisi arsitektur saat ini.

Tidak ada refactor atau perubahan kode pada tahap ini.
