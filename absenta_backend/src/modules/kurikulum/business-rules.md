# BUSINESS RULES - KURIKULUM

### 1. Struktur Kurikulum (Curriculum Mapping)
- **Uniqueness Constraint**: Kombinasi `mapel_id`, `tahun_pelajaran_id`, `tingkat`, dan `jurusan_id` (jika ada) harus unik. Jika ditemukan data yang sama saat penyimpanan, sistem akan melakukan pembaruan (Update) pada jumlah JP dan kelompoknya.
- **Tenant Isolation**: Seluruh pengaturan struktur kurikulum bersifat privat per tenant dan tidak dapat diakses atau diubah oleh tenant lain.
- **Grade Range**: Pengaturan tingkat dibatasi pada angka numerik yang valid sesuai jenjang pendidikan sekolah (misal: 10, 11, 12 untuk SMA).

### 2. Supervisi Guru
- **Supervisor Authority**: Hanya guru atau pimpinan yang memiliki hak akses administratif yang dapat ditugaskan sebagai `supervisor_id`.
- **Status Default**: Setiap jadwal supervisi baru yang dibuat secara otomatis mendapatkan status `SCHEDULED`.
- **Search Capability**: Pencarian data supervisi mendukung filter `mode: 'insensitive'` pada field Mapel, Kelas, dan Nama Guru untuk kemudahan pelaporan.
- **Data Ownership**: Perubahan (Update) atau penghapusan (Delete) data supervisi hanya dapat dilakukan jika data tersebut berada di bawah `tenant_id` operator yang bersangkutan.
- **Nilai Range**: Penilaian kuantitatif pada supervisi (jika diisi) harus berupa angka yang mencerminkan skor kinerja (0-100 atau skala lain yang ditetapkan sekolah).

### 3. Integritas Data & Pelaporan
- **Mapel Reference**: Mata pelajaran dalam struktur kurikulum harus merujuk pada master data mapel yang aktif di modul `Academic`.
- **History Protection**: Penghapusan data struktur kurikulum menggunakan `deleteMany` dengan filter `tenant_id` untuk memastikan keamanan data lintas sekolah.
