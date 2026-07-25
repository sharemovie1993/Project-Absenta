package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface SarprasService {
    @GET("dashboard/sarpras/stats")
    suspend fun getStats(): Response<SarprasStatsResponse>

    @GET("sarpras/assets")
    suspend fun getAssets(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<GenericListResponse<SarprasAsset>>

    @GET("sarpras/loans")
    suspend fun getLoans(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("status") status: String? = null
    ): Response<GenericListResponse<SarprasLoan>>

    @GET("sarpras/repairs")
    suspend fun getRepairs(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<GenericListResponse<SarprasRepair>>
}

data class SarprasStatsResponse(
    val success: Boolean,
    val data: SarprasStats
)

data class SarprasStats(
    val totalAssets: Int,
    val totalLoaned: Int,
    val totalBroken: Int
)

data class SarprasAsset(
    val id: String,
    val nama: String,
    val kode: String?,
    val brand: String?,
    val serial_number: String?,
    val kondisi: String, // BAIK, RUSAK, PERBAIKAN, HILANG
    val jumlah: Int,
    val is_loanable: Boolean,
    val Category: SarprasCategory?,
    val Location: SarprasLocation?
)

data class SarprasCategory(
    val id: String,
    val nama: String
)

data class SarprasLocation(
    val id: String,
    val nama: String
)

data class SarprasLoan(
    val id: String,
    val asset_id: String,
    val tanggal_pinjam: String,
    val tanggal_kembali_plan: String?,
    val tanggal_kembali_real: String?,
    val status: String, // PENDING, APPROVED, REJECTED, ACTIVE, RETURNED, OVERDUE
    val Asset: SarprasAsset?,
    val Peminjam: SarprasPeminjam?
)

data class SarprasPeminjam(
    val id: String,
    val full_name: String,
    val email: String
)

data class SarprasRepair(
    val id: String,
    val asset_id: String,
    val teknisi: String?,
    val biaya: Double?,
    val deskripsi: String?,
    val status: String, // PROSES, SELESAI, BATAL
    val tanggal_mulai: String,
    val tanggal_selesai: String?,
    val Asset: SarprasAsset?
)
