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

### 4. Jadwal Pelajaran (JadwalKBM)
- **Slot Index Mapping**: Jadwal pelajaran dipetakan menggunakan `slot_index` (Jam Ke-1, Ke-2, dst.) alih-alih waktu absolut, sehingga visualisasi grid dan alokasi jam mengajar secara otomatis menyesuaikan ketika terjadi perubahan jam KBM sekolah di tingkat Tenant Config.
- **Conflict Validation**: Bentrok jadwal kelas divalidasi secara ketat berdasarkan keunikan `slot_index` per hari/kelas. Bentrok jadwal guru divalidasi menggunakan rentang waktu absolut hasil konversi dari `slot_index` untuk tetap mendukung jadwal mengajar guru lintas kelas/shift.
- **Auto Session Generation (Organic Sync)**: Setiap kali jadwal pelajaran baru dibuat (`create`), diperbarui (`update`), atau diimpor (`importFromExcel`), jika hari jadwal tersebut sesuai dengan hari aktif hari ini, sistem secara otomatis dan organik akan men-trigger pembuatan/penyesuaian sesi absensi (`SesiAbsensi` beserta `AbsenGuru` default) secara real-time untuk hari tersebut, tanpa harus menunggu siklus cron job harian berikutnya (idempotent sync).
- **Capability Domain**: Akses ke seluruh endpoint Jadwal KBM divalidasi menggunakan `academic.schedules.*` (bukan `attendance.schedules.*`). Domain ini mencerminkan kepemilikan fitur di bawah workspace Kurikulum yang bersifat gratis.

### 5. Otorisasi Lintas Modul & Proteksi Komponen (Read-Only)
- **Pemisahan Otoritas (Separation of Duties)**: Pengguna dari ruang kerja lain (seperti `TU_KEPEGAWAIAN`) yang hanya memiliki hak baca tidak boleh melakukan perubahan data apa pun di lingkungan modul Kurikulum.
- **Dynamic Lock (Read-Only State)**: Seluruh formulir, grid pemetaan jam pelajaran, status shift, dan checklist di Struktur Kurikulum dan Jam KBM wajib mendeteksi ada/tidaknya kapabilitas tulis (`academic.manage.academic` / `academic.schedules.manage`) secara *client-side* untuk mengunci fungsionalitas pengeditan.
- **Fail-safe Widget Loading**: Setiap widget analitik di Dashboard Kurikulum harus berdiri sendiri secara terisolasi. Jika pengguna tidak memegang hak spesifik seperti `curriculum.supervision.view.schedule`, dashboard tidak boleh menampilkan pesan kesalahan global (403 crash screen), melainkan harus membendung panggilan API secara lokal dan merender status terproteksi pada widget tersebut.
