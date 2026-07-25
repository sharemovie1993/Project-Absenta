package com.absenta.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.ui.navigation.NavGraph
import com.absenta.app.ui.navigation.ScreenRoutes
import com.absenta.app.ui.theme.AbsentaTheme
import com.absenta.app.ui.theme.BackgroundDark

/**
 * MainActivity — Entry point Activity tunggal aplikasi Absenta.
 *
 * Bertanggung jawab untuk:
 * 1. Menentukan start destination berdasarkan validasi token & profile pengguna
 * 2. Menginisialisasi [NavGraph] dengan [NavHostController]
 * 3. Menerapkan [AbsentaTheme] ke seluruh konten aplikasi
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val tokenManager = TokenManager(applicationContext)

        setContent {
            AbsentaTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundDark
                ) {
                    val navController = rememberNavController()
                    var startDestination by remember { mutableStateOf<String?>(null) }

                    // Menentukan start destination secara asinkron
                    LaunchedEffect(Unit) {
                        startDestination = resolveStartDestination(tokenManager)
                    }

                    // Tunggu hingga start destination ditentukan
                    if (startDestination != null) {
                        NavGraph(
                            navController = navController,
                            startDestination = startDestination!!,
                            tokenManager = tokenManager
                        )
                    }
                }
            }
        }
    }

    /**
     * Menentukan rute awal berdasarkan status login & validasi token dari backend.
     * Jika token invalid/expired, otomatis clear session dan arahkan ke LOGIN.
     */
    private suspend fun resolveStartDestination(tokenManager: TokenManager): String {
        if (!tokenManager.isLoggedIn()) return ScreenRoutes.LOGIN

        // Validasi token aktif via GET /api/auth/me
        try {
            val retrofit = ApiClient.create(tokenManager)
            val profileService = retrofit.create(ProfileService::class.java)
            val response = profileService.getMyProfile()

            if (!response.isSuccessful || response.body()?.data == null) {
                tokenManager.clearSession()
                return ScreenRoutes.LOGIN
            }

            val caps = response.body()!!.data!!.capabilities
            val role = response.body()!!.data!!.role?.name ?: ""

            return when {
                role == "PARENT" || role.contains("PARENT") -> ScreenRoutes.PARENT_DASHBOARD
                caps.contains("dashboard.view.kepsek") -> ScreenRoutes.EXECUTIVE_DASHBOARD
                else -> ScreenRoutes.DYNAMIC_MENU_DASHBOARD
            }
        } catch (e: Exception) {
            tokenManager.clearSession()
            return ScreenRoutes.LOGIN
        }
    }
}
