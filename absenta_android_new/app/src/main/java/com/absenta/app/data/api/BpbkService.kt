package com.absenta.app.data.api

import com.absenta.app.data.model.CreateKonselingRequest
import com.absenta.app.data.model.CreateKonselingResponse
import com.absenta.app.data.model.KonselingResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * BpbkService — Retrofit interface untuk Bimbingan & Konseling (BPBK).
 *
 * Endpoint real backend:
 * - [GET /api/bpbk/konseling]: List catatan konseling siswa
 * - [POST /api/bpbk/konseling]: Tambah sesi bimbingan konseling baru
 * - [PUT /api/bpbk/konseling/:id]: Update sesi bimbingan konseling
 * - [DELETE /api/bpbk/konseling/:id]: Hapus catatan konseling
 */
interface BpbkService {

    @GET("api/bpbk/konseling")
    suspend fun getKonselingList(
        @Query("siswa_id") siswaId: String? = null,
        @Query("tipe") tipe: String? = null,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<KonselingResponse>

    @POST("api/bpbk/konseling")
    suspend fun createKonseling(
        @Body request: CreateKonselingRequest
    ): Response<CreateKonselingResponse>

    @PUT("api/bpbk/konseling/{id}")
    suspend fun updateKonseling(
        @Path("id") id: String,
        @Body request: CreateKonselingRequest
    ): Response<CreateKonselingResponse>

    @DELETE("api/bpbk/konseling/{id}")
    suspend fun deleteKonseling(
        @Path("id") id: String
    ): Response<Unit>
}
