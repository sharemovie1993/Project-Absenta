# TODO KURIKULUM

## High Priority
- [x] **Validation Layer (Zod)**: Implementasi skema validasi Zod pada seluruh endpoint Struktur Kurikulum dan Supervisi untuk mencegah inkonsistensi data.
- [ ] **Manajemen Perangkat Ajar (RPP/Modul Ajar)**: Membangun sistem repositori unggah dan verifikasi perangkat ajar guru.
- [ ] **Automasi Penjadwalan Supervisi**: Membuat sistem rekomendasi jadwal supervisi berdasarkan beban mengajar guru yang terekam di modul Academic.
- [ ] **Dashboard Monitoring Supervisi**: Membangun visualisasi statistik penyelesaian supervisi guru per semester bagi Kepala Sekolah.

## Medium Priority
- [ ] **Pemetaan Beban Mengajar Guru**: Fitur untuk menghitung dan membatasi total Jam Pelajaran (JP) per guru berdasarkan struktur kurikulum yang ditetapkan.
- [ ] **Integrasi e-Rapor**: Menghubungkan data Struktur Kurikulum dengan engine e-Rapor untuk otomatisasi pembobotan nilai rapor berdasarkan JP.
- [ ] **Advanced Analytics**: Analisis tren kompetensi guru berdasarkan hasil nilai supervisi akademik lintas periode.
- [x] **Reporting Engine (PDF)**: Fitur untuk mencetak instrumen hasil supervisi dan lembar rekomendasi pembinaan guru ke format PDF.

## Low Priority
- [ ] **Library Template Kurikulum**: Menyediakan template struktur kurikulum standar (Merdeka/K13) yang dapat di-cloning oleh tenant baru.
- [x] **Integrasi Kalender (iCal)**: Sinkronisasi agenda kalender akademik sekolah dengan Google Calendar, Outlook, atau Apple Calendar menggunakan format standar iCal feed (.ics).
- [ ] **Fitur Self-Assessment**: Modul evaluasi diri bagi guru sebelum dilakukan observasi kelas oleh supervisor.
