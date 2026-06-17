# Laporan: Pipeline Normalization – Absenta Backend

Ditujukan untuk: Pak Asep  
Tujuan: normalisasi pipeline agar semua route protected berprefix `/api` benar-benar berada di dalam `/api plugin pipeline` (AuthMiddleware + TenantMiddleware + CapabilityGuard), dan menyiapkan migrasi dari whitelist prefix ke route config (tanpa menjalankan removal duplikasi middleware pada tahap ini).

Referensi instruksi:
- [07 Instruksi Tahap Berikutnya - Pipeline Normalization.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/Hardengin%20Layer%20Middleware/07%20Instruksi%20Tahap%20Berikutnya%20-%20Pipeline%20Normalization.md)

---

## 1) Route /api yang sebelumnya tidak berada di /api plugin pipeline

Teridentifikasi dan dinormalisasi:
- `/api/payments/*`
- `/api/invoice/*`
- `/api/notifications/*` (sebelumnya berada di root: `/notifications`, `/notification`, `/v1/notifications`)

---

## 2) Normalisasi registrasi route agar masuk /api plugin pipeline

Perubahan yang dilakukan:
- Memindahkan registrasi route protected berikut ke dalam protectedApi `/api plugin`:
  - Invoice protected: `/api/invoice/*`
  - Payment protected: `/api/payments/*`
  - Notification protected: `/api/notifications/*`, `/api/notification/*`, `/api/v1/notifications/*`
- Menahan registrasi route public yang memang harus tetap public (root):
  - `/invoice/public/*`
  - `/payment/public/*`
  - `/webhooks/payment/*`
  - `/documents/public/*`
- Menambahkan alias public invoice pada `/api/invoice/public/*` melalui registrasi public invoice routes di dalam `/api plugin` (di luar protectedApi).

---

## 3) Identifikasi whitelist prefix bypass & penyesuaian (arah menuju config-based public)

Whitelist prefix yang sebelumnya digunakan untuk bypass (contoh utama):
- payment: `/payment/*`, `/webhooks/payment/*` (dan variasi `/api/...` di beberapa tempat)
- invoice public: `/invoice/public/*` (dan variasi `/api/...`)
- notification webhook: `/notifications/whatsapp/webhook` (dan variasi legacy)

Perubahan yang dilakukan pada tahap normalisasi:
- Menambahkan `config.skipAuth` pada route public yang memang harus public:
  - payment public page
  - invoice public download
  - notification WhatsApp webhook
  - auth public endpoints
  - billing plans public
  - system config GET
  - embedding endpoint
- Mengurangi ketergantungan “prefix bypass” pada AuthMiddleware (menghapus whitelist prefix dinamis untuk payment/invoice/notification).
- Menyederhanakan skip list pada TenantMiddleware dan menambahkan mekanisme berbasis route config (tanpa memengaruhi jalur khusus parent-app).

---

## 4) Runtime re-audit (setelah normalisasi)

Endpoint yang diuji:
- `/api/dashboard/overview`
- `/api/academic/guru`
- `/api/attendance/sesi-absensi`
- `/api/cooperative/toko`
- `/api/billing/subscriptions`
- `/api/payments/create`
- Tambahan validasi: `/api/invoice`, `/api/notifications/push/vapid-public-key`, `/api/notifications/whatsapp/webhook`

Hasil verifikasi:
- Semua endpoint uji berprefix `/api/*` sudah terobservasi melewati `/api plugin pipeline` (terlihat hook `/api plugin` dieksekusi untuk payments & invoice, yang sebelumnya tidak).
- Endpoint notification yang sebelumnya tidak memiliki `/api/notifications/*` sekarang tersedia dan berjalan melalui pipeline yang sama.

---

## Ringkasan Perubahan
- Normalisasi registrasi route payments/invoice/notifications agar konsisten berada di dalam `/api plugin pipeline`.
- Penambahan `config.skipAuth` pada endpoint public yang relevan untuk mengurangi ketergantungan whitelist prefix.

