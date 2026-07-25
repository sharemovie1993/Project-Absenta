package com.absenta.app.data.api

import com.absenta.app.data.model.AuthMeResponse
import com.absenta.app.data.model.GenericResponse
import com.absenta.app.data.model.UploadResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part

/**
 * ProfileService — Retrofit interface untuk manajemen profil pengguna.
 *
 * Endpoint real backend:
 * - [GET /api/auth/me]: Profil lengkap pengguna yang sedang login
 * - [PATCH /api/users/me]: Perbarui data profil
 * - [POST /api/users/me/photo]: Upload foto profil
 * - [POST /api/users/me/documents]: Upload berkas (KTP, KK, ijazah, dll.)
 */
interface ProfileService {

    /**
     * Mendapatkan profil lengkap pengguna yang sedang login.
     */
    @GET("api/auth/me")
    suspend fun getMyProfile(): Response<AuthMeResponse>

    /**
     * Memperbarui data profil pengguna.
     */
    @PATCH("api/users/me")
    suspend fun updateProfile(@Body body: Map<String, String>): Response<GenericResponse>

    /**
     * Upload foto profil pengguna via Multipart.
     */
    @Multipart
    @POST("api/users/me/photo")
    suspend fun uploadPhoto(
        @Part photo: MultipartBody.Part
    ): Response<UploadResponse>

    /**
     * Upload berkas dokumen pengguna.
     */
    @Multipart
    @POST("api/users/me/documents")
    suspend fun uploadDocument(
        @Part("jenis") jenis: RequestBody,
        @Part file: MultipartBody.Part
    ): Response<UploadResponse>

    @GET("api/academic/siswa")
    suspend fun getSiswaList(
        @retrofit2.http.Query("user_id") userId: String? = null,
        @retrofit2.http.Query("limit") limit: Int = 1
    ): Response<com.absenta.app.data.model.SiswaListResponse>

    @GET("api/academic/guru")
    suspend fun getGuruList(
        @retrofit2.http.Query("user_id") userId: String? = null,
        @retrofit2.http.Query("limit") limit: Int = 1
    ): Response<com.absenta.app.data.model.GuruListResponse>

    @GET("api/academic/siswa/{id}/documents")
    suspend fun getSiswaDocuments(@retrofit2.http.Path("id") siswaId: String): Response<com.absenta.app.data.model.MemberDocsResponse>

    @GET("api/academic/guru/{id}/documents")
    suspend fun getGuruDocuments(@retrofit2.http.Path("id") guruId: String): Response<com.absenta.app.data.model.MemberDocsResponse>

    @retrofit2.http.PUT("api/academic/siswa/{id}")
    suspend fun updateSiswa(@retrofit2.http.Path("id") siswaId: String, @Body body: Map<String, String>): Response<GenericResponse>

    @retrofit2.http.PUT("api/academic/guru/{id}")
    suspend fun updateGuru(@retrofit2.http.Path("id") guruId: String, @Body body: Map<String, String>): Response<GenericResponse>
}
