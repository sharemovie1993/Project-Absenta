package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface ParentService {
    @GET("parent-app/me")
    suspend fun getParentDashboard(): Response<ParentDashboardResponse>

    @POST("parent-app/notifications/fcm/register")
    suspend fun registerParentFcmToken(@Body request: ParentFcmTokenRequest): Response<GenericParentResponse>
}

data class ParentProfile(
    val id: String,
    val nama: String,
    val no_hp: String?
)

data class TodayStatus(
    val status: String,
    val label: String,
    val waktu_masuk: String?,
    val waktu_pulang: String?,
    val color_hint: String?,
    val is_terlambat: Boolean?
)

data class AttendanceSummary(
    val hadir: Int,
    val sakit: Int,
    val izin: Int,
    val alpa: Int,
    val terlambat: Int,
    val dispen: Int,
    val total_poin: Int
)

data class StudentDashboardData(
    val siswa_id: String,
    val nama_siswa: String,
    val kelas: String,
    val absensi_mode: String?,
    val timezone: String?,
    val status_kehadiran_hari_ini: TodayStatus?,
    val ringkasan_kehadiran: AttendanceSummary?
)

data class ParentDashboardResponse(
    val success: Boolean,
    val data: ParentDashboardData?
)

data class ParentDashboardData(
    val orang_tua: ParentProfile,
    val siswa: List<StudentDashboardData>
)

data class ParentFcmTokenRequest(
    val orangTuaId: String,
    val fcmToken: String,
    val platform: String = "android",
    val deviceInfo: DeviceInfoRequest? = null
)

data class DeviceInfoRequest(
    val model: String?,
    val osVersion: String?
)

data class GenericParentResponse(
    val success: Boolean,
    val message: String?
)
