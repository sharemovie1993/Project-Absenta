package com.absenta.app.data.api

import com.absenta.app.data.model.ChildGateStatusResponse
import com.absenta.app.data.model.MyAttendanceResponse
import com.absenta.app.data.model.ParentDashboardResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * ParentService — Retrofit interface untuk akses data orang tua siswa.
 *
 * Digunakan oleh Persona Orang Tua / Wali Siswa.
 *
 * Endpoint real backend:
 * - [GET /api/parent-app/me]: Dashboard portal orang tua (active students & status)
 * - [GET /api/parent-app/siswa/:id/tracking-harian]: Status gate & tracking harian anak
 * - [GET /api/parent-app/siswa/:id/rekap-bulanan]: Rekap absensi bulanan anak
 */
interface ParentService {

    /**
     * Mendapatkan dashboard portal orang tua beserta daftar anak yang terdaftar.
     */
    @GET("api/parent-app/me")
    suspend fun getParentDashboard(): Response<ParentDashboardResponse>

    /**
     * Mendapatkan status gate (tap masuk/pulang) anak untuk hari ini.
     *
     * @param childId ID siswa (anak) yang dipilih
     * @return [ChildGateStatusResponse] berisi jam datang dan pulang
     */
    @GET("api/parent-app/siswa/{id}/tracking-harian")
    suspend fun getChildGateStatus(
        @Path("id") childId: String
    ): Response<ChildGateStatusResponse>

    /**
     * Mendapatkan rekap absensi anak yang dipilih.
     *
     * @param childId ID siswa (anak) yang dipilih
     * @param bulan Filter bulan format YYYY-MM
     * @return [MyAttendanceResponse] berisi summary dan list record harian
     */
    @GET("api/parent-app/siswa/{id}/rekap-bulanan")
    suspend fun getChildAttendance(
        @Path("id") childId: String,
        @Query("bulan") bulan: String? = null
    ): Response<MyAttendanceResponse>
}
