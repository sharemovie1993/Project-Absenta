package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface ProfileService {
    @GET("auth/me")
    suspend fun getProfile(): Response<ProfileResponse>

    @PUT("auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ProfileUpdateResponse>

    @PUT("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ProfileUpdateResponse>

    @POST("auth/upload-avatar")
    @Multipart
    suspend fun uploadAvatar(
        @retrofit2.http.Part avatar: okhttp3.MultipartBody.Part
    ): Response<AvatarUploadResponse>

    @GET("notifications/my")
    suspend fun getNotifications(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("unread_only") unreadOnly: Boolean? = null
    ): Response<NotificationListResponse>

    @PUT("notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: String): Response<ProfileUpdateResponse>

    @PUT("notifications/read-all")
    suspend fun markAllAsRead(): Response<ProfileUpdateResponse>
}

data class ProfileResponse(
    val success: Boolean,
    val data: UserProfile?
)

data class UserProfile(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val capabilities: List<String>? = null,
    val avatar_url: String?,
    val phone: String?,
    val nip: String?,
    val jabatan: String?,
    val school_name: String?,
    val school_logo: String?,
    val is_active: Boolean,
    val last_login: String?,
    val created_at: String
)

data class UpdateProfileRequest(
    val name: String,
    val phone: String?,
    val jabatan: String?
)

data class ChangePasswordRequest(
    val current_password: String,
    val new_password: String,
    val confirm_password: String
)

data class ProfileUpdateResponse(
    val success: Boolean,
    val message: String
)

data class AvatarUploadResponse(
    val success: Boolean,
    val data: AvatarResult?
)

data class AvatarResult(
    val avatar_url: String
)

data class NotificationListResponse(
    val success: Boolean,
    val data: NotificationDataHolder?
)

data class NotificationDataHolder(
    val list: List<AppNotification>,
    val unread_count: Int
)

data class AppNotification(
    val id: String,
    val title: String,
    val body: String,
    val type: String,
    val is_read: Boolean,
    val created_at: String,
    val data: Map<String, String>?
)
