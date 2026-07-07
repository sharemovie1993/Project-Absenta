# BUSINESS RULES - AUDIT

### 1. Compliance Integrity
- **Non-Repudiation**: Setiap log audit wajib dibubuhi hash tanda tangan dari context server untuk memastikan bahwa data tidak dimanipulasi setelah ditulis.
- **Isolation**: Tabel audit log dipisahkan secara struktural dari log operasional biasa untuk menjamin kecepatan kueri dan perlindungan data sensitif.
