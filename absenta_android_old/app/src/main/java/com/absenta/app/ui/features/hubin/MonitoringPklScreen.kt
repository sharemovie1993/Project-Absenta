package com.absenta.app.ui.features.hubin

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.api.SiswaPkl
import com.absenta.app.ui.components.PklStatCard
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.absenta.app.data.local.SessionManager
import androidx.compose.runtime.collectAsState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonitoringPklScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
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
    var searchQuery by remember { mutableStateOf("") }
    var filterClass by remember { mutableStateOf("all") }

    fun loadMonitoringData() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getPenempatan(limit = 200)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    penempatanList = resp.body()?.data ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal memuat data monitoring", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
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

        loadMonitoringData()
    }

    val isGlobalHubin = remember(userRole, userCapabilities, positionCodes) {
        val roleUpper = userRole.uppercase()
        roleUpper == "ADMIN" || roleUpper == "SUPERADMIN" ||
                positionCodes.contains("HUBIN") || userCapabilities.contains("hubin.partners.manage")
    }

    // Process items for display
    val todayDateStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

    val monitoringItems = remember(penempatanList, todayDateStr, isGlobalHubin, activeGuruId) {
        val baseList = if (isGlobalHubin) {
            penempatanList
        } else {
            if (activeGuruId != null) {
                penempatanList.filter { it.pembimbing_id == activeGuruId }
            } else {
                emptyList()
            }
        }

        baseList.map { pkl ->
            val todayAbsen = pkl.AbsensiPkl?.find { it.tanggal.startsWith(todayDateStr) }
            
            MonitoringItem(
                id = pkl.id,
                siswaName = pkl.Siswa?.nama_siswa ?: "Siswa magang",
                kelas = pkl.Siswa?.Kelas?.nama_kelas ?: "XII - PKL",
                perusahaan = pkl.Mitra?.nama ?: "Mitra Industri",
                lokasi = pkl.Mitra?.alamat ?: "-",
                status = todayAbsen?.status ?: "BELUM ABSEN",
                jamMasuk = todayAbsen?.jam_masuk ?: "-",
                jamPulang = todayAbsen?.jam_pulang ?: "-",
                latitude = todayAbsen?.latitude_masuk,
                longitude = todayAbsen?.longitude_masuk,
                isVerified = todayAbsen?.is_verified ?: false
            )
        }
    }

    val classList = remember(monitoringItems) {
        listOf("all") + monitoringItems.map { it.kelas }.distinct().sorted()
    }

    val filteredItems = remember(monitoringItems, searchQuery, filterClass) {
        monitoringItems.filter { item ->
            val matchesSearch = item.siswaName.contains(searchQuery, ignoreCase = true) ||
                    item.perusahaan.contains(searchQuery, ignoreCase = true)
            val matchesClass = filterClass == "all" || item.kelas == filterClass
            matchesSearch && matchesClass
        }
    }

    // Dynamic stats
    val totalSiswaAktif = monitoringItems.size
    val totalHadirHariIni = monitoringItems.count { it.status == "HADIR" }
    val totalBelumAbsen = monitoringItems.count { it.status == "BELUM ABSEN" }

    // Export CSV and share it via Share Intent
    fun exportToCsvAndShare() {
        if (filteredItems.isEmpty()) {
            Toast.makeText(context, "Tidak ada data untuk diekspor", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val csvContent = StringBuilder()
            // UTF-8 BOM
            csvContent.append('\ufeff')
            // Headers
            csvContent.append("Nama Siswa,Kelas,Perusahaan Mitra,Status Presensi,Waktu Tap,Koordinat GPS\n")
            // Rows
            filteredItems.forEach { item ->
                val gps = if (item.latitude != null) "${item.latitude}, ${item.longitude}" else "N/A"
                csvContent.append("\"${item.siswaName}\",\"${item.kelas}\",\"${item.perusahaan}\",\"${item.status}\",\"${item.jamMasuk}\",\"$gps\"\n")
            }

            // Write to a cache file
            val cacheDir = context.cacheDir
            val csvFile = File(cacheDir, "Laporan_Monitoring_PKL_${todayDateStr}.csv")
            csvFile.writeText(csvContent.toString(), Charsets.UTF_8)

            // Create URI using FileProvider
            val authority = "${context.packageName}.fileprovider"
            val fileUri: Uri = FileProvider.getUriForFile(context, authority, csvFile)

            // Launch share sheet
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_STREAM, fileUri)
                putExtra(Intent.EXTRA_SUBJECT, "Laporan Monitoring PKL $todayDateStr")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Bagikan Laporan PKL"))
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal membuat berkas CSV", Toast.LENGTH_SHORT).show()
        }
    }

    if (isLocked) {
        HubinPremiumGate(
            featureName = "Monitoring PKL Real-Time",
            description = "Pantau kehadiran siswa magang secara real-time, pantau log aktivitas harian, tinjau titik lokasi geofencing presensi, serta unduh laporan pemantauan berkala.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Monitoring PKL Real-Time", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                        }
                    },
                    actions = {
                        IconButton(onClick = { exportToCsvAndShare() }) {
                            Icon(Icons.Default.Share, contentDescription = "Ekspor CSV", tint = Color.White)
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
                    PklStatCard("Aktif PKL", totalSiswaAktif.toString(), Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                    PklStatCard("Hadir Hari Ini", totalHadirHariIni.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
                    PklStatCard("Belum Absen", totalBelumAbsen.toString(), Color(0xFFEF4444), modifier = Modifier.weight(1f))
                }

                // Filters Box
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari siswa atau perusahaan...", fontSize = 13.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                            singleLine = true
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.List, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Filter Kelas", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                            }

                            // Class dropdown/spinner
                            var classExpanded by remember { mutableStateOf(false) }
                            val displayClass = if (filterClass == "all") "Semua Kelas" else filterClass

                            Box {
                                Button(
                                    onClick = { classExpanded = !classExpanded },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFECEFF1), contentColor = Color(0xFF37474F)),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                    modifier = Modifier.height(30.dp)
                                ) {
                                    Text(displayClass, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, modifier = Modifier.size(12.dp))
                                }

                                DropdownMenu(
                                    expanded = classExpanded,
                                    onDismissRequest = { classExpanded = false }
                                ) {
                                    classList.forEach { cls ->
                                        val label = if (cls == "all") "Semua Kelas" else cls
                                        DropdownMenuItem(
                                            text = { Text(label) },
                                            onClick = {
                                                filterClass = cls
                                                classExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Sync/Refresh Button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Hari ini: $todayDateStr", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    TextButton(
                        onClick = { loadMonitoringData() },
                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFF1E3C72))
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Segarkan", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (filteredItems.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Tidak ada aktivitas presensi terdeteksi.", color = Color(0xFF94A3B8))
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(filteredItems) { item ->
                            MonitoringCard(item = item)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MonitoringCard(item: MonitoringItem) {
    val context = LocalContext.current
    val statusColor = when (item.status) {
        "HADIR" -> Color(0xFF10B981)
        "SAKIT" -> Color(0xFFEF4444)
        "IZIN" -> Color(0xFFF59E0B)
        else -> Color(0xFF94A3B8)
    }
    val statusBg = when (item.status) {
        "HADIR" -> Color(0xFFD1FAE5)
        "SAKIT" -> Color(0xFFFFEAEA)
        "IZIN" -> Color(0xFFFEF3C7)
        else -> Color(0xFFF1F5F9)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
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
                    Text(item.siswaName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                    Text("Kelas: ${item.kelas} • ${item.perusahaan}", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Box(
                    modifier = Modifier
                        .background(statusBg, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(item.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = statusColor)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Tap Masuk", fontSize = 10.sp, color = Color.Gray)
                    Text(item.jamMasuk, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                }
                Column {
                    Text("Tap Pulang", fontSize = 10.sp, color = Color.Gray)
                    Text(item.jamPulang, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                }

                // GPS Location link button
                if (item.latitude != null && item.longitude != null) {
                    Button(
                        onClick = {
                            val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}")
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            context.startActivity(intent)
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF1E3C72).copy(alpha = 0.1f),
                            contentColor = Color(0xFF1E3C72)
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFFEF4444)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Buka Peta", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Text(
                        text = "Lokasi: ${item.lokasi}",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        modifier = Modifier.widthIn(max = 140.dp)
                    )
                }
            }
        }
    }
}

data class MonitoringItem(
    val id: String,
    val siswaName: String,
    val kelas: String,
    val perusahaan: String,
    val lokasi: String,
    val status: String,
    val jamMasuk: String,
    val jamPulang: String,
    val latitude: Double?,
    val longitude: Double?,
    val isVerified: Boolean
)
