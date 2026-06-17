# Kesimpulan Arsitektur Platform Absenta (2026)

## Ringkasan
Dokumen ini merangkum kondisi arsitektur teknis platform Absenta setelah serangkaian peningkatan pada sistem storage, scheduler, dan infrastruktur Redis. Tujuan dari perubahan ini adalah memastikan platform siap untuk scaling, multi-node deployment, dan operasi SaaS jangka panjang.

---

# 1. Arsitektur Inti Platform

Platform Absenta menggunakan pendekatan **Event Driven Modular Monolith**.

Struktur umum sistem:

API Layer  
↓  
Domain Modules  
↓  
Event Bus  
↓  
Queue (BullMQ)  
↓  
Workers

Pendekatan ini memungkinkan domain tetap modular tanpa harus langsung memecah sistem menjadi microservices.

---

# 2. Worker & Queue Architecture

Sistem background processing menggunakan **BullMQ** dengan Redis sebagai message broker.

Fitur yang sudah tersedia:

- Worker concurrency
- Retry mechanism
- Idempotency
- Dead Letter Queue
- Domain-based queue

Worker dipisahkan berdasarkan domain seperti:

- attendance
- billing
- notification
- analytics
- maintenance
- infra

Arsitektur ini memungkinkan worker ditambah secara horizontal jika beban meningkat.

---

# 3. Object Storage Architecture

Platform telah dimigrasikan dari filesystem lokal ke **Object Storage** menggunakan storage abstraction.

Storage driver yang tersedia:

- Local storage (default / development)
- S3 compatible storage (MinIO / S3)

Semua modul file sekarang menggunakan **storage service abstraction**, termasuk:

- document center
- backup service
- invoice PDF
- upload module

Akses file dilakukan melalui **API streaming**, bukan melalui URL storage langsung.

Keuntungan:

- kontrol akses penuh melalui API
- keamanan lebih baik
- siap untuk multi-node deployment

---

# 4. File Access Standardization

Semua file sekarang menggunakan pola:

Client  
↓  
API Endpoint  
↓  
Authorization / Token Validation  
↓  
Storage Service  
↓  
Object Storage

Pendekatan ini memastikan:

- tidak ada file yang dapat diakses langsung dari storage
- kontrol akses tetap berada di layer aplikasi

---

# 5. Distributed Scheduler Architecture

Scheduler sebelumnya berjalan menggunakan:

- setInterval
- node-cron

pada API process.

Untuk mencegah duplicate execution pada multi-node deployment, telah diimplementasikan **Distributed Scheduler Lock** menggunakan Redis.

Pattern yang digunakan:

SET lockKey value NX EX ttl

Scheduler yang dilindungi lock:

- Subscription Auto Renew
- Alert Engine
- Tenant Retention
- Worker Autoscaler

Dengan pendekatan ini, hanya satu node yang menjalankan scheduler pada satu waktu.

---

# 6. Redis Infrastructure

Redis sekarang menggunakan **connection factory terpusat**.

Mode yang didukung:

- single
- sentinel
- cluster

Konfigurasi menggunakan environment variable:

REDIS_MODE=single | sentinel | cluster

Saat ini platform berjalan dengan:

REDIS_MODE=single

Namun backend sudah **HA-ready** sehingga ketika Redis Sentinel atau Redis Cluster diterapkan di masa depan, perubahan hanya pada konfigurasi environment.

---

# 7. Multi-Node Readiness

Platform sekarang siap untuk deployment multi-node karena:

- Object storage tidak bergantung pada local disk
- Scheduler menggunakan distributed lock
- Worker queue mendukung multi-instance
- Redis sudah HA-ready

Arsitektur yang dimungkinkan:

API Node A  
API Node B  
API Node C  

semua menggunakan:

- Redis
- Object Storage
- Queue Worker

---

# 8. Tingkat Kematangan Arsitektur

Jika dinilai dalam konteks SaaS architecture maturity:

Tahap awal:

Monolith

Tahap sekarang:

**Production Grade Event Driven SaaS Platform**

Karakteristik yang sudah tercapai:

- modular domain architecture
- event-driven communication
- queue-based background processing
- object storage
- distributed scheduler
- HA-ready infrastructure

---

# 9. Single Point of Failure yang Masih Ada

Saat ini Redis masih berjalan dalam mode single instance.

Walaupun kode sudah mendukung Redis Sentinel dan Redis Cluster, implementasi HA pada infrastruktur Redis dapat dilakukan ketika platform mulai menggunakan multi-server deployment.

---

# 10. Kesimpulan

Platform Absenta sekarang telah berevolusi dari sistem monolith sederhana menjadi **Event Driven SaaS Platform yang siap diskalakan**.

Perubahan yang telah dilakukan meliputi:

- Storage migration ke object storage
- Standardisasi akses file
- Distributed scheduler lock
- Redis HA-ready configuration

Dengan arsitektur ini, platform siap untuk:

- menambah tenant dalam jumlah besar
- menjalankan beberapa API node
- menambah worker secara horizontal
- mengadopsi Redis High Availability di masa depan

Arsitektur ini memberikan fondasi yang kuat untuk pengembangan platform Absenta sebagai **SaaS platform multi-tenant jangka panjang**.

