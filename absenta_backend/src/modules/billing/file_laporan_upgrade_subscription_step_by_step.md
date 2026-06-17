LAPORAN AUDIT: FLOW STEP-BY-STEP UPGRADE SUBSCRIPTION (BERDASARKAN IMPLEMENTASI KODE)

- Tahap 1: Inisiasi Wizard
  - Endpoint menerima action START atau SELECT_PLAN.
  - START mengembalikan daftar plan publik, state subscription saat ini (jika ada), dan kemungkinan checkout belum terbayar.

- Tahap 2: Pemilihan Plan
  - SELECT_PLAN atau choose-plan mengirim plan_id untuk memulai proses checkout.
  - Sistem memastikan role SUPERADMIN atau ADMIN tenant.

- Tahap 3: Resolusi Subscription Target
  - Jika subscription_id diberikan, gunakan itu dengan validasi kepemilikan.
  - Jika tidak, cari subscription yang modulnya overlap dengan plan tujuan (features_json).

- Tahap 4: Plan Change Request
  - Batalkan PlanChangeRequest berstatus SCHEDULED sebelumnya (jika ada).
  - Buat PlanChangeRequest baru SCHEDULED dari plan saat ini ke plan tujuan, menyimpan price_snapshot dan currency.

- Tahap 5: Status Subscription
  - Jika bukan TRIAL, ubah status ke UPGRADE_PENDING dan atur next_billing_date ke akhir periode yang dihitung dari plan tujuan.
  - Jika TRIAL, biarkan status sesuai kondisi saat ini.

- Tahap 6: Pembuatan Billing Upgrade
  - charge_type: UPGRADE.
  - amount mengambil harga plan tujuan.
  - due_date di-set berdasarkan DUE_DAYS (default 3 hari).
  - Terdapat penanganan collision unique [subscription_id, billing_date]: reuse invoice aktif, cancel invoice lama, atau geser billing_date.

- Tahap 7: Pembuatan & Pengiriman Invoice
  - Generate invoice dari billing dengan period_start = hari ini untuk upgrade.
  - Panjang periode mengikuti billing_period plan tujuan (MONTH/YEAR).
  - Kirim invoice dan, untuk order, buat public link token untuk akses pembayaran.

- Tahap 8: Idempotensi
  - Jika telah ada billing upgrade aktif pada tanggal yang sama, sistem melakukan reuse dan mengembalikan checkout yang sama.

- Tahap 9: Pembayaran & Penerapan Upgrade
  - Saat payment SUCCESS pertama kali untuk invoice terkait, sistem memanggil extendSubscription.
  - extendSubscription memvalidasi period invoice, menerapkan plan tujuan (plan_id), status ACTIVE, auto_renew true, end_date dan next_billing_date ke period_end, dan menandai PlanChangeRequest sebagai APPLIED.
  - Integritas harga: expected vs actual total diverifikasi dan dicatat jika mismatch.

- Tahap 10: Pembatalan Upgrade
  - Jika invoice belum dibayar (DRAFT/SENT/VIEWED) dan tak ada payment PENDING/PROCESSING, pembatalan:
    - Void invoice (CANCELLED).
    - Batalkan PlanChangeRequest terkait.
    - Revert status subscription dari UPGRADE_PENDING ke ACTIVE/TRIAL/CANCELLED/EXPIRED sesuai kondisi periode dan histori pembayaran.

- Catatan Bisnis Kunci
  - Upgrade selalu memulai periode baru dari hari ini, tidak menumpang pada end period lama.
  - Penentuan panjang periode mengacu plan tujuan agar durasi sesuai (bulanan/tahunan).
  - Idempotensi dan collision ditangani untuk mencegah duplikasi invoice/billing.
  - Hak akses diproteksi: hanya SUPERADMIN atau ADMIN tenant yang dapat memulai upgrade.
  - Observabilitas melalui log aktivitas pada momen penting (CLICK UPGRADE, AUTO EXTENDED).

