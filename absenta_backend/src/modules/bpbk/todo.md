# TODO BPBK

## High Priority
- [x] **Selesaikan Dashboard Executive**: Menampilkan visualisasi data analitik penyelesaian kasus dan distribusi risiko secara grafis di dashboard utama BK.
- [x] **Validation Layer (Zod)**: Implementasi skema validasi Zod pada seluruh entry point BPBK (Kasus, Konseling, Summons) untuk menjamin kualitas data.
- [x] **Refactoring Visibility Filter**: Mengoptimalkan query `buildVisibilityFilter` untuk mendukung performa pada data kasus dalam jumlah besar (>5000 records).

## Medium Priority
- [x] **Trend Analysis UI**: Membangun antarmuka untuk menampilkan grafik tren risiko siswa berdasarkan data `ewsSnapshot`.
- [x] **Wali Kelas Dashboard UI**: Implementasi antarmuka khusus untuk Wali Kelas yang memanfaatkan data dari `getWaliKelasDashboardData`.
- [x] **Integrasi Kalender**: Sinkronisasi jadwal pemanggilan orang tua dan home visit dengan kalender internal sekolah/petugas.
- [x] **Advanced Reporting**: Penambahan fitur export laporan statistik BK dalam format Excel/PDF untuk keperluan rapat berkala sekolah.
- [x] **Audit Log UI**: Menampilkan riwayat perubahan kasus langsung pada detail kasus untuk mempermudah pelacakan pembinaan.
 
## Low Priority
- [x] **Early Warning System Customization**: Memberikan opsi bagi admin sekolah untuk mengatur bobot (weight) kalkulasi skor risiko sesuai kebijakan internal masing-masing sekolah.
- [x] **Pola Kasus AI**: Implementasi analisis pola kasus menggunakan AI sederhana untuk mendeteksi kecenderungan masalah siswa sebelum mencapai level risiko tinggi.
- [x] **Integrasi Lampiran Cloud Storage (S3)**: Mendukung penyimpanan dokumen asesmen dan foto home visit langsung ke cloud storage kompatibel S3 (seperti AWS S3) yang terorganisir per siswa melalui centralized `storageService` bawaan platform.

## Saran Fitur Baru
- [x] **BK Mobile Notifications**: Notifikasi push langsung ke smartphone guru BK saat ada siswa yang mencapai skor risiko tinggi secara real-time.
- [x] **Anonymous Reporting (Whistleblowing)**: Fitur bagi siswa untuk melaporkan kasus perundungan (bullying) atau masalah lainnya secara anonim.
- [x] **Parent Consultation Booking**: Modul bagi orang tua untuk melakukan booking jadwal konsultasi dengan guru BK melalui aplikasi orang tua.
- [ ] **Sociometry Integration**: Analisis hubungan sosial antar siswa dalam satu kelas untuk mendeteksi potensi konflik atau isolasi sosial.
- [ ] **Psychological Test Integration**: Import data hasil tes psikologi (IQ, Minat Bakat) untuk melengkapi profil perkembangan siswa.
