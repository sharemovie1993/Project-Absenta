package com.absenta.app.ui.features.hubin

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.api.PklAbsensiRecord
import com.absenta.app.data.api.SiswaPkl
import com.absenta.app.ui.components.PklStatCard
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first
import com.absenta.app.data.local.SessionManager
import androidx.compose.runtime.collectAsState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PklVerificationScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("HUBIN")
    }

    var userRole by remember { mutableStateOf("") }
    var userCapabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var positionCodes by remember { mutableStateOf<List<String>>(emptyList()) }
    var activeGuruId by remember { mutableStateOf<String?>(null) }

    var penempatanList by remember { mutableStateOf<List<SiswaPkl>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("SEMUA", "PERLU VERIFIKASI", "SUDAH DIVERIFIKASI")

    fun loadPenempatanData() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getPenempatan(limit = 100)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    penempatanList = resp.body()?.data ?: emptyList()
                    Log.d("AbsentaDebug", "PKL penempatan loaded: ${penempatanList.size}")
                } else {
                    Log.w("AbsentaDebug", "PklVerificationScreen API failed: ${resp.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "PklVerificationScreen error", e)
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        positionCodes = sessionManager.positionCodesFlow.first()

        try {
            val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
            val profileResp = academicService.getGuruMe()
            if (profileResp.isSuccessful && profileResp.body()?.success == true) {
                activeGuruId = profileResp.body()?.data?.id
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        loadPenempatanData()
    }

    val isGlobalHubin = remember(userRole, userCapabilities, positionCodes) {
        val roleUpper = userRole.uppercase()
        roleUpper == "ADMIN" || roleUpper == "SUPERADMIN" ||
                positionCodes.contains("HUBIN") || userCapabilities.contains("hubin.partners.manage")
    }

    // Process placements to find pending vs verified logs
    val verificationItems = remember(penempatanList, isGlobalHubin, activeGuruId) {
        val list = mutableListOf<VerificationItemHolder>()
        val baseList = if (isGlobalHubin) {
            penempatanList
        } else {
            if (activeGuruId != null) {
                penempatanList.filter { it.pembimbing_id == activeGuruId }
            } else {
                emptyList()
            }
        }

        baseList.forEach { pkl ->
            val unverifiedLogs = pkl.AbsensiPkl?.filter { !it.is_verified } ?: emptyList()
            val verifiedLogs = pkl.AbsensiPkl?.filter { it.is_verified } ?: emptyList()
            
            list.add(
                VerificationItemHolder(
                    pkl = pkl,
                    unverifiedLogs = unverifiedLogs,
                    verifiedLogs = verifiedLogs
                )
            )
        }
        list
    }

    val filteredItems = when (selectedTab) {
        1 -> verificationItems.filter { it.unverifiedLogs.isNotEmpty() }
        2 -> verificationItems.filter { it.unverifiedLogs.isEmpty() && it.verifiedLogs.isNotEmpty() }
        else -> verificationItems
    }

    if (isLocked) {
        HubinPremiumGate(
            featureName = "Verifikasi Absensi PKL",
            description = "Lakukan verifikasi kehadiran, kepatuhan geofencing, serta validasi jurnal aktivitas harian magang siswa secara praktis langsung dari perangkat Anda.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Verifikasi Absensi PKL", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color(0xFF1E3C72),
                        titleContentColor = Color.White
                    )
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF8FAFC))
            ) {
                // Stats Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    PklStatCard("Total Siswa", verificationItems.size.toString(), Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                    PklStatCard("Perlu Verifikasi", verificationItems.count { it.unverifiedLogs.isNotEmpty() }.toString(), Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                    PklStatCard("Selesai Verif", verificationItems.count { it.unverifiedLogs.isEmpty() && it.verifiedLogs.isNotEmpty() }.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
                }

                // Tab Row
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = {
                                Text(
                                    title,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selectedTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (filteredItems.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Tidak ada data verifikasi", color = Color(0xFF94A3B8))
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(filteredItems) { item ->
                            VerificationStudentCard(
                                item = item,
                                onVerifyLog = { logId ->
                                    scope.launch {
                                        try {
                                            val service = ApiClient.getClient(context).create(HubinService::class.java)
                                            val resp = service.verifyAbsensi(logId)
                                            if (resp.isSuccessful && resp.body()?.success == true) {
                                                Toast.makeText(context, "Log absensi berhasil diverifikasi!", Toast.LENGTH_SHORT).show()
                                                loadPenempatanData()
                                            } else {
                                                Toast.makeText(context, "Gagal memverifikasi", Toast.LENGTH_SHORT).show()
                                            }
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Kesalahan koneksi", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VerificationStudentCard(
    item: VerificationItemHolder,
    onVerifyLog: (String) -> Unit
) {
    val student = item.pkl
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        student.Siswa?.nama_siswa ?: "Siswa PKL",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        "NIS: ${student.Siswa?.nis ?: "-"} • ${student.Siswa?.Kelas?.nama_kelas ?: "XII - PKL"}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                if (item.unverifiedLogs.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFFEF3C7), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            "${item.unverifiedLogs.size} Menunggu",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD97706)
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFD1FAE5), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            "Clear",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Home, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Text(
                    student.Mitra?.nama ?: "Mitra belum ditentukan",
                    fontSize = 12.sp,
                    color = Color(0xFF475569)
                )
            }

            // List of unverified logs to verify individually
            if (item.unverifiedLogs.isNotEmpty()) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))
                Text("Daftar Absen Menunggu Verifikasi:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                Spacer(modifier = Modifier.height(6.dp))
                
                item.unverifiedLogs.forEach { record ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(record.tanggal, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                Button(
                                    onClick = { onVerifyLog(record.id) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(12.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Verify", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Masuk: ${record.jam_masuk ?: "-"} • Pulang: ${record.jam_pulang ?: "-"}",
                                fontSize = 11.sp,
                                color = Color(0xFF475569)
                            )
                            if (!record.kegiatan.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Jurnal: ${record.kegiatan}", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                    }
                }
            }
        }
    }
}

data class VerificationItemHolder(
    val pkl: SiswaPkl,
    val unverifiedLogs: List<PklAbsensiRecord>,
    val verifiedLogs: List<PklAbsensiRecord>
)
