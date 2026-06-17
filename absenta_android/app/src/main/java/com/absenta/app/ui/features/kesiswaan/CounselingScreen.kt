package com.absenta.app.ui.features.kesiswaan

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.KesiswaanService
import com.absenta.app.data.api.Pelanggaran
import kotlinx.coroutines.launch
import android.util.Log

data class CareSpotlightItem(
    val studentId: String,
    val name: String,
    val className: String,
    val totalPoints: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CounselingScreen(
    onNavigateBack: () -> Unit,
    onNavigateToViolations: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var violationsList by remember { mutableStateOf<List<Pelanggaran>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Calculated states
    var statsToday by remember { mutableStateOf(0) }
    var statsSevere by remember { mutableStateOf(0) }
    var statsTotal by remember { mutableStateOf(0) }
    var statsTotalPoints by remember { mutableStateOf(0) }
    var careSpotlightList by remember { mutableStateOf<List<CareSpotlightItem>>(emptyList()) }

    fun loadData() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "loadData triggered in CounselingScreen.")
            try {
                val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                val response = service.getPelanggaran(limit = 100, elevatedContext = "true")
                if (response.isSuccessful) {
                    val body = response.body()
                    violationsList = body?.data?.list ?: body?.list ?: emptyList()
                    Log.d("AbsentaDebug", "loadData success in CounselingScreen: Count=${violationsList.size}")

                    // Calculate stats
                    statsTotal = violationsList.size
                    
                    val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                    statsToday = violationsList.filter { it.tanggal.startsWith(todayStr) }.size
                    
                    statsSevere = violationsList.filter { it.poin >= 50 }.size
                    statsTotalPoints = violationsList.sumOf { it.poin }

                    // Group by student to build Care Spotlight (Top 5 students needing attention)
                    val grouped = violationsList.groupBy { it.siswa_id }
                    careSpotlightList = grouped.map { (studentId, list) ->
                        val first = list.first()
                        CareSpotlightItem(
                            studentId = studentId,
                            name = first.Siswa?.nama_siswa ?: "Siswa",
                            className = first.Siswa?.Kelas?.nama_kelas ?: "-",
                            totalPoints = list.sumOf { it.poin }
                        )
                    }.sortedByDescending { it.totalPoints }.take(5)
                    
                    Log.d("AbsentaDebug", "Calculated Spotlight: size=${careSpotlightList.size}")
                } else {
                    Log.w("AbsentaDebug", "loadData failed: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadData error", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
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
                title = { Text("Monitoring Kesiswaan & BK", fontWeight = FontWeight.Bold) },
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
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else {
                // 1. Stats Row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        StatBox(title = "Hari Ini", value = statsToday.toString(), color = Color(0xFF6366F1), modifier = Modifier.weight(1f))
                        StatBox(title = "Kasus Berat", value = statsSevere.toString(), color = Color(0xFFEF4444), modifier = Modifier.weight(1f))
                        StatBox(title = "Total Poin", value = statsTotalPoints.toString(), color = Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                    }
                }

                // 2. Action Menu
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToViolations() },
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Edit, contentDescription = "Input", tint = Color.White)
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text("Kelola & Input Catatan", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                    Text("Input catatan pelanggaran & kedisiplinan baru", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp)
                                }
                            }
                            Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Go", tint = Color.White)
                        }
                    }
                }

                // 3. Care Spotlight Section
                item {
                    Text("Care Spotlight (Prioritas Pembinaan BK)", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                }

                if (careSpotlightList.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Text(
                                text = "Semua siswa dalam kondisi baik. Tidak ada kasus yang perlu perhatian khusus.",
                                fontSize = 12.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    items(careSpotlightList) { item ->
                        CareSpotlightRowItem(item = item)
                    }
                }
            }
        }
    }
}

@Composable
fun StatBox(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = color)
        }
    }
}

@Composable
fun CareSpotlightRowItem(item: CareSpotlightItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0xFFEF4444).copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Warning, contentDescription = "Spotlight", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = item.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Kelas: ${item.className}",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${item.totalPoints} Pts",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = Color(0xFFEF4444)
                )
                Text(
                    text = "Butuh Pembinaan",
                    fontSize = 9.sp,
                    color = Color.Gray
                )
            }
        }
    }
}
