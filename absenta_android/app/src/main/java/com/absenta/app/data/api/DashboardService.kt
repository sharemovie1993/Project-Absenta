package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

/**
 * DashboardService.kt
 *
 * Pemetaan eksplisit dari absenta_frontend/src/api/dashboard.api.ts:
 * - getDailyClassStats()       → GET /dashboard/statistik/kelas/{tanggal}
 * - getDailyTeacherStats()     → GET /dashboard/statistik/guru/{tanggal}
 * - getKepsekEscalations()     → GET /dashboard/kepsek/escalations
 * - getHubinStats()            → GET /dashboard/hubin/stats
 * - getGerbangDashboardStats() → GET /dashboard/gerbang/stats
 * - getSarprasStats()          → GET /dashboard/sarpras/stats  (sudah di SarprasService, di sini juga)
 * - getKbmGlobalMonitoring()   → GET /dashboard/kurikulum/monitoring-global (dari kurikulum.api.ts)
 */
interface DashboardService {

    // ── Kurikulum: GET /dashboard/kurikulum/monitoring-global ──────────────────
    // Sumber frontend: kurikulumApi.getKbmGlobalMonitoring(tanggal) → /dashboard/kurikulum/monitoring-global
    // Field response: healthScore, activeClasses, totalClasses, teacherPresent, totalTeachers, supervisionCount
    @GET("dashboard/kurikulum/monitoring-global")
    suspend fun getKbmGlobalMonitoring(
        @Query("tanggal") tanggal: String? = null
    ): Response<KbmGlobalMonitoringResponse>

    // ── Kurikulum fallback: GET /dashboard/statistik/kelas/{tanggal} ───────────
    // Sumber frontend: getDailyClassStats() → /dashboard/statistik/kelas/{tanggal}
    @GET("dashboard/statistik/kelas/{tanggal}")
    suspend fun getDailyClassStats(
        @Path("tanggal") tanggal: String
    ): Response<StatistikKelasResponse>

    // ── Kurikulum fallback: GET /dashboard/statistik/guru/{tanggal} ─────────────
    // Sumber frontend: getDailyTeacherStats() → /dashboard/statistik/guru/{tanggal}
    @GET("dashboard/statistik/guru/{tanggal}")
    suspend fun getDailyTeacherStats(
        @Path("tanggal") tanggal: String
    ): Response<StatistikGuruResponse>

    // ── Kepsek: GET /dashboard/kepsek/escalations ────────────────────────────
    // Sumber frontend: getKepsekEscalations(limit) → /dashboard/kepsek/escalations
    @GET("dashboard/kepsek/escalations")
    suspend fun getKepsekEscalations(
        @Query("limit") limit: Int = 10
    ): Response<KepsekEscalationsApiResponse>

    // ── Hubin: GET /dashboard/hubin/stats ────────────────────────────────────
    // Sumber frontend: hubinApi.getStats() → /dashboard/hubin/stats
    // Field: pklAktif (atau totalSiswaPkl), totalMitra, pendingReports
    @GET("dashboard/hubin/stats")
    suspend fun getHubinStats(): Response<HubinStatsResponse>

    // ── Gerbang: GET /dashboard/gerbang/stats ────────────────────────────────
    // Sumber frontend: getGerbangDashboardStats() → /dashboard/gerbang/stats
    @GET("dashboard/gerbang/stats")
    suspend fun getGerbangStats(): Response<GerbangStatsResponse>

    // ── Sarpras: GET /dashboard/sarpras/stats ────────────────────────────────
    // Sumber frontend: getSarprasStats() → /dashboard/sarpras/stats
    // Sudah ada di SarprasService, tapi bisa juga dipanggil dari sini
    @GET("dashboard/sarpras/stats")
    suspend fun getSarprasStats(): Response<SarprasStatsDashboardResponse>

    // ── Kaprog: GET /dashboard/kaprog/stats ──────────────────────────────────
    @GET("dashboard/kaprog/stats")
    suspend fun getKaprogStats(): Response<KaprogStatsResponse>

    // ── Toolman: GET /dashboard/toolman/stats ────────────────────────────────
    @GET("dashboard/toolman/stats")
    suspend fun getToolmanStats(): Response<ToolmanStatsResponse>

    // ── Kabeng: GET /dashboard/kabeng/stats ──────────────────────────────────
    @GET("dashboard/kabeng/stats")
    suspend fun getKabengStats(): Response<KabengStatsResponse>

    // ── BKK: GET /dashboard/bkk/stats ────────────────────────────────────────
    @GET("dashboard/bkk/stats")
    suspend fun getBkkStats(): Response<BkkStatsResponse>
}

// ── Response Models ──────────────────────────────────────────────────────────

