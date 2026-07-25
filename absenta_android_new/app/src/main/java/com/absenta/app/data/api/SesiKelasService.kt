package com.absenta.app.data.api

import com.absenta.app.data.model.AbsenSiswaRequest
import com.absenta.app.data.model.AbsenSiswaSesiResponse
import com.absenta.app.data.model.CreateSesiManualRequest
import com.absenta.app.data.model.CreateSesiRequest
import com.absenta.app.data.model.ProgresMateriRequest
import com.absenta.app.data.model.SesiAbsensiResponse
import com.absenta.app.data.model.SesiKelasListResponse
import com.absenta.app.data.model.SesiKelasResponse
import com.absenta.app.data.model.SesiTapRequest
import com.absenta.app.data.model.SesiTapResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * SesiKelasService — Retrofit interface untuk manajemen sesi kelas (Persona Petugas Kelas / Guru).
 *
 * Endpoint real backend:
 * - [GET /api/attendance/sesi-absensi]: List sesi kelas aktif (dapat difilter tanggal / kelas_id)
 * - [POST /api/attendance/sesi-absensi]: Membuat sesi kelas baru secara manual
 * - [POST /api/attendance/sesi-absensi/generate-from-template]: Tarik dari Jadwal Mengajar KBM
 * - [PATCH /api/attendance/sesi-absensi/{id}/status]: Menutup sesi kelas
 * - [GET /api/attendance/sesi-absensi/{id}/absen-siswa]: Daftar siswa & status absensi sesi
 * - [POST /api/attendance/sesi-absensi/{id}/tap-siswa]: Tap/absen siswa per sesi
 * - [POST /api/attendance/sesi-absensi/{id}/progres-materi]: Input Jurnal KBM
 */
interface SesiKelasService {

    /**
     * Mendapatkan daftar sesi kelas aktif (dapat difilter per kelas_id dan tanggal).
     */
    @GET("api/attendance/sesi-absensi/petugas/check")
    suspend fun checkPetugasActive(): Response<com.absenta.app.data.model.PetugasCheckResponse>

    @GET("api/attendance/sesi-absensi")
    suspend fun listSesi(
        @Query("kelas_id") kelasId: String? = null,
        @Query("tanggal") tanggal: String? = null,
        @Query("status") status: String? = null,
        @Query("guru_id") guruId: String? = null,
        @Query("only_me") onlyMe: Boolean? = null,
        @Query("summary") summary: Boolean? = true
    ): Response<SesiKelasListResponse>

    /**
     * Membuat sesi kelas baru secara manual.
     */
    @POST("api/attendance/sesi-absensi")
    suspend fun createSesiManual(@Body request: CreateSesiManualRequest): Response<SesiKelasResponse>

    /**
     * Membuat sesi kelas baru (shortcut sederhana).
     */
    @POST("api/attendance/sesi-absensi")
    suspend fun createSesi(@Body request: CreateSesiRequest): Response<SesiKelasResponse>

    /**
     * Tarik dari Jadwal Mengajar KBM Hari Ini (Generate From Template).
     */
    @POST("api/attendance/sesi-absensi/generate-from-template")
    suspend fun generateFromTemplate(): Response<Unit>

    /**
     * Menutup / membuka kembali status sesi kelas.
     */
    @PATCH("api/attendance/sesi-absensi/{id}/status")
    suspend fun closeSesi(
        @Path("id") id: String,
        @Body statusBody: Map<String, String> = mapOf("status" to "CLOSED")
    ): Response<Unit>

    @PATCH("api/attendance/sesi-absensi/{id}/status")
    suspend fun updateSesiStatus(
        @Path("id") id: String,
        @Body request: Map<String, String>
    ): Response<Unit>

    /**
     * Menghapus sesi kelas.
     */
    @DELETE("api/attendance/sesi-absensi/{id}")
    suspend fun deleteSesi(@Path("id") id: String): Response<Unit>

    /**
     * Mendapatkan daftar siswa dan status absensi dalam satu sesi kelas.
     */
    @GET("api/attendance/sesi-absensi/{id}/absen-siswa")
    suspend fun getSesiAbsensi(@Path("id") id: String): Response<SesiAbsensiResponse>

    /**
     * Presensi SmartStudentPicker (Tap RFID / NISN / NIP / ID) pada Sesi Kelas.
     */
    @POST("api/attendance/sesi-absensi/{id}/tap-siswa")
    suspend fun tapSiswaSesi(
        @Path("id") id: String,
        @Body request: SesiTapRequest
    ): Response<SesiTapResponse>

    /**
     * Mencatat absensi siswa manual pada sesi kelas.
     */
    @POST("api/attendance/sesi-absensi/{id}/tap-siswa")
    suspend fun submitAbsenSiswa(
        @Path("id") id: String,
        @Body request: AbsenSiswaRequest
    ): Response<Unit>

    /**
     * Menyimpan Jurnal KBM / Progres Materi sesi kelas.
     */
    @POST("api/attendance/sesi-absensi/{id}/progres-materi")
    suspend fun saveProgresMateri(
        @Path("id") id: String,
        @Body request: ProgresMateriRequest
    ): Response<Unit>
}
