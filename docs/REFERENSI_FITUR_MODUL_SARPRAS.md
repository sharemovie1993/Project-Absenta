# 📚 KATALOG & REFERENSI FITUR: MODUL SARANA & PRASARANA (SARPRAS)
## Platform Absenta.id — Panduan Fitur Utama & Fitur Pendukung

> **Tujuan Dokumen:**  
> Dokumen ini memuat pembedahan mendalam mengenai seluruh fitur di dalam **Modul Sarana dan Prasarana / Asset & Facilities Management (SARPRAS Module)** Platform Absenta. Disusun secara terstruktur, menggunakan bahasa yang sederhana, mudah dipahami pimpinan sekolah, dan siap disalin (*copy-paste*) ke dalam proposal resmi atau dokumen presentasi.

---

## 📌 APA ITU MODUL SARPRAS?
Modul Sarpras adalah **pusat inventarisasi aset, pengendalian peminjaman alat praktik bengkel/lab, dan sistem pemeliharaan fasilitas sekolah** di SMKN 1 Plered. Modul ini dirancang khusus untuk memecahkan masalah kronis di sekolah kejuruan (SMK): **alat praktik bernilai jutaan rupiah yang sering hilang, rusak tanpa ada yang bertanggung jawab, atau saling lempar kesalahan antar-shift kelas.**

Sistem ini memastikan setiap barang milik negara/sekolah memiliki nomor identitas unik, riwayat peminjam tercatat hingga satuan detik, dan jadwal servis alat berjalan tertib.

---

## 🌟 1. FITUR UTAMA (CORE FEATURES)
*Fitur inti wajib yang digunakan oleh Waka Sarpras, Kepala Program Keahlian (Kaprog), dan Toolman Bengkel untuk mengamankan aset sekolah.*

| No | Nama Fitur | Penjelasan Sederhana | Manfaat Nyata di Sekolah |
| :-: | :--- | :--- | :--- |
| **A** | **Buku Induk Inventaris & Penomoran Kode Unik Otomatis** | Mendata seluruh aset sekolah (alat mesin perkakas, toolkit otomotif, komputer lab, proyektor, hingga perabot) dengan kode unik otomatis anti-tertukar (contoh: `INV-2026-X7K9P`). | Seluruh aset terdata rapi per gedung, ruangan, dan jurusan; memudahkan verifikasi fisik saat audit aset tahunan. |
| **B** | **Peminjaman Cepat Alat Bengkel (*Quick Scan Loan*)** | Toolman bengkel cukup men-scan barcode alat dan men-tap kartu RFID peminjam (siswa/guru) dalam waktu 3 detik saat jam praktik dimulai. | Menggantikan buku peminjaman kertas yang lambat; ratusan siswa praktikum terlayani cepat tanpa antre lama. |
| **C** | **Penguncian Tanggung Jawab Peminjam Aktif** | Selama alat belum berstatus "Dikembalikan", sistem mengunci identitas siswa peminjam terakhir sebagai penanggung jawab mutlak barang tersebut. | Menghentikan fenomena saling lempar kesalahan antar-siswa atau antar-kelas saat alat ditemukan hilang atau rusak. |
| **D** | **Verifikasi Kondisi Pengembalian (*Return Integrity Check*)** | Saat alat dikembalikan, petugas memeriksa kondisi fisik (`BAIK`, `RUSAK RINGAN`, `RUSAK BERAT`). Jika alat rusak, sistem otomatis menandai master aset dan mencatat insiden peminjamnya. | Kerusakan alat langsung terdeteksi di hari yang sama sehingga dapat segera ditagih ganti rugi atau diperbaiki sebelum jadwal kelas berikutnya. |
| **E** | **Tiket Pemeliharaan & Perbaikan Alat (*Repair & Maintenance*)** | Mengelola alur perbaikan fasilitas dari status `DIAJUKAN` $\rightarrow$ `PROSES PERBAIKAN` $\rightarrow$ `SELESAI/BATAL`, lengkap dengan catatan vendor bengkel servis dan biaya perbaikan. | Alat yang rusak segera tertangani secara terjadwal; Kepala Sekolah mengetahui estimasi dan realisasi anggaran perawatan sarpras. |
| **F** | **Penguncian Otomatis Aset dalam Perbaikan (*Auto Condition Lock*)** | Begitu alat masuk jadwal servis (`PROSES PERBAIKAN`), sistem otomatis mengunci alat tersebut agar tidak bisa dipinjam oleh guru atau kelas lain sampai perbaikan dinyatakan selesai. | Mencegah siswa memakai alat yang sedang rusak/berbahaya saat jam praktikum. |
| **G** | **Pengelompokan Aset per Jurusan & Ruang Praktik** | Membagi wewenang inventaris berdasarkan unit kerja (Kepala Bengkel Mesin hanya mengelola aset mesin perkakas, Kaprog Otomotif hanya mengelola bengkel otomotif, dst.). | Pengawasan aset terdistribusi adil ke masing-masing ketua bengkel kejuruan tanpa tumpang tindih data. |

