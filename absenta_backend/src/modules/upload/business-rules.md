# BUSINESS RULES - UPLOAD

### 1. File Validation
- **Strict Mime-Type Whitelist**: Hanya menerima berkas gambar (JPG, PNG, WebP) dan dokumen administratif (PDF, DOCX, XLSX). Mengunggah berkas executable (.exe, .js) diblokir mutlak demi keamanan server.
- **Maximum File Size Limit**: Batasan ukuran berkas default adalah 10MB per unggahan, kecuali diatur berbeda oleh batas paket langganan tenant.
