# SUB-MODUL JADWAL PIKET GURU & NOTIFIKASI OTOMATIS

## 1. Ikhtisar
Sub-modul **Jadwal Piket Guru** di lingkungan workspace Kurikulum bertugas mengelola distribusi penugasan guru piket harian (Piket Umum dan Piket Jurusan), memvalidasi ketersediaan guru terhadap beban mengajar KBM (*Teaching Load Conflict*), serta mengotomatisasi pengiriman pesan pengingat ke Grup WhatsApp resmi sekolah.

---

## 2. Arsitektur SaaS Dynamic Minute Dispatcher
Untuk memastikan skalabilitas di lingkungan multi-tenant dan kebal terhadap perbedaan zona waktu (WIB, WITA, WIT) serta reboot server:

1. **Minute Schedule Dispatcher (`piketScheduleDispatcher.job.ts`)**:
   - Berjalan berkala setiap **1 menit** (`*/1 * * * *`).
   - Membaca waktu lokal real-time dari masing-masing tenant (`tenant.timezone` atau `Asia/Jakarta`).
   - Mencocokkan:
     - `localTimeStr === config.morningTime` -> Trigger pengingat **Pagi (Hari Ini)**.
     - `localTimeStr === config.nightTime` -> Trigger pengingat **Malam (Besok Hari)**.

2. **Idempotency Outbox Guard (`NotificationLog`)**:
   - Sebelum pesan dikirim, sistem memvalidasi keberadaan log `SENT` dengan composite key: `PIKET:${targetDateString}:${shiftKey}`.
   - Menjamin setiap shift hanya dikirim tepat 1 kali per hari per tenant, kebal terhadap duplikasi saat server reboot / clustering PM2.

3. **Multi-Layer Working Day Guard (`checkSchoolWorkingDay`)**:
   - Memvalidasi hari kerja operasional sekolah (`tenant.hari_sekolah`).
   - Memeriksa libur darurat global (`AbsensiKejadianKhusus`).
   - Memeriksa hari libur akademik terjadwal (`KalenderAkademik`).

4. **Multi-Tenant Isolation**:
   - Tenant yang berstatus `DEMO` atau belum memiliki sesi WhatsApp Gateway mandiri diblokir dari pengiriman pesan ke grup publik.

---

## 3. Struktur Konfigurasi (`PIKET_WA_NOTIF_CONFIG`)

Disimpan pada tabel `Config` dengan format JSON:
```json
{
  "enabled": true,
  "targetGroupId": "120363xxx@g.us",
  "targetGroupName": "GURU & STAF NEPLE",
  "nightEnabled": false,
  "nightTime": "23:00",
  "morningEnabled": true,
  "morningTime": "05:00"
}
```

---

## 4. Daftar API Endpoints

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/kurikulum/jadwal-piket` | Ambil daftar jadwal piket guru |
| `GET` | `/api/kurikulum/jadwal-piket/hari-ini` | Ambil guru piket bertugas hari ini |
| `GET` | `/api/kurikulum/jadwal-piket/teaching-load` | Ambil peta beban mengajar guru (bentrok KBM) |
| `POST` | `/api/kurikulum/jadwal-piket` | Buat penugasan piket single |
| `POST` | `/api/kurikulum/jadwal-piket/bulk` | Buat penugasan piket massal |
| `PUT` | `/api/kurikulum/jadwal-piket/:id` | Update penugasan piket |
| `DELETE` | `/api/kurikulum/jadwal-piket/:id` | Hapus penugasan piket |
| `GET` | `/api/kurikulum/jadwal-piket/notif-config` | Ambil config notifikasi & list grup WA |
| `POST` | `/api/kurikulum/jadwal-piket/notif-config` | Simpan config notifikasi WA |
| `POST` | `/api/kurikulum/jadwal-piket/test-notif` | Test kirim notifikasi instan (`forceSend: true`) |
