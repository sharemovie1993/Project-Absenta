ABSENTA PLATFORM REFACTOR BLUEPRINT
Target Architecture: Modular Event-Driven SaaS Platform

Blueprint ini menjelaskan arah refactor arsitektur Absenta berdasarkan hasil audit sistem yang ada saat ini.

Tujuan blueprint:

menjaga sistem tetap stabil selama refactor

menghilangkan domain coupling

memperkuat tenant isolation

membuat worker architecture scalable

mempersiapkan Absenta sebagai SaaS platform multi service

Refactor dilakukan tanpa memecah ke microservice terlebih dahulu.

Target arsitektur tetap:

MODULAR MONOLITH + EVENT DRIVEN + WORKERS

1. Arsitektur Target Platform

Struktur target platform Absenta:

                 API GATEWAY
                      │
          ┌───────────┼───────────┐
          │           │           │
      Platform      Service     Shared
        Core        Modules     Services
          │           │           │
          └───────────┼───────────┘
                      │
               Event Bus (Redis)
                      │
                 Queue System
                      │
                    Workers
2. Platform Core Layer

Platform Core adalah modul yang menjadi fondasi seluruh sistem.

Modul yang termasuk platform core:

auth
tenant
user
subscription
billing
capability
permission
system-config
menu
consent

Karakteristik:

tidak bergantung pada service modules

hanya menyediakan platform capability

digunakan oleh semua service

Contoh fungsi:

auth → authentication
tenant → tenant isolation
capability → feature access
billing → subscription management
3. Service Modules

Service modules adalah domain bisnis utama platform.

Domain utama Absenta:

attendance
academic
cooperative
kesiswaan
kurikulum
parent-app

Setiap service harus memiliki:

controller
service
repository
events
queue producer

Contoh struktur target:

attendance
 ├ controller
 ├ service
 ├ repository
 ├ events
 └ queue

Service modules tidak boleh memanggil service domain lain secara langsung.

4. Shared Services

Shared services menyediakan layanan umum yang digunakan oleh banyak service.

Contoh:

notification
document-center
reporting
pdf
upload

Shared service hanya menerima:

events
queue jobs

Shared service tidak boleh dipanggil langsung oleh domain service.

5. Infrastructure Layer

Infrastructure layer menyediakan fasilitas teknis platform.

Komponen:

redis
queue
event-bus
scheduler
realtime
storage
lock
worker

Infrastructure tidak boleh memiliki dependency terhadap domain service.

Infra hanya menyediakan:

publish event
subscribe event
queue processing
broadcast realtime
6. Event Driven Architecture

Semua komunikasi antar service harus menggunakan domain events.

Contoh event catalog:

attendance.tap
attendance.session.started
attendance.session.closed

billing.subscription.created
billing.subscription.expired

document.generated

notification.created

Flow event:

attendance service
     │
 emit attendance.tap
     │
event bus
     │
notification worker
parent-app worker
analytics worker
7. Queue Architecture

Queue digunakan untuk semua proses asynchronous.

Queue topology target:

attendance_queue
notification_queue
billing_queue
document_queue
report_queue
analytics_queue

Producer:

domain service

Consumer:

workers

Contoh:

attendance.tap
 → notification_queue
 → parent_notification_worker
8. Worker Architecture

Worker harus dipisahkan dari API server.

Jenis worker:

notification worker
pdf worker
attendance worker
billing worker
report worker
analytics worker

Worker harus scalable:

multiple instances
horizontal scaling

Contoh:

notification worker x5
attendance worker x3
9. Tenant Isolation Standard

Semua tabel domain harus memiliki:

tenant_id NOT NULL

Query rule:

WHERE tenant_id = currentTenant

Entity yang boleh global:

Plan
PlanFeature
Permission
Menu
Master data

Semua entity lain harus tenant scoped.

10. Domain Communication Rule

Rule utama arsitektur:

Rule 1

Service domain tidak boleh memanggil service domain lain secara langsung

Dilarang:

attendanceService.notifyParent()

Harus:

emit attendance.event
Rule 2

Shared services hanya menerima event.

Contoh:

notification service

dipanggil melalui:

notification.created event
Rule 3

Infra tidak boleh import domain module.

Dilarang:

infra/eventbus → import attendance controller

Infra hanya:

publish
subscribe
11. Refactor Strategy

Refactor dilakukan bertahap.

Phase 1

Architecture Audit
✔ sudah selesai

Phase 2

Domain Coupling Refactor

target:

menghilangkan direct service calls
Phase 3

Event Architecture Implementation

target:

semua komunikasi antar domain melalui event
Phase 4

Tenant Isolation Hardening

target:

tidak ada tabel domain tanpa tenant_id
Phase 5

Worker Scaling

target:

worker horizontal scaling
Phase 6

Platform Stabilization

target:

platform siap multi-service SaaS
12. Target Final Platform

Setelah refactor selesai, Absenta akan memiliki arsitektur:

SaaS Platform
   │
Service Modules
   │
Event Driven Architecture
   │
Worker Processing
   │
Tenant Isolated Data

Platform ini siap untuk:

multi school SaaS
high concurrency attendance
multi service platform
future microservice migration
Catatan Penting

Blueprint ini bukan desain ulang sistem dari nol.

Ini adalah:

REFORM ARCHITECTURE

yang dilakukan secara bertahap tanpa merusak sistem yang sudah berjalan.