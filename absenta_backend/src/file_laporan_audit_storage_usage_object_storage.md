Storage Usage Audit — Verifikasi Penggunaan Object Storage

Ringkasan Aktivitas Audit (tanpa perubahan kode)
- Scan kode untuk penggunaan filesystem langsung (fs.* dan path.join ke uploads/storage).
- Verifikasi modul yang sudah memakai storage service untuk penyimpanan file permanen.
- Identifikasi modul/komponen yang masih bergantung pada local disk untuk file permanen atau servis file.

Status Per Modul

Document Module (document-center)
- status: migrated
- lokasi: src/modules/document-center/services/document-storage.service.ts

Backup Module (tenant backup)
- status: migrated
- lokasi: src/infra/storage/LocalDiskStorage.ts

Invoice PDF Module
- status: migrated
- lokasi: src/modules/pdf/services/pdf-invoice.service.ts

Export/Report Module
- status: migrated
- lokasi: src/modules/reporting (export CSV dan excel template via buffer/response)

Import Module
- status: migrated
- lokasi: src/modules/academic (import excel via buffer; import backup akademik via JSON body)

Upload Module
- status: migrated
- lokasi: src/modules/upload/services/upload.service.ts

Static serving untuk /uploads (tanpa local disk)
- status: migrated
- lokasi: src/infra/bootstrap.ts

Temuan Lain (local disk untuk logging/debug, bukan storage domain)
- File logging (operasional)
  - lokasi: src/utils/logger.ts
  - lokasi: src/modules/payment/services/payment.service.ts
  - lokasi: src/modules/payment/controllers/webhook.controller.ts
- Payment test report (membuat folder logs/reports)
  - lokasi: src/modules/payment/services/test.report.ts