---

## 🛠️ 2. FITUR TAMBAHAN & PENDUKUNG (SMART TOOLS)
*Alat bantu pintar untuk mencetak stiker barcode barang, memantau valuasi aset, dan mengisolasi alat KBM.*

| No | Nama Fitur | Penjelasan Sederhana | Manfaat Nyata di Sekolah |
| :-: | :--- | :--- | :--- |
| **1** | **Pembuat & Pencetak Stiker Label Barcode/QR Code Aset** | Menghasilkan label stiker siap cetak lengkap dengan logo SMKN 1 Plered, nama barang, kode inventaris, dan Barcode/QR Code untuk ditempel di fisik alat. | Semua alat bengkel dan inventaris sekolah memiliki identitas fisik yang profesional dan mudah di-scan dengan HP/scanner. |
| **2** | **Layar TV Monitor Sarpras (*Sarpras TV Mode*)** | Tampilan visual di ruang bengkel utama atau ruang Sarpras yang menyiarkan daftar alat yang sedang dipinjam hari ini dan alat yang terlambat dikembalikan. | Toolman dan guru bengkel cukup melihat layar monitor untuk memantau sirkulasi alat praktikum secara langsung. |
| **3** | **Pelacak Peminjaman Melebihi Batas Waktu (*Overdue Loans Alert*)** | Sistem memberi tanda peringatan merah jika ada alat praktikum atau laptop sekolah yang belum dikembalikan melewati batas jam pelajaran yang disepakati. | Mencegah alat praktik terbawa pulang ke rumah siswa atau tersimpan di loker pribadi tanpa izin. |
| **4** | **Pemisahan Khusus Aset Penunjang KBM (*KBM Asset Isolation*)** | Di ruang guru, sistem hanya menampilkan aset penunjang mengajar (seperti *Infocus Proyektor, Kabel HDMI, Pointer, Laptop KBM*) dan menyembunyikan alat berat bengkel. | Bapak/ibu guru dapat meminjam alat presentasi mengajar secara mandiri lewat HP tanpa terganggu daftar ribuan alat bengkel. |
| **5** | **Dashboard Total Valuasi & Nilai Aset Sekolah** | Menghitung secara otomatis nilai rupiah perolehan seluruh aset sekolah dan akumulasi biaya pemeliharaan tahunan secara akurat. | Memberikan data keuangan sarana prasarana yang valid untuk laporan pertanggungjawaban dana BOS/BOP ke dinas. |
| **6** | **Pusat Cetak Berkas Sarpras Ber-Kop Resmi Instan** | Mencetak Berita Acara Peminjaman, Berita Acara Kerusakan/Kehilangan, dan Lembar Rekapitulasi Inventaris Ruangan (KIR) ber-Kop resmi SMKN 1 Plered dalam 1-klik. | Dokumen berita acara resmi langsung tercetak rapi saat ada sengketa alat rusak atau pemeriksaan aset dari auditor. |
| **7** | **Pencatat Riwayat Transaksi Lengkap (*Audit Logging*)** | Mencatat setiap aktivitas penambahan barang, peminjaman, perbaikan, dan mutasi barang beserta nama staf operator dan waktunya. | Menjamin akuntabilitas; mencegah manipulasi data atau penghapusan catatan barang inventaris secara sepihak. |
| **8** | **Impor Data Aset Masal via Excel (*Bulk Asset Import*)** | Memasukkan ratusan daftar inventaris lama dari lembar kerja Excel ke dalam sistem secara massal dalam hitungan detik. | Mempercepat migrasi data sarpras sekolah tanpa perlu mengetik ulang satu per satu barang yang sudah ada. |
| **9** | **Tempat Pemulihan Data Aset (*Soft Delete & Restore*)** | Data barang atau lokasi yang tidak sengaja terhapus dapat dipulihkan kembali tanpa merusak riwayat transaksi peminjaman di masa lalu. | Riwayat pergerakan aset bertahun-tahun tetap aman tersimpan untuk kebutuhan akreditasi sekolah. |

