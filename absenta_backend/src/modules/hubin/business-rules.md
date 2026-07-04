# BUSINESS RULES - HUBIN

### 1. Keamanan & Cakupan Data (Enterprise Scoping)
- **Unit Restriction**: Pengguna dengan akses terbatas unit (misal: Kaprog) hanya dapat mengelola mitra dan penempatan PKL untuk siswa di bawah program keahliannya.
- **Pembimbing Access**: Guru pembimbing hanya diperbolehkan memperbarui data kontak dan lokasi mitra industri tempat mereka ditugaskan. Perubahan nama atau bidang usaha mitra memerlukan otoritas HUBIN Global.
- **Audit Logging**: Setiap aksi krusial (pembukaan mitra baru, penempatan siswa, penghapusan data) wajib dicatat melalui `activityLogService`.

### 2. Manajemen Penempatan PKL
- **Academic Snapshot Binding**: Setiap penempatan PKL wajib terikat pada `siswa_akademik_id` aktif untuk memastikan integritas data laporan nilai meskipun siswa naik kelas/lulus di kemudian hari.
- **Single Active Placement**: Satu siswa dilarang memiliki lebih dari satu penempatan PKL yang aktif dalam rentang waktu yang sama.
- **Bulk Validation**: Proses penempatan massal (Bulk) wajib memvalidasi bahwa seluruh siswa berada dalam lingkup unit kerja operator (jika dibatasi).

### 3. Absensi & Anti-Fraud (Geofencing)
- **Geofencing Mandatory**: Absensi Check-In secara default ditolak jika jarak siswa ke titik koordinat industri melebihi radius yang ditetapkan (default: 100m).
- **Dinas Luar Override**: Siswa diperbolehkan melakukan absensi di luar radius hanya jika mencentang opsi `is_dinas_luar` atau memiliki flag `is_flexible_location` di profil penempatan.
- **Accuracy Guard**: Sistem mencatat `accuracy` GPS. Jika akurasi terdeteksi sangat rendah (< 1m - indikasi fake GPS), peringatan anti-fraud akan dicatat di log sistem.
- **Verification Status**: Absensi yang dilakukan di luar radius industri secara otomatis berstatus "Belum Terverifikasi" dan memerlukan persetujuan manual pembimbing.

### 4. Jurnal, Penilaian & BKK
- **Logbook Uniqueness**: Siswa hanya dapat membuat satu logbook utama per hari melalui alur Check-In/Out. Pembaruan logbook setelah jam kerja diperbolehkan.
- **Portfolio Review**: Jurnal akhir/portofolio yang diunggah siswa masuk ke status `MENUNGGU_REVIEW`. Pembimbing wajib memberikan status `DISETUJUI` atau `REVISI` beserta catatan.
- **BKK-Tracer Automation**: Sistem secara otomatis melakukan *upsert* data Tracer Study siswa menjadi status `BEKERJA` dengan detail perusahaan terkait apabila lamaran BKK berstatus `DITERIMA`.
- **Interview Notification**: Undangan interview wajib menyertakan detail waktu, lokasi/link, dan narahubung yang akan dikirimkan secara otomatis via WhatsApp ke nomor alumni.
- **Assessment Immutability**: Nilai PKL yang sudah masuk ke sistem akademik pusat tidak dapat diubah kembali melalui modul HUBIN tanpa prosedur pembatalan khusus.

### 5. Integrasi Penyimpanan (Storage) & Keuangan
- **Storage Driver**: Pengunggahan dokumen menggunakan centralized `storageService` platform (mendukung AWS S3 atau Local Disk fallback).
- **Permission Management**: Berkas yang diunggah secara otomatis diatur hak akses publiknya (public-read) agar dapat diakses atau diunduh oleh pembimbing sekolah dan pihak industri.
- **TEFA Order Policy**: Setiap order TEFA wajib mencantumkan nilai kontrak dan target penyelesaian untuk keperluan audit pendapatan unit produksi sekolah.
- **Cleanup Policy**: Penghapusan entitas di database HUBIN wajib memicu penghapusan berkas terkait di penyimpanan (melalui `storageService.delete`) untuk menghemat ruang penyimpanan tenant.
