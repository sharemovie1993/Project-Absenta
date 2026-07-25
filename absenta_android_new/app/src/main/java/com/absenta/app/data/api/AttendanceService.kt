package com.absenta.app.data.api

import com.absenta.app.data.model.MarkGateAbsenceRequest
import com.absenta.app.data.model.MyAttendanceResponse
import com.absenta.app.data.model.NotPresentStudentsResponse
import com.absenta.app.data.model.TapRequest
import com.absenta.app.data.model.TapResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * AttendanceService — Retrofit interface untuk endpoint presensi/absensi gerbang & Cek Manual.
 *
 * Endpoint real backend:
 * - [POST /api/attendance/gerbang/tap]: Tap presensi gerbang (siswa atau guru)
 * - [GET /api/attendance/gerbang/not-present]: Daftar siswa belum tap di gerbang (Masih Dinanti)
 * - [POST /api/attendance/gerbang/absence]: Cek Manual status presensi siswa (HADIR, SAKIT, IZIN, DISPEN, ALPA)
 * - [GET /api/attendance/rekap/siswa/me/bulanan]: Rekap absensi bulanan siswa
 */
interface AttendanceService {

    /**
     * Mencatat tap presensi gerbang (siswa atau guru).
     */
    @POST("api/attendance/gerbang/tap")
    suspend fun tap(@Body request: TapRequest): Response<TapResponse>

    /**
     * Bypass keterlambatan presensi gerbang (Force HADIR).
     */
    @POST("api/attendance/gerbang/bypass-late")
    suspend fun bypassLate(@Body request: com.absenta.app.data.model.BypassLateRequest): Response<TapResponse>

    /**
     * Mendapatkan daftar siswa yang belum tap di gerbang arah datang (Masih Dinanti).
     */
    @GET("api/attendance/gerbang/not-present")
    suspend fun getNotPresentStudents(
        @Query("kelas_id") kelasId: String? = null
    ): Response<NotPresentStudentsResponse>

    /**
     * Mencatat status presensi siswa secara Cek Manual (HADIR, SAKIT, IZIN, DISPEN, ALPA).
     */
    @POST("api/attendance/gerbang/absence")
    suspend fun markGateAbsence(@Body request: MarkGateAbsenceRequest): Response<Unit>

    /**
     * Mendapatkan statistik kehadiran gerbang (students_entered / Siap Belajar, total_students_target).
     */
    @GET("api/attendance/gerbang/stats")
    suspend fun getGerbangStats(
        @Query("kelas_id") kelasId: String? = null
    ): Response<com.absenta.app.data.model.GerbangStatsResponse>

    /**
     * Mendapatkan rekap absensi bulanan siswa yang sedang login.
     */
    @GET("api/attendance/rekap/siswa/me/bulanan")
    suspend fun getMyAttendance(
        @Query("bulan") bulan: String? = "2026-07"
    ): Response<MyAttendanceResponse>
}
