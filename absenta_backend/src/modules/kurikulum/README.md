# MODULE KURIKULUM

## Deskripsi
Modul Kurikulum adalah pusat pengaturan struktur pendidikan dan penjaminan mutu pengajaran di Absenta.id. Modul ini bertanggung jawab untuk memetakan beban mengajar guru, struktur mata pelajaran per tingkat, serta melakukan evaluasi kinerja guru melalui sistem supervisi akademik.

## Aktor & Peran
- **Wakasek Kurikulum**: Pengelola utama struktur kurikulum, pemetaan mata pelajaran, dan koordinator supervisi.
- **Kepala Sekolah**: Peninjau hasil supervisi akademik dan pengambil keputusan mutu pendidikan.
- **Guru**: Subjek supervisi yang menerima feedback hasil observasi kelas dan pengampu mata pelajaran sesuai struktur yang ditetapkan.

## Sub-Modul & Fitur Terimplementasi

### 1. Struktur Kurikulum (Curriculum Mapping)
- **Pemetaan Mapel**: Mengatur mata pelajaran yang diajarkan pada tingkat tertentu (1-12) dan jurusan tertentu.
- **Beban Belajar (JP)**: Pengaturan Jam Pelajaran (JP) per minggu untuk setiap mata pelajaran dalam struktur.
- **Grouping & Sorting**: Pengelompokan mata pelajaran (Kelompok A, B, C, atau Pilihan) dan fitur pengambilan data terkelompok per tingkat (`getByTingkatGrouped`).
- **Smart Upsert Logic**: Mekanisme cerdas untuk memperbarui data struktur tanpa duplikasi berdasarkan kombinasi tahun ajaran, tingkat, dan jurusan.

### 2. Supervisi Akademik (Teacher Observation)
- **Penjadwalan Supervisi**: Perencanaan observasi kelas dengan detail waktu (Jam Ke), mata pelajaran, dan kelas.
- **Monitoring & Search**: Pelacakan siklus supervisi dari `SCHEDULED` hingga selesai, dilengkapi pencarian universal berdasarkan Guru, Mapel, atau Kelas.
- **Evaluasi Kinerja**: Pencatatan catatan observasi dan nilai kuantitatif hasil kinerja guru di kelas.
- **Supervisor Assignment**: Penugasan guru senior atau pimpinan sebagai supervisor untuk melakukan observasi.

## Teknologi & Pattern
- **Pattern**: Service Layer, Smart Upsert (Conflict Resolution), Filtered Querying.
- **Integrasi**: Terhubung erat dengan modul `Academic` (Mapel, Jurusan, Tahun Pelajaran) dan `Guru`.
- **Database**: Prisma ORM dengan PostgreSQL, menggunakan indexing pada entitas relasional untuk performa pencarian.
