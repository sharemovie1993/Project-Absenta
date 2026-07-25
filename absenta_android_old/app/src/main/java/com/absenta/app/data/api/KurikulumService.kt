package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface KurikulumService {
    @GET("kurikulum/schedule/my")
    suspend fun getMySchedule(): Response<ScheduleListResponse>

    @GET("kurikulum/journals")
    suspend fun getJournals(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<JournalListResponse>

    @POST("kurikulum/journals")
    suspend fun createJournal(@Body request: JournalRequest): Response<KurikulumGenericResponse>

    @PUT("kurikulum/journals/{id}")
    suspend fun updateJournal(
        @Path("id") id: String,
        @Body request: JournalRequest
    ): Response<KurikulumGenericResponse>
}

data class ScheduleListResponse(
    val success: Boolean,
    val data: ScheduleDataHolder?
)

data class ScheduleDataHolder(
    val list: List<ScheduleEntry>
)

data class ScheduleEntry(
    val id: String,
    val hari: String,
    val jam_mulai: String,
    val jam_selesai: String,
    val nama_mapel: String,
    val nama_kelas: String,
    val ruang: String?
)

data class JournalListResponse(
    val success: Boolean,
    val data: JournalDataHolder?
)

data class JournalDataHolder(
    val list: List<JournalEntry>
)

data class JournalEntry(
    val id: String,
    val tanggal: String,
    val mapel: String,
    val kelas: String,
    val materi: String,
    val jumlah_hadir: Int,
    val jumlah_izin: Int,
    val jumlah_sakit: Int,
    val jumlah_alpa: Int,
    val catatan: String?
)

data class JournalRequest(
    val tanggal: String,
    val schedule_id: String,
    val materi: String,
    val catatan: String?,
    val hadir: List<String> = emptyList(),
    val izin: List<String> = emptyList(),
    val sakit: List<String> = emptyList(),
    val alpa: List<String> = emptyList()
)

data class KurikulumGenericResponse(
    val success: Boolean,
    val message: String
)
