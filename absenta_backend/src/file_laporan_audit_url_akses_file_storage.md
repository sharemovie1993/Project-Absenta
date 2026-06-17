Audit URL Akses File dari Storage (Object Storage / Streaming)

Ringkasan Aktivitas Audit
- Mengidentifikasi seluruh endpoint yang mengembalikan URL file dan/atau mengirim stream file.
- Mengklasifikasikan pola akses file per domain: presigned/public URL vs streaming lewat API.
- Mengidentifikasi inkonsistensi pola dan titik risiko ketika redirect ke URL publik.

Pola yang Dipakai Saat Ini

Upload Module
- pola: Option B (API streaming file)
- upload response: mengembalikan URL /uploads/<filename>
- serving: GET /uploads/* melakukan streaming dari storage service
- lokasi: src/modules/upload/services/upload.service.ts, src/infra/bootstrap.ts

Document Center
- pola: Option B (API streaming file)
- download authenticated: streaming
- public download (token): streaming
- endpoint “signed-url” saat ini menghasilkan token (bukan presigned S3), dan tetap diakses via endpoint streaming public download
- lokasi: src/modules/document-center/controllers/documents.controller.ts, src/modules/document-center/services/documents.service.ts

Invoice PDF
- pola: Option B (API streaming file)
- download public token: streaming dari storage service (tanpa redirect ke presigned/public URL)
- lokasi: src/modules/pdf/services/pdf-invoice.service.ts, src/modules/invoice/routes/public.routes.ts

Kesimpulan Konsistensi
- Implementasi konsisten: Upload Module, Document Center, dan Invoice PDF memakai Option B (streaming via API).

Catatan Risiko
- Tidak ada redirect ke presigned/public URL untuk Invoice PDF.

Rekomendasi Konsistensi (pilih salah satu)
- Standarisasi Option B: semua akses file dilakukan dengan streaming melalui API (termasuk Invoice PDF), dan URL publik langsung/presigned tidak digunakan untuk client.
- Standarisasi Option A: semua akses file ke client dilakukan via presigned URL dari object storage (termasuk Upload Module dan Document Center), dan endpoint streaming dipakai hanya untuk kebutuhan internal.

