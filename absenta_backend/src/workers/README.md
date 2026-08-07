# Dokumentasi Modul Background Workers & WhatsApp Gateway Daemon
**Absenta Backend Workers Subsystem (`src/workers`)**

---

## 📋 Ringkasan Peran Modul Workers

Folder `src/workers/` berisi entrypoint dan logika untuk seluruh *background daemons* dan *queue processors* di sistem Absenta. Seluruh worker dirancang untuk berjalan secara independen dari REST API server utama (`main.ts`).

---

## 🛠️ Daftar Worker & Kontrak Akses

### 1. 🤖 **`wa-worker.ts` — Dedicated WhatsApp Gateway Daemon**
* **Entrypoint PM2**: Layanan `absenta-wa-service` (Instance #3, Mode Fork).
* **Peran Utama**: 
  - Mengelola siklus koneksi socket WhatsApp Web (Baileys SDK).
  - Melakukan inisialisasi ganda dan pemulihan sesi (`waGatewayService.restoreConnections()`).
  - Menerima event pesan masuk dari WhatsApp dan meneruskannya ke Router Chatbot FSM.
  - Mengirim pesan balasan, notifikasi pengumuman, dan slip izin presensi ke WhatsApp pengguna.
* **⚠️ Kontrak Keamanan (Critical Single-Owner Rule)**:
  `wa-worker.ts` adalah **SATU-SATUNYA** proses di seluruh aplikasi yang boleh memanggil `waGatewayService.restoreConnections()`. Pemanggilan ganda dari `main.ts` atau worker lain DILARANG KERAS karena akan merusak berkas sesi SQLite/JSON di disk (`auth_info_baileys`).

---

### 2. ⏱️ **`attendance.worker.ts` — Attendance Auto-Close & Summary Engine**
* **Peran Utama**:
  - Menjalankan pemrosesan otomatis penutupan sesi KBM/Presensi yang habis masa berlakunya.
  - Melakukan agregasi data presensi harian siswa dan guru.
  - Memicu pengiriman notifikasi rekap presensi ke WhatsApp/Email orang tua dan wali kelas.

---

### 3. 📄 **`invoice-pdf.queue.ts` & `mou-pdf.queue.ts` — PDF Generation Queue Workers**
* **Peran Utama**:
  - Mengambil antrean pencetakan dokumen PDF (Invoice langganan tenant & Dokumen MOU).
  - Menggunakan Puppeteer / HTML-to-PDF compiler secara asynchronous agar tidak membebani main thread HTTP server.

---

### 4. 🔔 **`notification.worker.ts` — Centralized Push Notification Consumer**
* **Peran Utama**:
  - Mengonsumsi antrean notifikasi dari Redis BullMQ/EventBus.
  - Mengirimkan pesan pemberitahuan broadcast, alert izin, dan invoice billing secara terpusat.

---

## 🏗️ Pola Komunikasi Antar Proses (IPC & Event Bus)

```text
┌───────────────────────────┐         ┌───────────────────────────┐
│   absenta-api:3003        │         │   absenta-wa-service      │
│   (4x Cluster Instances)  │         │   (1x Dedicated Daemon)   │
└─────────────┬─────────────┘         └─────────────▲─────────────┘
              │                                     │
              │  1. Push Message / WA Event         │  2. Consume & Send
              ▼                                     │     WA Sockets
┌───────────────────────────────────────────────────┴─────────────┐
│                    Redis Pub/Sub & BullMQ                       │
└─────────────────────────────────────────────────────────────────┘
```

1. REST API (`absenta-api`) menerima HTTP Request dari Frontend atau Webhook.
2. REST API mempublikasikan pesan ke Redis Queue / Event Bus.
3. Dedicated Worker (`absenta-wa-service` atau `notification.worker`) mengambil pesan dari Redis dan memprosesnya secara terpisah.
