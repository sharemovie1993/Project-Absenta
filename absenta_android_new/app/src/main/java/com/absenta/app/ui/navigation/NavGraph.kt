package com.absenta.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.absenta.app.data.local.TokenManager
import com.absenta.app.ui.auth.LoginScreen
import com.absenta.app.ui.dashboard.DynamicMenuDashboard
import com.absenta.app.ui.dashboard.ExecutiveDashboardScreen
import com.absenta.app.ui.dashboard.ParentDashboardScreen
import com.absenta.app.ui.features.academic.MyScheduleScreen
import com.absenta.app.ui.features.attendance.CameraScannerScreen
import com.absenta.app.ui.features.attendance.MyAttendanceScreen
import com.absenta.app.ui.features.attendance.SesiKelasManagerScreen
import com.absenta.app.ui.features.kesiswaan.MyPoinScreen
import com.absenta.app.ui.features.profile.EditProfileScreen
import com.absenta.app.ui.features.profile.MyProfileScreen
import com.absenta.app.ui.features.profile.UploadBerkasScreen

/**
 * NavGraph — mendefinisikan seluruh graph navigasi aplikasi Absenta.
 *
 * Berfungsi sebagai **Dynamic Screen Registry**: setiap [ScreenRoutes] dikaitkan
 * ke Composable screen-nya masing-masing. Navigasi antar layar dilakukan via
 * [NavHostController].
 *
 * Start Destination:
 * - Jika belum login → [ScreenRoutes.LOGIN]
 * - Jika sudah login → ditentukan oleh [startDestination] dari [MainActivity]
 *   berdasarkan capabilities yang tersimpan di [TokenManager]
 *
 * @param navController Controller navigasi dari [MainActivity]
 * @param startDestination Rute awal berdasarkan status login dan capabilities
 * @param tokenManager Manager session untuk diteruskan ke setiap screen
 * @param modifier Modifier opsional
 */
@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String,
    tokenManager: TokenManager,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {

        // ── Auth ──────────────────────────────────────────────────────────────
        composable(ScreenRoutes.LOGIN) {
            LoginScreen(
                tokenManager = tokenManager,
                onLoginSuccess = { destination ->
                    navController.navigate(destination) {
                        popUpTo(ScreenRoutes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        // ── Dashboard ─────────────────────────────────────────────────────────

        /** Dynamic Menu Dashboard — menampilkan kartu menu dari API /api/menu */
        composable(ScreenRoutes.DYNAMIC_MENU_DASHBOARD) {
            DynamicMenuDashboard(
                tokenManager = tokenManager,
                onNavigate = { route -> navController.navigate(route) },
                onLogout = {
                    navController.navigate(ScreenRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        /** Dashboard eksekutif KPI (Kepsek/Wakasek/Pengawas) */
        composable(ScreenRoutes.EXECUTIVE_DASHBOARD) {
            ExecutiveDashboardScreen(
                tokenManager = tokenManager,
                onLogout = {
                    navController.navigate(ScreenRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        /** Dashboard orang tua (Live Gate Status + Rekap Anak) */
        composable(ScreenRoutes.PARENT_DASHBOARD) {
            ParentDashboardScreen(
                tokenManager = tokenManager,
                onLogout = {
                    navController.navigate(ScreenRoutes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // ── Profile ───────────────────────────────────────────────────────────

        composable(ScreenRoutes.MY_PROFILE) {
            MyProfileScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToEdit = { navController.navigate(ScreenRoutes.EDIT_PROFILE) },
                onNavigateToUpload = { navController.navigate(ScreenRoutes.UPLOAD_BERKAS) }
            )
        }

        composable(ScreenRoutes.EDIT_PROFILE) {
            EditProfileScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.UPLOAD_BERKAS) {
            UploadBerkasScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── Attendance ────────────────────────────────────────────────────────

        /** Rekap absensi saya (Persona Siswa) */
        composable(ScreenRoutes.MY_ATTENDANCE) {
            MyAttendanceScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        /** Manajemen sesi kelas (list sesi) */
        composable(ScreenRoutes.SESI_KELAS_MANAGER) {
            SesiKelasManagerScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToRiwayatAjar = { navController.navigate(ScreenRoutes.RIWAYAT_AJAR) }
            )
        }

        /** Scanner kamera QR gerbang */
        composable(ScreenRoutes.CAMERA_SCANNER) {
            CameraScannerScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── Academic ──────────────────────────────────────────────────────────

        composable(ScreenRoutes.MY_SCHEDULE) {
            MyScheduleScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.RIWAYAT_AJAR) {
            com.absenta.app.ui.features.academic.RiwayatAjarScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.MONITORING_KBM) {
            com.absenta.app.ui.features.academic.MonitoringKbmScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.SUPERVISI_KBM) {
            com.absenta.app.ui.features.academic.SupervisiKbmScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.KALENDER_AKADEMIK) {
            com.absenta.app.ui.features.academic.KalenderAkademikScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── Kesiswaan ─────────────────────────────────────────────────────────

        composable(ScreenRoutes.MY_POIN) {
            MyPoinScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.SURAT_IZIN_PIKET) {
            com.absenta.app.ui.features.kesiswaan.SuratIzinPiketScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.NOTIFICATIONS) {
            com.absenta.app.ui.features.notification.NotificationScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.BPBK_KONSELING) {
            com.absenta.app.ui.features.kesiswaan.BpbkKonselingScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(ScreenRoutes.MONITORING_PKL) {
            com.absenta.app.ui.features.academic.MonitoringPklScreen(
                tokenManager = tokenManager,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
