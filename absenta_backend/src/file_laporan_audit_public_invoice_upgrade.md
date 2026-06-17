LAPORAN AUDIT: FULL UPGRADE SUBSCRIPTION – PUBLIC INVOICE LINK

- STEP 1 — Route Backend
  - Controller/Plugin publik invoice terdaftar.
  - Jalur tersedia:
    - GET /invoice/public/:token
    - GET /invoice/public/:token/download
    - GET /api/invoice/:id/public-link
    - GET /payment/public/:token/pay
  - Potensi bug:
    - 404 Route not found dapat terjadi jika reverse-proxy hanya meneruskan /api/* dan tidak meneruskan /invoice/public/*.

- STEP 2 — Navigasi Frontend
  - Aksi “View Invoice” membuka URL publik berbasis token.
  - Handler memanggil public token lalu membuka /invoice/public/{token}.
  - Tidak ditemukan pola salah seperti membuka /invoice/public/{invoiceId}.

- STEP 3 — API getPublicInvoiceLink
  - Endpoint: GET /api/invoice/:id/public-link.
  - Format respon: { success, message, data: { url, token } }.
  - url mengarah ke /invoice/public/{token}.

- STEP 4 — Response orderSubscriptionPlan
  - Endpoint: POST /billing/subscriptions/order.
  - Respon mengandung checkout.invoice_id dan opsional checkout.public_token, checkout.public_url.
  - Jika public_token tidak hadir, frontend memanggil /api/invoice/:id/public-link.

- STEP 5 — Audit Database Invoice
  - Invoice upgrade terbaru ditemukan (status DRAFT, charge_type UPGRADE).
  - Token publik tidak disimpan di DB; disimpan di cache dan dapat diperoleh via /api/invoice/:id/public-link.

- STEP 6 — Audit Subscription State
  - Subscription dengan status UPGRADE_PENDING terdeteksi.
  - Informasi target_upgrade_plan dan upgrade_invoice_id disediakan melalui endpoint my-subscription (agregasi), bukan kolom langsung di tabel.

- STEP 7 — Trace End-to-End
  - UI → orderSubscriptionPlan → billing UPGRADE → invoice dibuat → public token digenerate via API/cache → frontend redirect ke /payment/public/{token} atau /invoice/public/{token}.
  - Titik potensi berhenti: akses GET /invoice/public/{token} ditolak reverse-proxy bila hanya /api/* yang diproksikan.

- KESIMPULAN SEMENTARA
  - Rute backend untuk /invoice/public/:token ada dan terdaftar.
  - Penyebab 404 “Route not found” paling mungkin: konfigurasi proxy/ingress tidak meneruskan jalur /invoice/public/* ke backend (hanya /api/*). Solusi: pastikan proxy juga mem-forward /invoice/public/* ke backend atau gunakan alias /api/invoice/public/:token.

