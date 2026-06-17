Instruksi Audit – Verifikasi Penggunaan Object Storage pada Seluruh Domain Module

Platform Absenta telah menyelesaikan implementasi storage abstraction dan integrasi object storage menggunakan MinIO/S3 melalui storage service.

Langkah berikutnya adalah memastikan seluruh domain module pada platform benar-benar menggunakan storage service dan tidak lagi menulis file langsung ke local filesystem.

Audit ini bertujuan untuk memastikan platform benar-benar siap untuk deployment multi-node.

Tujuan audit:

1. Memastikan semua operasi penyimpanan file menggunakan storage service.
2. Mengidentifikasi modul yang masih menggunakan filesystem langsung.
3. Memastikan tidak ada dependency terhadap local disk server pada file permanen.

Scope audit:

document-center module
backup service
invoice pdf service
export/report service
import service
module lain yang menghasilkan file

Langkah audit:

Scan seluruh kode untuk mencari penggunaan filesystem langsung.

Cari penggunaan fungsi berikut:

fs.writeFile
fs.createWriteStream
fs.readFile
fs.unlink
path.join('storage')
path.join('uploads')
path.join('documents')

Identifikasi apakah operasi tersebut digunakan untuk penyimpanan file permanen.

Periksa apakah modul berikut sudah menggunakan storage service:

document storage
backup storage
invoice pdf storage
export file storage
import file storage

Jika ditemukan file yang disimpan langsung ke local disk untuk penyimpanan permanen, tandai modul tersebut sebagai belum menggunakan object storage.

Temporary file diperbolehkan menggunakan local disk jika:

file hanya digunakan sementara untuk proses internal
file langsung dihapus setelah upload ke storage service

Contoh workflow yang masih diperbolehkan:

generate pdf ke temporary file
upload file ke storage service
hapus temporary file

Namun file hasil akhir harus disimpan menggunakan storage service.

Output laporan yang diminta:

Storage Usage Audit

Document Module
status: migrated / needs update

Backup Module
status: migrated / needs update

Invoice PDF Module
status: migrated / needs update

Export Module
status: migrated / needs update

Import Module
status: migrated / needs update

Jika ditemukan penggunaan filesystem langsung, sertakan:

nama modul
lokasi file kode
jenis operasi filesystem yang digunakan

Constraint:

Audit ini tidak boleh melakukan perubahan kode.

Audit hanya membaca kode dan memverifikasi penggunaan storage service.
