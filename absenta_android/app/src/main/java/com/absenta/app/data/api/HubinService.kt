package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface HubinService {

    // --- MITRA ---
    @GET("hubin/mitra")
    suspend fun getMitra(
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<MitraListResponse>

    @POST("hubin/mitra")
    suspend fun createMitra(
        @Body data: MitraIndustriInput
    ): Response<HubinGenericResponse>

    @PUT("hubin/mitra/{id}")
    suspend fun updateMitra(
        @Path("id") id: String,
        @Body data: MitraIndustriInput
    ): Response<HubinGenericResponse>

    @DELETE("hubin/mitra/{id}")
    suspend fun deleteMitra(
        @Path("id") id: String
    ): Response<HubinGenericResponse>

    // --- PENEMPATAN ---
    @GET("hubin/penempatan")
    suspend fun getPenempatan(
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<PenempatanListResponse>

    @GET("hubin/penempatan/me")
    suspend fun getMyPenempatan(): Response<MyPenempatanResponse>

    @POST("hubin/penempatan")
    suspend fun createPenempatan(
        @Body data: PenempatanInput
    ): Response<HubinGenericResponse>

    @PUT("hubin/penempatan/{id}/nilai")
    suspend fun updatePenilaian(
        @Path("id") id: String,
        @Body body: UpdateNilaiRequest
    ): Response<HubinGenericResponse>

    @POST("hubin/penempatan/{id}/kunjungan")
    suspend fun addKunjungan(
        @Path("id") id: String,
        @Body data: KunjunganInput
    ): Response<HubinGenericResponse>

    @DELETE("hubin/penempatan/{id}")
    suspend fun deletePenempatan(
        @Path("id") id: String
    ): Response<HubinGenericResponse>

    @POST("hubin/penempatan/{id}/jurnal-akhir")
    suspend fun submitJurnalPortofolio(
        @Path("id") id: String,
        @Body body: SubmitJurnalRequest
    ): Response<HubinGenericResponse>

    @PUT("hubin/penempatan/{id}/jurnal-akhir/review")
    suspend fun reviewJurnalPortofolio(
        @Path("id") id: String,
        @Body body: ReviewJurnalRequest
    ): Response<HubinGenericResponse>

    // --- ABSENSI ---
    @GET("hubin/absensi/{siswaPklId}")
    suspend fun getPklAbsensi(
        @Path("siswaPklId") siswaPklId: String,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<PklAbsensiListResponse>

    @POST("hubin/absensi/check-in")
    suspend fun checkIn(
        @Body request: PklCheckRequest
    ): Response<HubinGenericResponse>

    @POST("hubin/absensi/check-out")
    suspend fun checkOut(
        @Body request: PklCheckRequest
    ): Response<HubinGenericResponse>

    @PUT("hubin/absensi/{siswaPklId}/logbook")
    suspend fun updateLogbook(
        @Path("siswaPklId") siswaPklId: String,
        @Body request: PklLogbookRequest
    ): Response<HubinGenericResponse>

    @PUT("hubin/absensi/{id}/verify")
    suspend fun verifyAbsensi(
        @Path("id") id: String
    ): Response<HubinGenericResponse>

    // --- SETTINGS ---
    @GET("hubin/settings")
    suspend fun getSettings(): Response<HubinSettingsResponse>

    @PUT("hubin/settings")
    suspend fun updateSettings(
        @Body data: HubinSettingsDataInput
    ): Response<HubinGenericResponse>

    // --- LEGACY/COMPATIBILITY METHODS ---
    // Dipakai oleh PklVerificationScreen.kt sebelum diupdate
    @GET("hubin/penempatan")
    suspend fun getPklStudents(
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<PenempatanListResponse>

    @PUT("hubin/absensi/{id}/verify")
    suspend fun verifyPklLog(
        @Path("id") id: String,
        @Body body: VerifyPklRequest
    ): Response<HubinGenericResponse>
}

// --- DATA MODELS ---

data class MitraIndustri(
    val id: String,
    val nama: String,
    val bidang: String?,
    val alamat: String?,
    val kontak: String?,
    val mou_url: String?,
    val latitude: Double?,
    val longitude: Double?,
    val radius: Int?
)

data class MitraIndustriInput(
    val nama: String,
    val bidang: String? = null,
    val alamat: String? = null,
    val kontak: String? = null,
    val mou_url: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radius: Int? = null
)

data class SiswaPkl(
    val id: String,
    val siswa_id: String,
    val mitra_id: String,
    val tanggal_mulai: String,
    val tanggal_selesai: String?,
    val status: String,
    val pembimbing_id: String?,
    val Siswa: SiswaSimple?,
    val Mitra: MitraDetail?,
    val Pembimbing: PembimbingDetail?,
    val nilai_json: NilaiJson?,
    val kunjungan_json: List<KunjunganRecord>?,
    val jurnal_json: JurnalJson?,
    val AbsensiPkl: List<PklAbsensiRecord>? = null
)

data class SiswaSimple(
    val nama_siswa: String,
    val nis: String,
    val no_hp: String?,
    val Kelas: HubinKelasSimple?
)

data class HubinKelasSimple(
    val nama_kelas: String
)

data class MitraDetail(
    val id: String,
    val nama: String,
    val alamat: String?,
    val kontak: String?,
    val mou_url: String?,
    val latitude: Double?,
    val longitude: Double?,
    val radius: Double?
)

data class PembimbingDetail(
    val id: String?,
    val nama_guru: String?,
    val no_hp: String?
)

data class NilaiJson(
    val soft_skills: Double?,
    val technical_skills: Double?,
    val discipline: Double?,
    val catatan: String?,
    val nilai_akhir: Double?
)

data class KunjunganRecord(
    val tanggal: String,
    val catatan: String,
    val foto_url: String?,
    val latitude: Double?,
    val longitude: Double?
)

data class JurnalJson(
    val file_url: String,
    val status: String, // 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'REVISI'
    val submitted_at: String,
    val catatan_revisi: String?,
    val reviewed_at: String?
)

data class PenempatanInput(
    val siswa_id: String,
    val mitra_id: String,
    val pembimbing_id: String? = null,
    val tanggal_mulai: String,
    val tanggal_selesai: String? = null,
    val status: String = "AKTIF"
)

data class UpdateNilaiRequest(
    val nilai: NilaiInput
)

data class NilaiInput(
    val soft_skills: Double,
    val technical_skills: Double,
    val discipline: Double,
    val catatan: String,
    val nilai_akhir: Double
)

data class KunjunganInput(
    val catatan: String,
    val foto_url: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class SubmitJurnalRequest(
    val file_url: String
)

data class ReviewJurnalRequest(
    val status: String,
    val catatan: String
)

data class HubinSettingsResponse(
    val success: Boolean,
    val data: HubinSettingsData?
)

data class HubinSettingsData(
    val folderUrl: String,
    val driveMode: String
)

data class HubinSettingsDataInput(
    val folderUrl: String,
    val driveMode: String
)

data class MitraListResponse(
    val success: Boolean,
    val data: List<MitraIndustri>?,
    val pagination: HubinPagination? = null
)

data class PenempatanListResponse(
    val success: Boolean,
    val data: List<SiswaPkl>?,
    val pagination: HubinPagination? = null
)

data class MyPenempatanResponse(
    val success: Boolean,
    val data: SiswaPkl?
)

data class HubinPagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

data class PklAbsensiListResponse(
    val success: Boolean,
    val data: List<PklAbsensiRecord>?
)

data class PklAbsensiRecord(
    val id: String,
    val tanggal: String,
    val jam_masuk: String?,
    val jam_pulang: String?,
    val status: String,
    val kegiatan: String?,
    val image_url: String?,
    val image_url_out: String?,
    val is_verified: Boolean,
    val latitude_masuk: Double? = null,
    val longitude_masuk: Double? = null
)

data class PklCheckRequest(
    val siswaPklId: String,
    val latitude: Double,
    val longitude: Double,
    val kegiatan: String? = null,
    val image_url: String? = null
)

data class PklLogbookRequest(
    val kegiatan: String,
    val absensiId: String? = null,
    val image_url: String? = null
)

data class HubinGenericResponse(
    val success: Boolean,
    val message: String
)

// Legacy request model (dipakai oleh PklVerificationScreen.kt)
data class VerifyPklRequest(
    val status: String,
    val catatan_pembimbing: String?
)
