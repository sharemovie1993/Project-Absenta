# TODO HUBIN

## High Priority
- [x] **Migrasi ke Storage Service**: Transisi dari `GoogleDriveService` yang bersifat deprecated ke `storageService` platform yang lebih tersentralisasi (selesai diimplementasikan pada upload dokumen PKL/MoU).
- [x] **Validation Layer (Zod)**: Implementasi skema validasi Zod pada endpoint pembuatan mitra dan penempatan PKL untuk mencegah data sampah.
- [x] **Penyelesaian Dashboard Monitoring**: Menghubungkan query `getRecentActivity` ke UI dashboard untuk pantauan timeline aktivitas HUBIN secara real-time.

## Medium Priority
- [x] **Advanced Geofencing Refinement**: Meningkatkan akurasi deteksi lokasi pada area dengan sinyal lemah menggunakan teknik *last known location caching*.
- [x] **Tracer Study Analytics**: Membangun visualisasi statistik hasil tracer study (grafik pie sebaran keterserapan lulusan).
- [x] **Timeline Lamaran BKK UI**: Menyelesaikan antarmuka pelacakan log status lamaran (Terkirim -> Interview -> Diterima/Ditolak) untuk siswa/alumni.
- [x] **Export PDF Sertifikat MoU**: Fitur untuk mencetak dokumen MoU Mitra ke dalam format PDF standar sekolah.
- [ ] **Integrasi Kalender Kunjungan**: Sinkronisasi jadwal kunjungan pembimbing dengan kalender internal di dashboard Guru.

## Low Priority
- [x] **Otomasi Sertifikat PKL**: Fitur untuk generate sertifikat PKL otomatis (PDF) berdasarkan nilai yang diinput pembimbing dan draf dari industri.
- [ ] **Tefa Billing Integration**: Menghubungkan modul TEFA dengan `BillingService` untuk penagihan pesanan produk/jasa ke mitra.
- [x] **Mobile App Logbook V2**: Optimasi antarmuka pengisian logbook harian agar lebih ringan dan mendukung mode offline.
