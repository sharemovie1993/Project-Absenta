package com.absenta.app.ui.features.attendance

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ArrowBack
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
import com.absenta.app.data.api.AttendanceDayDetail
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.MonthlyRekapData
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }

    var userRole by remember { mutableStateOf("") }
    var calendarDate by remember { mutableStateOf(Calendar.getInstance()) }
    var rekapData by remember { mutableStateOf<MonthlyRekapData?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    val monthYearFormat = remember { SimpleDateFormat("MMMM yyyy", Locale("in", "ID")) }
    val dbMonthFormat = remember { SimpleDateFormat("yyyy-MM", Locale.US) }

    // Memuat rekap bulanan secara otomatis saat bulan berubah
    fun loadRekap() {
        scope.launch {
            isLoading = true
            userRole = sessionManager.userRoleFlow.first() ?: ""
            val capabilities = sessionManager.capabilitiesFlow.first()
            val bulanKey = dbMonthFormat.format(calendarDate.time)
            Log.d("AbsentaDebug", "Loading attendance rekap: UserRole=$userRole, Month=$bulanKey, Capabilities=$capabilities")
            
            try {
                val apiService = ApiClient.getClient(context).create(AttendanceService::class.java)
                val isSiswaRekap = userRole == "PARENT" || userRole == "WALI_MURID" || userRole == "ORTU" || userRole == "SISWA" || userRole == "STUDENT" || capabilities.contains("attendance.rekap.siswa")
                val response = if (isSiswaRekap) {
                    Log.d("AbsentaDebug", "Fetching student attendance rekap...")
                    apiService.getRekapBulananSiswaMe(bulanKey)
                } else {
                    Log.d("AbsentaDebug", "Fetching teacher attendance rekap...")
                    apiService.getRekapBulananGuruMe(bulanKey)
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    rekapData = response.body()?.data
                    Log.d("AbsentaDebug", "Rekap load success: DaysCount=${rekapData?.detail?.size ?: 0}")
                } else {
                    rekapData = null
                    Log.w("AbsentaDebug", "Rekap load failed: Code=${response.code()}, Message=${response.body()?.message}")
                }
            } catch (e: Exception) {
                rekapData = null
                Log.e("AbsentaDebug", "Exception while loading attendance rekap", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(calendarDate) {
        loadRekap()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Riwayat Kehadiran", fontWeight = FontWeight.Bold) },
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
            // 1. Month Picker Controller
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = {
                            val newCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                add(Calendar.MONTH, -1)
                            }
                            calendarDate = newCal
                        }) {
                            Icon(Icons.Default.KeyboardArrowLeft, contentDescription = "Bulan Sebelumnya")
                        }

                        Text(
                            text = monthYearFormat.format(calendarDate.time).uppercase(),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF1E293B),
                            letterSpacing = 1.sp
                        )

                        IconButton(onClick = {
                            val newCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                add(Calendar.MONTH, 1)
                            }
                            calendarDate = newCal
                        }) {
                            Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Bulan Berikutnya")
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else if (rekapData == null || rekapData?.detail.isNullOrEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier.padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Tidak Ada Data",
                                tint = Color.Gray,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Belum Ada Data Presensi",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color(0xFF1E293B)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Tidak ditemukan riwayat kehadiran untuk periode ini.",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                // 2. Stats Grid
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Skor Kehadiran", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
                                Text("${rekapData?.persentase_kehadiran?.toInt() ?: 0}%", fontSize = 28.sp, fontWeight = FontWeight.Black, color = Color(0xFF10B981))
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Poin Pts", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
                                Text("${rekapData?.total_poin ?: 0}", fontSize = 28.sp, fontWeight = FontWeight.Black, color = Color(0xFFF59E0B))
                            }
                        }
                    }
                }

                // 3. Calendar Grid Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Days Header
                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                                listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min").forEach { day ->
                                    Text(
                                        text = day,
                                        modifier = Modifier.weight(1f),
                                        textAlign = TextAlign.Center,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Gray
                                    )
                                }
                            }

                            // Calculate Calendar Grid Days
                            val daysInMonth = calendarDate.getActualMaximum(Calendar.DAY_OF_MONTH)
                            val firstDayCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                set(Calendar.DAY_OF_MONTH, 1)
                            }
                            val dayOfWeek = firstDayCal.get(Calendar.DAY_OF_WEEK) // 1 = Sun, 2 = Mon
                            val prefixEmptyDays = if (dayOfWeek == Calendar.SUNDAY) 6 else dayOfWeek - 2

                            val totalSlots = prefixEmptyDays + daysInMonth
                            val rows = (totalSlots + 6) / 7

                            val detailMap = rekapData?.detail?.associateBy { it.tanggal } ?: emptyMap()
                            val dateFormater = SimpleDateFormat("yyyy-MM-dd", Locale.US)

                            for (r in 0 until rows) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    for (c in 0 until 7) {
                                        val slotIndex = r * 7 + c
                                        val dayNumber = slotIndex - prefixEmptyDays + 1

                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .aspectRatio(1f),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (dayNumber in 1..daysInMonth) {
                                                val dayCal = Calendar.getInstance().apply {
                                                    time = calendarDate.time
                                                    set(Calendar.DAY_OF_MONTH, dayNumber)
                                                }
                                                val dateStr = dateFormater.format(dayCal.time)
                                                val detail = detailMap[dateStr]

                                                CalendarDayCell(dayNumber = dayNumber, detail = detail)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Detailed Status Summary Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                "Rincian Kehadiran",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B)
                            )

                            StatusSummaryRow(label = "HADIR TEPAT WAKTU", count = rekapData?.statistik?.get("HADIR") ?: 0, color = Color(0xFF10B981))
                            StatusSummaryRow(label = "TERLAMBAT", count = rekapData?.statistik?.get("TERLAMBAT") ?: 0, color = Color(0xFFF59E0B))
                            StatusSummaryRow(label = "IZIN", count = rekapData?.statistik?.get("IZIN") ?: 0, color = Color(0xFF3B82F6))
                            StatusSummaryRow(label = "SAKIT", count = rekapData?.statistik?.get("SAKIT") ?: 0, color = Color(0xFF8B5CF6))
                            StatusSummaryRow(label = "ALPA", count = rekapData?.statistik?.get("ALPA") ?: 0, color = Color(0xFFEF4444))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarDayCell(dayNumber: Int, detail: AttendanceDayDetail?) {
    val status = detail?.status ?: "BELUM"
    val badgeColor = when (status) {
        "HADIR" -> Color(0xFF10B981)
        "TERLAMBAT" -> Color(0xFFF59E0B)
        "SAKIT" -> Color(0xFF8B5CF6)
        "IZIN" -> Color(0xFF3B82F6)
        "ALPA" -> Color(0xFFEF4444)
        else -> Color(0xFFE2E8F0)
    }

    val textColor = if (status == "BELUM") Color(0xFF64748B) else Color.White

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(badgeColor, RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = dayNumber.toString(),
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Black
        )
    }
}

@Composable
fun StatusSummaryRow(label: String, count: Int, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(color, RoundedCornerShape(4.dp))
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF475569)
            )
        }

        Text(
            text = "$count Hari",
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFF1E293B)
        )
    }
}