---

## 📋 3. VERSI RINGKAS UNTUK DIMASUKKAN KE PROPOSAL
*(Bagian di bawah ini bisa langsung Anda salin ke bab penjelasan fitur sarpras pada lembar proposal untuk Kepala Sekolah)*

> ### Ringkasan Modul Sarana & Prasarana (SARPRAS) Platform Absenta
> 
> Modul Sarpras mengamankan aset bernilai tinggi SMKN 1 Plered dan menertibkan peminjaman alat bengkel secara akuntabel:
> 
> 1. **Fondasi Utama:**
>    - **Inventarisasi & Kode Unik Otomatis:** Pendataan terstruktur seluruh peralatan per gedung, ruang, dan jurusan kejuruan.
>    - **Peminjaman Cepat Berbasis Scan Barcode/RFID (3 Detik):** Pelayanan peminjaman alat praktikum bebas antrean panjang.
>    - **Penguncian Tanggung Jawab Peminjam Aktif:** Kepastian identitas penanggung jawab barang untuk mencegah saling lempar kesalahan.
>    - **Pemeriksaan Integritas Pengembalian:** Verifikasi kondisi fisik alat (Baik/Rusak) saat alat kembali.
>    - **Tiket Pemeliharaan & Servis Alat (*Maintenance*):** Alur perbaikan fasilitas, estimasi biaya, dan pencatatan bengkel servis.
>    - **Penguncian Otomatis Aset Rusak:** Proteksi keamanan agar alat rusak tidak dapat dipinjam siswa saat jam praktik.
>    - **Pembagian Wewenang per Bengkel Jurusan:** Pengelolaan inventaris oleh masing-masing kepala program keahlian.
> 
> 2. **Otomasi & Nilai Tambah:**
>    - **Cetak Stiker Label Barcode/QR Code Aset:** Identitas visual profesional pada fisik peralatan sekolah.
>    - **Layar TV Monitor Sarpras (*Live Status*):** Tampilan visual sirkulasi peminjaman alat di ruang bengkel.
>    - **Alarm Peminjaman Melebihi Batas (*Overdue Alert*):** Deteksi dini alat praktikum yang belum dikembalikan.
>    - **Peminjaman Mandiri Aset KBM Guru:** Layanan pinjam proyektor dan laptop mengajar via HP guru.
>    - **Dashboard Valuasi Aset Sekolah:** Perhitungan nilai rupiah aset untuk audit BOS/BOP.
>    - **Pusat Cetak Berita Acara Ber-Kop Resmi:** Cetak formulir peminjaman dan berita acara kerusakan 1-klik siap audit dinas.

---
*Dokumen ini disusun sebagai materi rujukan resmi Platform Absenta.*
