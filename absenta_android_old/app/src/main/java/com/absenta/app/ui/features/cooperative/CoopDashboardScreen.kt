package com.absenta.app.ui.features.cooperative

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopDashboardScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit,
    onNavigateToSavings: () -> Unit,
    onNavigateToLoans: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val coopService = remember { ApiClient.getClient(context).create(CooperativeService::class.java) }

    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val capabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())

    // Premium Gate Check
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Dashboard Koperasi",
            description = "Fitur ringkasan informasi dan statistik koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Role detection
    val isGuruOrSiswa = remember(userRole) {
        val role = userRole?.uppercase() ?: ""
        role == "GURU" || role == "SISWA" || role == "STUDENT" || role == "TEACHER"
    }

    val isOperator = remember(userRole, capabilities) {
        val role = userRole?.uppercase() ?: ""
        role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN" ||
                capabilities.contains("cooperative.members.manage") ||
                capabilities.contains("cooperative.savings.deposit")
    }

    // States
    var isLoading by remember { mutableStateOf(false) }
    var memberStatus by remember { mutableStateOf("loading") } // "loading", "member", "non-member"
    var totalMySavings by remember { mutableDoubleStateOf(0.0) }
    
    // Stats for Operator
    var statsMembers by remember { mutableIntStateOf(0) }
    var statsSavings by remember { mutableDoubleStateOf(0.0) }
    var statsLoans by remember { mutableDoubleStateOf(0.0) }
    var statsDue by remember { mutableIntStateOf(0) }

    var announcements by remember { mutableStateOf<List<CoopAnnouncement>>(emptyList()) }
    var selectedAnn by remember { mutableStateOf<CoopAnnouncement?>(null) }

    val formatRupiah = remember {
        NumberFormat.getCurrencyInstance(Locale("in", "ID")).apply {
            maximumFractionDigits = 0
        }
    }

    fun loadData() {
        isLoading = true
        scope.launch {
            try {
                // Fetch announcements
                val annRes = coopService.getAnnouncements()
                if (annRes.isSuccessful && annRes.body()?.success == true) {
                    announcements = annRes.body()?.data ?: emptyList()
                }

                if (isGuruOrSiswa) {
                    // Check membership
                    val memberRes = coopService.getMemberMe()
                    if (memberRes.isSuccessful && memberRes.body()?.success == true) {
                        val member = memberRes.body()?.data
                        if (member != null && member.status == "ACTIVE") {
                            memberStatus = "member"
                            
                            // Fetch savings balance
                            val savingsRes = coopService.getSavings()
                            if (savingsRes.isSuccessful) {
                                val list = savingsRes.body() ?: emptyList()
                                totalMySavings = list.sumOf { it.balance?.toDoubleOrNull() ?: 0.0 }
                            }
                        } else {
                            memberStatus = "non-member"
                        }
                    } else {
                        memberStatus = "non-member"
                    }
                } else {
                    memberStatus = "member" // default view for admin/operator
                }

                if (isOperator) {
                    val statsRes = coopService.getDashboardStats()
                    if (statsRes.isSuccessful && statsRes.body()?.success == true) {
                        val data = statsRes.body()?.data
                        if (data != null) {
                            statsMembers = data.totalMembers
                            statsSavings = data.totalSavings
                            statsLoans = data.totalLoans
                            statsDue = data.dueInstallments
                        }
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat data: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard Koperasi", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { loadData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Segarkan", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3C72))
            )
        }
    ) { paddingValues ->
        if (isLoading && announcements.isEmpty() && memberStatus == "loading") {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Banner Non-Member
                if (isGuruOrSiswa && memberStatus == "non-member") {
                    item {
                        NonMemberBanner()
                    }
                }

                // Banner Active Member Info
                if (isGuruOrSiswa && memberStatus == "member") {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFE6F4EA)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Aktif", tint = Color(0xFF137333))
                                Text(
                                    "Anda terdaftar sebagai Anggota Aktif Koperasi Sekolah. Akses penuh layanan simpan pinjam diaktifkan.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF137333),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                // Member Personal Stats
                if (isGuruOrSiswa && memberStatus == "member") {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            PersonalStatCard(
                                title = "Total Simpanan Saya",
                                value = formatRupiah.format(totalMySavings),
                                icon = Icons.Default.Wallet,
                                color = Color(0xFF10B981),
                                modifier = Modifier.weight(1f)
                            )

                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(110.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(12.dp),
                                    verticalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Pintasan Layanan", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                    
                                    Button(
                                        onClick = onNavigateToSavings,
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72).copy(alpha = 0.1f)),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        modifier = Modifier.fillMaxWidth().height(32.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Tabungan &rarr;", color = Color(0xFF1E3C72), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }

                                    Button(
                                        onClick = onNavigateToLoans,
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981).copy(alpha = 0.1f)),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        modifier = Modifier.fillMaxWidth().height(32.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Pinjaman &rarr;", color = Color(0xFF10B981), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                // Operator Stats Grid
                if (isOperator) {
                    item {
                        Text(
                            text = "Statistik Koperasi (Pengurus)",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }

                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                StatCard(
                                    title = "Total Anggota",
                                    value = statsMembers.toString(),
                                    icon = Icons.Default.Person,
                                    color = Color(0xFF3B82F6),
                                    modifier = Modifier.weight(1f)
                                )
                                StatCard(
                                    title = "Total Simpanan",
                                    value = formatRupiah.format(statsSavings),
                                    icon = Icons.Default.Wallet,
                                    color = Color(0xFF10B981),
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                StatCard(
                                    title = "Pinjaman Aktif",
                                    value = formatRupiah.format(statsLoans),
                                    icon = Icons.Default.TrendingUp,
                                    color = Color(0xFF8B5CF6),
                                    modifier = Modifier.weight(1f)
                                )
                                StatCard(
                                    title = "Jatuh Tempo",
                                    value = "$statsDue Cicilan",
                                    icon = Icons.Default.Warning,
                                    color = Color(0xFFEF4444),
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }

                // Announcements Section
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Pengumuman Koperasi",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }
                }

                if (announcements.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("Tidak ada pengumuman koperasi saat ini.", color = Color.Gray, fontSize = 13.sp)
                            }
                        }
                    }
                } else {
                    items(announcements) { ann ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedAnn = ann },
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF3B82F6).copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                                            .padding(6.dp)
                                    ) {
                                        Icon(Icons.Default.Notifications, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(16.dp))
                                    }
                                    Text("PENGUMUMAN", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                }
                                
                                Text(
                                    text = ann.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier.padding(top = 8.dp),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Text(
                                    text = ann.content,
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B),
                                    modifier = Modifier.padding(top = 4.dp),
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis
                                )
                                
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = ann.createdAt.substringBefore("T"),
                                        fontSize = 10.sp,
                                        color = Color.Gray
                                    )
                                    Text(
                                        text = "Selengkapnya &rarr;",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1E3C72)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Detail Announcement Dialog
    selectedAnn?.let { ann ->
        AlertDialog(
            onDismissRequest = { selectedAnn = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Notifications, contentDescription = null, tint = Color(0xFF3B82F6))
                    Text(ann.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(ann.content, fontSize = 13.sp, color = Color(0xFF334155))
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Diterbitkan: ${ann.createdAt.replace("T", " ").substringBefore(".")}", fontSize = 10.sp, color = Color.Gray)
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedAnn = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Tutup", color = Color.White)
                }
            }
        )
    }
}

@Composable
fun NonMemberBanner() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(
                    colors = listOf(Color(0xFF4F46E5), Color(0xFF7C3AED))
                ),
                shape = RoundedCornerShape(16.dp)
            )
            .padding(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                        .padding(6.dp)
                ) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                }
                Text(
                    "Anda Belum Terdaftar sebagai Anggota Koperasi",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            Text(
                "Untuk mengakses fitur tabungan personal, pinjaman, dan pembagian SHU, silakan daftarkan diri Anda langsung kepada pengurus koperasi sekolah.",
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 12.sp,
                lineHeight = 16.sp
            )
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(100.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(color.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(22.dp))
            }
            Column(verticalArrangement = Arrangement.Center) {
                Text(
                    text = title.uppercase(),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Gray
                )
                Text(
                    text = value,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun PersonalStatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(110.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
            }
            Column {
                Text(title, fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Medium)
                Text(
                    text = value,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B),
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}
