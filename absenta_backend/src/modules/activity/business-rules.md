# BUSINESS RULES - ACTIVITY LOG

### 1. Immutability of Log
- **Read-Only History**: Log aktivitas yang sudah masuk ke database bersifat `immutable` (tidak boleh di-update atau di-delete oleh aktor mana pun termasuk Superadmin).
- **Pruning Policy**: Pembersihan log lama wajib dilakukan melalui mekanisme arsip terjadwal ke *cold storage*, bukan penghapusan langsung.

### 2. Context Capturing
- **Metadata Completeness**: Setiap log harus menyertakan `user_id`, `tenant_id` (jika ada), nama modul, tipe aksi (CREATE/UPDATE/DELETE/AUTH), serta payload detail yang di-serialize ke JSON jika aksi tersebut krusial.
