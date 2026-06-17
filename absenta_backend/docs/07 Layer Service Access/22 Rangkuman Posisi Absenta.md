🧠 Posisi Platform Absenta Saat Ini

Platform Absenta sekarang sudah berada pada level:

Multi-Tenant SaaS Platform
dengan
Event Driven Architecture
+ Modular Domain
+ Authorization Engine

Ini bukan lagi aplikasi absensi, tetapi sudah menjadi platform layanan sekolah.

1️⃣ Arsitektur Backend

Backend sudah direstrukturisasi menjadi Domain Modular Architecture.

Struktur utama sekarang:

modules
├── auth
├── tenant
├── attendance
├── academic
├── kesiswaan
├── billing
├── payment
├── invoice
├── notification
├── dashboard
├── reporting
├── superadmin
├── parent-app
└── cooperative

Setiap domain sudah menggunakan pola:

controllers
routes
services
commands
queries
repositories
event-handlers

Hasilnya:

maintainable
scalable
auditable
2️⃣ Event Driven System

Platform sekarang sudah menggunakan Domain Event Architecture.

Contoh event:

attendance.tap
invoice.pdf.requested
payment.webhook.processed
billing.subscription.plan_changed
tenant.created

Flow sistem:

Controller
   ↓
Service
   ↓
Database Write
   ↓
emitDomainEvent
   ↓
Redis Queue
   ↓
Worker

Side effects dipindahkan ke worker system.

3️⃣ Worker System

Worker sekarang menangani proses berat.

Contoh worker:

notification worker
email worker
whatsapp worker
pdf generation worker
analytics worker
parent app worker
attendance reconciliation worker
billing worker

Keuntungan:

API tetap cepat
beban terdistribusi
sistem lebih stabil
4️⃣ Attendance Engine

Core platform (Absensi) sudah memiliki arsitektur yang solid.

Flow absensi:

RFID Tap
   ↓
API
   ↓
Service
   ↓
PostgreSQL

Tanpa queue di jalur kritis.

Pendukung:

Redis lock
Redis cache
Realtime events

Background automation:

attendanceAutoClose.job

yang melakukan:

session closing
alpa generation
notification
5️⃣ Redis Infrastructure

Redis sekarang digunakan untuk:

distributed lock
gate presence cache
event streaming
queue system
sidebar cache
authorization cache

Contoh key:

absenta:lock:session:create
absenta:gate_present
events:attendance
sidebar:user:{id}
6️⃣ Storage System

Storage layer sudah dipisahkan:

infra/storage

mendukung:

S3 compatible storage
MinIO
cloud storage

Digunakan untuk:

document
invoice pdf
uploads
7️⃣ Multi-Tenant SaaS

Absenta sudah fully multi-tenant.

Tenant isolation menggunakan:

tenant middleware
tenant resolver
tenantId di JWT

Flow login:

tenant resolve
↓
login
↓
JWT tenantId
↓
endpoint isolation
8️⃣ SaaS Billing System

Domain billing sudah lengkap:

billing
payment
invoice
subscription
revenue

Flow:

tenant subscribe
↓
billing created
↓
invoice generated
↓
payment webhook
↓
subscription updated

Model:

SaaS subscription
9️⃣ Sidebar Rendering Engine

Menu sekarang dikontrol backend, bukan frontend.

Sidebar dibangun oleh:

SidebarRenderingService

Filtering berdasarkan:

tenant features
user capabilities
organizational position
petugas active

Endpoint:

GET /api/menu/sidebar

Menu database menjadi source of truth.

🔟 Authorization Engine

Authorization sekarang sudah sangat matang.

Pipeline request:

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
Data Scope Guard
↓
Controller

Authorization berbasis:

RBAC
+
Organizational Position
1️⃣1️⃣ RBAC Model Final

Role sistem sekarang hanya 4:

SUPERADMIN
ADMIN
GURU
SISWA

Role hanya memberikan baseline capability.

Contoh:

ADMIN → platform management
GURU → teaching access
SISWA → personal access
1️⃣2️⃣ Organizational Authorization Engine

Spesialisasi kewenangan sekarang berasal dari:

OrganizationalPosition

Contoh:

KURIKULUM
KESISWAAN
WALIKELAS
PETUGAS_KELAS
GERBANG
HUBIN
SARPRAS
TU
KAPROG

Capability tambahan diberikan melalui:

OrganizationalCapability

Final capability:

Role baseline
+
Organizational capability
1️⃣3️⃣ Absensi Authorization Model

Logika operasional absensi sekarang jelas:

GURU GERBANG
→ mengelola absensi gerbang

SISWA PETUGAS_KELAS
→ mengelola absensi sesi

GURU_BIASA
→ hanya melihat

WALIKELAS
→ monitoring kelas

Ini sudah masuk ke desain capability.

1️⃣4️⃣ Action Catalog

Capability sekarang sudah canonical.

Format:

domain.resource.action

Contoh:

academic.students.view.list
attendance.sessions.update.attendance
cooperative.members.view.list
dashboard.view.overview

Legacy capability sudah dihapus.

1️⃣5️⃣ Policy Engine

Seeder sekarang menghasilkan:

Permission
RolePermission
OrganizationalCapability

Source of truth:

Action Catalog

Seeder memiliki guardrail:

throw error jika capability tidak ada di catalog
1️⃣6️⃣ Sidebar + Authorization Integration

Menu sekarang muncul berdasarkan:

tenant features
+
capabilities
+
organizational position

Jadi UI mengikuti authorization.

1️⃣7️⃣ SaaS Service Platform

Platform sekarang mendukung layanan:

CORE PLATFORM
ABSENSI
KOPERASI
RAPOR (future)
PPDB (future)
PERPUSTAKAAN (future)

Tenant hanya melihat menu sesuai layanan yang dibeli.

1️⃣8️⃣ Load Testing Framework

Anda sudah memiliki:

k6 load testing
dataset generator
session creator
gate warmup
test runner

Bisa melakukan:

arrival spike
session spike
full simulation
stress test
1️⃣9️⃣ Infrastruktur Server

Topologi sekarang:

Laptop (load test)
     │
WireGuard
     │
Backend Server
     │
Redis
PostgreSQL
Workers

Deployment menggunakan:

Docker
Reverse Proxy
2️⃣0️⃣ Level Kematangan Platform

Jika diklasifikasikan:

Level	Status
Prototype	✔ selesai
Production App	✔ selesai
Platform Architecture	✔ selesai
SaaS Platform	✔ selesai

Absenta sekarang berada di:

SaaS Platform Architecture
📊 Gambaran Sistem Sekarang
            FRONTEND
                │
                ▼
          API CONTROLLERS
                │
     ┌──────────┴──────────┐
     │                     │
DOMAIN SERVICES        EVENT BUS
     │                     │
     ▼                     ▼
 POSTGRESQL            REDIS QUEUE
                           │
                           ▼
                        WORKERS
🚀 Kesimpulan

Platform Absenta sekarang sudah memiliki:

✔ modular domain architecture
✔ event driven backend
✔ worker processing
✔ redis infrastructure
✔ multi tenant SaaS
✔ billing system
✔ sidebar rendering engine
✔ canonical action catalog
✔ RBAC + organizational authorization
✔ capability based UI
✔ load test framework

Secara arsitektur, platform ini sudah setara dengan:

modern SaaS platform architecture