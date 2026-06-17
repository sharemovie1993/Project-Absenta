package com.absenta.app.ui.auth

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AuthService
import com.absenta.app.data.api.LoginRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch
import android.util.Log

sealed interface LoginUiState {
    object Idle : LoginUiState
    object Loading : LoginUiState
    data class Success(val role: String) : LoginUiState
    data class Error(val message: String) : LoginUiState
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {

    private val sessionManager = SessionManager(application.applicationContext)

    var uiState: LoginUiState by mutableStateOf(LoginUiState.Idle)
        private set

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            uiState = LoginUiState.Error("Email dan password tidak boleh kosong")
            return
        }

        viewModelScope.launch {
            uiState = LoginUiState.Loading
            try {
                val context = getApplication<Application>().applicationContext
                val authService = ApiClient.getClient(context).create(AuthService::class.java)
                val response = authService.login(LoginRequest(email, password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val loginData = response.body()?.data
                    if (loginData != null) {
                        Log.d("ABSENTA_DEBUG", "Login Success. User: ${loginData.user.full_name}, Role: ${loginData.user.role.name}, Positions: ${loginData.user.position_codes}")
                        // Simpan sesi lengkap (termasuk list jabatan/position_codes dan capabilities) ke DataStore
                        sessionManager.saveSession(
                            token = loginData.token,
                            tenantSub = loginData.tenant_sub,
                            role = loginData.user.role.name,
                            name = loginData.user.full_name,
                            email = loginData.user.email,
                            positionCodes = loginData.user.position_codes,
                            waliKelasDi = loginData.user.guru_profile?.wali_kelas_di?.nama_kelas,
                            capabilities = loginData.user.capabilities
                        )
                        
                        // Ambil status langganan tenant untuk memetakan fitur yang aktif
                        try {
                            val billingService = ApiClient.getClient(context).create(com.absenta.app.data.api.BillingService::class.java)
                            val subResponse = billingService.getSubscriptionStatus()
                            if (subResponse.isSuccessful && subResponse.body()?.success == true) {
                                val features = subResponse.body()?.data?.features
                                if (features != null) {
                                    sessionManager.saveFeatures(features)
                                    Log.d("ABSENTA_DEBUG", "Login - Saved subscription features: $features")
                                }
                            } else {
                                Log.e("ABSENTA_DEBUG", "Login - Failed to get subscription features: ${subResponse.message()}")
                            }
                        } catch (e: Exception) {
                            Log.e("ABSENTA_DEBUG", "Login - Error fetching subscription status: ${e.message}")
                        }

                        // Ambil daftar menu dari backend untuk menetapkan active hubs (modul menu) di bottom bar
                        try {
                            val menuService = ApiClient.getClient(context).create(com.absenta.app.data.api.MenuService::class.java)
                            val menuResponse = menuService.getSidebarMenu()
                            if (menuResponse.isSuccessful && menuResponse.body()?.sidebar != null) {
                                val sidebarNodes = menuResponse.body()?.sidebar ?: emptyList()
                                val activeHubs = mutableSetOf<String>()
                                
                                val akademikKeywords = listOf("AKADEMIK", "KESISWAAN", "KURIKULUM")
                                val absensiKeywords = listOf("ABSENSI", "ATTENDANCE")
                                val hubinKeywords = listOf("HUBIN", "PKL", "MITRA", "INDUSTRI")
                                val koperasiKeywords = listOf("KOPERASI", "COOPERATIVE")
                                
                                for (node in sidebarNodes) {
                                    val name = node.name.trim().uppercase()
                                    if (akademikKeywords.any { name.contains(it) }) {
                                        activeHubs.add("AKADEMIK")
                                    }
                                    if (absensiKeywords.any { name.contains(it) }) {
                                        activeHubs.add("ABSENSI")
                                    }
                                    if (hubinKeywords.any { name.contains(it) }) {
                                        activeHubs.add("HUBIN")
                                    }
                                    if (koperasiKeywords.any { name.contains(it) }) {
                                        activeHubs.add("KOPERASI")
                                    }
                                }
                                
                                val hubsList = activeHubs.toList()
                                sessionManager.saveActiveHubs(hubsList)
                                
                                // Save dynamic menu JSON using Gson
                                val gson = com.google.gson.Gson()
                                val sidebarJson = gson.toJson(sidebarNodes)
                                sessionManager.saveSidebarMenuJson(sidebarJson)
                                
                                Log.d("ABSENTA_DEBUG", "Login - Saved active menu hubs: $hubsList and sidebar JSON: $sidebarJson")
                            } else {
                                Log.e("ABSENTA_DEBUG", "Login - Failed to get sidebar menu: ${menuResponse.message()}")
                            }
                        } catch (e: Exception) {
                            Log.e("ABSENTA_DEBUG", "Login - Error fetching sidebar menu: ${e.message}")
                        }

                        // Trigger pendaftaran token FCM ke backend untuk push notifications
                        com.absenta.app.fcm.AbsentaFirebaseMessagingService.registerFcmToken(context)
                        uiState = LoginUiState.Success(loginData.user.role.name)
                    } else {
                        uiState = LoginUiState.Error("Data respon kosong")
                    }
                } else {
                    val errorMessage = response.body()?.message ?: "Email atau password salah"
                    uiState = LoginUiState.Error(errorMessage)
                }
            } catch (e: Exception) {
                uiState = LoginUiState.Error("Gagal terhubung ke server: ${e.localizedMessage}")
            }
        }
    }

    fun resetState() {
        uiState = LoginUiState.Idle
    }
}
