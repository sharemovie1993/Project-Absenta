Instruksi Implementasi – Storage Migration untuk Multi-Node Deployment

Platform Absenta saat ini masih menyimpan sebagian file pada local disk server.

Contoh:

backup tenant
document storage
PDF invoice

Hal ini menyebabkan platform belum siap untuk deployment pada lebih dari satu node server karena file tidak dapat diakses oleh node lain.

Langkah berikutnya adalah memigrasikan storage menjadi object storage agar seluruh node dapat mengakses file yang sama.

Tujuan implementasi:

1. Menghilangkan ketergantungan pada local disk server.
2. Menyediakan storage yang dapat diakses oleh multiple node.
3. Menyediakan storage yang lebih aman untuk backup dan document.

Scope perubahan:

storage layer
backup service
document storage
invoice pdf storage

Langkah implementasi:

Tambahkan abstraction storage service dengan interface berikut:

upload(filePath, buffer)
download(filePath)
delete(filePath)

Implementasikan dua storage driver:

LocalStorageDriver
S3StorageDriver

Tambahkan konfigurasi environment:

STORAGE_DRIVER=local | s3

Jika STORAGE_DRIVER=s3 maka gunakan object storage.

Tambahkan konfigurasi berikut:

S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY

Refactor seluruh modul berikut agar menggunakan storage service:

backup service
document storage
invoice pdf storage

Pastikan semua file disimpan menggunakan storage service dan tidak langsung menulis ke local disk.

Verifikasi:

Upload file dari API harus tetap berjalan normal.

File harus dapat diakses dari node lain jika menggunakan object storage.

Constraint:

Tidak ada perubahan API publik.

Default driver tetap local storage agar backward compatible.
