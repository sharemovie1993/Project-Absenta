# ARCHITECTURE

Backend (Node.js):
- **Framework**: Fastify (High-performance web framework).
- **Language**: TypeScript.
- **ORM**: Prisma (Type-safe database access).
- **Validation**: Zod (Integrated) & Custom Logic.

Database & Storage:
- **Primary**: PostgreSQL (Logical multi-tenant isolation via tenant_id columns).
- **Cache & Queue**: Redis (Entitlement caching, organizational context, and job store for BullMQ background workers).
- **Files**: Storage Service (supporting Local Storage and AWS S3/S3-compatible Object Storage for general uploads) & Google Drive API (specifically for Hubin PKL documents).

Architecture Patterns:
- **CQS (Command Query Separation)**: Pemisahan logic perubahan data (Commands) dan pengambilan data (Queries) pada modul kritis untuk menjaga performa dan kejelasan alur data.
- **Service Layer Abstraction**: Seluruh logika bisnis dienkapsulasi dalam kelas Service yang dapat dipanggil kembali lintas modul.
- **Hybrid Data Sourcing**: Mekanisme sinkronisasi data (misal: Plans) dari server eksternal melalui REST API dengan sistem penyimpanan lokal sebagai cadangan (fallback).
- **Event-Driven Communication**: Integrasi antar-modul loosely-coupled menggunakan Event Bus: Local In-Memory Event Bus (siklus hidup trial) dan Redis Pub/Sub Domain Event Bus (event terdistribusi lintas proses seperti seeding tenant.created dan data tap IoT gerbang absensi).
- **Entitlement Engine**: Sistem kontrol fitur dinamis berbasis langganan aktif yang dioptimalkan dengan Redis Caching (TTL 60 detik).
- **Organizational-Based Access Control**: Hak akses yang diresolusi secara real-time berdasarkan hirarki jabatan (OrganizationalPosition) dan penugasan unit kerja (OrganizationalAssignment).
- **Background Job Processing (Worker Nodes)**: Pemrosesan tugas latar belakang (asinkron) terdistribusi menggunakan BullMQ untuk memproses antrean email, notifikasi WhatsApp, pengecekan kedaluwarsa trial, pembuatan PDF secara dinamis, dan tugas pemeliharaan sistem.

Communication:
- **REST API**: Antarmuka utama untuk Frontend dan integrasi pihak ketiga.
- **Real-time**: Socket.io untuk pemantauan gerbang absensi dan dashboard live.
- **Webhook**: Penanganan notifikasi pembayaran dari Payment Gateway.

Infrastructure:
- **Deployment**: Ubuntu Server, PM2 (Process Manager).
- **Proxy**: Nginx (Reverse proxy & SSL termination).
- **Tunneling**: Easy Tunnel (WireGuard-based) untuk akses dev server.
