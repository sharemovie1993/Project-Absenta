package com.absenta.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AssignmentInd
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.DashboardService
import com.absenta.app.data.api.KesiswaanService
import com.absenta.app.data.api.ParentService
import com.absenta.app.data.api.PiketService
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.api.SesiKelasService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.navigation.ScreenRoutes
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.PrimaryDark
import com.absenta.app.ui.theme.PrimaryLight
import com.absenta.app.ui.theme.Success
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import com.absenta.app.ui.theme.TextTertiary
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Model item kartu menu berbentuk App Icon 1 Kata */
private data class MenuCard(
    val route: String,
    val label: String, // 1 Kata saja
    val icon: ImageVector,
    val bgGradient: List<Color>,
    val iconColor: Color
)

/** Model kategori grup menu dashboard */
private data class MenuCategory(
    val title: String,
    val items: List<MenuCard>
)

/**
 * DynamicMenuDashboard — Desain App Launcher Grid Ultra Modern (4 Kolom Grid per Baris, Squircle App Icons, Label 1 Kata).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DynamicMenuDashboard(
    tokenManager: TokenManager,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var userName by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("") }
    var menuCategories by remember { mutableStateOf<List<MenuCategory>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showLogoutDialog by remember { mutableStateOf(false) }    // === Live API Data States ===
    var photoUrl by remember { mutableStateOf<String?>(""  ) }
    var schoolName by remember { mutableStateOf("Absenta") }

    // Role detection flags
    val normalizedRole = userRole.uppercase()
    val isSiswa = normalizedRole == "SISWA" || normalizedRole.contains("SISWA")
    val isParent = normalizedRole == "PARENT" || normalizedRole.contains("ORTU") || normalizedRole.contains("PARENT")
    val isExec = normalizedRole.contains("KEPSEK") || normalizedRole.contains("KEPALA") || normalizedRole.contains("ADMIN")
    // Default: GURU / PIKET / WALIKELAS / KURIKULUM etc.

    // GURU stats
    var sesiCount by remember { mutableStateOf(0) }
    var piketActive by remember { mutableStateOf(false) }
    // SISWA stats
    var kehadiranPersen by remember { mutableStateOf(0.0) }
    var totalPoin by remember { mutableStateOf(0) }
    // KEPSEK/ADMIN stats
    var hadirSiswa by remember { mutableStateOf(0) }
    var totalSiswa by remember { mutableStateOf(0) }
    var hadirGuru by remember { mutableStateOf(0) }
    var totalGuru by remember { mutableStateOf(0) }
    // ORTU stats
    var childStatus by remember { mutableStateOf("—") }
    var childName by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        userName = tokenManager.userNameFlow.firstOrNull() ?: ""
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: "USER"
        photoUrl = tokenManager.photoUrlFlow.firstOrNull()
        val caps = tokenManager.getCapabilities()
        menuCategories = buildMenuCategories(userRole, caps)
        isLoading = false

        val retrofit = ApiClient.create(tokenManager)

        // === Profile API → Nama, Foto, Sekolah (semua role) ===
        try {
            val profileService = retrofit.create(ProfileService::class.java)
            val profileResp = profileService.getMyProfile()
            if (profileResp.isSuccessful) {
                profileResp.body()?.data?.let { user ->
                    userName = user.fullName ?: user.name ?: userName
                    photoUrl = user.photoUrl ?: user.fotoUrlRaw ?: user.avatarUrl
                    schoolName = user.tenantInfo?.name ?: "Absenta"
                }
            }
        } catch (_: Exception) { }

        val roleUpper = userRole.uppercase()
        val roleSiswa = roleUpper == "SISWA" || roleUpper.contains("SISWA")
        val roleParent = roleUpper == "PARENT" || roleUpper.contains("ORTU") || roleUpper.contains("PARENT")
        val roleExec = roleUpper.contains("KEPSEK") || roleUpper.contains("KEPALA") || roleUpper.contains("ADMIN")

        when {
            // === SISWA: Kehadiran bulan ini + Poin ===
            roleSiswa -> {
                try {
                    val attService = retrofit.create(AttendanceService::class.java)
                    val currentMonth = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date())
                    val attResp = attService.getMyAttendance(bulan = currentMonth)
                    if (attResp.isSuccessful) {
                        kehadiranPersen = attResp.body()?.data?.persentaseKehadiran ?: 0.0
                    }
                } catch (_: Exception) { }
                try {
                    val kesService = retrofit.create(KesiswaanService::class.java)
                    val poinResp = kesService.getMyPoin()
                    if (poinResp.isSuccessful) {
                        totalPoin = poinResp.body()?.data?.summary?.netPoin ?: 0
                    }
                } catch (_: Exception) { }
            }

            // === ORTU: Status anak hari ini ===
            roleParent -> {
                try {
                    val parentService = retrofit.create(ParentService::class.java)
                    val dashResp = parentService.getParentDashboard()
                    if (dashResp.isSuccessful) {
                        val child = dashResp.body()?.data?.children?.firstOrNull()
                            ?: dashResp.body()?.data?.activeChildren?.firstOrNull()
                        childName = child?.namaLengkap ?: child?.namaSiswa ?: ""
                        childStatus = child?.gateStatus?.status ?: "Belum Hadir"
                    }
                } catch (_: Exception) { }
            }

            // === KEPSEK/ADMIN: Overview sekolah ===
            roleExec -> {
                try {
                    val dashService = retrofit.create(DashboardService::class.java)
                    val overResp = dashService.getOverview()
                    if (overResp.isSuccessful) {
                        overResp.body()?.data?.let { ov ->
                            hadirSiswa = ov.hadirSiswa
                            totalSiswa = ov.totalSiswa
                            hadirGuru = ov.hadirGuru
                            totalGuru = ov.totalGuru
                        }
                    }
                } catch (_: Exception) { }
            }

            // === GURU (default): Sesi + Piket ===
            else -> {
                try {
                    val sesiService = retrofit.create(SesiKelasService::class.java)
                    val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                    val sesiResp = sesiService.listSesi(tanggal = today, onlyMe = true)
                    if (sesiResp.isSuccessful) {
                        sesiCount = sesiResp.body()?.data?.size ?: 0
                    }
                } catch (_: Exception) { }
                try {
                    val sesiService = retrofit.create(SesiKelasService::class.java)
                    val petugasResp = sesiService.checkPetugasActive()
                    if (petugasResp.isSuccessful) {
                        piketActive = petugasResp.body()?.data?.active == true ||
                                      petugasResp.body()?.data?.isPetugasKelas == true
                    }
                } catch (_: Exception) { }
            }
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Keluar Sesi", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin keluar dari aplikasi Absenta?", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    scope.launch {
                        tokenManager.clearSession()
                        onLogout()
                    }
                }) { Text("Keluar", color = Primary, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }

    Scaffold(
        topBar = {
            DashboardTopBar(
                photoUrl = photoUrl,
                onLogoutClick = { showLogoutDialog = true },
                onAvatarClick = { onNavigate(ScreenRoutes.MY_PROFILE) }
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        if (isLoading) {
            LoadingOverlay(modifier = Modifier.padding(paddingValues))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(bottom = 32.dp, start = 16.dp, end = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 1. Hero Greeting Card (Blue Gradient) — Live API data
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    GreetingHeaderCard(
                        name = userName,
                        role = userRole,
                        schoolName = schoolName,
                        photoUrl = photoUrl
                    )
                }

                // 2. Quick Stats Row — Role-Based Live API data
                item {
                    when {
                        isSiswa -> QuickStatsSiswa(
                            kehadiranPersen = kehadiranPersen,
                            totalPoin = totalPoin
                        )
                        isParent -> QuickStatsOrtu(
                            childName = childName,
                            childStatus = childStatus
                        )
                        isExec -> QuickStatsExec(
                            hadirSiswa = hadirSiswa,
                            totalSiswa = totalSiswa,
                            hadirGuru = hadirGuru,
                            totalGuru = totalGuru
                        )
                        else -> QuickStatsGuru(
                            sesiCount = sesiCount,
                            piketActive = piketActive
                        )
                    }
                }

                // 2. Render Categories with 4-Column App-Icon Grid
                items(menuCategories) { category ->
                    if (category.items.isNotEmpty()) {
                        ModernCategorySection(
                            category = category,
                            onNavigate = onNavigate
                        )
                    }
                }
            }
        }
    }
}

/** Section Kategori Menu dengan Layout Grid App Icon 4-Kolom per Baris */
@Composable
private fun ModernCategorySection(
    category: MenuCategory,
    onNavigate: (String) -> Unit
) {
    Column {
        // Minimalist Section Header Badge Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(vertical = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(14.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Primary)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = category.title.uppercase(),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 1.sp
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Render Cards in 4-Column App-Icon Launcher Grid
        category.items.chunked(4).forEach { rowItems ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                rowItems.forEach { card ->
                    Box(modifier = Modifier.weight(1f)) {
                        AppIconGridItem(card = card, onClick = { onNavigate(card.route) })
                    }
                }
                // Fill blank slots in row to keep 4-column alignment
                repeat(4 - rowItems.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

/** TopBar Dashboard: Logo + "Dashboard" + Search + Avatar (Live Photo) + Logout */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DashboardTopBar(
    photoUrl: String?,
    onLogoutClick: () -> Unit,
    onAvatarClick: () -> Unit
) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Logo Absenta (Squircle mini)
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            Brush.linearGradient(listOf(Primary, PrimaryDark))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "A",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Dashboard",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
        },
        actions = {
            IconButton(onClick = { /* Search placeholder */ }) {
                Icon(Icons.Default.Search, contentDescription = "Cari", tint = Primary)
            }
            // Avatar mini — Foto profil dari API /auth/me
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(PrimaryContainer)
                    .clickable { onAvatarClick() },
                contentAlignment = Alignment.Center
            ) {
                if (!photoUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = ImageRequest.Builder(androidx.compose.ui.platform.LocalContext.current)
                            .data(photoUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = "Foto Profil",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(34.dp).clip(CircleShape)
                    )
                } else {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = "Profil",
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            IconButton(onClick = onLogoutClick) {
                Icon(
                    Icons.AutoMirrored.Filled.Logout,
                    contentDescription = "Logout",
                    tint = Primary
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = BackgroundDark,
            titleContentColor = TextPrimary,
            actionIconContentColor = Primary
        )
    )
}

/** Greeting Hero Card — Live data dari API /auth/me (Nama, Foto, Sekolah) */
@Composable
private fun GreetingHeaderCard(
    name: String,
    role: String,
    schoolName: String = "Absenta",
    photoUrl: String? = null
) {
    // Time-based greeting
    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when {
            hour < 11 -> "Selamat Pagi,"
            hour < 15 -> "Selamat Siang,"
            hour < 18 -> "Selamat Sore,"
            else -> "Selamat Malam,"
        }
    }
    val displayName = name.ifEmpty { "Pengguna Absenta" }
    val formattedRole = role.uppercase().replace("_", " ")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Primary, PrimaryLight)
                    )
                )
                .padding(horizontal = 20.dp, vertical = 18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Text Content
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = greeting,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.85f)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = displayName,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    // Role Badge + School Name (Live dari API)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color.White.copy(alpha = 0.25f))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = formattedRole,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "·  $schoolName",
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Right: Avatar Circle (Live Photo dari API /auth/me)
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.25f)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!photoUrl.isNullOrEmpty()) {
                        AsyncImage(
                            model = ImageRequest.Builder(androidx.compose.ui.platform.LocalContext.current)
                                .data(photoUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Foto Profil",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(52.dp).clip(CircleShape)
                        )
                    } else {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = "Avatar",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }
        }
    }
}

