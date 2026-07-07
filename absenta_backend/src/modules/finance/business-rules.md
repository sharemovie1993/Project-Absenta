# BUSINESS RULES - FINANCE

### 1. Financial Consistency
- **Reconciliation Check**: Pengembalian dana hanya diperbolehkan jika invoice asal berstatus PAID, dana sudah terekonsiliasi di Payment Gateway, dan nilai refund tidak melebihi nilai transaksi awal.
- **Atomic Modification**: Setiap perubahan status refund wajib dibungkus dalam transaksi basis data untuk menghindari anomali neraca keuangan platform.
