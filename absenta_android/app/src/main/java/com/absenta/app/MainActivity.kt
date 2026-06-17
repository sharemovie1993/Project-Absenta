package com.absenta.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.absenta.app.data.local.SessionManager
import com.absenta.app.ui.dashboard.DashboardScreen
import com.absenta.app.ui.auth.LoginScreen
import com.absenta.app.ui.navigation.Screen
import com.absenta.app.ui.features.attendance.ScannerScreen
import com.absenta.app.ui.features.attendance.MyAttendanceScreen
import com.absenta.app.ui.features.cooperative.POSScreen
import com.absenta.app.ui.features.cooperative.SavingsScreen
import com.absenta.app.ui.features.cooperative.LoansScreen
import com.absenta.app.ui.features.cooperative.PPOBScreen
import com.absenta.app.ui.features.cooperative.CoopSettingsScreen
import com.absenta.app.ui.features.cooperative.CoopDashboardScreen
import com.absenta.app.ui.features.cooperative.CoopMembersScreen
import com.absenta.app.ui.features.cooperative.CoopAnnouncementsScreen
import com.absenta.app.ui.features.cooperative.CoopProductsScreen
import com.absenta.app.ui.features.cooperative.CoopSHUScreen
import com.absenta.app.ui.features.cooperative.CoopVouchersScreen
import com.absenta.app.ui.features.cooperative.CoopTicketsScreen
import com.absenta.app.ui.features.cooperative.CoopAccountingScreen
import com.absenta.app.ui.features.attendance.AttendanceRekapScreen
import com.absenta.app.ui.features.attendance.JadwalTemplateScreen
import com.absenta.app.ui.features.kesiswaan.ViolationReportScreen
import com.absenta.app.ui.features.kesiswaan.CounselingScreen
import com.absenta.app.ui.features.generic.GenericDetailScreen
import com.absenta.app.ui.features.hubin.PklVerificationScreen
import com.absenta.app.ui.features.hubin.MitraIndustriScreen
import com.absenta.app.ui.features.hubin.PenempatanPklScreen
import com.absenta.app.ui.features.hubin.MonitoringPklScreen
import com.absenta.app.ui.features.kurikulum.TeachingJournalScreen
import com.absenta.app.ui.features.kurikulum.ScheduleScreen
import com.absenta.app.ui.features.billing.SubscriptionPlansScreen
import com.absenta.app.ui.features.billing.TenantInvoiceScreen
import com.absenta.app.ui.features.profile.ProfileScreen
import com.absenta.app.ui.features.notifications.NotificationsScreen
import com.absenta.app.ui.features.sarpras.SarprasScreen
import com.absenta.app.ui.auth.ForgotPasswordScreen
import com.absenta.app.ui.features.hubin.PklAbsensiScreen
import com.absenta.app.ui.features.kesiswaan.PiketScreen
import com.absenta.app.ui.features.academic.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import com.absenta.app.data.api.ApiClient

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.currentBackStackEntryAsState
import com.absenta.app.ui.dashboard.DynamicTab
import com.absenta.app.ui.dashboard.dialogs.RenderStaticBottomSheet
import com.absenta.app.ui.dashboard.dialogs.RenderDynamicBottomSheet
import com.absenta.app.ui.features.attendance.HistoryScreen



