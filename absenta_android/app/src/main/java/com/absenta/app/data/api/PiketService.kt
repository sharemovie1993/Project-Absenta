package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface PiketService {
    @GET("kesiswaan/piket")
    suspend fun getDailyPermits(
        @Query("date") date: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<PiketListResponse>

    @POST("kesiswaan/piket")
    suspend fun createPermit(
        @Body request: CreatePermitRequest
    ): Response<PiketSingleResponse>

    @PATCH("kesiswaan/piket/{id}/kembali")
    suspend fun markReturned(
        @Path("id") id: String
    ): Response<PiketSingleResponse>

    @DELETE("kesiswaan/piket/{id}")
    suspend fun deletePermit(
        @Path("id") id: String
    ): Response<GenericPiketResponse>
}

data class IzinKeluarSiswa(
    val id: String,
    val tenant_id: String,
    val siswa_akademik_id: String,
    val guru_piket_id: String?,
    val jam_keluar: String,
    val jam_kembali: String?,
    val alasan: String,
    val tipe_izin: String, // e.g. "IZIN_KELUAR" or "PULANG_AWAL"
    val status: String, // e.g. "DISETUJUI" or "KEMBALI"
    val created_at: String,
    val updated_at: String,
    val SiswaAkademik: SiswaAkademikRelation?
)

data class SiswaAkademikRelation(
    val id: String,
    val siswa: SiswaDetailSimple,
    val kelas: KelasDetailSimple?
)

data class SiswaDetailSimple(
    val id: String,
    val nama_siswa: String,
    val nis: String,
    val no_rfid: String?,
    val foto_url: String?
)

data class KelasDetailSimple(
    val id: String,
    val nama_kelas: String
)

data class PiketListResponse(
    val success: Boolean,
    val data: List<IzinKeluarSiswa>?
)

data class PiketSingleResponse(
    val success: Boolean,
    val data: IzinKeluarSiswa?
)

data class CreatePermitRequest(
    val siswa_akademik_id: String,
    val guru_piket_id: String?,
    val alasan: String,
    val tipe_izin: String,
    val jam_keluar: String // ISO date string
)

data class GenericPiketResponse(
    val success: Boolean,
    val message: String?
)
