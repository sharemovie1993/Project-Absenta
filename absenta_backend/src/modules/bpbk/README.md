# MODULE BPBK (Bimbingan Konseling)

## Deskripsi
Modul BPBK adalah sistem manajemen bimbingan konseling komprehensif yang dirancang untuk mendukung perkembangan siswa dan penanganan masalah secara terstruktur. Modul ini mengintegrasikan pemantauan perilaku (Early Warning System), konseling, hingga alur formal pemanggilan orang tua dan kunjungan rumah.

## Aktor & Peran
- **Guru BK (Konselor)**: Aktor utama dengan akses penuh (`bk.counseling.view.sensitive`) untuk menangani kasus, melakukan asesmen, dan konseling.
- **Kepala Sekolah**: Peninjau dan pemberi persetujuan akhir untuk surat pemanggilan orang tua (Summons Approval).
- **Wali Kelas**: Memiliki akses terbatas (`LIMITED` visibility) untuk memantau perkembangan dan kasus siswa di kelas binaannya.
- **Orang Tua**: Penerima notifikasi notifikasi terkait kasus publik, surat panggilan, dan hasil pembinaan melalui Parent App atau WhatsApp.

## Sub-Modul & Fitur Terimplementasi

### 1. Manajemen Kasus (Case Management)
- **Life Cycle Kasus**: Alur dari pembukaan kasus (`TERBUKA`), proses penanganan (`PROSES`), hingga penyelesaian (`SELESAI`) dengan fitur *reopen count*.
- **Visibility Control**: Tiga level visibilitas (`PUBLIC`, `LIMITED`, `SENSITIVE`) untuk menjaga kerahasiaan data sesuai kode etik konseling.
- **Auto-Completion**: Penutupan kasus secara otomatis menyelesaikan semua sesi konseling yang masih berjalan di bawah kasus tersebut.

### 2. Intervensi & Pembinaan
- **Konseling Siswa**: Pencatatan sesi konseling individu atau kelompok dengan dokumentasi masalah dan solusi.
- **Pemanggilan Orang Tua (Summons)**: Alur formal pembuatan surat panggilan dengan integrasi **Surat Keluar** dan sistem **Quick Approval** oleh Kepala Sekolah via WhatsApp.
- **Home Visit**: Pencatatan log kunjungan rumah dengan dukungan unggah dokumen/foto bukti kegiatan.
- **Rujukan Kasus**: Sistem rujukan ke pihak eksternal (psikolog, medis, atau kepolisian) jika kasus memerlukan penanganan khusus.

### 3. Asesmen & EWS
- **Asesmen BK**: Repositori hasil tes psikologi, asesmen minat bakat, dan instrumen BK lainnya.
- **Early Warning System (EWS)**: Kalkulasi otomatis skor risiko siswa berdasarkan akumulasi poin pelanggaran, ketidakhadiran (Alpa), dan bobot prioritas kasus aktif.
- **Risk Distribution**: Pemetaan level risiko siswa (`LOW`, `MEDIUM`, `HIGH`) untuk tindakan preventif yang lebih cepat.

### 4. Dashboard & Analitik
- **Real-time Stats**: Statistik kasus aktif, pemanggilan tertunda, dan kunjungan rumah bulanan.
- **Student Risk Trend**: Timeline komprehensif riwayat perilaku siswa (Pelanggaran, Prestasi, Konseling, Home Visit, Summons) dalam satu tampilan urutan waktu.
- **Wali Kelas Dashboard**: Tampilan khusus untuk Wali Kelas untuk memantau siswa kritis di kelas binaannya secara efisien.
- **Performance Analytics**: Perhitungan *Completion Rate* kasus dan *Mean Resolution Time* (rata-rata waktu penyelesaian).
- **Trend Analysis**: Pemantauan tren risiko siswa per jurusan dan kelas untuk identifikasi dini area bermasalah.

## Teknologi & Pattern
- **Pattern**: Service Layer, Helper Visibility Filter, Activity Logging (Audit Trail).
- **Security**: Capability-based Access Control (CBAC), Secure Public View Tokens for official documents.
- **Integrasi**: `parentNotificationService` (Parent App), `SuratKeluarService` (Correspondence), `WhatsAppService` (Notifications).

## Integrasi Lintas Modul & Ruang Kerja (Cross-Workspace)
Untuk mendukung sinergi manajemen pembelajaran (KBM), pembinaan siswa, dan Kurikulum Merdeka, beberapa halaman BPBK diintegrasikan ke ruang kerja lain:
1. **Ruang Kerja Kurikulum (Wakasek Kurikulum)**:
   - **Monitoring Kasus Pembelajaran** (`/bpbk/cases` via `bk.cases.view.list`): Untuk memantau hambatan belajar siswa yang kritis.
   - **Asesmen & Pemetaan Minat Siswa** (`/bpbk/asesmen` via `bk.assessment.view.list`): Untuk memetakan gaya belajar (Visual/Auditori/Kinestetik) dan pemilihan mapel pilihan.
2. **Ruang Kerja Guru (Staf Pengajar)**:
   - **Rujukan Kasus BK** (`/bpbk/rujukan` via `bk.referrals.view.list` & `bk.referrals.manage`): Untuk merujuk/melimpahkan penanganan masalah siswa di kelas ke guru BK.
   - **Asesmen & Pemetaan Minat Siswa** (`/bpbk/asesmen` via `bk.assessment.view.list`): Sebagai acuan merancang Pembelajaran Berdiferensiasi di kelas.