class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(
                android.graphics.Color.TRANSPARENT,
                android.graphics.Color.TRANSPARENT
            )
        )
        super.onCreate(savedInstanceState)
        
        setContent {
            val navController = rememberNavController()
            var startDestination by remember { mutableStateOf<String?>(null) }
            val sessionManager = remember { SessionManager(applicationContext) }

            val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
            val userName by sessionManager.userNameFlow.collectAsState(initial = "Pengguna")
            val positionCodes by sessionManager.positionCodesFlow.collectAsState(initial = emptyList())
            val waliKelasDi by sessionManager.waliKelasDiFlow.collectAsState(initial = "")
            val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
            val activeHubs by sessionManager.activeHubsFlow.collectAsState(initial = emptyList())
            val userCapabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())
            val sidebarMenuJson by sessionManager.sidebarMenuJsonFlow.collectAsState(initial = "")

            var currentMainTabId by remember { mutableStateOf("BERANDA") }
            var activeSheetType by remember { mutableStateOf<String?>(null) }
            var showBottomSheet by remember { mutableStateOf(false) }

            var showGatingDialog by remember { mutableStateOf(false) }
            var lockedModuleName by remember { mutableStateOf("") }

            var selectedAkademikSubTab by remember { mutableStateOf(0) }
            var selectedAbsensiSubTab by remember { mutableStateOf(0) }
            var selectedHubinSubTab by remember { mutableStateOf(0) }
            var selectedKoperasiSubTab by remember { mutableStateOf(0) }

            val sidebarNodes = remember(sidebarMenuJson, userCapabilities, userRole) {
                if (sidebarMenuJson.isNullOrEmpty()) {
                    emptyList<com.absenta.app.data.api.SidebarNode>()
                } else {
                    try {
                        val type = object : com.google.gson.reflect.TypeToken<List<com.absenta.app.data.api.SidebarNode>>() {}.type
                        val list = com.google.gson.Gson().fromJson<List<com.absenta.app.data.api.SidebarNode>>(sidebarMenuJson, type)?.toMutableList() ?: mutableListOf()
                        
                        val canManageCoop = userCapabilities.contains("cooperative.members.manage") || userRole == "ADMIN" || userRole == "SUPERADMIN" || userRole == "SUPER_ADMIN"
                        if (canManageCoop) {
                            val coopIndex = list.indexOfFirst { it.name.trim().uppercase() == "KOPERASI" }
                            if (coopIndex != -1) {
                                val coopNode = list[coopIndex]
                                val children = coopNode.children?.toMutableList() ?: mutableListOf()
                                val hasSettings = children.any { it.path == "/cooperative/settings" || it.name == "Pengaturan Koperasi" }
                                if (!hasSettings) {
                                    children.add(
                                        com.absenta.app.data.api.SidebarNode(
                                            id = "coop-settings-injected",
                                            name = "Pengaturan Koperasi",
                                            path = "/cooperative/settings",
                                            type = "item",
                                            icon = "Settings",
                                            locked = false,
                                            feature_state = "ACTIVE",
                                            required_capability = "cooperative.members.manage",
                                            order = 99,
                                            children = null
                                        )
                                    )
                                    list[coopIndex] = coopNode.copy(children = children)
                                }
                            }
                        }
                        list
                    } catch (e: Exception) {
                        android.util.Log.e("ABSENTA_DEBUG", "Error parsing sidebar JSON: ${e.message}")
                        emptyList()
                    }
                }
            }

            val visibleTabs = remember(sidebarNodes, activeHubs) {
                val list = mutableListOf<DynamicTab>()
                list.add(DynamicTab("BERANDA", "BERANDA", Icons.Default.Home))
                
                if (sidebarNodes.isEmpty()) {
                    val defaultHubs = if (activeHubs.isEmpty()) {
                        listOf("AKADEMIK", "ABSENSI", "KOPERASI", "HUBIN")
                    } else {
                        activeHubs
                    }
                    defaultHubs.forEach { hub ->
                        val icon = when (hub) {
                            "AKADEMIK" -> Icons.Default.Star
                            "ABSENSI" -> Icons.Default.DateRange
                            "KOPERASI" -> Icons.Default.ShoppingCart
                            "HUBIN" -> Icons.Default.List
                            "SARPRAS" -> Icons.Default.Build
                            else -> Icons.Default.Star
                        }
                        list.add(DynamicTab(hub, hub, icon))
                    }
                } else {
                    sidebarNodes.forEach { node ->
                        val hubName = node.name.trim().uppercase()
                        val icon = when (hubName) {
                            "AKADEMIK" -> Icons.Default.Star
                            "ABSENSI" -> Icons.Default.DateRange
                            "KOPERASI" -> Icons.Default.ShoppingCart
                            "HUBIN" -> Icons.Default.List
                            "SARPRAS" -> Icons.Default.Build
                            "MANAGEMENT" -> Icons.Default.Settings
                            else -> Icons.Default.Star
                        }
                        list.add(DynamicTab(hubName, node.name, icon, node))
                    }
                }
                
                list.add(DynamicTab("SAYA", "SAYA", Icons.Default.AccountCircle))
                list
            }

            val currentBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = currentBackStackEntry?.destination?.route

            fun getActiveTabId(route: String?, currentTabId: String): String {
                if (route == null) return "BERANDA"
                return when {
                    route == Screen.Dashboard.route -> currentTabId
                    route == Screen.Profile.route || route == Screen.Notifications.route -> "SAYA"
                    route.contains("academic", ignoreCase = true) || route.contains("siswa", ignoreCase = true) || route.contains("guru", ignoreCase = true) || route.contains("kelas", ignoreCase = true) || route.contains("mapel", ignoreCase = true) || route.contains("semester", ignoreCase = true) || route.contains("jurusan", ignoreCase = true) || route.contains("tahun_pelajaran", ignoreCase = true) -> "AKADEMIK"
                    route.contains("scanner", ignoreCase = true) || route.contains("attendance", ignoreCase = true) || route.contains("rekap", ignoreCase = true) || route.contains("history", ignoreCase = true) -> "ABSENSI"
                    route.contains("coop", ignoreCase = true) || route.contains("pos", ignoreCase = true) || route.contains("savings", ignoreCase = true) || route.contains("loans", ignoreCase = true) || route.contains("ppob", ignoreCase = true) -> "KOPERASI"
                    route.contains("pkl", ignoreCase = true) || route.contains("verification", ignoreCase = true) -> "HUBIN"
                    route.contains("sarpras", ignoreCase = true) -> "SARPRAS"
                    else -> "BERANDA"
                }
            }

            val highlightedTabId = getActiveTabId(currentRoute, currentMainTabId)

            val checkFeatureAndRun: (String, () -> Unit) -> Unit = { module, action ->
                val isLocked = enabledFeatures.isNotEmpty() && !enabledFeatures.contains(module.uppercase())
                if (isLocked) {
                    lockedModuleName = module.uppercase()
                    showGatingDialog = true
                } else {
                    action()
                }
            }

            val gatedNavigateToCoopPOS = { navController.navigate(Screen.CoopPOS.route) }
            val gatedNavigateToCoopSavings = { navController.navigate(Screen.CoopSavings.route) }
            val gatedNavigateToCoopLoans = { navController.navigate(Screen.CoopLoans.route) }
            val gatedNavigateToCoopPPOB = { navController.navigate(Screen.CoopPPOB.route) }
            val gatedNavigateToCoopSettings = { navController.navigate(Screen.CoopSettings.route) }
            val gatedNavigateToCoopDashboard = { navController.navigate(Screen.CoopDashboard.route) }
            val gatedNavigateToCoopMembers = { navController.navigate(Screen.CoopMembers.route) }
            val gatedNavigateToCoopAnnouncements = { navController.navigate(Screen.CoopAnnouncements.route) }
            val gatedNavigateToCoopProducts = { navController.navigate(Screen.CoopProducts.route) }
            val gatedNavigateToCoopSHU = { navController.navigate(Screen.CoopSHU.route) }
            val gatedNavigateToCoopVouchers = { navController.navigate(Screen.CoopVouchers.route) }
            val gatedNavigateToCoopTickets = { navController.navigate(Screen.CoopTickets.route) }
            val gatedNavigateToCoopAccounting = { navController.navigate(Screen.CoopAccounting.route) }
            
            val gatedNavigateToScanner = { navController.navigate(Screen.Scanner.route) }
            val gatedNavigateToMyAttendance = { navController.navigate(Screen.MyAttendance.route) }
            val gatedNavigateToAttendanceRekap = { navController.navigate(Screen.AttendanceRekap.route) }
            
            val gatedNavigateToSarpras = { navController.navigate(Screen.Sarpras.route) }
            
            val gatedNavigateToPklVerification = { navController.navigate(Screen.PklVerification.route) }
            val gatedNavigateToPklAbsensi = { navController.navigate(Screen.PklAbsensi.route) }
            val gatedNavigateToMitraIndustri = { navController.navigate(Screen.MitraIndustri.route) }
            val gatedNavigateToPenempatanPkl = { navController.navigate(Screen.PenempatanPkl.route) }
            val gatedNavigateToMonitoringPkl = { navController.navigate(Screen.MonitoringPkl.route) }
 
            val gatedNavigateToGenericDetail: (String) -> Unit = { title ->
                navController.navigate(Screen.GenericDetail.createRoute(title))
            }

            val navigateToItem: (com.absenta.app.data.api.SidebarNode) -> Unit = { item ->
                val title = item.name.trim()
                val path = item.path ?: ""
                
                when {
                    title.contains("Presensi Mandiri", ignoreCase = true) || title.contains("My Attendance", ignoreCase = true) -> {
                        gatedNavigateToMyAttendance()
                    }
                    title.contains("Jadwal Pelajaran", ignoreCase = true) || title.contains("Jadwal Template", ignoreCase = true) || path.contains("jadwal-template", ignoreCase = true) -> {
                        navController.navigate(Screen.JadwalTemplate.route)
                    }
                    title.contains("Riwayat Presensi", ignoreCase = true) || path.contains("history", ignoreCase = true) -> {
                        navController.navigate(Screen.History.route)
                    }
                    title.contains("Scan Presensi", ignoreCase = true) || title.contains("Scanner", ignoreCase = true) -> {
                        gatedNavigateToScanner()
                    }
                    title.contains("Rekap Absensi", ignoreCase = true) || title.contains("Rekap Siswa", ignoreCase = true) -> {
                        gatedNavigateToAttendanceRekap()
                    }
                    title.contains("Pelanggaran", ignoreCase = true) -> {
                        navController.navigate(Screen.KesiswaanViolations.route)
                    }
                    title.contains("Konseling", ignoreCase = true) -> {
                        navController.navigate(Screen.KesiswaanCounseling.route)
                    }
                    title.contains("Piket", ignoreCase = true) -> {
                        navController.navigate(Screen.Piket.route)
                    }
                    path.contains("registrasi-siswa", ignoreCase = true) || title.contains("Registrasi Siswa", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicRegistrasiSiswa.route)
                    }
                    title.contains("Wali Kelas", ignoreCase = true) || path.contains("wali-kelas", ignoreCase = true) || path.contains("wali_kelas", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicWaliKelas.route)
                    }
                    title.contains("Guru Mapel", ignoreCase = true) || path.contains("guru-mapel", ignoreCase = true) || path.contains("guru_mapel", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicGuruMapel.route)
                    }
                    title.contains("Jenis Kegiatan", ignoreCase = true) || path.contains("jenis-kegiatan", ignoreCase = true) || path.contains("jenis_kegiatan", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicJenisKegiatan.route)
                    }
                    title.contains("Struktur Organisasi", ignoreCase = true) || path.contains("struktur-organisasi", ignoreCase = true) || path.contains("struktur_organisasi", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicStrukturOrganisasi.route)
                    }
                    path.contains("siswa", ignoreCase = true) || title.contains("Siswa", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicSiswa.route)
                    }
                    title.equals("Tahun Pelajaran", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicTahunPelajaran.route)
                    }
                    title.equals("Guru", ignoreCase = true) || title.contains("Data Guru", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicGuru.route)
                    }
                    title.equals("Kelas", ignoreCase = true) || title.contains("Data Kelas", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicKelas.route)
                    }
                    title.contains("Mata Pelajaran", ignoreCase = true) || title.equals("Mapel", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicMapel.route)
                    }
                    title.equals("Semester", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicSemester.route)
                    }
                    title.equals("Jurusan", ignoreCase = true) -> {
                        navController.navigate(Screen.AcademicJurusan.route)
                    }
                    title.contains("Mitra", ignoreCase = true) || title.contains("Perusahaan", ignoreCase = true) -> {
                        gatedNavigateToMitraIndustri()
                    }
                    title.contains("Penempatan", ignoreCase = true) || title.contains("Plotting", ignoreCase = true) -> {
                        gatedNavigateToPenempatanPkl()
                    }
                    title.contains("Presensi & Jurnal PKL", ignoreCase = true) || title.contains("Jurnal PKL", ignoreCase = true) -> {
                        gatedNavigateToPklAbsensi()
                    }
                    title.contains("Verifikasi Absensi", ignoreCase = true) -> {
                        gatedNavigateToPklVerification()
                    }
                    title.contains("Monitoring PKL", ignoreCase = true) || title.contains("Monitoring", ignoreCase = true) -> {
                        gatedNavigateToMonitoringPkl()
                    }
                    title.contains("Tabungan", ignoreCase = true) || title.contains("Simpanan", ignoreCase = true) || path.contains("savings", ignoreCase = true) -> {
                        gatedNavigateToCoopSavings()
                    }
                    title.contains("Pinjaman", ignoreCase = true) || path.contains("loans", ignoreCase = true) -> {
                        gatedNavigateToCoopLoans()
                    }
                    title.contains("Katalog Belanja", ignoreCase = true) || title.contains("POS", ignoreCase = true) || title.contains("Kasir", ignoreCase = true) || path.contains("pos", ignoreCase = true) -> {
                        gatedNavigateToCoopPOS()
                    }
                    title.contains("PPOB", ignoreCase = true) || title.contains("Pembayaran", ignoreCase = true) || title.contains("Token", ignoreCase = true) || title.contains("Pulsa", ignoreCase = true) || path.contains("ppob", ignoreCase = true) -> {
                        gatedNavigateToCoopPPOB()
                    }
                    title.contains("Pengaturan Koperasi", ignoreCase = true) || title.contains("Pengaturan", ignoreCase = true) || path.contains("settings", ignoreCase = true) -> {
                        gatedNavigateToCoopSettings()
                    }
                    title.contains("Dashboard Koperasi", ignoreCase = true) || path.contains("cooperative/dashboard", ignoreCase = true) -> {
                        gatedNavigateToCoopDashboard()
                    }
                    title.contains("Manajemen Anggota", ignoreCase = true) || title.contains("Anggota Koperasi", ignoreCase = true) || path.contains("cooperative/members", ignoreCase = true) -> {
                        gatedNavigateToCoopMembers()
                    }
                    title.contains("Pengumuman Koperasi", ignoreCase = true) || path.contains("cooperative/announcements", ignoreCase = true) -> {
                        gatedNavigateToCoopAnnouncements()
                    }
                    title.contains("Produk", ignoreCase = true) || title.contains("Inventori", ignoreCase = true) || path.contains("cooperative/products", ignoreCase = true) || path.contains("cooperative/toko", ignoreCase = true) -> {
                        gatedNavigateToCoopProducts()
                    }
                    title.contains("SHU", ignoreCase = true) || path.contains("cooperative/shu", ignoreCase = true) -> {
                        gatedNavigateToCoopSHU()
                    }
                    title.contains("Voucher", ignoreCase = true) || path.contains("cooperative/vouchers", ignoreCase = true) -> {
                        gatedNavigateToCoopVouchers()
                    }
                    title.contains("Tiket", ignoreCase = true) || title.contains("Bantuan", ignoreCase = true) || path.contains("cooperative/tickets", ignoreCase = true) -> {
                        gatedNavigateToCoopTickets()
                    }
                    title.contains("Laporan Keuangan", ignoreCase = true) || title.contains("Akuntansi", ignoreCase = true) || path.contains("cooperative/reports", ignoreCase = true) || path.contains("cooperative/accounting", ignoreCase = true) -> {
                        gatedNavigateToCoopAccounting()
                    }
                    title.contains("Sarpras", ignoreCase = true) || path.contains("sarpras", ignoreCase = true) -> {
                        gatedNavigateToSarpras()
                    }
                    else -> {
                        gatedNavigateToGenericDetail(title)
                    }
                }
            }

            // Cek status sesi saat aplikasi dibuka
            LaunchedEffect(Unit) {
                val token = sessionManager.jwtTokenFlow.first()
                if (!token.isNullOrEmpty()) {
                    // Mendaftarkan kembali token FCM ke backend jika user sudah login sebelumnya
                    com.absenta.app.fcm.AbsentaFirebaseMessagingService.registerFcmToken(applicationContext)
                    
                    // Segarkan list fitur teraktif di latar belakang (tidak memblokir UI startup)
                    launch {
                        try {
                            val billingService = ApiClient.getClient(applicationContext).create(com.absenta.app.data.api.BillingService::class.java)
                            val subResponse = billingService.getSubscriptionStatus()
                            if (subResponse.isSuccessful && subResponse.body()?.success == true) {
                                val features = subResponse.body()?.data?.features
                                if (features != null) {
                                    sessionManager.saveFeatures(features)
                                    android.util.Log.d("ABSENTA_DEBUG", "Startup - Refreshed subscription features: $features")
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("ABSENTA_DEBUG", "Startup - Error refreshing features: ${e.message}")
                        }
                    }

                    // Segarkan menu active hubs di latar belakang (tidak memblokir UI startup)
                    launch {
                        try {
                            val menuService = ApiClient.getClient(applicationContext).create(com.absenta.app.data.api.MenuService::class.java)
                            val menuResponse = menuService.getSidebarMenu()
                            if (menuResponse.isSuccessful && menuResponse.body()?.sidebar != null) {
                                val sidebarNodesList = menuResponse.body()?.sidebar ?: emptyList()
                                val activeHubsList = mutableSetOf<String>()
                                
                                val akademikKeywords = listOf("AKADEMIK", "KESISWAAN", "KURIKULUM")
                                val absensiKeywords = listOf("ABSENSI", "ATTENDANCE")
                                val hubinKeywords = listOf("HUBIN", "PKL", "MITRA", "INDUSTRI")
                                val koperasiKeywords = listOf("KOPERASI", "COOPERATIVE")
                                
                                for (node in sidebarNodesList) {
                                    val name = node.name.trim().uppercase()
                                    if (akademikKeywords.any { name.contains(it) }) {
                                        activeHubsList.add("AKADEMIK")
                                    }
                                    if (absensiKeywords.any { name.contains(it) }) {
                                        activeHubsList.add("ABSENSI")
                                    }
                                    if (hubinKeywords.any { name.contains(it) }) {
                                        activeHubsList.add("HUBIN")
                                    }
                                    if (koperasiKeywords.any { name.contains(it) }) {
                                        activeHubsList.add("KOPERASI")
                                    }
                                }
                                val hubsList = activeHubsList.toList()
                                sessionManager.saveActiveHubs(hubsList)
                                
                                // Save dynamic menu JSON using Gson
                                val gson = com.google.gson.Gson()
                                val sidebarJson = gson.toJson(sidebarNodesList)
                                sessionManager.saveSidebarMenuJson(sidebarJson)
                                
                                android.util.Log.d("ABSENTA_DEBUG", "Startup - Refreshed active menu hubs: $hubsList and sidebar JSON: $sidebarJson")
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("ABSENTA_DEBUG", "Startup - Error refreshing menu hubs: ${e.message}")
                        }
                    }

                    startDestination = Screen.Dashboard.route
                } else {
                    startDestination = Screen.Login.route
                }
            }

            val showBottomBar = currentRoute != null && currentRoute != Screen.Login.route && currentRoute != Screen.ForgotPassword.route

            Scaffold(
                bottomBar = {
                    if (showBottomBar) {
                        NavigationBar(containerColor = Color.White) {
                            visibleTabs.forEach { tab ->
                                NavigationBarItem(
                                    selected = highlightedTabId == tab.id,
                                    onClick = {
                                        when (tab.id) {
                                            "BERANDA" -> {
                                                currentMainTabId = "BERANDA"
                                                if (currentRoute != Screen.Dashboard.route) {
                                                    navController.navigate(Screen.Dashboard.route) {
                                                        popUpTo(Screen.Dashboard.route) { inclusive = false }
                                                    }
                                                }
                                                showBottomSheet = false
                                                activeSheetType = null
                                            }
                                            "SAYA" -> {
                                                currentMainTabId = "SAYA"
                                                if (currentRoute != Screen.Dashboard.route) {
                                                    navController.navigate(Screen.Dashboard.route) {
                                                        popUpTo(Screen.Dashboard.route) { inclusive = false }
                                                    }
                                                }
                                                showBottomSheet = false
                                                activeSheetType = null
                                            }
                                            else -> {
                                                activeSheetType = tab.id
                                                showBottomSheet = true
                                            }
                                        }
                                    },
                                    label = { Text(tab.title, fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                                    icon = {
                                        Icon(imageVector = tab.icon, contentDescription = tab.title)
                                    },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color(0xFF1E3C72),
                                        selectedTextColor = Color(0xFF1E3C72),
                                        indicatorColor = Color(0xFF1E3C72).copy(alpha = 0.1f)
                                    )
                                )
                            }
                        }
                    }
                }
            ) { paddingValues ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .consumeWindowInsets(paddingValues)
                ) {
                    if (startDestination == null) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Memuat Sesi...", fontSize = 16.sp)
                        }
                    } else {
                        NavHost(
                            navController = navController,
                            startDestination = startDestination!!
                        ) {
                            // Halaman Login
                            composable(Screen.Login.route) {
                                LoginScreen(
                                    onLoginSuccess = { role ->
                                        navController.navigate(Screen.Dashboard.route) {
                                            popUpTo(Screen.Login.route) { inclusive = true }
                                        }
                                    },
                                    onForgotPassword = {
                                        navController.navigate(Screen.ForgotPassword.route)
                                    }
                                )
                            }

                            // Halaman Lupa Password
                            composable(Screen.ForgotPassword.route) {
                                ForgotPasswordScreen(onNavigateBack = { navController.popBackStack() })
                            }
                            
                            // Hub Dashboard Utama
                            composable(Screen.Dashboard.route) {
                                DashboardScreen(
                                    currentMainTabId = currentMainTabId,
                                    onMainTabChange = { currentMainTabId = it },
                                    onNavigateToHistory = { navController.navigate(Screen.History.route) },
                                    onLogout = {
                                        navController.navigate(Screen.Login.route) {
                                            popUpTo(Screen.Dashboard.route) { inclusive = true }
                                        }
                                    },
                                    onNavigateToScanner = gatedNavigateToScanner,
                                    onNavigateToMyAttendance = gatedNavigateToMyAttendance,
                                    onNavigateToCoopPOS = gatedNavigateToCoopPOS,
                                    onNavigateToCoopSavings = gatedNavigateToCoopSavings,
                                    onNavigateToCoopLoans = gatedNavigateToCoopLoans,
                                    onNavigateToViolations = { navController.navigate(Screen.KesiswaanViolations.route) },
                                    onNavigateToCounseling = { navController.navigate(Screen.KesiswaanCounseling.route) },
                                    onNavigateToGenericDetail = gatedNavigateToGenericDetail,
                                    onNavigateToPklVerification = gatedNavigateToPklVerification,
                                    onNavigateToTeachingJournal = { navController.navigate(Screen.TeachingJournal.route) },
                                    onNavigateToSchedule = { navController.navigate(Screen.Schedule.route) },
                                    onNavigateToSubscriptionPlans = { navController.navigate(Screen.SubscriptionPlans.route) },
                                    onNavigateToTenantInvoice = { navController.navigate(Screen.TenantInvoice.route) },
                                    onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                                    onNavigateToNotifications = { navController.navigate(Screen.Notifications.route) },
                                    onNavigateToAttendanceRekap = gatedNavigateToAttendanceRekap,
                                    onNavigateToSarpras = gatedNavigateToSarpras,
                                    onNavigateToPklAbsensi = gatedNavigateToPklAbsensi,
                                    onNavigateToPiket = { navController.navigate(Screen.Piket.route) },
                                    onNavigateToAcademicSiswa = { navController.navigate(Screen.AcademicSiswa.route) },
                                    onNavigateToAcademicTahunPelajaran = { navController.navigate(Screen.AcademicTahunPelajaran.route) },
                                    onNavigateToAcademicGuru = { navController.navigate(Screen.AcademicGuru.route) },
                                    onNavigateToAcademicKelas = { navController.navigate(Screen.AcademicKelas.route) },
                                    onNavigateToAcademicMapel = { navController.navigate(Screen.AcademicMapel.route) },
                                    onNavigateToAcademicSemester = { navController.navigate(Screen.AcademicSemester.route) },
                                    onNavigateToAcademicJurusan = { navController.navigate(Screen.AcademicJurusan.route) }
                                )
                            }

                            // Halaman Scanner Kamera
                            composable(Screen.Scanner.route) {
                                ScannerScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }

                            // Halaman Presensi Mandiri GPS
                            composable(Screen.MyAttendance.route) {
                                MyAttendanceScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }

                            // Halaman Riwayat Presensi
                            composable(Screen.History.route) {
                                HistoryScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }

                            // Halaman POS Koperasi
                            composable(Screen.CoopPOS.route) {
                                POSScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Simpanan Koperasi
                            composable(Screen.CoopSavings.route) {
                                SavingsScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Pinjaman Koperasi
                            composable(Screen.CoopLoans.route) {
                                LoansScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman PPOB Koperasi
                            composable(Screen.CoopPPOB.route) {
                                PPOBScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Pengaturan Koperasi
                            composable(Screen.CoopSettings.route) {
                                CoopSettingsScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }

                            // Halaman Dashboard Koperasi
                            composable(Screen.CoopDashboard.route) {
                                CoopDashboardScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) },
                                    onNavigateToSavings = { navController.navigate(Screen.CoopSavings.route) },
                                    onNavigateToLoans = { navController.navigate(Screen.CoopLoans.route) }
                                )
                            }

                            // Halaman Manajemen Anggota Koperasi
                            composable(Screen.CoopMembers.route) {
                                CoopMembersScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Pengumuman Koperasi
                            composable(Screen.CoopAnnouncements.route) {
                                CoopAnnouncementsScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Manajemen Produk Koperasi
                            composable(Screen.CoopProducts.route) {
                                CoopProductsScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman SHU Koperasi
                            composable(Screen.CoopSHU.route) {
                                CoopSHUScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Voucher Koperasi
                            composable(Screen.CoopVouchers.route) {
                                CoopVouchersScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Tiket Bantuan Koperasi
                            composable(Screen.CoopTickets.route) {
                                CoopTicketsScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            composable(Screen.CoopAccounting.route) {
                                CoopAccountingScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Catatan Pelanggaran
                            composable(Screen.KesiswaanViolations.route) {
                                ViolationReportScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    }
                                )
                            }

                            // Halaman Konseling BK
                            composable(Screen.KesiswaanCounseling.route) {
                                CounselingScreen(
                                    onNavigateBack = {
                                        navController.popBackStack()
                                    },
                                    onNavigateToViolations = {
                                        navController.navigate(Screen.KesiswaanViolations.route)
                                    }
                                )
                            }

                            // Halaman Detail Akademik/Absensi/Hubin Generik
                            composable(Screen.GenericDetail.route) { backStackEntry ->
                                val title = backStackEntry.arguments?.getString("title") ?: "Detail"
                                GenericDetailScreen(
                                    title = title,
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Milestone 4: Halaman Verifikasi PKL (Hubin)
                            composable(Screen.PklVerification.route) {
                                PklVerificationScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Milestone 4: Halaman Jurnal Mengajar (Kurikulum)
                            composable(Screen.TeachingJournal.route) {
                                TeachingJournalScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Milestone 4: Halaman Jadwal Mengajar (Kurikulum)
                            composable(Screen.Schedule.route) {
                                ScheduleScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Jadwal Pelajaran (Template)
                            composable(Screen.JadwalTemplate.route) {
                                JadwalTemplateScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Milestone 5: Halaman Paket Langganan (Billing)
                            composable(Screen.SubscriptionPlans.route) {
                                SubscriptionPlansScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Riwayat Tagihan (Billing)
                            composable(Screen.TenantInvoice.route) {
                                TenantInvoiceScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Profil & Akun
                            composable(Screen.Profile.route) {
                                ProfileScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onLogout = {
                                        navController.navigate(Screen.Login.route) {
                                            popUpTo(0) { inclusive = true }
                                        }
                                    }
                                )
                            }

                            // Halaman Notifikasi
                            composable(Screen.Notifications.route) {
                                NotificationsScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Rekap Absensi Siswa
                            composable(Screen.AttendanceRekap.route) {
                                AttendanceRekapScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Sarana Prasarana (Sarpras)
                            composable(Screen.Sarpras.route) {
                                SarprasScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Absensi PKL (Siswa)
                            composable(Screen.PklAbsensi.route) {
                                PklAbsensiScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Mitra Industri
                            composable(Screen.MitraIndustri.route) {
                                MitraIndustriScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Penempatan PKL
                            composable(Screen.PenempatanPkl.route) {
                                PenempatanPklScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Monitoring PKL
                            composable(Screen.MonitoringPkl.route) {
                                MonitoringPklScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToPlans = { navController.navigate(Screen.SubscriptionPlans.route) }
                                )
                            }

                            // Halaman Piket Harian & BK (Satpam/Guru)
                            composable(Screen.Piket.route) {
                                PiketScreen(onNavigateBack = { navController.popBackStack() })
                            }

                            // Halaman Data Siswa (Akademik)
                            composable(Screen.AcademicSiswa.route) {
                                SiswaListScreen(
                                    onNavigateBack = { navController.popBackStack() },
                                    onNavigateToGenericDetail = { title ->
                                        navController.navigate(Screen.GenericDetail.createRoute(title))
                                    },
                                    onNavigateToRegistrasiSiswa = {
                                        navController.navigate(Screen.AcademicRegistrasiSiswa.route)
                                    }
                                )
                            }

                            // Halaman Registrasi Siswa
                            composable(Screen.AcademicRegistrasiSiswa.route) {
                                RegistrasiSiswaScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Wali Kelas
                            composable(Screen.AcademicWaliKelas.route) {
                                WaliKelasScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Guru Mapel
                            composable(Screen.AcademicGuruMapel.route) {
                                GuruMapelScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Jenis Kegiatan
                            composable(Screen.AcademicJenisKegiatan.route) {
                                JenisKegiatanScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Transition (Kenaikan Kelas)
                            composable(Screen.AcademicTransition.route) {
                                TransitionScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Siswa Cards (Kartu Siswa)
                            composable(Screen.AcademicSiswaCards.route) {
                                SiswaCardsScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Mutation (Mutasi Siswa)
                            composable(Screen.AcademicMutation.route) {
                                MutationScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Struktur Organisasi
                            composable(Screen.AcademicStrukturOrganisasi.route) {
                                StrukturOrganisasiScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Backup & Restore
                            composable(Screen.AcademicBackup.route) {
                                BackupScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Tahun Pelajaran (Akademik)
                            composable(Screen.AcademicTahunPelajaran.route) {
                                TahunPelajaranListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Data Guru (Akademik)
                            composable(Screen.AcademicGuru.route) {
                                GuruListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Data Kelas (Akademik)
                            composable(Screen.AcademicKelas.route) {
                                KelasListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Mata Pelajaran (Akademik)
                            composable(Screen.AcademicMapel.route) {
                                MapelListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Semester (Akademik)
                            composable(Screen.AcademicSemester.route) {
                                SemesterListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }

                            // Halaman Jurusan (Akademik)
                            composable(Screen.AcademicJurusan.route) {
                                JurusanListScreen(
                                    onNavigateBack = { navController.popBackStack() }
                                )
                            }
                        }
                    }

                    // Slide-up Modal Bottom Sheet
                    if (showBottomSheet && activeSheetType != null) {
                        @OptIn(ExperimentalMaterial3Api::class)
                        ModalBottomSheet(
                            onDismissRequest = {
                                showBottomSheet = false
                                activeSheetType = null
                            },
                            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                            containerColor = Color.White,
                            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                        ) {
                            val activeRootNode = sidebarNodes.find { it.name.trim().uppercase() == activeSheetType }
                            if (activeRootNode == null) {
                                RenderStaticBottomSheet(
                                    activeSheetType = activeSheetType!!,
                                    userRole = userRole ?: "",
                                    positionCodes = positionCodes ?: emptyList(),
                                    capabilities = userCapabilities ?: emptyList(),
                                    selectedAkademikSubTab = selectedAkademikSubTab,
                                    onAkademikSubTabChange = { selectedAkademikSubTab = it },
                                    selectedAbsensiSubTab = selectedAbsensiSubTab,
                                    onAbsensiSubTabChange = { selectedAbsensiSubTab = it },
                                    selectedHubinSubTab = selectedHubinSubTab,
                                    onHubinSubTabChange = { selectedHubinSubTab = it },
                                    selectedKoperasiSubTab = selectedKoperasiSubTab,
                                    onKoperasiSubTabChange = { selectedKoperasiSubTab = it },
                                    onDismiss = {
                                        showBottomSheet = false
                                        activeSheetType = null
                                    },
                                    gatedNavigateToScanner = gatedNavigateToScanner,
                                    gatedNavigateToMyAttendance = gatedNavigateToMyAttendance,
                                    gatedNavigateToAttendanceRekap = gatedNavigateToAttendanceRekap,
                                    gatedNavigateToSarpras = gatedNavigateToSarpras,
                                    gatedNavigateToPklVerification = gatedNavigateToPklVerification,
                                    gatedNavigateToPklAbsensi = gatedNavigateToPklAbsensi,
                                    gatedNavigateToCoopPOS = gatedNavigateToCoopPOS,
                                    gatedNavigateToCoopSavings = gatedNavigateToCoopSavings,
                                    gatedNavigateToCoopLoans = gatedNavigateToCoopLoans,
                                    gatedNavigateToCoopPPOB = gatedNavigateToCoopPPOB,
                                    gatedNavigateToCoopSettings = gatedNavigateToCoopSettings,
                                    gatedNavigateToCoopDashboard = gatedNavigateToCoopDashboard,
                                    gatedNavigateToCoopMembers = gatedNavigateToCoopMembers,
                                    gatedNavigateToCoopAnnouncements = gatedNavigateToCoopAnnouncements,
                                    gatedNavigateToCoopProducts = gatedNavigateToCoopProducts,
                                    gatedNavigateToCoopSHU = gatedNavigateToCoopSHU,
                                    gatedNavigateToCoopVouchers = gatedNavigateToCoopVouchers,
                                    gatedNavigateToCoopTickets = gatedNavigateToCoopTickets,
                                    gatedNavigateToCoopAccounting = gatedNavigateToCoopAccounting,
                                    gatedNavigateToGenericDetail = gatedNavigateToGenericDetail,
                                    onShowHistory = { navController.navigate(Screen.History.route) },
                                    onNavigateToViolations = { navController.navigate(Screen.KesiswaanViolations.route) },
                                    onNavigateToCounseling = { navController.navigate(Screen.KesiswaanCounseling.route) },
                                    onNavigateToPiket = { navController.navigate(Screen.Piket.route) },
                                    onNavigateToAcademicSiswa = { navController.navigate(Screen.AcademicSiswa.route) },
                                    onNavigateToAcademicTahunPelajaran = { navController.navigate(Screen.AcademicTahunPelajaran.route) },
                                    onNavigateToAcademicGuru = { navController.navigate(Screen.AcademicGuru.route) },
                                    onNavigateToAcademicKelas = { navController.navigate(Screen.AcademicKelas.route) },
                                    onNavigateToAcademicMapel = { navController.navigate(Screen.AcademicMapel.route) },
                                    onNavigateToAcademicSemester = { navController.navigate(Screen.AcademicSemester.route) },
                                    onNavigateToAcademicJurusan = { navController.navigate(Screen.AcademicJurusan.route) },
                                    onNavigateToAcademicRegistrasiSiswa = { navController.navigate(Screen.AcademicRegistrasiSiswa.route) },
                                    onNavigateToAcademicWaliKelas = { navController.navigate(Screen.AcademicWaliKelas.route) },
                                    onNavigateToAcademicGuruMapel = { navController.navigate(Screen.AcademicGuruMapel.route) },
                                    onNavigateToAcademicJenisKegiatan = { navController.navigate(Screen.AcademicJenisKegiatan.route) },
                                    onNavigateToAcademicTransition = { navController.navigate(Screen.AcademicTransition.route) },
                                    onNavigateToAcademicSiswaCards = { navController.navigate(Screen.AcademicSiswaCards.route) },
                                    onNavigateToAcademicMutation = { navController.navigate(Screen.AcademicMutation.route) },
                                    onNavigateToAcademicStrukturOrganisasi = { navController.navigate(Screen.AcademicStrukturOrganisasi.route) },
                                    onNavigateToAcademicBackup = { navController.navigate(Screen.AcademicBackup.route) }
                                )
                            } else {
                                RenderDynamicBottomSheet(
                                    rootNode = activeRootNode,
                                    onDismiss = {
                                        showBottomSheet = false
                                        activeSheetType = null
                                    },
                                    onNavigateToItem = navigateToItem
                                )
                            }
                        }
                    }

                    if (showGatingDialog) {
                        AlertDialog(
                            onDismissRequest = { showGatingDialog = false },
                            icon = {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = "Locked Feature",
                                    tint = Color(0xFFE2B93B),
                                    modifier = Modifier.size(36.dp)
                                )
                            },
                            title = {
                                Text(
                                    text = "Fitur Premium Belum Aktif",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp,
                                    color = Color(0xFF1E293B)
                                )
                            },
                            text = {
                                Text(
                                    text = "Sekolah Anda belum mengaktifkan layanan modul $lockedModuleName. Silakan hubungi Administrator sekolah atau tingkatkan paket langganan Anda.",
                                    fontSize = 14.sp,
                                    color = Color(0xFF64748B)
                                )
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        showGatingDialog = false
                                        navController.navigate(Screen.SubscriptionPlans.route)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                ) {
                                    Text("Lihat Paket")
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { showGatingDialog = false }) {
                                    Text("Tutup", color = Color(0xFF64748B))
                                }
                            },
                            shape = RoundedCornerShape(20.dp),
                            containerColor = Color.White
                        )
                    }
                }
            }
        }
    }
}

