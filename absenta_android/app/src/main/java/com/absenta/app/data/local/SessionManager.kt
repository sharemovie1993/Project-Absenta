package com.absenta.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore by preferencesDataStore(name = "user_session")

class SessionManager(private val context: Context) {

    companion object {
        private val JWT_TOKEN_KEY = stringPreferencesKey("jwt_token")
        private val TENANT_SUB_KEY = stringPreferencesKey("tenant_sub")
        private val USER_ROLE_KEY = stringPreferencesKey("user_role")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val POSITION_CODES_KEY = stringPreferencesKey("position_codes")
        private val WALI_KELAS_DI_KEY = stringPreferencesKey("wali_kelas_di")
        private val BASE_URL_KEY = stringPreferencesKey("base_url")
        private val ENABLED_FEATURES_KEY = stringPreferencesKey("enabled_features")
        private val ACTIVE_HUBS_KEY = stringPreferencesKey("active_hubs")
        private val SIDEBAR_MENU_JSON_KEY = stringPreferencesKey("sidebar_menu_json")
        private val CAPABILITIES_KEY = stringPreferencesKey("capabilities")
    }

    val jwtTokenFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[JWT_TOKEN_KEY]
    }

    val tenantSubFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[TENANT_SUB_KEY]
    }

    val userRoleFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_ROLE_KEY]
    }

    val userNameFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_NAME_KEY]
    }

    val positionCodesFlow: Flow<List<String>> = context.dataStore.data.map { preferences ->
        val csv = preferences[POSITION_CODES_KEY] ?: ""
        if (csv.isEmpty()) emptyList() else csv.split(",")
    }

    val waliKelasDiFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[WALI_KELAS_DI_KEY]
    }

    val baseUrlFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[BASE_URL_KEY]
    }

    val enabledFeaturesFlow: Flow<List<String>> = context.dataStore.data.map { preferences ->
        val csv = preferences[ENABLED_FEATURES_KEY] ?: ""
        if (csv.isEmpty()) emptyList() else csv.split(",")
    }

    val activeHubsFlow: Flow<List<String>> = context.dataStore.data.map { preferences ->
        val csv = preferences[ACTIVE_HUBS_KEY] ?: ""
        if (csv.isEmpty()) emptyList() else csv.split(",")
    }

    val sidebarMenuJsonFlow: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[SIDEBAR_MENU_JSON_KEY]
    }

    val capabilitiesFlow: Flow<List<String>> = context.dataStore.data.map { preferences ->
        val csv = preferences[CAPABILITIES_KEY] ?: ""
        if (csv.isEmpty()) emptyList() else csv.split(",")
    }

    suspend fun saveBaseUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[BASE_URL_KEY] = url
        }
    }

    suspend fun saveFeatures(features: List<String>) {
        context.dataStore.edit { preferences ->
            preferences[ENABLED_FEATURES_KEY] = features.joinToString(",")
        }
    }

    suspend fun saveActiveHubs(hubs: List<String>) {
        context.dataStore.edit { preferences ->
            preferences[ACTIVE_HUBS_KEY] = hubs.joinToString(",")
        }
    }

    suspend fun saveSidebarMenuJson(json: String) {
        context.dataStore.edit { preferences ->
            preferences[SIDEBAR_MENU_JSON_KEY] = json
        }
    }

    suspend fun saveSession(
        token: String,
        tenantSub: String?,
        role: String,
        name: String,
        email: String,
        positionCodes: List<String>?,
        waliKelasDi: String?,
        capabilities: List<String>?
    ) {
        context.dataStore.edit { preferences ->
            preferences[JWT_TOKEN_KEY] = token
            preferences[TENANT_SUB_KEY] = tenantSub ?: ""
            preferences[USER_ROLE_KEY] = role
            preferences[USER_NAME_KEY] = name
            preferences[USER_EMAIL_KEY] = email
            preferences[POSITION_CODES_KEY] = positionCodes?.joinToString(",") ?: ""
            preferences[WALI_KELAS_DI_KEY] = waliKelasDi ?: ""
            preferences[CAPABILITIES_KEY] = capabilities?.joinToString(",") ?: ""
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            // Hapus session saja, pertahankan BASE_URL agar user tidak capek input ulang saat logout
            val savedBaseUrl = preferences[BASE_URL_KEY] ?: ""
            preferences.clear()
            if (savedBaseUrl.isNotEmpty()) {
                preferences[BASE_URL_KEY] = savedBaseUrl
            }
        }
    }
}
