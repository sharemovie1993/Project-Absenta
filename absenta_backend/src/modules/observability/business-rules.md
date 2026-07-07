# BUSINESS RULES - OBSERVABILITY

### 1. Alert Frequency
- **Deduplication Policy**: Alarm untuk kategori error yang sama hanya boleh dipicu sekali setiap 15 menit untuk mencegah spam notifikasi ke DevOps.
- **No Performance Impact**: Proses penarikan data metrik (metrics gathering) wajib dirancang non-blocking dan tidak menggunakan query SQL yang memicu lock tabel database utama.
