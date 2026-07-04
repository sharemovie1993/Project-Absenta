# TODO ACADEMIC

## High Priority
- [x] **Selesaikan Bulk Import Siswa**: Mengimplementasikan logic `importFromRowsCommand` dengan fitur Smart Match seperti pada GuruMapel.
- [x] **UI Transisi Akhir Tahun**: Membangun interface untuk review preview transisi (NAIK/TINGGAL) sebelum eksekusi `TransitionService.execute`.
- [x] **Validation Layer (Zod)**: Migrasi seluruh interface input service ke skema validasi Zod untuk mencegah "junk data".
  - [x] Sub-modul Siswa (terintegrasi di `siswa.schema.ts`)
  - [x] Sub-modul Guru (terintegrasi di `guru.schema.ts`)
  - [x] Sub-modul Kelas (terintegrasi di `kelas.schema.ts`)
  - [x] Sub-modul Jurusan (terintegrasi di `jurusan.schema.ts`)
  - [x] Sub-modul Tahun Pelajaran (terintegrasi di `tahun-pelajaran.schema.ts`)
  - [x] Sub-modul Semester (terintegrasi di `semester.schema.ts`)
  - [x] Sub-modul Mata Pelajaran (Mapel) (terintegrasi di `mapel.schema.ts`)
  - [x] Sub-modul Wali Kelas
  - [x] Sub-modul Kenaikan Kelas & Transisi Tahun Ajaran
  - [x] Sub-modul Struktur Organisasi
  - [x] Sub-modul Student Card Config

## Medium Priority
- [x] **Prorata Penugasan Struktural**: Menambahkan fitur `start_date` dan `end_date` yang lebih ketat pada `OrganizationalAssignment` untuk mendukung pergantian jabatan di tengah semester.
- [x] **Template Kartu Pelajar**: Menambahkan lebih banyak preset layout (Horizontal/Vertical) pada `StudentCardConfig`.


## Low Priority
- [x] **Global Dashboard Stats**: Statistik perbandingan antar tahun ajaran untuk melihat tren jumlah siswa dan rasio guru-siswa.
- [x] **RFID Bulk Programmer Utility**: Tools untuk membantu pendaftaran massal kartu RFID baru dengan scan cepat.

## Saran Fitur Baru
- [ ] **Otomasi Pembuatan User**: Integrasi dengan Google Workspace atau Azure AD untuk sinkronisasi akun siswa/guru secara otomatis.
- [ ] **AI-Powered Schedule Optimizer**: Algoritma untuk menyusun jadwal pelajaran secara otomatis berdasarkan ketersediaan guru dan ruang kelas tanpa bentrok.
- [ ] **Mobile Student Card (Digital ID)**: Implementasi kartu pelajar digital pada aplikasi mobile dengan QR Code dinamis untuk keamanan tambahan.
- [ ] **Advanced Analytics**: Prediksi potensi siswa putus sekolah (Drop-out Prediction) berdasarkan data kehadiran dan nilai.
- [x] **E-Wallet Integrasi**: Sinkronisasi saldo koperasi sekolah langsung ke kartu pelajar RFID untuk transaksi cashless di kantin.
