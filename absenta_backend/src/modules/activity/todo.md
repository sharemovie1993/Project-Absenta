# TODO ACTIVITY LOG

## High Priority
- [x] **Audit Trail Implementation**: Memastikan modul ini dipanggil di setiap operasi mutasi data kritis.
- [x] **Tenant Scoping**: Membatasi query GET agar admin sekolah hanya bisa melihat log tenant-nya sendiri.

## Medium Priority
- [ ] **IP Location Resolver**: Integrasi dengan GeoIP database untuk mendeteksi lokasi geografis akses.

## Low Priority
- [ ] **Log Export**: Fitur ekspor log ke CSV/Excel bagi admin tenant.

## Saran Fitur Baru
- [ ] **Suspicious Activity Alert**: Sistem deteksi anomali (misal: login dari dua lokasi berbeda dalam waktu singkat) yang langsung men-trigger alert ke admin.
