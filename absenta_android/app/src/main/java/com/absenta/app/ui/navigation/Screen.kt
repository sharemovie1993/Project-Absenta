package com.absenta.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector? = null) {
    object Login : Screen("login", "Masuk")
    object ForgotPassword : Screen("forgot_password", "Lupa Password")
    object Dashboard : Screen("dashboard", "Beranda", Icons.Default.Home)
    object History : Screen("history", "Riwayat", Icons.Default.DateRange)
    object AttendanceRekap : Screen("attendance_rekap", "Rekap Absensi")
    object Profile : Screen("profile", "Profil", Icons.Default.AccountCircle)
    object Scanner : Screen("scanner", "Scan Presensi")
    object MyAttendance : Screen("my_attendance", "Presensi GPS")
    object JadwalTemplate : Screen("jadwal_template", "Jadwal Pelajaran")
    object CoopPOS : Screen("coop_pos", "POS Koperasi")
    object CoopSavings : Screen("coop_savings", "Simpanan Koperasi")
    object CoopLoans : Screen("coop_loans", "Pinjaman Koperasi")
    object CoopPPOB : Screen("coop_ppob", "PPOB Koperasi")
    object CoopSettings : Screen("coop_settings", "Pengaturan Koperasi")
    object CoopDashboard : Screen("coop_dashboard", "Dashboard Koperasi")
    object CoopMembers : Screen("coop_members", "Manajemen Anggota Koperasi")
    object CoopAnnouncements : Screen("coop_announcements", "Pengumuman Koperasi")
    object CoopProducts : Screen("coop_products", "Manajemen Produk Koperasi")
    object CoopSHU : Screen("coop_shu", "Sisa Hasil Usaha Koperasi")
    object CoopVouchers : Screen("coop_vouchers", "Manajemen Voucher Koperasi")
    object CoopTickets : Screen("coop_tickets", "Tiket Layanan Koperasi")
    object CoopAccounting : Screen("coop_accounting", "Laporan Keuangan")
    object KesiswaanViolations : Screen("kesiswaan_violations", "Catatan Pelanggaran")
    object KesiswaanCounseling : Screen("kesiswaan_counseling", "Konseling BK")
    object PklVerification : Screen("pkl_verification", "Verifikasi PKL")
    object TeachingJournal : Screen("teaching_journal", "Jurnal Mengajar")
    object Schedule : Screen("schedule", "Jadwal Mengajar")
    object Sarpras : Screen("sarpras", "Sarana Prasarana")
    object SubscriptionPlans : Screen("subscription_plans", "Paket Langganan")
    object TenantInvoice : Screen("tenant_invoice", "Riwayat Tagihan")
    object Notifications : Screen("notifications", "Notifikasi")
    object PklAbsensi : Screen("pkl_absensi", "Absensi PKL")
    object MitraIndustri : Screen("mitra_industri", "Mitra Industri")
    object PenempatanPkl : Screen("penempatan_pkl", "Penempatan PKL")
    object MonitoringPkl : Screen("monitoring_pkl", "Monitoring PKL")
    object Piket : Screen("piket", "Piket Harian")
    object AcademicSiswa : Screen("academic_siswa", "Data Siswa")
    object AcademicTahunPelajaran : Screen("academic_tahun_pelajaran", "Tahun Pelajaran")
    object AcademicGuru : Screen("academic_guru", "Data Guru")
    object AcademicKelas : Screen("academic_kelas", "Data Kelas")
    object AcademicMapel : Screen("academic_mapel", "Mata Pelajaran")
    object AcademicSemester : Screen("academic_semester", "Semester")
    object AcademicJurusan : Screen("academic_jurusan", "Jurusan")
    object AcademicRegistrasiSiswa : Screen("academic_registrasi_siswa", "Registrasi Siswa")
    object AcademicWaliKelas : Screen("academic_wali_kelas", "Wali Kelas")
    object AcademicGuruMapel : Screen("academic_guru_mapel", "Guru Mapel")
    object AcademicJenisKegiatan : Screen("academic_jenis_kegiatan", "Jenis Kegiatan")
    object AcademicTransition : Screen("academic_transition", "Kenaikan Kelas")
    object AcademicSiswaCards : Screen("academic_siswa_cards", "Kartu Siswa")
    object AcademicMutation : Screen("academic_mutation", "Mutasi Siswa")
    object AcademicStrukturOrganisasi : Screen("academic_struktur_organisasi", "Struktur Organisasi")
    object AcademicBackup : Screen("academic_backup", "Backup & Restore")
    object GenericDetail : Screen("generic_detail/{title}", "Detail") {
        fun createRoute(title: String) = "generic_detail/$title"
    }
}

