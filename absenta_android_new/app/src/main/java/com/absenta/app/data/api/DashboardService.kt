package com.absenta.app.data.api

import com.absenta.app.data.model.DashboardOverviewResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * DashboardService — Retrofit interface untuk data dashboard eksekutif.
 *
 * Digunakan oleh Persona Pejabat Eksekutif (Kepsek/Wakasek/Pengawas).
 * Memerlukan capability `dashboard.view.kepsek` atau `dashboard.view.overview`.
 *
 * Endpoint:
 * - [GET /api/dashboard/overview]: KPI summary seluruh sekolah
 */
interface DashboardService {

    /**
     * Mendapatkan data overview dashboard eksekutif hari ini.
     *
     * Berisi:
     * - % Kehadiran Siswa dan Guru
     * - Stat Izin/Sakit/Alpa
     * - Status Tap Gerbang (datang/pulang)
     * - List anomali sistem (sesi belum dibuka, lonjakan alpa, dsb.)
     *
     * @param tanggal Filter tanggal (format YYYY-MM-DD), default: hari ini
     * @return [DashboardOverviewResponse] berisi seluruh KPI
     */
    @GET("api/dashboard/overview")
    suspend fun getOverview(
        @Query("tanggal") tanggal: String? = null
    ): Response<DashboardOverviewResponse>
}
