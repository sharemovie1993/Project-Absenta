# ABSENTA PLATFORM — Rangkuman Perjalanan Arsitektur & Domain Hardening

Tanggal: 2026-03-15

Dokumen ini merangkum perjalanan refaktor arsitektur backend Absenta hingga mencapai tahap **Production-Grade Event Driven SaaS Platform**.

Dokumen ini mencatat kondisi awal, audit arsitektur, blueprint refactor, hingga implementasi bertahap yang dilakukan untuk menstabilkan domain architecture platform.

---

## 1. Kondisi Awal Platform

Platform Absenta pada awalnya sudah memiliki banyak komponen penting:

* Event Bus
* BullMQ Queue
* Worker Architecture
* Redis Infrastructure
* Multi-tenant system
* Modular folder structure

Namun audit awal menemukan beberapa masalah arsitektur yang umum terjadi pada sistem yang berkembang cepat:

### Temuan Awal

* Circular dependency antar domain
* Service files terlalu besar (>1000 lines)
* Controller langsung mengakses Prisma
* Cross-domain orchestration
* Notification menjadi “god consumer”
* Multiple PrismaClient instance di beberapa service

Masalah ini tidak menyebabkan sistem gagal berjalan, tetapi berpotensi menghambat skalabilitas jangka panjang.

---

## 2. Audit Arsitektur

Audit dilakukan dalam dua tahap utama:

### DOMAIN_COMPLETION_AUDIT

Audit pertama memetakan:

* seluruh domain modules
* service map
* event producer
* event consumer
* queue worker
* dependency graph

Hasil audit:

* total modules: 33
* service files: 87
* domain events: 13
* workers: 7

Ditemukan beberapa domain berstatus **NEEDS REFACTOR**, terutama:

* attendance
* academic
* billing
* payment
* invoice
* notification
* parent-app
* auth
* superadmin

### DOMAIN_HARDENING_AUDIT

Audit kedua fokus pada masalah arsitektur:

* circular dependency
* service decomposition
* controller boundary violation
* event architecture consistency

Circular dependency yang ditemukan:

1. parent-app → attendance → auth → notification → parent-app
2. academic → parent-app → attendance → auth → academic
3. invoice ↔ pdf

---

## 3. Blueprint Refactor

Berdasarkan hasil audit dibuat dokumen:

DOMAIN_REFACTOR_BLUEPRINT.md

Blueprint ini mendefinisikan:

* prinsip arsitektur domain
* target struktur module
* strategi memutus circular dependency
* service decomposition plan
* event architecture standard
* urutan implementasi refactor
* definition of done

### Prinsip Utama Blueprint

1. Modul adalah boundary
2. Komunikasi lintas domain menggunakan event
3. Controller tidak boleh mengakses Prisma langsung
4. Service besar harus dipecah
5. Side-effect diproses oleh worker
6. Repository adalah satu-satunya akses database

---

## 4. Implementasi Refactor (Phase Execution)

Refactor dilakukan secara bertahap untuk menjaga stabilitas sistem production.

---

### Phase 0 — Invoice/PDF Cycle Fix

Masalah:

invoice ↔ pdf circular dependency

Solusi:

invoice.emit("invoice.pdf.requested")

PDF generation diproses oleh worker.

Hasil:

* cycle invoice/pdf dihapus
* PDF generation menjadi asynchronous

---

### Phase 1 — Notification Domain Split

Masalah:

notification menjadi “god consumer”.

Solusi:

consumer dipisah menjadi:

* attendance-event-consumer
* payment-event-consumer
* parent-notification-consumer
* notification-request-consumer

Side-effect dipindah ke worker.

Hasil:

* notification domain menjadi modular
* worker scaling lebih mudah

---

### Phase 2 — Parent App Decoupling

Masalah:

parent-app memanggil attendance service langsung.

Solusi:

diganti menjadi event/queue flow.

Contoh:

parent-app → enqueue job → attendance-worker

Parent-app juga menambahkan event consumer untuk attendance events.

Hasil:

* dependency parent-app → attendance dihapus
* parent-app menjadi projection domain

---

### Phase 3 — Auth Tenant Onboarding Refactor

Masalah:

auth menjadi orchestrator lintas domain.

Solusi:

auth hanya mengemit event:

tenant.created

Domain lain melakukan initialization melalui event consumer.

Contoh:

tenant.created
→ academic seed
→ billing setup
→ notification welcome

Hasil:

* cross-domain orchestration dihapus
* tenant onboarding menjadi event-driven

---

