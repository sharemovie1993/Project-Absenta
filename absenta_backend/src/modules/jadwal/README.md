# MODULE JADWAL (Schedule Validator)

## Deskripsi
Modul Jadwal adalah modul pendukung yang didedikasikan untuk melakukan komputasi dan pengecekan bentrok jadwal KBM (Kegiatan Belajar Mengajar) secara matematis sebelum diaplikasikan pada kurikulum sekolah.

## Aktor & Peran
- **Staf Kurikulum (Admin)**: Mengajukan data jadwal untuk divalidasi oleh sistem.

## Sub-Modul & Fitur Terimplementasi
### 1. Conflict Resolver
- **checkClassConflict**: Memvalidasi apakah suatu kelas telah terisi oleh mata pelajaran lain pada hari dan jam yang sama.
- **checkTeacherConflict**: Memvalidasi apakah guru pengampu memiliki jadwal mengajar paralel di kelas lain pada jam yang sama.

## Teknologi & Pattern
- **Pattern**: Pure Functional Validation Engine, Conflict Detection Algorithm.
