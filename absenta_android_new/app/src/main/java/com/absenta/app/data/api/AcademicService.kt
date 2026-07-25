package com.absenta.app.data.api

import com.absenta.app.data.model.MyScheduleResponse
import com.absenta.app.data.model.SesiKelasResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * AcademicService — Retrofit interface untuk akademik, jadwal pelajaran, & monitoring KBM.
 *
 * Endpoint real backend:
 * - [GET /api/kurikulum/jadwal-kbm/my]: Jadwal pelajaran mingguan KBM pengguna yang login
 * - [GET /api/attendance/sesi-absensi/today]: Live sesi KBM hari ini seluruh kelas
 * - [GET /api/kurikulum/rekap-kbm]: Rekap monitoring KBM real-time
 */
interface AcademicService {

    @GET("api/kurikulum/jadwal-kbm/my")
    suspend fun getMySchedule(): Response<MyScheduleResponse>

    @GET("api/attendance/sesi-absensi/today")
    suspend fun getTodaySesiAbsensi(): Response<SesiKelasResponse>

    @GET("api/kurikulum/rekap-kbm")
    suspend fun getRekapKbm(
        @Query("tanggal") tanggal: String? = null,
        @Query("kelas_id") kelasId: String? = null
    ): Response<SesiKelasResponse>
}
