package com.absenta.app.data.api

import com.absenta.app.data.model.LoginRequest
import com.absenta.app.data.model.LoginResponse
import com.absenta.app.data.model.RefreshTokenRequest
import com.absenta.app.data.model.RefreshTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * AuthService — Retrofit interface untuk endpoint autentikasi.
 *
 * Endpoint:
 * - [POST /api/auth/login]: Login dengan identifier (NIS/NISN/username/email) & password
 * - [POST /api/auth/refresh]: Refresh access token menggunakan refresh token
 * - [POST /api/auth/logout]: Logout dan invalidasi token di backend
 * - [POST /api/parent-app/auth/login]: Login khusus orang tua siswa
 */
interface AuthService {

    /**
     * Login pengguna (Siswa, Guru, Staff, Pejabat).
     *
     * @param request Body berisi [identifier] dan [password]
     * @return [LoginResponse] berisi access_token, refresh_token, dan profil user
     */
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    /**
     * Refresh access token menggunakan refresh token yang masih valid.
     *
     * @param request Body berisi [refresh_token]
     * @return [RefreshTokenResponse] berisi access_token baru
     */
    @POST("api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    /**
     * Logout: invalidasi token di server.
     *
     * @return Response sukses/gagal
     */
    @POST("api/auth/logout")
    suspend fun logout(): Response<Unit>

    /**
     * Login khusus orang tua siswa (via modul parent-app).
     *
     * @param request Body berisi [identifier] dan [password]
     * @return [LoginResponse] berisi token dan profil orang tua
     */
    @POST("api/parent-app/auth/login")
    suspend fun loginParent(@Body request: LoginRequest): Response<LoginResponse>
}
