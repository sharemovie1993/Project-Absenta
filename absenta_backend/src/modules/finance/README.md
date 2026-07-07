# MODULE FINANCE (Platform Refunds)

## Deskripsi
Modul Finance mengelola aktivitas pencatatan keuangan internal tingkat platform Absenta.id, khususnya manajemen pengembalian dana (*refund*) transaksi langganan paket SaaS tenant akibat pembatalan atau kelebihan bayar.

## Aktor & Peran
- **System Superadmin / Accountant**: Memvalidasi permintaan refund, melakukan transfer balik, dan mencatat status transaksi di buku besar keuangan platform.

## Sub-Modul & Fitur Terimplementasi
### 1. Refund Ledger
- **Record Refund**: Pembuatan record mutasi refund pada database terintegrasi dengan accounting double-entry jurnal platform.

## Teknologi & Pattern
- **Pattern**: Financial Transaction Integrity.
- **Database**: Tabel `PlatformTransaction` dan `TenantRefundRecord`.
