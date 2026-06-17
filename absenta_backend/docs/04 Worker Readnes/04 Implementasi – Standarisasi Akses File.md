Instruksi Implementasi – Standarisasi Akses File ke Streaming API (Option B)

Platform Absenta saat ini telah menggunakan object storage melalui storage service (MinIO/S3).
Sebagian besar modul sudah mengakses file menggunakan pola streaming melalui API (Option B).

Namun modul Invoice PDF masih menggunakan pola campuran:

* presigned/public URL (Option A)
* streaming melalui endpoint API (Option B)

Untuk menjaga konsistensi arsitektur platform, seluruh akses file harus distandarisasi menggunakan **Option B (API streaming)**.

Artinya client tidak lagi menerima presigned URL atau public object URL dari storage.

Semua file harus diakses melalui endpoint API yang melakukan streaming dari storage service.

Tujuan implementasi:

1. Menstandarisasi seluruh akses file melalui API streaming.
2. Menghilangkan penggunaan presigned URL atau public object URL dari object storage.
3. Menyelaraskan pola akses file pada Upload Module, Document Center, dan Invoice PDF.
4. Memastikan kontrol akses tetap berada di layer API.

Scope perubahan:

invoice pdf service
public invoice routes
file access logic pada modul invoice

Langkah implementasi:

Refactor Invoice PDF service agar tidak lagi mengembalikan presigned URL atau public object URL.

Sebagai gantinya, service harus mengembalikan path file yang disimpan pada storage service.

Contoh struktur path:

invoices/<invoiceId>.pdf

Endpoint public invoice harus melakukan streaming file melalui storage service.

Alur endpoint menjadi:

Client request
→ API endpoint
→ validasi token atau akses
→ storageService.download(path)
→ stream file ke response

Pastikan endpoint public invoice tidak melakukan redirect ke presigned URL atau object URL.

Seluruh file invoice harus dikirim sebagai streaming response dari API.

Gunakan header response yang sesuai:

Content-Type: application/pdf
Content-Disposition: inline atau attachment sesuai kebutuhan

Jika file tidak ditemukan pada storage service, endpoint harus mengembalikan error 404.

Pastikan semua konfigurasi S3_PUBLIC_BASE_URL atau mekanisme presigned URL tidak lagi digunakan untuk invoice download.

Verifikasi:

Endpoint download invoice harus tetap bekerja pada mode local storage maupun S3 storage.

Download invoice harus melalui API streaming, bukan redirect ke URL storage.

Endpoint harus tetap kompatibel dengan sistem token akses invoice yang sudah ada.

Constraint:

Tidak ada perubahan pada struktur database.

Tidak ada perubahan pada API endpoint publik yang sudah digunakan client.

Perubahan hanya pada cara file diambil dari storage dan dikirim ke client.

Setelah implementasi selesai, semua modul berikut harus menggunakan pola yang sama:

Upload Module
Document Center
Invoice PDF

Semua file diakses melalui API streaming dari storage service.
