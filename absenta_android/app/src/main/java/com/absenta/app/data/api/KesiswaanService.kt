package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface KesiswaanService {
    @GET("kesiswaan/pelanggaran")
    suspend fun getPelanggaran(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null,
        @Query("elevated_context") elevatedContext: String? = null
    ): Response<GenericListResponse<Pelanggaran>>

    @POST("kesiswaan/pelanggaran")
    suspend fun createPelanggaran(@Body request: PelanggaranRequest): Response<GenericKesiswaanResponse>

    @PUT("kesiswaan/pelanggaran/{id}")
    suspend fun updatePelanggaran(@Path("id") id: String, @Body request: PelanggaranRequest): Response<GenericKesiswaanResponse>

    @DELETE("kesiswaan/pelanggaran/{id}")
    suspend fun deletePelanggaran(@Path("id") id: String): Response<GenericKesiswaanResponse>

    @GET("kesiswaan/jenis-pelanggaran")
    suspend fun getJenisPelanggaran(): Response<GenericListResponse<JenisPelanggaran>>

    @GET("academic/siswa")
    suspend fun getStudents(
        @Query("search") search: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("search_fields") searchFields: String? = null,
        @Query("elevated_context") elevatedContext: String? = null,
        @Query("context") context: String? = null
    ): Response<GenericListResponse<SiswaData>>
}

data class GenericListResponse<T>(
    val success: Boolean,
    val data: ListDataHolder<T>?,
    val list: List<T>? = null
)

data class ListDataHolder<T>(
    val list: List<T>
)

data class GenericKesiswaanResponse(
    val success: Boolean,
    val message: String
)

data class Pelanggaran(
    val id: String,
    val siswa_id: String,
    val jenis_pelanggaran: String,
    val poin: Int,
    val keterangan: String?,
    val tanggal: String,
    val status: String,
    val Siswa: SiswaData?
)

data class SiswaData(
    val id: String,
    val nama_siswa: String,
    val nis: String?,
    val no_rfid: String?,
    val Kelas: KelasData?
)

data class KelasData(
    val nama_kelas: String
)

data class JenisPelanggaran(
    val id: String,
    val kategori: String,
    val nama_pelanggaran: String,
    val poin: Int
)

data class PelanggaranRequest(
    val siswa_id: String,
    val jenis_pelanggaran: String,
    val poin: Int,
    val keterangan: String,
    val tanggal: String,
    val status: String = "BARU"
)
