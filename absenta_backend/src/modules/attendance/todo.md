# TODO ATTENDANCE

## High Priority
- [x] **Sistem Auto-Close Sesi Menggantung**: Implementasi *worker* untuk menutup sesi absensi yang masih berstatus `BERLANGSUNG` setelah melewati jam operasional sekolah.
- [x] **Refinement Face Recognition**: Peningkatan integrasi SDK Face Recognition untuk mendukung verifikasi *liveness* dan pencegahan spoofing foto.
- [x] **Optimasi Merge Rekap**: Meningkatkan performa *query* rekap bulanan pada tenant dengan jumlah siswa >1000 menggunakan teknik *materialized view* atau *caching* statistik harian.
- [x] **Standardisasi Manual Entry**: Menambah field `catatan` pada tabel `AbsenGerbangSiswa` untuk menyimpan alasan izin/sakit yang diinput manual.
- [x] **Validation Layer (Zod)**: Migrasi seluruh endpoint input dan tipe data DTO di modul Attendance ke skema validasi Zod (sub-modul: gerbang, sesi-absensi, rekap, devices) untuk menstandarkan validasi tipe data.

## Medium Priority
- [x] **Dashboard Monitoring Gerbang V2**: Interface real-time yang lebih interaktif dengan dukungan *streaming* foto siswa saat tap (jika perangkat mendukung).
- [x] **Advanced Analytics**: Analisis tren keterlambatan siswa berdasarkan hari, mata pelajaran, atau guru tertentu (Early Warning System).
- [x] **Offline Mode Sync**: Peningkatan protokol sinkronisasi data untuk perangkat IoT yang mengalami gangguan koneksi internet (Store and Forward).
- [x] **Superadmin Performance Tools**: Memperluas endpoint `/attendance/session` untuk simulasi beban (stress test) pada level gerbang.

## Low Priority
- [x] **Integrasi Smart Lock**: Menghubungkan status kehadiran guru/siswa dengan sistem kunci pintu pintar (Smart Lock) di ruang kelas/lab.
- [x] **Gamifikasi Kehadiran**: Fitur *leaderboard* kehadiran siswa dan kelas terbaik bulanan untuk meningkatkan kedisiplinan.
- [x] **RFID Bulk Programmer**: Utilitas untuk membantu pendaftaran massal kartu RFID baru melalui perangkat pembaca USB di dashboard admin.

## Saran Fitur Baru
- [ ] **AI-Powered Face Anti-Spoofing v2**: Integrasi model deteksi kedipan mata (blink detection) untuk keamanan biometrik yang lebih tinggi.
- [ ] **Predictive Attendance**: Menggunakan Machine Learning untuk memprediksi siswa yang berisiko tinggi bolos berdasarkan pola historis.
- [ ] **Parent Video Feed**: Opsi streaming video singkat (2-3 detik) ke aplikasi orang tua saat siswa melakukan tap di gerbang.
- [ ] **Dynamic Attendance Threshold**: Penyesuaian otomatis toleransi keterlambatan berdasarkan kondisi cuaca atau lalu lintas (via API eksternal).
- [ ] **Student Health Monitoring Integration**: Integrasi dengan data suhu tubuh dari thermal scanner IoT saat tap gerbang.
