# STANDAR OPERASIONAL PROSEDUR (SOP)
## Penanganan Sesi KBM Terlewat, Sanggahan Presensi, dan Koreksi Kehadiran Guru/Siswa
**Kode Dokumen**: SOP-ABS-KBM-001  
**Revisi**: 1.0  
**Status**: Berlaku Efektif  

---

### 1. TUJUAN
1. Menjamin integritas, akurasi, dan transparansi data kehadiran Guru dan Siswa pada kegiatan Belajar Mengajar (KBM).
2. Mencegah manipulasi atau pengisian presensi susulan yang tidak sah setelah jam pelajaran berakhir.
3. Memberikan panduan baku bagi Guru, Siswa, Petugas Kelas, Guru Piket, dan Tim Kurikulum dalam menyelesaikan sengketa/kesalahan presensi (*attendance dispute*).

---

### 2. RUANG LINGKUP
Prosedur ini berlaku untuk seluruh kegiatan pembelajaran intrakurikuler terjadwal di lingkungan sekolah yang tercatat dalam aplikasi Absenta, mencakup:
* Status Sesi KBM (`BERLANGSUNG`, `SIAP DIMULAI`, `SELESAI`, `TERLEWAT`, `MENDATANG`).
* Status Kehadiran Guru (`HADIR`, `TERLAMBAT`, `IZIN`, `SAKIT`, `PENUGASAN`, `DIGANTIKAN/INVAL`, `ALPA`).
* Status Kehadiran Siswa (`HADIR`, `TERLAMBAT`, `IZIN`, `SAKIT`, `DISPEN`, `ALPA`).

---

### 3. DEFINISI & KETENTUAN STATUS SESI TERLEWAT (*OVERDUE*)
1. **Sesi Terlewat (*Overdue*)** adalah kondisi di mana jadwal KBM telah melewati batas waktu selesai (`waktu_selesai < waktu_sekarang`) dan guru pengampu belum melakukan pembukaan sesi / tap presensi.
2. **Penguncian Otomatis (*System Lockout*)**:
   * Sesi terlewat secara otomatis berstatus **Read-Only / Terkunci**.
   * Guru Pengampu dan Siswa Petugas Kelas **tidak dapat** membuka sesi, melakukan absensi manual, atau mengubah status siswa pada sesi yang telah terkunci.

---

### 4. MATRIKS KEWENANGAN OPERATOR

| Role Pengguna | Akses Saat Sesi Berlangsung (Live) | Akses Saat Sesi Terlewat (Hari H) | Akses Koreksi Historis (Hari Lalu) | Batas Tindakan |
| :--- | :---: | :---: | :---: | :--- |
| **Siswa Petugas Kelas** | ✅ Presensi Siswa Kelas | ❌ Terkunci (Read-Only) | ❌ Tidak Berhak | Melaporkan kendala ke Guru / Piket |
| **Guru Pengampu** | ✅ Buka Sesi, Foto Bukti, Jurnal | ❌ Terkunci (Read-Only) | ❌ Tidak Berhak | Mengajukan permohonan ke Meja Piket / Kurikulum |
| **Wali Kelas** | 👁️ Monitoring Kelas | 👁️ Monitoring Kelas | ❌ Tidak Berhak Ubah Langsung | Mengadvokasi siswa/guru binaan |
| **Meja Piket (Guru Piket)** | ✅ Kelola Sesi & Status Guru | ✅ **Bisa Ubah Status (Same-Day Override)** | ❌ Terkunci setelah pergantian hari | Khusus penyelesaian operasional pada hari berjalan |
| **Tim Kurikulum & Kepala Sekolah** | ✅ Akses Penuh | ✅ **Otoritas Tertinggi (Unlock & Override)** | ✅ **Bisa Koreksi Kapan Saja (Audit Logged)** | Pemegang kebijakan akademik dan audit resmi sekolah |

---

### 5. PROSEDUR OPERASIONAL PENANGANAN KOMPLAIN (ALUR DISPUTE)

#### Skenario A: Komplain Pada Hari yang Sama (Hari H)
*Contoh Kasus: Guru hadir mengajar di kelas, namun lupa membawa perangkat/kartu RFID atau terkendala jaringan internet sehingga sesi otomatis tercatat Terlewat.*

1. **Langkah 1 (Pelaporan Bukti Fisik)**:
   * Guru Pengampu atau Ketua Kelas melapor ke **Meja Piket**.
   * Menyerahkan bukti pendukung (Buku Jurnal Fisik Kelas, dokumentasi foto, atau paraf ketua kelas).
2. **Langkah 2 (Verifikasi Meja Piket)**:
   * Guru Piket memverifikasi keberadaan guru di kelas pada jam pelajaran terkait.
3. **Langkah 3 (Eksekusi Pembaruan Status)**:
   * Guru Piket membuka modul **Meja Piket / Pantau Guru KBM** pada aplikasi Absenta.
   * Memilih nama guru $\rightarrow$ Mengubah status menjadi `HADIR` / `IZIN` / `PENUGASAN`.
   * Sistem secara *real-time* memancarkan pembaruan data ke Dashboard Siswa, Dashboard Guru, dan Monitoring Kurikulum.

---

#### Skenario B: Komplain Historis (Setelah Berganti Hari / Pasca-KBM)
*Contoh Kasus: Siswa atau Guru baru menyadari status kehadirannya tercatat Alpa pada hari sebelumnya karena kesalahan teknis.*

1. **Langkah 1 (Pengajuan Berkas Sanggahan)**:
   * Pihak yang bersangkutan mengisi formulir sanggahan presensi atau melapor resmi ke **Tim Kurikulum / Bagian Akademik**.
2. **Langkah 2 (Audit Investigasi Kurikulum)**:
   * Tim Kurikulum memeriksa rekaman Jurnal Pembelajaran, log pintu gerbang (*access log*), dan konfirmasi Wali Kelas.
3. **Langkah 3 (Koreksi dengan Audit Trail)**:
   * Tim Kurikulum mengakses modul **Koreksi Presensi KBM / Audit Override**.
   * Memperbarui status sesi/kehadiran dan **wajib mencantumkan alasan koreksi** (contoh: *"Koreksi kehadiran Sdr. Wawan berdasarkan verifikasi jurnal kelas X-AKL-1"*).
   * Sistem mencatat `updated_by`, `timestamp`, dan `reason` ke dalam tabel audit log database.

---

### 6. SANKSI ATAS KELALAIAN & PENYALAHGUNAAN
1. Setiap tindakan membuka/mengubah status sesi KBM tanpa bukti fisik yang valid merupakan pelanggaran disiplin akademik.
2. Seluruh log perubahan status tersimpan permanen di sistem dan dapat diunduh dalam Berita Acara Presensi Resmi untuk keperluan evaluasi kinerja dan akreditasi sekolah.