/** ═══ GURU Quick Stats: Sesi Hari Ini + Status Piket ═══ */
@Composable
private fun QuickStatsGuru(sesiCount: Int, piketActive: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.Groups,
            iconTint = Primary,
            label = "SESI HARI INI",
            value = "$sesiCount Kelas",
            valueColor = TextPrimary
        )
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.AssignmentInd,
            iconTint = if (piketActive) Success else TextTertiary,
            label = "PIKET",
            value = if (piketActive) "Aktif" else "Tidak Aktif",
            valueColor = if (piketActive) Success else TextTertiary
        )
    }
}

/** ═══ SISWA Quick Stats: Kehadiran Bulan Ini + Poin Saya ═══ */
@Composable
private fun QuickStatsSiswa(kehadiranPersen: Double, totalPoin: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.AutoMirrored.Filled.FactCheck,
            iconTint = Success,
            label = "KEHADIRAN",
            value = "${String.format("%.0f", kehadiranPersen)}%",
            valueColor = if (kehadiranPersen >= 80) Success else com.absenta.app.ui.theme.Danger
        )
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.EmojiEvents,
            iconTint = if (totalPoin >= 0) Primary else com.absenta.app.ui.theme.Danger,
            label = "POIN SAYA",
            value = if (totalPoin >= 0) "+$totalPoin" else "$totalPoin",
            valueColor = if (totalPoin >= 0) Primary else com.absenta.app.ui.theme.Danger
        )
    }
}

