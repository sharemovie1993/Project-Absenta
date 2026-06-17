package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/request-password-reset")
    suspend fun requestPasswordReset(@Body request: Map<String, String>): Response<GenericApiResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: Map<String, String>): Response<LoginResponse>
}

data class GenericApiResponse(
    val success: Boolean,
    val message: String?
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val message: String?,
    val data: LoginData?
)

data class LoginData(
    val token: String,
    val user: UserInfo,
    val tenant_sub: String?
)

data class UserInfo(
    val id: String,
    val full_name: String,
    val email: String,
    val role: RoleInfo,
    val position_codes: List<String>?,
    val capabilities: List<String>? = null,
    val guru_profile: GuruProfile?
)

data class RoleInfo(
    val id: String,
    val name: String
)

data class GuruProfile(
    val id: String,
    val wali_kelas_di: ClassInfo?
)

data class ClassInfo(
    val id: String,
    val nama_kelas: String
)
