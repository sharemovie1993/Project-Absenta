package com.absenta.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

// Extension property untuk membuat DataStore singleton pada Context
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "absenta_session")

/**
 * TokenManager — mengelola session token, tenant ID, dan capabilities pengguna.
 *
 * Data disimpan menggunakan Jetpack DataStore Preferences.
 * Semua operasi menggunakan Kotlin Coroutines.
 *
 * Data yang disimpan:
 * - [KEY_ACCESS_TOKEN]: JWT access token untuk request API
 * - [KEY_REFRESH_TOKEN]: Refresh token untuk perpanjang sesi
 * - [KEY_USER_ID]: ID pengguna
 * - [KEY_TENANT_ID]: ID Tenant sekolah
 * - [KEY_USER_NAME]: Nama tampilan pengguna
 * - [KEY_USER_ROLE]: Kode role (SISWA, GURU, dsb.)
 * - [KEY_CAPABILITIES]: JSON array capabilities dari backend
 * - [KEY_BASE_URL]: Base URL backend (configurable per sekolah)
 * - [KEY_PHOTO_URL]: URL foto profil
 * - [KEY_IS_PARENT]: Flag khusus apakah pengguna adalah orang tua
 *
 * @param context Application context
 */
class TokenManager(private val context: Context) {

    private val gson = Gson()

    // ── Keys ─────────────────────────────────────────────────────────────────

