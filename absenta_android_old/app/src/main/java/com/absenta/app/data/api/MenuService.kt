package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header

interface MenuService {
    @GET("menu/sidebar")
    suspend fun getSidebarMenu(
        @Header("X-Skip-403-Redirect") skipRedirect: String = "true"
    ): Response<SidebarResponse>
}

data class SidebarResponse(
    val sidebar: List<SidebarNode>?
)

data class SidebarNode(
    val id: String,
    val name: String,
    val path: String?,
    val type: String?,
    val icon: String?,
    val locked: Boolean?,
    val feature_state: String?,
    val required_capability: String?,
    val order: Int?,
    val children: List<SidebarNode>?
)

