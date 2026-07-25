package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AttendanceService {
    @POST("attendance/gerbang/tap")
    suspend fun submitTap(@Body request: TapRequest): Response<TapResponse>

    @retrofit2.http.GET("attendance/rekap/guru/me/bulanan")
    suspend fun getRekapBulananGuruMe(
        @retrofit2.http.Query("bulan") bulan: String,
        @retrofit2.http.Query("tahun_pelajaran_id") tahunPelajaranId: String? = null
    ): Response<MonthlyRekapResponse>

    @retrofit2.http.GET("attendance/rekap/siswa/me/bulanan")
    suspend fun getRekapBulananSiswaMe(
        @retrofit2.http.Query("bulan") bulan: String,
        @retrofit2.http.Query("tahun_pelajaran_id") tahunPelajaranId: String? = null
    ): Response<MonthlyRekapResponse>

    @retrofit2.http.GET("attendance/jadwal-template/my")
    suspend fun getMyJadwalTemplate(
        @retrofit2.http.Query("tanggal") tanggal: String
    ): Response<JadwalTemplateListResponse>

    @retrofit2.http.GET("attendance/jadwal-template")
    suspend fun getJadwalTemplate(
        @retrofit2.http.Query("kelas_id") kelasId: String? = null,
        @retrofit2.http.Query("guru_id") guruId: String? = null,
        @retrofit2.http.Query("tahun_pelajaran_id") tahunPelajaranId: String? = null,
        @retrofit2.http.Query("semester_id") semesterId: String? = null,
        @retrofit2.http.Query("hari") hari: String? = null
    ): Response<JadwalTemplateListResponse>

    @retrofit2.http.POST("attendance/jadwal-template")
    suspend fun createJadwalTemplate(
        @retrofit2.http.Body payload: CreateJadwalPayload
    ): Response<GenericApiResponse>

    @retrofit2.http.PUT("attendance/jadwal-template/{id}")
    suspend fun updateJadwalTemplate(
        @retrofit2.http.Path("id") id: String,
        @retrofit2.http.Body payload: CreateJadwalPayload
    ): Response<GenericApiResponse>

    @retrofit2.http.DELETE("attendance/jadwal-template/{id}")
    suspend fun deleteJadwalTemplate(
        @retrofit2.http.Path("id") id: String
    ): Response<GenericApiResponse>

    @retrofit2.http.GET("attendance/sesi-absensi")
    suspend fun getSesiAbsensiList(
        @retrofit2.http.Query("guru_id") guruId: String?,
        @retrofit2.http.Query("summary") summary: Boolean? = true,
        @retrofit2.http.Query("journals") journals: Boolean? = true
    ): Response<SesiAbsensiListResponse>

    @retrofit2.http.GET("attendance/sesi-absensi/{sesi_id}/absen-siswa")
    suspend fun getSesiAbsenSiswa(
        @retrofit2.http.Path("sesi_id") sesiId: String
    ): Response<SesiAbsenSiswaResponse>

    @retrofit2.http.POST("attendance/sesi-absensi/{sesi_id}/progres-materi")
    suspend fun upsertProgresMateri(
        @retrofit2.http.Path("sesi_id") sesiId: String,
        @retrofit2.http.Body payload: ProgresMateriRequest
    ): Response<GenericApiResponse>
}

data class MonthlyRekapResponse(
    val success: Boolean,
    val message: String,
    val data: MonthlyRekapData?
)

data class MonthlyRekapData(
    val name: String?,
    val nama_guru: String?,
    val nama_siswa: String?,
    val bulan: String,
    val statistik: Map<String, Int>?,
    val persentase_kehadiran: Double?,
    val total_poin: Int?,
    val detail: List<AttendanceDayDetail>?
)

data class AttendanceDayDetail(
    val id: String?,
    val tanggal: String, // "yyyy-MM-dd"
    val status: String, // "HADIR", "TERLAMBAT", "SAKIT", "IZIN", "ALPA"
    val waktu_tap: String?
)

data class TapRequest(
    val siswa_id: String,
    val arah: String // "GERBANG_DATANG" or "GERBANG_PULANG"
)