    companion object {
        private val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_TENANT_ID = stringPreferencesKey("tenant_id")
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_ROLE = stringPreferencesKey("user_role")
        private val KEY_CAPABILITIES = stringPreferencesKey("capabilities")
        private val KEY_BASE_URL = stringPreferencesKey("base_url")
        private val KEY_PHOTO_URL = stringPreferencesKey("photo_url")
        private val KEY_IS_PARENT = stringPreferencesKey("is_parent")
        private val KEY_FCM_TOKEN = stringPreferencesKey("fcm_token")
        private val KEY_TENANT_TIMEZONE = stringPreferencesKey("tenant_timezone")

        private val KEY_SAVED_CREDENTIALS = stringPreferencesKey("saved_credentials_json")
        /** Base URL default — diubah saat sekolah mendeploy backend di server mereka sendiri */
        const val DEFAULT_BASE_URL = "http://10.10.10.250:3004/"
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    /**
     * Menyimpan timezone tenant (sekolah). Default "Asia/Jakarta".
     */
    suspend fun saveTenantTimezone(timezone: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_TENANT_TIMEZONE] = timezone
        }
    }

    /** Mendapatkan timezone tenant sekolah (default: Asia/Jakarta) */
    suspend fun getTenantTimezone(): String =
        context.dataStore.data.map { it[KEY_TENANT_TIMEZONE] ?: "Asia/Jakarta" }.first()

    /**
     * Menyimpan seluruh data session setelah login berhasil.
     */
    suspend fun saveSession(
        accessToken: String,
        refreshToken: String,
        userId: String,
        userName: String,
        userRole: String,
        capabilities: List<String>,
        tenantId: String? = null,
        photoUrl: String? = null,
        isParent: Boolean = false
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = accessToken
            prefs[KEY_REFRESH_TOKEN] = refreshToken
            prefs[KEY_USER_ID] = userId
            if (!tenantId.isNullOrEmpty()) {
                prefs[KEY_TENANT_ID] = tenantId
            }
            prefs[KEY_USER_NAME] = userName
            prefs[KEY_USER_ROLE] = userRole
            prefs[KEY_CAPABILITIES] = gson.toJson(capabilities)
            prefs[KEY_PHOTO_URL] = photoUrl ?: ""
            prefs[KEY_IS_PARENT] = if (isParent) "true" else "false"
        }
    }

    /**
     * Memperbarui access token setelah token refresh berhasil.
     */
    suspend fun updateTokens(newAccessToken: String, newRefreshToken: String? = null) {
        context.dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = newAccessToken
            if (newRefreshToken != null) {
                prefs[KEY_REFRESH_TOKEN] = newRefreshToken
            }
        }
    }

    /**
     * Menyimpan base URL server backend.
     */
    suspend fun saveBaseUrl(url: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_BASE_URL] = if (url.endsWith("/")) url else "$url/"
        }
    }

    /**
     * Menyimpan FCM token perangkat.
     */
    suspend fun saveFcmToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_FCM_TOKEN] = token
        }
    }

    // ── Read (Suspend) ────────────────────────────────────────────────────────

    /** Mendapatkan access token saat ini (suspend, one-shot) */
    suspend fun getAccessToken(): String? =
        context.dataStore.data.map { it[KEY_ACCESS_TOKEN] }.first()

    /** Mendapatkan refresh token saat ini (suspend, one-shot) */
    suspend fun getRefreshToken(): String? =
        context.dataStore.data.map { it[KEY_REFRESH_TOKEN] }.first()

    /** Mendapatkan tenant ID saat ini (suspend, one-shot) */
    suspend fun getTenantId(): String? =
        context.dataStore.data.map { it[KEY_TENANT_ID] }.first()

    /** Mendapatkan base URL backend (suspend, one-shot) */
    suspend fun getBaseUrl(): String =
        context.dataStore.data.map { it[KEY_BASE_URL] ?: DEFAULT_BASE_URL }.first()

    /** Mendapatkan FCM token (suspend, one-shot) */
    suspend fun getFcmToken(): String? =
        context.dataStore.data.map { it[KEY_FCM_TOKEN] }.first()

    /**
     * Mendapatkan daftar capabilities pengguna yang sedang login.
     */
    suspend fun getCapabilities(): List<String> {
        val json = context.dataStore.data.map { it[KEY_CAPABILITIES] }.first()
        return if (json.isNullOrEmpty()) emptyList()
        else gson.fromJson(json, object : TypeToken<List<String>>() {}.type)
    }

    // ── Read (Flow) ───────────────────────────────────────────────────────────

    val accessTokenFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_ACCESS_TOKEN] }

    val userIdFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_USER_ID] }

    val tenantIdFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_TENANT_ID] }

    val userNameFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_USER_NAME] }

    val userRoleFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_USER_ROLE] }

    val photoUrlFlow: Flow<String?> =
        context.dataStore.data.map { it[KEY_PHOTO_URL] }

    val isParentFlow: Flow<Boolean> =
        context.dataStore.data.map { it[KEY_IS_PARENT] == "true" }

    // ── Validation ────────────────────────────────────────────────────────────

    suspend fun isLoggedIn(): Boolean =
        !getAccessToken().isNullOrEmpty()

    suspend fun hasCapability(capability: String): Boolean =
        getCapabilities().contains(capability)

    suspend fun hasAnyCapability(vararg capabilities: String): Boolean {
        val userCaps = getCapabilities()
        return capabilities.any { it in userCaps }
    }

    // ── Clear ─────────────────────────────────────────────────────────────────

    suspend fun saveLoginCredential(identifier: String, pass: String, label: String = "", role: String = "") {
        val current = getSavedCredentials().toMutableList()
        current.removeAll { it.identifier.equals(identifier, ignoreCase = true) }
        current.add(0, SavedCredential(identifier, pass, label, role))
        val trimmed = current.take(6)
        context.dataStore.edit { prefs ->
            prefs[KEY_SAVED_CREDENTIALS] = gson.toJson(trimmed)
        }
    }

    suspend fun getSavedCredentials(): List<SavedCredential> {
        val json = context.dataStore.data.map { it[KEY_SAVED_CREDENTIALS] }.first()
        return if (json.isNullOrEmpty()) emptyList()
        else gson.fromJson(json, object : TypeToken<List<SavedCredential>>() {}.type)
    }

    suspend fun clearSession() {
        val savedBaseUrl = getBaseUrl()
        val savedHistory = context.dataStore.data.map { it[KEY_SAVED_CREDENTIALS] }.first()
        context.dataStore.edit { prefs ->
            prefs.clear()
            prefs[KEY_BASE_URL] = savedBaseUrl
            if (!savedHistory.isNullOrEmpty()) {
                prefs[KEY_SAVED_CREDENTIALS] = savedHistory
            }
        }
    }
}

data class SavedCredential(
    val identifier: String,
    val pass: String,
    val label: String = "",
    val role: String = ""
)
