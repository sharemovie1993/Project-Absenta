package com.absenta.app.data.api

import com.absenta.app.data.model.MyPoinResponse
import com.absenta.app.data.model.ReportPelanggaranRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

/**
 * KesiswaanService — Retrofit interface untuk poin pelanggaran & prestasi.
 *
 * Endpoint real backend:
 * - [GET /api/kesiswaan/pelanggaran]: List pelanggaran & poin
 * - [POST /api/kesiswaan/pelanggaran]: Laporkan pelanggaran siswa baru
 * - [PUT /api/kesiswaan/pelanggaran/:id]: Update laporan pelanggaran
 * - [DELETE /api/kesiswaan/pelanggaran/:id]: Hapus laporan pelanggaran
 * - [GET /api/kesiswaan/prestasi]: List prestasi siswa
 * - [POST /api/kesiswaan/prestasi]: Tambah prestasi siswa
 * - [DELETE /api/kesiswaan/prestasi/:id]: Hapus prestasi siswa
 */
interface KesiswaanService {

    @GET("api/kesiswaan/pelanggaran")
    suspend fun getMyPoin(): Response<MyPoinResponse>

    @POST("api/kesiswaan/pelanggaran")
    suspend fun reportPelanggaran(@Body request: ReportPelanggaranRequest): Response<Unit>

    @PUT("api/kesiswaan/pelanggaran/{id}")
    suspend fun updatePelanggaran(
        @Path("id") id: String,
        @Body request: ReportPelanggaranRequest
    ): Response<Unit>

    @DELETE("api/kesiswaan/pelanggaran/{id}")
    suspend fun deletePelanggaran(
        @Path("id") id: String
    ): Response<Unit>

    @GET("api/kesiswaan/prestasi")
    suspend fun getPrestasiList(): Response<MyPoinResponse>

    @POST("api/kesiswaan/prestasi")
    suspend fun createPrestasi(@Body request: ReportPelanggaranRequest): Response<Unit>

    @DELETE("api/kesiswaan/prestasi/{id}")
    suspend fun deletePrestasi(@Path("id") id: String): Response<Unit>
}
