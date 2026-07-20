# BUSINESS RULES - BPBK

### 1. Keamanan & Visibilitas Data
- **Capability Check**: Akses ke data berstatus `SENSITIVE` wajib memiliki capability `bk.counseling.view.sensitive` atau akses penuh sistem.
- **Wali Kelas Restriction**: Wali Kelas hanya dapat melihat data `LIMITED` dan `PUBLIC` untuk siswa yang berada di kelas binaannya (berdasarkan `OrganizationalAssignment` dengan posisi `WALIKELAS`).
- **Elevated Creation**: Pembuatan data baru (Kasus, Konseling, Summons) menggunakan `elevatedScopeMiddleware` untuk memastikan petugas memiliki wewenang administratif yang sesuai di tingkat unit atau tenant.
- **Audit Trail**: Setiap aksi pembuatan, pembaruan, penghapusan, hingga pembukaan data sensitif wajib dicatat dalam `activityLogService`.
- **Soft Delete**: Penghapusan data kasus, konseling, pemanggilan, dan kunjungan rumah menggunakan mekanisme *soft delete* (`deleted_at`) untuk menjaga integritas riwayat.
- **Recycle Bin**: Data yang dihapus dapat dipulihkan melalui fitur Restore yang memerlukan capability khusus `bk.recyclebin.restore`.

### 2. Manajemen Kasus & Konseling
- **Automatic Session Closure**: Saat sebuah Kasus BK diubah statusnya menjadi `SELESAI`, semua sesi konseling aktif (`PROSES`) di bawah kasus tersebut akan otomatis ditutup menjadi `SELESAI`.
- **Reopen Counter**: Sistem melacak berapa kali sebuah kasus dibuka kembali melalui field `reopen_count`.
- **Visibility Inheritance**: Data intervensi (Konseling, Asesmen, dll) secara default mengikuti atau lebih ketat dari visibilitas kasus induknya.

### 3. Pemanggilan Orang Tua (Summons Workflow)
- **Principal Approval**: Jika konfigurasi `bpbk_summons_require_principal_approval` aktif, surat panggilan baru berstatus `BARU` dan memerlukan persetujuan Kepala Sekolah sebelum dikirim.
- **Quick Approval**: Kepala Sekolah dapat menyetujui draf surat melalui link aman (token-based) yang dikirim via WhatsApp tanpa perlu login ke sistem.
- **Notification Trigger**: Notifikasi WhatsApp ke Orang Tua hanya dikirim setelah status pemanggilan menjadi `DIKIRIM`.
- **Public View Token**: Link dokumen resmi untuk Orang Tua menggunakan token aman yang memiliki masa berlaku selama 7 hari (`7 * 24 * 60 * 60` detik) untuk menjaga privasi dokumen.
- **Letter Format**: Nomor surat panggilan digenerasikan secara otomatis dengan format: `800 / [NIS] / BK / [TAHUN]`.

### 4. Early Warning System (EWS)
- **Risk Scoring Formula**:
  - Poin Pelanggaran (Bobot 1.5)
  - Jumlah Alpa 30 hari terakhir (Bobot 12.0)
  - Kasus Prioritas TINGGI (Bobot 25.0)
  - Kasus Prioritas SEDANG (Bobot 10.0)
  - Kasus Prioritas RENDAH (Bobot 5.0)
  - Dikurangi Poin Prestasi (Bobot 0.5)
- **Risk Thresholds**:
  - **HIGH RISK**: Skor >= 70
  - **MEDIUM RISK**: Skor >= 30
  - **LOW RISK**: Skor < 30
- **Snapshot Logic**: Perubahan skor risiko harian disimpan dalam `ewsSnapshot` untuk keperluan analisis tren jangka panjang.

### 5. Pelaporan & Statistik
- **Resolution Metrics**: Kecepatan penyelesaian kasus dihitung dari selisih `tanggal_kasus` hingga `closed_at`.
- **Jurusan/Kelas Distribution**: Analitik risiko dikelompokkan berdasarkan unit organisasi untuk memetakan area intervensi prioritas bagi tim BK.

### 6. Hak Akses Lintas Workspace (Kurikulum & Guru)
- **KURIKULUM**:
  - Diberikan izin memantau kasus belajar lewat capability `bk.cases.view.list` (Monitoring Kasus Pembelajaran) & `bk.cases.view.detail`.
  - Diberikan izin mengunduh/menganalisis hasil tes lewat capability `bk.assessment.view.list` (Asesmen & Pemetaan Minat Siswa).
- **GURU**:
  - Diberikan izin melihat profil gaya belajar siswa lewat capability `bk.assessment.view.list`.
  - Diberikan izin penuh membuat rujukan penanganan kasus siswa lewat capability `bk.referrals.manage` & `bk.referrals.view.list` (Rujukan Kasus).

