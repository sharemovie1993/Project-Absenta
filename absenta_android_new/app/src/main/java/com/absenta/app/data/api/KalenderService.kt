package com.absenta.app.data.api

import com.absenta.app.data.model.BulkSeedKalenderRequest
import com.absenta.app.data.model.CreateKalenderRequest
import com.absenta.app.data.model.CreateKalenderResponse
import com.absenta.app.data.model.KalenderResponse
import com.absenta.app.data.model.KalenderStatsResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * KalenderService — Retrofit interface untuk Kalender Akademik & Agenda Hari Libur Sekolah.
 *
 * Endpoint real backend:
 * - [GET /api/kurikulum/kalender]: List event kalender akademik (dapat difilter per tahun_pelajaran_id)
 * - [GET /api/kurikulum/kalender/stats]: Rekap statistik (hari libur, ujian, minggu efektif S1/S2)
 * - [POST /api/kurikulum/kalender]: Tambah event kalender baru
 * - [PUT /api/kurikulum/kalender/:id]: Edit event kalender
 * - [DELETE /api/kurikulum/kalender/:id]: Hapus event kalender
 * - [POST /api/kurikulum/kalender/bulk-seed]: Generate otomatis libur nasional & sekolah
 */
interface KalenderService {

    @GET("api/kurikulum/kalender")
    suspend fun getKalenderList(
        @Query("tahun_pelajaran_id") tahunPelajaranId: String? = null
    ): Response<KalenderResponse>

    @GET("api/kurikulum/kalender/stats")
    suspend fun getKalenderStats(
        @Query("tahun_pelajaran_id") tahunPelajaranId: String? = null
    ): Response<KalenderStatsResponse>

    @POST("api/kurikulum/kalender")
    suspend fun createKalender(
        @Body request: CreateKalenderRequest
    ): Response<CreateKalenderResponse>

    @PUT("api/kurikulum/kalender/{id}")
    suspend fun updateKalender(
        @Path("id") id: String,
        @Body request: CreateKalenderRequest
    ): Response<CreateKalenderResponse>

    @DELETE("api/kurikulum/kalender/{id}")
    suspend fun deleteKalender(
        @Path("id") id: String
    ): Response<Unit>

    @POST("api/kurikulum/kalender/bulk-seed")
    suspend fun bulkSeedHolidays(
        @Body request: BulkSeedKalenderRequest
    ): Response<Unit>
}