### Phase 4 — Attendance Service Decomposition

Masalah:

* gerbang.service.ts ~1700 lines
* sesi.service.ts ~1200 lines

Solusi:

memecah service menjadi:

commands
queries
repositories
event-handlers

Akses prisma dipindahkan ke:

gerbang.db.ts
sesi.db.ts

Hasil:

* attendance domain menjadi modular
* logic side-effect dipisah

---

### Phase 5 — Academic Domain Decomposition

Masalah:

siswa.service.ts ~1360 lines

Solusi:

memecah menjadi:

commands
queries
repositories

Service menjadi facade tipis.

Hasil:

* academic domain lebih maintainable
* CRUD logic terisolasi

---

### Phase 6 — Commercial Domain Refactor

Domain yang direfactor:

* billing
* payment
* invoice

Solusi:

menambahkan struktur:

commands
queries
repositories
event-handlers

Contoh perubahan:

* createInvoice → create-invoice.command.ts
* processWebhook → process-webhook.command.ts
* billing.invoice.requested consumer → event-handler

Hasil:

* domain komersial menjadi konsisten dengan domain lain

---

### Phase 7 — Superadmin & Prisma Standardization

Masalah:

TenantDetailService membuat instance PrismaClient sendiri.

Solusi:

menggunakan shared prisma instance melalui repository.

Refactor tambahan:

* query extraction
* command extraction
* service menjadi orchestrator

Hasil:

* koneksi database lebih stabil
* service lebih modular

---

## 5. Arsitektur Platform Setelah Refactor

Struktur platform sekarang:

API
↓
Domain Modules
↓
emitDomainEvent()
↓
Event Bus
↓
Queue (BullMQ)
↓
Workers

### Domain Modules

* auth
* tenant
* user
* attendance
* academic
* billing
* payment
* invoice
* notification
* parent-app
* superadmin

### Struktur Domain Standar

Setiap domain sekarang mengikuti pola:

controllers
services
commands
queries
repositories
event-handlers

### Worker Architecture

Worker domain-aligned:

* attendance-worker
* billing-worker
* notification-worker
* analytics-worker
* maintenance-worker
* infra-worker

---

## 6. Hasil Akhir Refactor

Setelah seluruh fase selesai:

* tidak ada circular dependency antar domain
* tidak ada service >1000 lines
* controller tidak mengakses Prisma langsung
* semua domain menggunakan repository pattern
* komunikasi lintas domain menggunakan event

---

## 7. Status Platform

Platform Absenta sekarang berada pada tahap:

**Production-Grade Event Driven Modular SaaS Platform**

Karakteristik yang sudah tercapai:

* clean domain boundary
* event-driven communication
* worker architecture
* repository isolation
* service decomposition
* multi-tenant ready

---

## 8. Langkah Berikutnya

Tahap berikutnya bukan lagi refactor domain, tetapi **platform stabilization**.

Beberapa pekerjaan yang direkomendasikan:

1. membuat dependency graph platform
2. memetakan event topology
3. memetakan worker topology
4. melakukan performance profiling
5. membuat dokumentasi arsitektur final platform

---

## 9. Kesimpulan

Perjalanan refaktor ini berhasil mengubah backend Absenta dari sistem modular yang berkembang cepat menjadi platform yang memiliki arsitektur yang stabil dan siap diskalakan.

Dengan arsitektur saat ini, platform dapat berkembang menjadi sistem SaaS multi-sekolah dengan jumlah tenant besar tanpa memerlukan perubahan arsitektur besar di masa depan.


Berikut peta arsitektur visual Absenta berdasarkan seluruh refaktor yang sudah Anda lakukan (Phase 0–7).
Saya susun agar mudah dipahami sebagai platform map tingkat tinggi.

1️⃣ Peta Arsitektur Platform Absenta (High-Level)
                         CLIENT APPLICATIONS
      ┌─────────────────────────────────────────────────────┐
      │                                                     │
      │  Web Admin     Parent App     Teacher App     API   │
      │                                                     │
      └─────────────────────────────────────────────────────┘
                                │
                                │ HTTP / REST
                                ▼
                         ┌───────────────┐
                         │   API Layer   │
                         │ (Fastify App) │
                         └───────────────┘
                                │
                                ▼
                       Middleware Pipeline
               (Auth → Tenant → Capability → Guards)
                                │
                                ▼
                        Domain Modules Layer

