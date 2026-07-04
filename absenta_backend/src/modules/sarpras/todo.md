# TODO SARPRAS

## High Priority
- [x] **Validation Layer (Zod)**: Implementasi skema validasi Zod pada seluruh endpoint (Asset, Category, Location, Loan, Repair) untuk menjamin tipe data input.
- [x] **Cetak Label QR Code**: Fitur untuk generate dan cetak label QR code aset dalam format PDF untuk penempelan fisik pada barang.
- [x] **Dashboard Monitoring Real-time**: Membangun visualisasi statistik ketersediaan aset dan status perbaikan per ruangan/lokasi.

## Medium Priority
- [x] **Notifikasi Jatuh Tempo**: Integrasi dengan `waGatewayService` untuk mengirimkan pengingat otomatis kepada peminjam aset yang melewati batas waktu pengembalian.
- [x] **Laporan Depresiasi Aset**: Fitur penghitungan penyusutan nilai aset tahunan berdasarkan tanggal pembelian dan harga perolehan.
- [x] **Manajemen Barang Habis Pakai**: Sub-modul khusus untuk pelacakan stok barang yang tidak dipinjamkan (misal: spidol, tinta, kertas) dengan ambang batas stok minimum (Stock Alert).

## Low Priority
- [x] **Mobile Asset Scanner**: Pengembangan fitur pemindaian QR code melalui aplikasi mobile untuk inventarisasi (Stock Opname) ruangan secara cepat.
- [x] **Integrasi Kalender Perbaikan**: Sinkronisasi jadwal perbaikan aset dengan kalender kerja teknisi internal.
- [x] **Lampiran Foto Kerusakan**: Menambahkan fitur unggah foto bukti kerusakan saat pendaftaran perbaikan aset.
