# Absenta Multi-Tenant Backend
**Enterprise Attendance, Academic & Operational SaaS Engine**

---

## 🚀 Ringkasan Sistem

Absenta Backend adalah platform micro-monolith berkinerja tinggi yang dibangun menggunakan **Fastify v4**, **Prisma ORM**, **PostgreSQL**, **Redis**, dan **Socket.IO**, yang dikelola secara terpusat oleh **PM2 Cluster**.

---

## 📚 Indeks Dokumentasi Arsitektur & Modul

1. 🛠️ **DevOps & PM2 7-Worker Cluster Architecture**:
   * [`docs/99 DevOps/PM2_CLUSTER_AND_WORKER_ARCHITECTURE.md`](file:///d:/BarayaProject/Project%20Absenta/absenta_backend/docs/99%20DevOps/PM2_CLUSTER_AND_WORKER_ARCHITECTURE.md) — Panduan lengkap topologi 7-worker PM2, aturan single-owner WhatsApp Gateway, dan petunjuk build `tsc-alias`.

2. 🤖 **Modul Background Workers & WhatsApp Gateway**:
   * [`src/workers/README.md`](file:///d:/BarayaProject/Project%20Absenta/absenta_backend/src/workers/README.md) — Spesifikasi dedicated worker `absenta-wa-service`, `attendance.worker`, `invoice-pdf.queue`, dan arsitektur komunikasi Redis Pub/Sub.

---

## ⚡ Skrip Perintah Utama

* **Kompilasi Local Build**:
  ```bash
  npm run build
  ```
  *(Menjalankan `prisma generate`, `tsc`, dan `tsc-alias` untuk mengonversi seluruh path alias `@/` menjadi relative path murni di `dist/`)*.

* **Menjalankan PM2 Produksi**:
  ```bash
  pm2 delete all && pm2 start ecosystem.config.js && pm2 save
  ```

---

## 📊 Topologi Layanan Produksi (7 PM2 Workers)

* `#0 absenta-redis` (Fork) — Monitor kesehatan Redis Native systemd
* `#1 absenta-api:3003` (Cluster Instance 1) — Fastify REST API Primary
* `#2 absenta-web:5175` (Fork) — Serve Frontend Dashboard
* `#3 absenta-wa-service` (Fork) — Single-Owner WhatsApp Gateway Daemon
* `#4 absenta-api:3003` (Cluster Instance 2) — Fastify REST API Secondary
* `#5 absenta-api:3003` (Cluster Instance 3) — Fastify REST API Secondary
* `#6 absenta-api:3003` (Cluster Instance 4) — Fastify REST API Secondary