2️⃣ Domain Modules Map
                         DOMAIN MODULES
 ┌─────────────────────────────────────────────────────────────┐
 │                                                             │
 │   Auth        Tenant        User        System Config       │
 │                                                             │
 │   Attendance  Academic      Parent-App  Notification        │
 │                                                             │
 │   Billing     Payment       Invoice     Document Center     │
 │                                                             │
 │   Analytics   Observability Audit        Superadmin         │
 │                                                             │
 └─────────────────────────────────────────────────────────────┘


Setiap domain sekarang menggunakan struktur standar:

controllers
services
commands
queries
repositories
event-handlers

3️⃣ Event-Driven Communication

Komunikasi lintas domain tidak lagi melalui service call, tetapi melalui event bus.

                ┌─────────────────────────┐
                │     Domain Event Bus     │
                │      (Redis Pub/Sub)    │
                └─────────────────────────┘
                         ▲
                         │
                   emitDomainEvent()
                         │


Contoh alur event:

attendance.tap
        │
        ▼
notification-event-consumer
        │
        ▼
notification-worker
        │
        ▼
email / whatsapp / push

4️⃣ Worker Architecture

Worker Absenta sekarang domain-aligned:

                         WORKER LAYER
 ┌───────────────────────────────────────────────────────┐
 │                                                       │
 │   attendance-worker                                   │
 │   billing-worker                                      │
 │   notification-worker                                 │
 │   analytics-worker                                    │
 │   maintenance-worker                                  │
 │   infra-worker                                        │
 │                                                       │
 └───────────────────────────────────────────────────────┘


Worker menggunakan:

BullMQ Queue
Retry
Idempotency
Dead Letter Queue

5️⃣ Queue Topology
                 ┌───────────────┐
                 │   BullMQ      │
                 │   Queues      │
                 └───────────────┘
                        │
                        ▼
        ┌────────────────────────────────┐
        │                                │
        │  attendance queue              │
        │  billing queue                 │
        │  notification queue            │
        │  analytics queue               │
        │  maintenance queue             │
        │  infra queue                   │
        │                                │
        └────────────────────────────────┘

6️⃣ Database Layer
                     DATABASE LAYER
             ┌───────────────────────────┐
             │                           │
             │         PostgreSQL        │
             │                           │
             └───────────────────────────┘
                       ▲
                       │
               Repository Layer
                       │
                       ▼
                  Prisma Client
            (shared instance via utils)


Semua domain mengakses database melalui:

repository → prisma


bukan langsung dari controller/service.

7️⃣ Storage Layer

Untuk file seperti:

invoice PDF
documents
uploads
backups


Absenta menggunakan storage abstraction.

Client
  │
  ▼
API Endpoint
  │
  ▼
Storage Service
  │
  ▼
Object Storage
(Local / S3 Compatible)

8️⃣ Infrastruktur Pendukung
                       INFRASTRUCTURE
 ┌───────────────────────────────────────────────────────┐
 │                                                       │
 │ Redis (Event Bus + Queue Broker)                      │
 │ Object Storage                                        │
 │ Distributed Scheduler Lock                            │
 │ Observability (logs + metrics)                        │
 │                                                       │
 └───────────────────────────────────────────────────────┘


Redis sudah HA-ready untuk:

single
sentinel
cluster

9️⃣ Event Flow Contoh
Attendance Flow
RFID Tap
   │
   ▼
attendance.tap
   │
   ▼
Event Bus
   │
   ▼
notification-event-consumer
   │
   ▼
notification-worker
   │
   ▼
Send parent notification

Tenant Onboarding Flow
tenant.created
      │
      ▼
academic consumer
      │
      ▼
billing consumer
      │
      ▼
notification consumer


Auth tidak lagi memanggil service domain lain.

🔟 Arsitektur Final Platform

Secara keseluruhan platform sekarang berbentuk:

                 ┌───────────────────────────┐
                 │      CLIENT APPS          │
                 └─────────────┬─────────────┘
                               │
                               ▼
                       API (Fastify)
                               │
                      Middleware Layer
                               │
                               ▼
                       Domain Modules
                               │
                         emit events
                               │
                               ▼
                           Event Bus
                               │
                               ▼
                           Queue Layer
                               │
                               ▼
                           Workers
                               │
                               ▼
                     Database + Storage

Kesimpulan Arsitektur

Absenta sekarang memiliki karakteristik:

Event Driven Modular Monolith
Domain-Oriented Architecture
Queue-Based Background Processing
Repository Pattern Data Access
Worker-Based Side Effects
Multi-Tenant SaaS Ready


Ini adalah arsitektur yang sangat stabil untuk SaaS platform jangka panjang.