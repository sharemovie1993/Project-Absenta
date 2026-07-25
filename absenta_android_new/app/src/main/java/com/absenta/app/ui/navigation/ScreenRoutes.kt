package com.absenta.app.ui.navigation

/**
 * ScreenRoutes — mendefinisikan seluruh rute navigasi dalam aplikasi Absenta.
 *
 * Setiap rute adalah string konstanta yang digunakan oleh [NavGraph] untuk
 * mencocokkan screen dengan destination. Format: `snake_case` untuk konsistensi.
 *
 * Kategori rute:
 * - **Auth**: Layar login (semua persona)
 * - **Dashboard**: Layar utama setelah login (berbeda per persona)
 * - **Profile**: Profil, edit, upload berkas
 * - **Attendance**: Rekap absensi, sesi kelas, scanner gerbang
 * - **Academic**: Jadwal pelajaran
 * - **Kesiswaan**: Poin pelanggaran & prestasi
 */
object ScreenRoutes {

    // ── Auth ──────────────────────────────────────────────────────────────────
    /** Layar login (entry point aplikasi) */
    const val LOGIN = "login"

    // ── Dashboard ─────────────────────────────────────────────────────────────
    /** Dashboard utama: menampilkan menu berdasarkan capabilities API */
    const val DYNAMIC_MENU_DASHBOARD = "dynamic_menu_dashboard"
    /** Dashboard eksekutif (Kepsek/Wakasek/Pengawas) */
    const val EXECUTIVE_DASHBOARD = "executive_dashboard"
    /** Dashboard orang tua siswa */
    const val PARENT_DASHBOARD = "parent_dashboard"

    // ── Profile ───────────────────────────────────────────────────────────────
    /** Tampilan profil pengguna */
    const val MY_PROFILE = "my_profile"
    /** Edit data profil */
    const val EDIT_PROFILE = "edit_profile"
    /** Upload berkas / foto profil */
    const val UPLOAD_BERKAS = "upload_berkas"

    // ── Attendance ────────────────────────────────────────────────────────────
    /** Rekap absensi saya (Persona Siswa) */
    const val MY_ATTENDANCE = "my_attendance"
    /** Manajemen sesi kelas (Persona Petugas Kelas) */
    const val SESI_KELAS_MANAGER = "sesi_kelas_manager"
    /** Detail sesi dengan daftar absensi siswa (membawa arg sesi_id) */
    const val SESI_KELAS_DETAIL = "sesi_kelas_detail/{sesiId}"
    /** Scanner kamera QR gerbang (Persona Petugas Gerbang) */
    const val CAMERA_SCANNER = "camera_scanner"

    // ── Academic ──────────────────────────────────────────────────────────────
    /** Jadwal pelajaran saya (Persona Siswa) */
    const val MY_SCHEDULE = "my_schedule"
    /** Riwayat mengajar & Jurnal KBM (Persona Guru) */
    const val RIWAYAT_AJAR = "riwayat_ajar"
    /** Pemantauan KBM Real-Time Seluruh Kelas (Persona Guru Piket / Kurikulum / Kepsek) */
    const val MONITORING_KBM = "monitoring_kbm"
    /** Supervisi KBM & Evaluasi Pengajaran Guru (Persona Kepsek / Kurikulum / Pengawas) */
    const val SUPERVISI_KBM = "supervisi_kbm"
    /** Kalender Pendidikan, Hari Libur, & Agenda Sekolah (Semua Persona) */
    const val KALENDER_AKADEMIK = "kalender_akademik"
    /** Monitoring Penempatan & Jurnal PKL Siswa di Industri (Persona Hubin / Pembimbing / Siswa) */
    const val MONITORING_PKL = "monitoring_pkl"

    // ── Kesiswaan ─────────────────────────────────────────────────────────────
    /** Ringkasan poin pelanggaran & prestasi (Persona Siswa) */
    const val MY_POIN = "my_poin"
    /** Buku piket & penerbitan surat izin keluar/terlambat siswa (Persona Guru Piket) */
    const val SURAT_IZIN_PIKET = "surat_izin_piket"
    /** Pusat Notifikasi & Pengumuman Sekolah (Semua Persona) */
    const val NOTIFICATIONS = "notifications"
    /** Layanan Bimbingan Konseling / BK Siswa (Persona Guru BK / Kesiswaan / Admin) */
    const val BPBK_KONSELING = "bpbk_konseling"

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Membuat rute SESI_KELAS_DETAIL dengan ID sesi yang nyata.
     *
     * @param sesiId ID sesi kelas yang akan dibuka
     * @return String rute yang siap digunakan untuk navigasi
     */
    fun sesiKelasDetail(sesiId: String) = "sesi_kelas_detail/$sesiId"

    /**
     * Peta capability backend ke rute screen yang sesuai.
     * Digunakan oleh [NavGraph] untuk membangun dynamic screen registry
     * berdasarkan hasil API [GET /api/menu].
     */
    val CAPABILITY_ROUTE_MAP = mapOf(
        "attendance.scan" to CAMERA_SCANNER,
        "attendance.sessions.create" to SESI_KELAS_MANAGER,
        "attendance.sessions.update.attendance" to SESI_KELAS_MANAGER,
        "attendance.view.my" to MY_ATTENDANCE,
        "academic.schedules.view.list" to MY_SCHEDULE,
        "academic.profile.update" to MY_PROFILE,
        "kesiswaan.pelanggaran.view" to MY_POIN,
        "dashboard.view.kepsek" to EXECUTIVE_DASHBOARD,
        "dashboard.view.overview" to EXECUTIVE_DASHBOARD,
        "attendance.riwayat_ajar.view" to RIWAYAT_AJAR
    )
}
