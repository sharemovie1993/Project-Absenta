# BUSINESS RULES - DASHBOARD

### 1. Data Visibility Policy
- **Strict Capabilities Scope**: Setiap data statistik wajib disaring berdasarkan kewenangan aktor yang meminta (Wali kelas hanya melihat grafik kelasnya, guru hanya melihat kelas pengajarannya).
- **Caching & Freshness**: Data statistik berat (seperti tren kehadiran tahunan) disimpan di cache Redis dengan TTL 5 menit untuk menghindari beban query berat di PostgreSQL.
