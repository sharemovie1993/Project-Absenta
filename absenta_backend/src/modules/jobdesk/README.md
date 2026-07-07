# MODULE JOBDESK

## Deskripsi
Modul Jobdesk mengelola pemetaan tugas pokok dan fungsi (Tupoksi) bagi staf dan guru di lingkungan sekolah. Modul ini menghubungkan perincian tanggung jawab operasional dengan jabatan struktural yang diampu.

## Aktor & Peran
- **Admin Sekolah**: Pengatur item tugas pada jabatan struktural (Kepsek, Wakasis, Wali Kelas, Kajur).
- **Guru & Staf**: Mengakses informasi daftar tugas harian/mingguan yang melekat pada jabatannya.

## Sub-Modul & Fitur Terimplementasi
### 1. Jobdesk Assignment
- **getMyJobdesk**: Mengambil daftar tanggung jawab aktif yang relevan dengan jabatan guru yang login.
- **updatePositionJobdesk**: Admin memetakan tanggung jawab ke dalam template jabatan.

## Teknologi & Pattern
- **Pattern**: Mapping Template Pattern, Role-based Duties.
- **Database**: Tabel `JobdeskTemplate`, `UserJobdesk`.
