LAPORAN AUDIT FLOW UPGRADE SUBSCRIPTION (BERDASARKAN IMPLEMENTASI KODE)

- Cakupan Audit:
  - controllers: subscription.controller, my-subscription.controller
  - routes: subscription.routes, subscription-check.routes
  - services: billing.service (extendSubscription), invoice.service (generasi invoice terkait upgrade), payment workflow

- Ringkasan Alur Utama:
  - Penginisiasian upgrade melalui endpoint: upgrade-wizard, choose-plan, order.
  - Validasi peran: SUPERADMIN atau ADMIN tenant.
  - Penentuan subscription target: berdasarkan overlap fitur plan atau parameter subscription_id.
  - Pembuatan PlanChangeRequest status SCHEDULED.
  - Pembuatan Billing charge_type UPGRADE, due date mengikuti DUE_DAYS (default 3 hari).
  - Generasi Invoice dari Billing, pengiriman invoice, dan opsional public link token.
  - Status subscription di-set UPGRADE_PENDING sampai pembayaran sukses.
  - Pembayaran sukses memicu extendSubscription: update plan_id ke target, status ACTIVE, end_date/next_billing_date ke period_end, auto_renew aktif, PlanChangeRequest jadi APPLIED.

- Endpoint Terkait Upgrade:
  - POST /subscriptions/upgrade-wizard (START, SELECT_PLAN)
  - POST /subscriptions/:id/choose-plan
  - POST /subscriptions/order
  - POST /subscriptions/upgrade/cancel

- Idempotensi & Penanganan Konflik:
  - Reuse Billing/Invoice UPGRADE pada tanggal yang sama bila masih aktif (DRAFT/SENT/VIEWED).
  - Penanganan collision unique [subscription_id, billing_date] dengan shifting billing_date atau cancel invoice lama.
  - Membatalkan PlanChangeRequest SCHEDULED sebelumnya sebelum membuat yang baru.

- Pembatalan Upgrade:
  - Void invoice (CANCELLED) jika belum dibayar dan tidak ada pembayaran PENDING/PROCESSING.
  - Batalkan PlanChangeRequest terkait.
  - Revert status subscription dari UPGRADE_PENDING ke ACTIVE/TRIAL/CANCELLED/EXPIRED sesuai kondisi historis pembayaran dan plan.

- Penentuan Periode Tagihan Upgrade:
  - Periode upgrade dimulai “hari ini” (now), tidak mengikuti end_date saat ini.
  - Panjang periode mengikuti billing_period plan tujuan (MONTH/YEAR).

- Observabilitas & Integritas:
  - Pencatatan aktivitas: UPGRADE_CLICKED, SUBSCRIPTION_AUTO_EXTENDED.
  - Validasi integritas pendapatan: perbandingan expected vs actual invoice total pada proses apply upgrade.

- Keamanan & Multi-Tenant:
  - Filter tenant_id konsisten pada query-query upgrade.
  - Pemeriksaan role dan kepemilikan subscription untuk aksi-aksi sensitif.

- Temuan Penting (Potensi Isu):
  - Pemanggilan fungsi penentuan subscription pada alur wizard (START) tidak konsisten parameter terhadap definisi fungsi, berisiko perilaku tak terduga pada penentuan subscription awal.
  - Ketergantungan pada features_json untuk deteksi overlap modul: pastikan konsistensi data agar mapping plan→modul akurat.
  - Proses reuse/collision mengandalkan status invoice; diperlukan monitoring agar tidak terjadi kebocoran invoice CANCELLED yang masih tertaut.

- Kesimpulan:
  - Alur upgrade telah mencakup pembuatan checkout, idempotensi, pembatalan aman, serta penerapan upgrade pasca pembayaran dengan menjaga integritas periode dan harga.
  - Ditemukan satu ketidakkonsistenan pemanggilan fungsi pada wizard yang sebaiknya ditinjau lebih lanjut.

