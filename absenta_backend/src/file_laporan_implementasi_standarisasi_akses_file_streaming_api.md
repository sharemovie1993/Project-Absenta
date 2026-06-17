Laporan Implementasi — Standarisasi Akses File ke Streaming API (Option B)

Ringkasan Perubahan
- Mengubah Invoice PDF agar tidak lagi mengembalikan presigned/public object URL, dan menggantinya dengan akses streaming via API.
- Mengubah public invoice download agar melakukan streaming PDF dari storage service (tanpa redirect).
- Mengubah endpoint download invoice (RBAC) agar melakukan streaming PDF dari storage service (tanpa redirect).
- Mengubah worker invoice-pdf agar menghasilkan storageKey, bukan URL.
- Mengupdate laporan audit URL akses file agar pola akses sekarang konsisten Option B.

Build
- npm run build: SUCCESS