/**
 * GET /dashboard/kurikulum/monitoring-global
 * Sesuai frontend kurikulumApi.getKbmGlobalMonitoring():
 * data.healthScore, data.activeClasses, data.totalClasses,
 * data.teacherPresent, data.totalTeachers, data.supervisionCount
 */
data class KbmGlobalMonitoringResponse(
    val success: Boolean,
    val data: KbmGlobalMonitoringData?
)

data class KbmGlobalMonitoringData(
    val healthScore: Int = 0,
    val activeClasses: Int = 0,
    val totalClasses: Int = 0,
    val teacherPresent: Int = 0,
    val totalTeachers: Int = 0,
    val supervisionCount: Int = 0
)

/**
 * GET /dashboard/statistik/kelas/{tanggal}
 * Sesuai frontend getDailyClassStats(): data.kelasAktif, data.totalKelas
 */
data class StatistikKelasResponse(
    val success: Boolean,
    val data: StatistikKelasData?
)

data class StatistikKelasData(
    val kelasAktif: Int = 0,
    val totalKelas: Int = 0
)

/**
 * GET /dashboard/statistik/guru/{tanggal}
 * Sesuai frontend getDailyTeacherStats(): data.guruHadir, data.totalGuru
 */
data class StatistikGuruResponse(
    val success: Boolean,
    val data: StatistikGuruData?
)

data class StatistikGuruData(
    val guruHadir: Int = 0,
    val totalGuru: Int = 0
)

/**
 * GET /dashboard/kepsek/escalations
 * Sesuai frontend getKepsekEscalations(): data[] dengan { id, judul, deskripsi }
 */
data class KepsekEscalationsApiResponse(
    val success: Boolean,
    val data: List<EscalationApiItem>?
)

data class EscalationApiItem(
    val id: String,
    val judul: String,
    val deskripsi: String
)

/**
 * GET /dashboard/hubin/stats
 * Sesuai frontend hubinApi.getStats():
 * data.pklAktif (atau totalSiswaPkl), data.totalMitra, data.pendingReports
 */
data class HubinStatsResponse(
    val success: Boolean,
    val data: HubinStatsData?
)

data class HubinStatsData(
    // Frontend menggunakan: hubinStatsRes?.data?.pklAktif || hubinStatsRes?.data?.totalSiswaPkl
    val pklAktif: Int = 0,
    val totalSiswaPkl: Int = 0,
    val totalMitra: Int = 0,
    val pendingReports: Int = 0
)

/**
 * GET /dashboard/gerbang/stats
 * Sesuai frontend getGerbangDashboardStats()
 */
data class GerbangStatsResponse(
    val success: Boolean,
    val data: GerbangStatsData?
)

data class GerbangStatsData(
    val totalScansToday: Int = 0,
    val lateStudents: Int = 0,
    // "AKTIF" | "NONAKTIF" | "GANGGUAN"
    val gateStatus: String = "AKTIF"
)

/**
 * GET /dashboard/sarpras/stats
 * Sesuai frontend getSarprasStats()
 */
data class SarprasStatsDashboardResponse(
    val success: Boolean,
    val data: SarprasStatsDashboardData?
)

data class SarprasStatsDashboardData(
    // Memetakan ke: activeBorrows, availableAssets, pendingMaintenance
    val totalLoaned: Int = 0,      // → activeBorrows
    val totalAssets: Int = 0,      // → availableAssets
    val totalBroken: Int = 0       // → pendingMaintenance
)

/**
 * GET /dashboard/kaprog/stats
 */
data class KaprogStatsResponse(
    val success: Boolean,
    val data: KaprogStatsData?
)

data class KaprogStatsData(
    val totalTeachers: Int = 0,
    val activeClasses: Int = 0,
    val supervisionCount: Int = 0,
    val programName: String = ""
)

/**
 * GET /dashboard/toolman/stats
 */
data class ToolmanStatsResponse(
    val success: Boolean,
    val data: ToolmanStatsData?
)

data class ToolmanStatsData(
    val toolsBorrowed: Int = 0,
    val toolsAvailable: Int = 0,
    val damagedReports: Int = 0
)

/**
 * GET /dashboard/kabeng/stats
 */
data class KabengStatsResponse(
    val success: Boolean,
    val data: KabengStatsData?
)

data class KabengStatsData(
    val activeBengkel: Int = 0,
    val availableTools: Int = 0,
    val practiceSchedules: Int = 0,
    val programName: String = ""
)

/**
 * GET /dashboard/bkk/stats
 */
data class BkkStatsResponse(
    val success: Boolean,
    val data: BkkStatsData?
)

data class BkkStatsData(
    val alumniPlaced: Int = 0,
    val activeJobs: Int = 0,
    val pendingApplications: Int = 0
)
