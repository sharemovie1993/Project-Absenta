package com.absenta.app.data.api

import com.absenta.app.data.model.CreatePklAbsensiRequest
import com.absenta.app.data.model.CreatePklPenempatanRequest
import com.absenta.app.data.model.MitraPklResponse
import com.absenta.app.data.model.PklResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * HubinService — Retrofit interface untuk Monitoring PKL / Prakerin Industri (Hubin).
 *
 * Endpoint real backend:
 * - [GET /api/hubin/penempatan]: List penempatan PKL siswa
 * - [GET /api/hubin/mitra]: List mitra perusahaan industri
 * - [POST /api/hubin/penempatan]: Tambah penempatan PKL baru
 * - [PUT /api/hubin/penempatan/:id]: Edit penempatan PKL
 * - [DELETE /api/hubin/penempatan/:id]: Hapus penempatan PKL
 * - [POST /api/hubin/absensi]: Jurnal & Presensi PKL siswa
 */
interface HubinService {

    @GET("api/hubin/penempatan")
    suspend fun getPklList(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null
    ): Response<PklResponse>

    @GET("api/hubin/mitra")
    suspend fun getMitraList(): Response<MitraPklResponse>

    @POST("api/hubin/penempatan")
    suspend fun createPenempatan(
        @Body request: CreatePklPenempatanRequest
    ): Response<Unit>

    @PUT("api/hubin/penempatan/{id}")
    suspend fun updatePenempatan(
        @Path("id") id: String,
        @Body request: CreatePklPenempatanRequest
    ): Response<Unit>

    @DELETE("api/hubin/penempatan/{id}")
    suspend fun deletePenempatan(
        @Path("id") id: String
    ): Response<Unit>

    @POST("api/hubin/absensi")
    suspend fun submitPklAbsensi(
        @Body request: CreatePklAbsensiRequest
    ): Response<Unit>
}
