# TODO BILLING & SUBSCRIPTION (License Server Integration)

## High Priority
- [x] **Migrasi Invoicing & Payment ke License Server**: Logika pembuatan tagihan bulanan rutin, penagihan prorata, overdue handling, dan integrasi payment gateway sepenuhnya didelegasikan ke server lisensi terpusat.
- [x] **Validation Layer (Zod) pada Webhook Lisensi**: Menerapkan skema validasi Zod pada parameter input push event webhook lisensi (`handleLicenseWebhook`) untuk menjamin integritas callback.
- [x] **Penyelarasan Query & Proxying**: Mengimplementasikan `getInvoicesByTenantQuery` dan `getPaymentsByTenantQuery` agar mengambil data secara dinamis dari Server Lisensi pusat (menggunakan API axios).
- [x] **Mekanisme Grace Period / Offline Fallback**: Menjamin bahwa platform lokal tetap berjalan dengan aman (Grace Period) menggunakan cache `Subscription` terakhir ketika server lisensi mengalami gangguan (offline/timeout).

## Medium Priority
- [x] **Keamanan Callback Webhook**: Menambahkan mekanisme tanda tangan digital (API Signature Verification) pada callback webhook dari License Server untuk mencegah spoofing request.
- [x] **Optimasi Cache Invalidation**: Menyelaraskan instruksi `invalidateTenantFeaturesCache` dengan perubahan lisensi di server pusat agar perubahan hak akses fitur dapat segera diterapkan secara instan.

## Low Priority
- [x] **Sinkronisasi Otomatis Berkala (Pull Fallback)**: Membuat worker sederhana yang melakukan pencocokan berkas lisensi (pull check) mingguan jika ada kegagalan push webhook.
