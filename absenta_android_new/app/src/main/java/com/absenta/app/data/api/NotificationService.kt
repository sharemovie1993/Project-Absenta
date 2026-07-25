package com.absenta.app.data.api

import com.absenta.app.data.model.NotificationResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * NotificationService — Retrofit interface untuk Notifikasi & Pengumuman Sekolah.
 *
 * Endpoint real backend:
 * - [GET /api/notifications/my]: Notifikasi & pengumuman milik akun terotentikasi
 * - [GET /api/notifications/stats]: Statistik notifikasi
 * - [GET /api/notifications/logs]: Log pengiriman notifikasi sistem (email, WhatsApp, dsb.)
 */
interface NotificationService {

    @GET("api/notifications/my")
    suspend fun getMyNotifications(): Response<NotificationResponse>

    @GET("api/notifications/stats")
    suspend fun getNotificationStats(): Response<NotificationResponse>

    @GET("api/notifications/logs")
    suspend fun getNotificationLogs(
        @Query("page") page: Int? = 1,
        @Query("limit") limit: Int? = 50,
        @Query("type") type: String? = null,
        @Query("status") status: String? = null
    ): Response<NotificationResponse>
}