/** ═══ KEPSEK/ADMIN Quick Stats: Hadir Siswa + Hadir Guru ═══ */
@Composable
private fun QuickStatsExec(
    hadirSiswa: Int, totalSiswa: Int,
    hadirGuru: Int, totalGuru: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.School,
            iconTint = Primary,
            label = "HADIR SISWA",
            value = "$hadirSiswa/$totalSiswa",
            valueColor = TextPrimary
        )
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.Person,
            iconTint = Success,
            label = "HADIR GURU",
            value = "$hadirGuru/$totalGuru",
            valueColor = TextPrimary
        )
    }
}

/** ═══ ORTU Quick Stats: Status Anak + Info ═══ */
@Composable
private fun QuickStatsOrtu(childName: String, childStatus: String) {
    val isHadir = childStatus.uppercase().contains("HADIR") ||
                  childStatus.uppercase().contains("MASUK")
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.School,
            iconTint = if (isHadir) Success else com.absenta.app.ui.theme.Warning,
            label = "STATUS ANAK",
            value = if (isHadir) "Hadir" else childStatus.ifEmpty { "Belum Hadir" },
            valueColor = if (isHadir) Success else com.absenta.app.ui.theme.Warning
        )
        QuickStatCard(
            modifier = Modifier.weight(1f).fillMaxHeight(),
            icon = Icons.Default.Person,
            iconTint = Primary,
            label = "ANAK",
            value = childName.ifEmpty { "—" },
            valueColor = TextPrimary
        )
    }
}

