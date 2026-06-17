Instruksi Audit – Absenta Domain Completion & Architecture Hardening

Platform Absenta saat ini telah mencapai tahap **Event Driven Modular Monolith** dengan komponen berikut sudah stabil:

* Auth System
* Tenant Isolation
* Capability System
* Event Bus
* Queue Worker (BullMQ)
* Redis Infrastructure
* Object Storage
* Distributed Scheduler

Fokus audit ini **bukan lagi pada infrastruktur platform**, tetapi pada **kelengkapan domain modules dan boundary antar domain**.

Audit harus memastikan bahwa setiap domain module benar-benar siap untuk skalabilitas SaaS jangka panjang.

KONTEKS ARSITEKTUR PLATFORM

Struktur arsitektur platform saat ini:

API Layer
↓
Domain Modules
↓
emitDomainEvent()
↓
Event Bus
↓
Redis Pub/Sub
↓
BullMQ Queue
↓
Workers
↓
Retry / Idempotency / DLQ

Domain modules berada pada folder:

src/modules

LINGKUP AUDIT

Audit seluruh module pada:

src/modules

Module yang terdeteksi:

academic
activity
analytics
attendance
audit
auth
backup
billing
consent
cooperative
dashboard
document-center
finance
invoice
jadwal
kesiswaan
kurikulum
menu
notification
observability
parent-app
payment
pdf
reporting
revenue
risk
sekolah
superadmin
system-config
tenant
upgrade-intelligence
upload
user

ANALISIS DOMAIN BOUNDARY

Untuk setiap module:

Identifikasi apakah module tersebut merupakan:

Core Platform Domain
Service Domain
Support Domain
Infrastructure Domain

Contoh klasifikasi yang diharapkan:

Core Platform
auth
tenant
user
billing

Service Domains
attendance
payment
invoice
reporting
academic
cooperative
parent-app

Shared Services
notification
document-center

Platform Modules
observability
system-config
superadmin

Analisis apakah terdapat:

* domain yang terlalu besar
* domain yang memiliki terlalu banyak dependency
* domain yang memanggil domain lain secara langsung

SERVICE ARCHITECTURE ANALYSIS

Untuk setiap module:

Identifikasi:

* controllers
* routes
* services
* guards
* utils

Periksa apakah terdapat pelanggaran berikut:

controller langsung mengakses database
service terlalu besar (>1000 lines)
logic domain bercampur

EVENT DRIVEN COMPLIANCE

Cari semua penggunaan:

emitDomainEvent
publishEvent
eventBus.publish

Identifikasi:

event producer per module
event consumer per module

Contoh event:

attendance.tap
attendance.session.created
billing.invoice.generated
payment.succeeded
notification.email.send_requested

Periksa apakah terdapat domain yang:

* tidak menghasilkan event
* masih synchronous coupling dengan domain lain

QUEUE & WORKER ALIGNMENT

Audit folder:

src/workers
src/queue
src/queues
src/jobs

Identifikasi:

worker name
queue name
event yang diproses
domain yang diproses

Periksa apakah worker sudah **domain aligned**.

Contoh ideal:

attendance-worker
billing-worker
notification-worker
analytics-worker

DEPENDENCY GRAPH

Buat dependency graph antar module.

Contoh:

attendance → academic
attendance → user
billing → tenant
reporting → attendance

Laporkan jika ditemukan:

circular dependency
tight coupling antar domain

TENANT ISOLATION VERIFICATION

Periksa module berikut:

attendance
academic
billing
payment
reporting

Pastikan bahwa:

* query selalu menggunakan tenant_id
* tidak ada akses lintas tenant
* tenant guard diterapkan pada routes

DOMAIN COMPLETENESS ANALYSIS

Untuk setiap module berikan status:

COMPLETE
PARTIAL
NEEDS REFACTOR

Kriteria:

COMPLETE

* service boundary jelas
* event sudah ada
* dependency minimal

PARTIAL

* logic masih bercampur
* event belum lengkap

NEEDS REFACTOR

* domain terlalu besar
* synchronous coupling
* dependency berlebihan

CRITICAL ARCHITECTURE RISKS

Laporkan jika ditemukan:

* domain coupling tinggi
* event missing
* worker tidak domain specific
* module terlalu besar
* service terlalu kompleks

OUTPUT LAPORAN

Hasil audit harus dibuat pada file:

docs/architecture/DOMAIN_COMPLETION_AUDIT.md

FORMAT LAPORAN

Ringkasan platform

Module list
Service map
Event producer map
Event consumer map
Worker map
Dependency graph
Domain completeness analysis
Critical architecture risks

Tambahkan ringkasan di awal laporan:

Total modules
Total services
Total events
Total workers

Modules COMPLETE
Modules PARTIAL
Modules NEEDS REFACTOR
