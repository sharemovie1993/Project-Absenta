# Dokumentasi Arsitektur PM2 7-Worker Cluster & WhatsApp Gateway Daemon
**Project Absenta — Production Architecture & Maintenance Blueprint**

---

## 1. Ringkasan Topologi PM2 (7-Worker Topology)

Pada lingkungan produksi VPS, aplikasi Absenta berjalan menggunakan PM2 Process Manager dengan total **7 Worker Processes** yang terbagi ke dalam 4 Aplikasi Utama di `ecosystem.config.js`:

```text
┌────┬───────────────────────┬──────────┬───────────┬────────┬──────────────────────────────────────────┐
│ ID │ Nama Layanan          │ Mode     │ Instances │ Port   │ Peran / Tanggung Jawab Utama             │
├────┼───────────────────────┼──────────┼───────────┼────────┼──────────────────────────────────────────┤
│ 0  │ absenta-redis         │ fork     │     1     │ 6379   │ Monitor kesehatan Redis Systemd Native   │
│ 1  │ absenta-api:3003      │ cluster  │     4     │ 3003   │ Primary Fastify REST API Worker #1       │
│ 2  │ absenta-web:5175      │ fork     │     1     │ 5175   │ Static Serve Frontend Web Dashboard      │
│ 3  │ absenta-wa-service    │ fork     │     1     │ —      │ Dedicated Worker Single-Owner WA Gateway │
│ 4  │ absenta-api:3003      │ cluster  │ (Shared)  │ 3003   │ Secondary Fastify REST API Worker #2     │
│ 5  │ absenta-api:3003      │ cluster  │ (Shared)  │ 3003   │ Secondary Fastify REST API Worker #3     │
│ 6  │ absenta-api:3003      │ cluster  │ (Shared)  │ 3003   │ Secondary Fastify REST API Worker #4     │
└────┴───────────────────────┴──────────┴───────────┴────────┴──────────────────────────────────────────┘
```

---

## 2. Kontrak Single-Owner WhatsApp Gateway (`absenta-wa-service`)

### ⚠️ **Masalah Utama Pembatalan Crash 1.900x**
Perpustakaan Baileys WhatsApp Web menggunakan penyimpanan file lokal (`auth_info_baileys`) untuk menyimpan berkas kredensial & sesi. Jika beberapa proses Node.js memanggil `waGatewayService.restoreConnections()` secara bersamaan di direktori sesi yang sama, file lock SQLite/JSON akan bentrok, menyebabkan error `EADDRINUSE` / *Session Lock Conflict*, dan membuat proses API reboot berulang-ulang hingga 1.900+ kali.

### 🛡️ **Aturan Arsitektur Tunggal (Single-Owner Rule)**:
1. Pemanggilan `waGatewayService.restoreConnections()` **HANYA BOLEH DILAKUKAN** oleh `src/workers/wa-worker.ts` (`absenta-wa-service`).
2. Berkas `src/main.ts` (Fastify REST API) **DILARANG KERAS** memanggil `restoreConnections()`. `main.ts` hanya mendaftarkan status WhatsApp Gateway Pool sebagai `online` tanpa membuka socket Baileys langsung.
3. Seluruh pesan masuk/keluar WhatsApp diproses melalui queue Redis / Event Bus terpusat.

---

## 3. Aturan Kompilasi TypeScript & Resolution Path Alias

### 🔍 **Alasan Mengapa `node_args: '-r tsconfig-paths/register'` Dilarang di Cluster Mode**
1. **Saat Development (`src/`)**:
   - Pengembang menggunakan alias `@/` (contoh: `import { prisma } from '@/utils/prisma'`) untuk menjaga kerapihan kode.
2. **Saat Build Produksi (`npm run build`)**:
   - Skrip build menjalankan `tsc && npx tsc-alias -p tsconfig.json`.
   - Tool `tsc-alias` mengubah seluruh string `@/` di folder `dist/` menjadi **Relative Path murni** (contoh: `../../utils/prisma`).
3. **Saat PM2 Cluster Production Runtime**:
   - Karena folder `dist/` sudah 100% menggunakan relative path murni, **`node_args: '-r tsconfig-paths/register'` WAJIB DICABUT** dari `ecosystem.config.js`.
   - Menggunakan `-r tsconfig-paths/register` pada Node 20 cluster mode akan membajak fungsi internal `Module._findPath` Node.js dan merusak pertukaran pesan IPC socket antar-worker, sehingga worker 2, 3, 4 melempar error `errored`.

---

## 4. Berkas Konfigurasi Standar (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'absenta-redis',
      script: './scripts/redis-monitor.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'absenta-api:3003',
      script: './dist/main.js',
      cwd: __dirname,
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_ROLE: 'api',
      },
    },
    {
      name: 'absenta-web:5175',
      script: 'npx',
      args: 'serve -s ../absenta_frontend/dist -l 5175',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'absenta-wa-service',
      script: './dist/workers/wa-worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVICE_ROLE: 'wa-worker',
      },
    },
  ],
};
```

---

## 5. Prosedur Deployment Standar (SOP Deployment)

Setiap kali melakukan pembaruan kode di server produksi VPS:

```bash
cd /var/www/project-absenta
git checkout .
git pull origin main
cd absenta_backend
npm run build
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

Pastikan setelah menjalankan skrip di atas, seluruh 7 worker berstatus **🟢 ONLINE** dengan **`0x restarts`**.
