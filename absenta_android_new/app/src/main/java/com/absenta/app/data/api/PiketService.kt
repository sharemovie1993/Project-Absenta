package com.absenta.app.data.api

import com.absenta.app.data.model.CreatePermitRequest
import com.absenta.app.data.model.CreatePermitResponse
import com.absenta.app.data.model.IzinKeluarSiswaResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * PiketService — Retrofit interface untuk Modul Buku Piket & Surat Izin Keluar/Masuk Siswa.
 *
 * Endpoint real backend:
 * - [GET /api/kesiswaan/piket]: Daftar surat izin harian
 * - [POST /api/kesiswaan/piket]: Buat surat izin baru
 * - [PATCH /api/kesiswaan/piket/:id/kembali]: Tandai siswa telah kembali ke sekolah
 * - [DELETE /api/kesiswaan/piket/:id]: Hapus record surat izin
 */
interface PiketService {

    @GET("api/kesiswaan/piket")
    suspend fun getDailyPermits(
        @Query("date") date: String? = null
    ): Response<IzinKeluarSiswaResponse>

    @POST("api/kesiswaan/piket")
    suspend fun createPermit(
        @Body request: CreatePermitRequest
    ): Response<CreatePermitResponse>

    @PATCH("api/kesiswaan/piket/{id}/kembali")
    suspend fun markReturned(
        @Path("id") id: String
    ): Response<CreatePermitResponse>

    @DELETE("api/kesiswaan/piket/{id}")
    suspend fun deletePermit(
        @Path("id") id: String
    ): Response<Unit>
}
