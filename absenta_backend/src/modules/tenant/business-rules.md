# BUSINESS RULES - TENANT

### 1. Lifecycle & Domains
- **Domain Slug Constraints**: Sub-domain domain tenant (slug) harus bersifat unik, minimal 4 karakter huruf kecil alfanumerik tanpa karakter khusus.
- **Suspension Lock**: Tenant yang dialihkan ke status SUSPENDED otomatis memutus seluruh token JWT user aktif di bawah tenant tersebut dan mengunci endpoint API agar merespons kode HTTP 403.
- **Grace Period Recovery**: Permohonan penghapusan tenant (`request-deletion`) memberikan masa tenggang selama 30 hari. Selama masa ini data tetap utuh dan dapat dipulihkan (*cancel-deletion*).
