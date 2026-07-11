# TODO KESISWAAN

## High Priority
- [x] **Integrasi EWS (Early Warning System)**: Menghubungkan poin pelanggaran secara real-time ke modul BPBK untuk memicu notifikasi peringatan dini bagi siswa dengan risiko tinggi.
- [x] **Validation Layer (Zod)**: Implementasi skema validasi Zod pada seluruh endpoint (Pelanggaran, Prestasi, Piket) untuk memastikan integritas tipe data input.
- [x] **Reporting Engine**: Membangun sistem laporan bulanan kesiswaan (PDF) yang mencakup rekapitulasi poin per kelas dan per jurusan.

## Medium Priority
- [x] **Fitur Cetak Surat Izin**: Menambahkan fungsi cetak surat izin keluar (thermal/A4) langsung dari dasbor guru piket.
- [x] **Notifikasi Real-time Orang Tua**: Integrasi dengan `waGatewayService` untuk mengirimkan notifikasi instan saat siswa dicatat melakukan pelanggaran berat.
- [x] **Leaderboard Prestasi**: Membangun antarmuka peringkat siswa berprestasi di aplikasi siswa untuk meningkatkan motivasi.

## Low Priority
- [x] **Analitik Kedisiplinan**: Grafik tren pelanggaran per bulan untuk membantu sekolah mengidentifikasi waktu-waktu rawan gangguan disiplin.
- [ ] **Mobile Entry for Piket**: Optimasi UI dasbor piket untuk penggunaan pada perangkat mobile/tablet bagi guru piket yang berkeliling.
- [ ] **Custom Point Weighting**: Memberikan opsi bagi admin sekolah untuk mengubah bobot poin default pada jenis pelanggaran/prestasi tertentu melalui antarmuka pengaturan.