/** Kartu Statistik Mini Reusable — DRY component untuk semua varian role */
@Composable
private fun QuickStatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    iconTint: Color,
    label: String,
    value: String,
    valueColor: Color
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = label,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = value,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = valueColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/** App-Icon Menu Item seukuran Ikon Aplikasi Smartphone (Squircle 54dp + Label 1 Kata) */
@Composable
private fun AppIconGridItem(card: MenuCard, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 2.dp)
    ) {
        // Squircle App Icon Container (54dp x 54dp)
        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    Brush.linearGradient(card.bgGradient)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = card.icon,
                contentDescription = card.label,
                tint = card.iconColor,
                modifier = Modifier.size(26.dp)
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Label Fitur 1 Kata Saja
        Text(
            text = card.label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextPrimary,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * Membangun 5 [MenuCategory] dengan label 1 kata & gradien warna modern khas App Icons.
 */
private fun buildMenuCategories(role: String, capabilities: List<String>): List<MenuCategory> {
    val normalizedRole = role.uppercase()
    val isSiswa = normalizedRole == "SISWA" || normalizedRole.contains("SISWA")
    val isParent = normalizedRole == "PARENT" || normalizedRole.contains("PARENT") || normalizedRole.contains("ORTU")

    // 1. AKADEMIK (Jadwal, Kalender, Riwayat, Monitoring, Supervisi, Eksekutif)
    val akademikCards = mutableListOf<MenuCard>()
    if (isSiswa || capabilities.contains("academic.schedules.view.list") || normalizedRole.contains("GURU") || normalizedRole.contains("KURIKULUM") || normalizedRole.contains("ADMIN")) {
        akademikCards += MenuCard(
            route = ScreenRoutes.MY_SCHEDULE,
            label = "Jadwal",
            icon = Icons.Default.CalendarMonth,
            bgGradient = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
            iconColor = Color.White
        )
    }
    akademikCards += MenuCard(
        route = ScreenRoutes.KALENDER_AKADEMIK,
        label = "Kalender",
        icon = Icons.Default.CalendarMonth,
        bgGradient = listOf(Color(0xFF0284C7), Color(0xFF0369A1)),
        iconColor = Color.White
    )
    if (!isSiswa && !isParent && (normalizedRole.contains("GURU") || normalizedRole.contains("WALIKELAS") || normalizedRole.contains("KURIKULUM") || normalizedRole.contains("KEPSEK") || normalizedRole.contains("ADMIN") || capabilities.contains("attendance.riwayat_ajar.view"))) {
        akademikCards += MenuCard(
            route = ScreenRoutes.RIWAYAT_AJAR,
            label = "Riwayat",
            icon = Icons.Default.Book,
            bgGradient = listOf(Color(0xFFEC4899), Color(0xFFBE185D)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (capabilities.contains("attendance.monitoring.view.live.status") || normalizedRole.contains("PIKET") || normalizedRole.contains("GURU") || normalizedRole.contains("KURIKULUM") || normalizedRole.contains("KEPSEK") || normalizedRole.contains("ADMIN"))) {
        akademikCards += MenuCard(
            route = ScreenRoutes.MONITORING_KBM,
            label = "Monitoring",
            icon = Icons.AutoMirrored.Filled.FactCheck,
            bgGradient = listOf(Color(0xFF6366F1), Color(0xFF4338CA)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (capabilities.contains("kurikulum.supervisi.manage") || normalizedRole.contains("KEPSEK") || normalizedRole.contains("KEPALA_SEKOLAH") || normalizedRole.contains("KURIKULUM") || normalizedRole.contains("PENGAWAS") || normalizedRole.contains("ADMIN"))) {
        akademikCards += MenuCard(
            route = ScreenRoutes.SUPERVISI_KBM,
            label = "Supervisi",
            icon = Icons.Default.EmojiEvents,
            bgGradient = listOf(Color(0xFFF59E0B), Color(0xFFB45309)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (capabilities.contains("dashboard.view.kepsek") || normalizedRole.contains("KEPSEK") || normalizedRole.contains("KEPALA_SEKOLAH") || normalizedRole.contains("EXECUTIVE") || normalizedRole.contains("ADMIN"))) {
        akademikCards += MenuCard(
            route = ScreenRoutes.EXECUTIVE_DASHBOARD,
            label = "Eksekutif",
            icon = Icons.Default.Dashboard,
            bgGradient = listOf(Color(0xFF10B981), Color(0xFF047857)),
            iconColor = Color.White
        )
    }

    // 2. KESISWAAN (Poin, Piket, BK)
    val kesiswaanCards = mutableListOf<MenuCard>()
    if (isSiswa || capabilities.contains("affairs.violations.view.list") || capabilities.contains("affairs.violations.report") || normalizedRole.contains("BPBK") || normalizedRole.contains("KESISWAAN") || normalizedRole.contains("GURU") || normalizedRole.contains("ADMIN")) {
        kesiswaanCards += MenuCard(
            route = ScreenRoutes.MY_POIN,
            label = "Poin",
            icon = Icons.Default.EmojiEvents,
            bgGradient = listOf(Color(0xFFF97316), Color(0xFFC2410C)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (capabilities.contains("affairs.piket.manage") || normalizedRole.contains("PIKET") || normalizedRole.contains("KESISWAAN") || normalizedRole.contains("BPBK") || normalizedRole.contains("GURU") || normalizedRole.contains("ADMIN"))) {
        kesiswaanCards += MenuCard(
            route = ScreenRoutes.SURAT_IZIN_PIKET,
            label = "Piket",
            icon = Icons.Default.Book,
            bgGradient = listOf(Color(0xFFF43F5E), Color(0xFFBE123C)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (normalizedRole.contains("BPBK") || normalizedRole.contains("GURU") || normalizedRole.contains("KESISWAAN") || normalizedRole.contains("KEPSEK") || normalizedRole.contains("ADMIN"))) {
        kesiswaanCards += MenuCard(
            route = ScreenRoutes.BPBK_KONSELING,
            label = "BK",
            icon = Icons.Default.Person,
            bgGradient = listOf(Color(0xFFEC4899), Color(0xFF9D174D)),
            iconColor = Color.White
        )
    }

    // 3. PRESENSI (Absensi, Sesi, Scanner)
    val presensiCards = mutableListOf<MenuCard>()
    if (isSiswa || isParent || capabilities.contains("attendance.recap.view.monthly") || capabilities.contains("attendance.recap.view.daily") || capabilities.contains("attendance.reports.view") || normalizedRole.contains("GURU") || normalizedRole.contains("ADMIN")) {
        presensiCards += MenuCard(
            route = ScreenRoutes.MY_ATTENDANCE,
            label = "Absensi",
            icon = Icons.AutoMirrored.Filled.FactCheck,
            bgGradient = listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (normalizedRole.contains("PETUGAS") || normalizedRole.contains("KELAS") || normalizedRole.contains("GURU") || normalizedRole.contains("WALIKELAS") || normalizedRole.contains("KURIKULUM") || normalizedRole.contains("ADMIN") || capabilities.contains("attendance.sessions.create") || capabilities.contains("attendance.sessions.update.attendance"))) {
        presensiCards += MenuCard(
            route = ScreenRoutes.SESI_KELAS_MANAGER,
            label = "Sesi",
            icon = Icons.Default.Groups,
            bgGradient = listOf(Color(0xFF10B981), Color(0xFF059669)),
            iconColor = Color.White
        )
    }
    if (!isSiswa && !isParent && (normalizedRole.contains("GERBANG") || capabilities.contains("attendance.scan") || capabilities.contains("attendance.gate.tap.entry"))) {
        presensiCards += MenuCard(
            route = ScreenRoutes.CAMERA_SCANNER,
            label = "Scanner",
            icon = Icons.Default.QrCodeScanner,
            bgGradient = listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8)),
            iconColor = Color.White
        )
    }

    // 4. HUBIN (PKL)
    val hubinCards = mutableListOf<MenuCard>()
    hubinCards += MenuCard(
        route = ScreenRoutes.MONITORING_PKL,
        label = "PKL",
        icon = Icons.Default.Business,
        bgGradient = listOf(Color(0xFF6366F1), Color(0xFF4338CA)),
        iconColor = Color.White
    )

    // 5. INFORMASI (Pengumuman, Profil, Berkas)
    val infoCards = mutableListOf<MenuCard>()
    infoCards += MenuCard(
        route = ScreenRoutes.NOTIFICATIONS,
        label = "Pengumuman",
        icon = Icons.Default.Notifications,
        bgGradient = listOf(Color(0xFF14B8A6), Color(0xFF0D9488)),
        iconColor = Color.White
    )
    infoCards += MenuCard(
        route = ScreenRoutes.MY_PROFILE,
        label = "Profil",
        icon = Icons.Default.Person,
        bgGradient = listOf(Color(0xFF06B6D4), Color(0xFF0891B2)),
        iconColor = Color.White
    )
    if (capabilities.contains("documents.upload") || capabilities.contains("academic.profile.update") || isSiswa || normalizedRole.contains("GURU") || normalizedRole.contains("ADMIN")) {
        infoCards += MenuCard(
            route = ScreenRoutes.UPLOAD_BERKAS,
            label = "Berkas",
            icon = Icons.Default.Upload,
            bgGradient = listOf(Color(0xFF64748B), Color(0xFF334155)),
            iconColor = Color.White
        )
    }

    return listOf(
        MenuCategory("Akademik", akademikCards),
        MenuCategory("Kesiswaan", kesiswaanCards),
        MenuCategory("Presensi", presensiCards),
        MenuCategory("Hubin", hubinCards),
        MenuCategory("Informasi & Akun", infoCards)
    )
}
