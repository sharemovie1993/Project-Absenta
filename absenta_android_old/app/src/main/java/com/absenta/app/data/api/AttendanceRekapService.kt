package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface AttendanceRekapService {

    @GET("attendance/rekap/siswa-harian")
    suspend fun getRekapHarian(
        @Query("date") date: String? = null,
        @Query("kelas_id") kelasId: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<RekapHarianResponse>

    @GET("attendance/rekap/siswa-bulanan")
    suspend fun getRekapBulanan(
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null,
        @Query("kelas_id") kelasId: String? = null,
        @Query("page") page: Int? = null
    ): Response<RekapBulananResponse>

    @GET("attendance/guru-monitoring")
    suspend fun getGuruMonitoring(
        @Query("date") date: String? = null,
        @Query("page") page: Int? = null
    ): Response<GuruMonitoringResponse>

    @GET("attendance/monitoring")
    suspend fun getMonitoringKbm(
        @Query("date") date: String? = null,
        @Query("kelas_id") kelasId: String? = null
    ): Response<MonitoringKbmResponse>

    @GET("academic/kelas")
    suspend fun getKelasList(): Response<KelasListResponse>
}

// --- Rekap Harian ---
data class RekapHarianResponse(
    val success: Boolean,
    val data: RekapHarianData?
)
data class RekapHarianData(
    val list: List<RekapHarianSiswa>,
    val summary: RekapSummary?,
    val total: Int
)
data class RekapHarianSiswa(
    val siswa_id: String,
    val nama: String,
    val nis: String,
    val kelas: String,
    val status: String, // HADIR, SAKIT, IZIN, ALPHA, TERLAMBAT
    val tap_masuk: String?,
    val tap_keluar: String?,
    val keterangan: String?
)
data class RekapSummary(
    val hadir: Int,
    val sakit: Int,
    val izin: Int,
    val alpha: Int,
    val terlambat: Int,
    val total: Int
)

// --- Rekap Bulanan ---
data class RekapBulananResponse(
    val success: Boolean,
    val data: RekapBulananData?
)
data class RekapBulananData(
    val list: List<RekapBulananSiswa>,
    val total: Int,
    val bulan: Int,
    val tahun: Int
)
data class RekapBulananSiswa(
    val siswa_id: String,
    val nama: String,
    val nis: String,
    val kelas: String,
    val hadir: Int,
    val sakit: Int,
    val izin: Int,
    val alpha: Int,
    val terlambat: Int,
    val total_hari: Int,
    val persentase_hadir: Double
)

// --- Guru Monitoring ---
data class GuruMonitoringResponse(
    val success: Boolean,
    val data: GuruMonitoringData?
)
data class GuruMonitoringData(
    val list: List<GuruAbsensiItem>,
    val summary: RekapSummary?,
    val total: Int
)
data class GuruAbsensiItem(
    val guru_id: String,
    val nama: String,
    val nip: String,
    val status: String,
    val tap_masuk: String?,
    val tap_keluar: String?,
    val jabatan: String?
)

// --- Monitoring KBM ---
data class MonitoringKbmResponse(
    val success: Boolean,
    val data: MonitoringKbmData?
)
data class MonitoringKbmData(
    val list: List<KbmItem>,
    val total_kelas: Int,
    val kelas_aktif: Int
)
data class KbmItem(
    val kelas_id: String,
    val nama_kelas: String,
    val jurusan: String,
    val jam_pelajaran: String,
    val guru: String,
    val mapel: String,
    val siswa_hadir: Int,
    val siswa_total: Int,
    val status_kbm: String // BERLANGSUNG, SELESAI, BELUM_MULAI
)

// --- Kelas ---
data class KelasListResponse(
    val success: Boolean,
    val data: List<KelasItem>?
)
data class KelasItem(
    val id: String,
    val nama_kelas: String,
    val jurusan: String?,
    val tingkat: String?,
    val jumlah_siswa: Int?
)
