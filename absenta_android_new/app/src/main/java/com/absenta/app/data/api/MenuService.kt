package com.absenta.app.data.api

import com.absenta.app.data.model.MenuResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * MenuService — Retrofit interface untuk endpoint menu navigasi dinamis.
 *
 * Backend [SidebarRenderingService] menyaring 35+ modul berdasarkan
 * capabilities pengguna yang sedang login dan tenant features yang aktif.
 *
 * Endpoint:
 * - [GET /api/menu]: Mendapatkan daftar menu yang diizinkan untuk user saat ini
 */
interface MenuService {

    /**
     * Mendapatkan daftar menu navigasi yang difilter berdasarkan capabilities user.
     * Bearer token di-inject otomatis oleh [AuthInterceptor].
     *
     * @param platform Platform yang meminta menu ("android" | "web"), default "android"
     * @return [MenuResponse] berisi list [MenuGroup] dengan item-item menu
     */
    @GET("api/menu")
    suspend fun getMenu(
        @Query("platform") platform: String = "android"
    ): Response<MenuResponse>
}