data class TapResponse(
    val success: Boolean,
    val message: String,
    val data: TapData?
)

data class TapData(
    val id: String,
    val siswa_id: String,
    val waktu_tap: String,
    val arah: String,
    val status: String, // e.g. "HADIR", "TERLAMBAT"
    val siswa: StudentDetailInfo?
)

data class StudentDetailInfo(
    val id: String,
    val full_name: String,
    val nis: String,
    val no_absen: Int?
)

data class JadwalTemplateListResponse(
    val success: Boolean,
    val data: List<JadwalTemplateEntry>?
)

data class JadwalTemplateEntry(
    val id: String,
    val jam_mulai: String,
    val jam_selesai: String,
    val hari: String,
    val jenis_kegiatan: String?,
    val Mapel: MapelInfo?,
    val Kelas: KelasInfo?,
    val session: SessionInfo?,
    val is_live: Boolean = false,
    val is_finished: Boolean = false,
    val is_adhoc: Boolean = false,
    val attendance_status: String? = null,
    val waktu_tap: String? = null,
    val tenant_id: String? = null,
    val tahun_pelajaran_id: String? = null,
    val semester_id: String? = null,
    val kelas_id: String? = null,
    val mapel_id: String? = null,
    val guru_id: String? = null,
    val Guru: JadwalGuruInfo? = null
)

data class JadwalGuruInfo(
    val id: String,
    val User: JadwalUserInfo?
)

data class JadwalUserInfo(
    val full_name: String
)

data class CreateJadwalPayload(
    val tahun_pelajaran_id: String,
    val semester_id: String,
    val kelas_id: String,
    val hari: String,
    val jam_mulai: String,
    val jam_selesai: String,
    val mapel_id: String?,
    val guru_id: String?,
    val jenis_kegiatan: String
)

data class MapelInfo(
    val id: String?,
    val nama_mapel: String,
    val kode_mapel: String?
)

data class KelasInfo(
    val id: String,
    val nama_kelas: String
)

data class SessionInfo(
    val id: String,
    val status: String,
    val is_auto_closed: Boolean?,
    val _summary: SummaryInfo?,
    val AbsenGuru: List<AbsenGuruInfo>?
)

data class SummaryInfo(
    val total: Int,
    val HADIR: Int,
    val TERLAMBAT: Int,
    val IZIN: Int,
    val SAKIT: Int,
    val ALPA: Int
)

data class AbsenGuruInfo(
    val waktu_tap: String?,
    val is_terlambat: Boolean?
)

data class SesiAbsensiListResponse(
    val success: Boolean,
    val message: String?,
    val data: List<SesiAbsensiEntry>?
)

data class SesiAbsensiEntry(
    val id: String,
    val tanggal: String,
    val waktu_mulai: String,
    val waktu_selesai: String?,
    val jenis_kegiatan: String,
    val status: String?,
    val Kelas: KelasSimpleName?,
    val Mapel: MapelSimpleName?,
    val ProgresMateri: ProgresMateriEntry?,
    val summary: SesiSummaryEntry?
)

data class KelasSimpleName(
    val nama_kelas: String
)

data class MapelSimpleName(
    val nama_mapel: String
)

data class ProgresMateriEntry(
    val judul_materi: String,
    val deskripsi: String?,
    val pencapaian_persen: Int,
    val kendala: String?,
    val kegiatan: String?
)

data class SesiSummaryEntry(
    val HADIR: Int,
    val TOTAL: Int
)

data class SesiAbsenSiswaResponse(
    val success: Boolean,
    val message: String?,
    val data: List<SesiAbsenSiswaEntry>?
)

data class SesiAbsenSiswaEntry(
    val id: String,
    val siswa_id: String,
    val status: String,
    val waktu_tap: String?,
    val Siswa: SiswaSimpleInfo?
)

data class SiswaSimpleInfo(
    val id: String,
    val nama_siswa: String,
    val nis: String
)

data class ProgresMateriRequest(
    val judul_materi: String,
    val deskripsi: String?,
    val pencapaian_persen: Int,
    val kendala: String?
)
