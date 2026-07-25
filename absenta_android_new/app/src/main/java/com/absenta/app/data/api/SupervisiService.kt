package com.absenta.app.data.api

import com.absenta.app.data.model.CreateSupervisiRequest
import com.absenta.app.data.model.CreateSupervisiResponse
import com.absenta.app.data.model.SupervisiResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * SupervisiService — Retrofit interface untuk Penilaian & Form Supervisi KBM Pengajaran Guru.
 *
 * Endpoint real backend:
 * - [GET /api/kurikulum/supervisi]: Daftar riwayat supervisi
 * - [POST /api/kurikulum/supervisi]: Buat / terbitkan supervisi pengajaran guru
 * - [PUT /api/kurikulum/supervisi/:id]: Edit hasil penilaian supervisi
 * - [DELETE /api/kurikulum/supervisi/:id]: Hapus record supervisi
 */
interface SupervisiService {

    @GET("api/kurikulum/supervisi")
    suspend fun getSupervisiList(
        @Query("guru_id") guruId: String? = null,
        @Query("tanggal") tanggal: String? = null
    ): Response<SupervisiResponse>

    @POST("api/kurikulum/supervisi")
    suspend fun createSupervisi(
        @Body request: CreateSupervisiRequest
    ): Response<CreateSupervisiResponse>

    @PUT("api/kurikulum/supervisi/{id}")
    suspend fun updateSupervisi(
        @Path("id") id: String,
        @Body request: CreateSupervisiRequest
    ): Response<CreateSupervisiResponse>

    @DELETE("api/kurikulum/supervisi/{id}")
    suspend fun deleteSupervisi(
        @Path("id") id: String
    ): Response<Unit>
}
