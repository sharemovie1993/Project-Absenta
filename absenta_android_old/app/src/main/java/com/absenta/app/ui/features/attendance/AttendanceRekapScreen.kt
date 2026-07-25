package com.absenta.app.ui.features.attendance

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.absenta.app.data.api.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceRekapScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("HARIAN", "BULANAN", "GURU")

    // Harian state
    var rekapHarian by remember { mutableStateOf<List<RekapHarianSiswa>>(emptyList()) }
    var summaryHarian by remember { mutableStateOf<RekapSummary?>(null) }
    var selectedDate by remember { mutableStateOf(getTodayDate()) }

    // Bulanan state
    var rekapBulanan by remember { mutableStateOf<List<RekapBulananSiswa>>(emptyList()) }
    val currentCal = Calendar.getInstance()
    var selectedMonth by remember { mutableStateOf(currentCal.get(Calendar.MONTH) + 1) }
    var selectedYear by remember { mutableStateOf(currentCal.get(Calendar.YEAR)) }

    // Guru state
    var guruList by remember { mutableStateOf<List<GuruAbsensiItem>>(emptyList()) }
    var summaryGuru by remember { mutableStateOf<RekapSummary?>(null) }

    var isLoading by remember { mutableStateOf(false) }

    fun loadHarian() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "AttendanceRekap - loadHarian: date=$selectedDate")
            try {
                val svc = ApiClient.getClient(context).create(AttendanceRekapService::class.java)
                val resp = svc.getRekapHarian(date = selectedDate)
                if (resp.isSuccessful && resp.body()?.data?.list?.isNotEmpty() == true) {
                    rekapHarian = resp.body()!!.data!!.list
                    summaryHarian = resp.body()!!.data!!.summary
                    Log.d("AbsentaDebug", "Rekap harian loaded: ${rekapHarian.size} siswa")
                } else {
                    rekapHarian = emptyList()
                    summaryHarian = null
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Rekap harian error", e)
                rekapHarian = emptyList()
                summaryHarian = null
            } finally { isLoading = false }
        }
    }

    fun loadBulanan() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "AttendanceRekap - loadBulanan: month=$selectedMonth year=$selectedYear")
            try {
                val svc = ApiClient.getClient(context).create(AttendanceRekapService::class.java)
                val resp = svc.getRekapBulanan(month = selectedMonth, year = selectedYear)
                if (resp.isSuccessful && resp.body()?.data?.list?.isNotEmpty() == true) {
                    rekapBulanan = resp.body()!!.data!!.list
                    Log.d("AbsentaDebug", "Rekap bulanan loaded: ${rekapBulanan.size} siswa")
                } else {
                    rekapBulanan = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Rekap bulanan error", e)
                rekapBulanan = emptyList()
            } finally { isLoading = false }
        }
    }

    fun loadGuru() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "AttendanceRekap - loadGuru: date=$selectedDate")
            try {
                val svc = ApiClient.getClient(context).create(AttendanceRekapService::class.java)
                val resp = svc.getGuruMonitoring(date = selectedDate)
                if (resp.isSuccessful && resp.body()?.data?.list?.isNotEmpty() == true) {
                    guruList = resp.body()!!.data!!.list
                    summaryGuru = resp.body()!!.data!!.summary
                    Log.d("AbsentaDebug", "Guru monitoring loaded: ${guruList.size} guru")
                } else {
                    guruList = emptyList()
                    summaryGuru = null
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Guru monitoring error", e)
                guruList = emptyList()
                summaryGuru = null
            } finally { isLoading = false }
        }
    }

    LaunchedEffect(selectedTab, selectedDate, selectedMonth, selectedYear) {
        when (selectedTab) {
            0 -> loadHarian()
            1 -> loadBulanan()
            2 -> loadGuru()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Rekap Absensi", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFFF8FAFC))) {
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                tabs.forEachIndexed { i, label ->
                    Tab(
                        selected = selectedTab == i,
                        onClick = { selectedTab = i },
                        text = {
                            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                                color = if (selectedTab == i) Color(0xFF1E3C72) else Color(0xFF94A3B8))
                        }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                when (selectedTab) {
                    0 -> RekapHarianContent(
                        rekapList = rekapHarian,
                        summary = summaryHarian,
                        selectedDate = selectedDate,
                        onDateChange = { selectedDate = it }
                    )
                    1 -> RekapBulananContent(
                        rekapList = rekapBulanan,
                        selectedMonth = selectedMonth,
                        selectedYear = selectedYear,
                        onMonthChange = { m, y -> selectedMonth = m; selectedYear = y }
                    )
                    2 -> RekapGuruContent(
                        guruList = guruList,
                        summary = summaryGuru,
                        selectedDate = selectedDate,
                        onDateChange = { selectedDate = it }
                    )
                }
            }
        }
    }
}

@Composable
fun RekapHarianContent(
    rekapList: List<RekapHarianSiswa>,
    summary: RekapSummary?,
    selectedDate: String,
    onDateChange: (String) -> Unit
) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Date Picker Row
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.DateRange, contentDescription = null, tint = Color(0xFF1E3C72), modifier = Modifier.size(20.dp))
                        Text(formatDisplayDate(selectedDate), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    }
                    // Simple date navigation
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(onClick = { onDateChange(getPreviousDate(selectedDate)) }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kemarin", modifier = Modifier.size(16.dp))
                        }
                        if (selectedDate != getTodayDate()) {
                            IconButton(onClick = { onDateChange(getNextDate(selectedDate)) }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.ArrowForward, contentDescription = "Besok", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
        }

        // Summary Cards
        summary?.let { s ->
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SummaryChip("Hadir", s.hadir, Color(0xFF10B981), modifier = Modifier.weight(1f))
                    SummaryChip("Sakit", s.sakit, Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                    SummaryChip("Izin", s.izin, Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                    SummaryChip("Alpha", s.alpha, Color(0xFFEF4444), modifier = Modifier.weight(1f))
                    SummaryChip("Terlambat", s.terlambat, Color(0xFF8B5CF6), modifier = Modifier.weight(1f))
                }
            }
        }

        // Header
        item {
            Text("${rekapList.size} Siswa", fontSize = 13.sp, fontWeight = FontWeight.Bold,
                color = Color(0xFF64748B), modifier = Modifier.padding(start = 4.dp, top = 4.dp))
        }

        items(rekapList, key = { it.siswa_id }) { siswa ->
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(40.dp).background(getStatusColor(siswa.status).copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center) {
                        Text(getStatusEmoji(siswa.status), fontSize = 18.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(siswa.nama, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF0F172A))
                        Text("${siswa.nis} • ${siswa.kelas}", fontSize = 12.sp, color = Color(0xFF64748B))
                        if (siswa.tap_masuk != null) {
                            Text("Masuk: ${siswa.tap_masuk.take(5)}${if (siswa.tap_keluar != null) " | Keluar: ${siswa.tap_keluar.take(5)}" else ""}",
                                fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    StatusBadge(siswa.status)
                }
            }
        }
    }
}

@Composable
fun RekapBulananContent(
    rekapList: List<RekapBulananSiswa>,
    selectedMonth: Int,
    selectedYear: Int,
    onMonthChange: (Int, Int) -> Unit
) {
    val bulanNames = listOf("Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des")
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    IconButton(onClick = {
                        val (m, y) = if (selectedMonth == 1) 12 to (selectedYear - 1) else (selectedMonth - 1) to selectedYear
                        onMonthChange(m, y)
                    }) { Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp)) }

                    Text("${bulanNames[selectedMonth - 1]} $selectedYear", fontWeight = FontWeight.Bold,
                        fontSize = 16.sp, color = Color(0xFF1E293B))

                    IconButton(onClick = {
                        val cal = Calendar.getInstance()
                        if (selectedMonth < cal.get(Calendar.MONTH) + 1 || selectedYear < cal.get(Calendar.YEAR)) {
                            val (m, y) = if (selectedMonth == 12) 1 to (selectedYear + 1) else (selectedMonth + 1) to selectedYear
                            onMonthChange(m, y)
                        }
                    }) { Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp)) }
                }
            }
        }

        item { Text("${rekapList.size} Siswa", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B), modifier = Modifier.padding(start = 4.dp)) }

        items(rekapList, key = { it.siswa_id }) { siswa ->
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(siswa.nama, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF0F172A))
                            Text("${siswa.nis} • ${siswa.kelas}", fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                        Box(modifier = Modifier.background(
                            if (siswa.persentase_hadir >= 80) Color(0xFFD1FAE5) else if (siswa.persentase_hadir >= 60) Color(0xFFFEF3C7) else Color(0xFFFEE2E2),
                            RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 4.dp)) {
                            Text("${siswa.persentase_hadir.toInt()}%", fontWeight = FontWeight.Black, fontSize = 13.sp,
                                color = if (siswa.persentase_hadir >= 80) Color(0xFF065F46) else if (siswa.persentase_hadir >= 60) Color(0xFF92400E) else Color(0xFF991B1B))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        MiniStat("H", siswa.hadir, Color(0xFF10B981), modifier = Modifier.weight(1f))
                        MiniStat("S", siswa.sakit, Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                        MiniStat("I", siswa.izin, Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                        MiniStat("A", siswa.alpha, Color(0xFFEF4444), modifier = Modifier.weight(1f))
                        MiniStat("T", siswa.terlambat, Color(0xFF8B5CF6), modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun RekapGuruContent(
    guruList: List<GuruAbsensiItem>,
    summary: RekapSummary?,
    selectedDate: String,
    onDateChange: (String) -> Unit
) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.DateRange, contentDescription = null, tint = Color(0xFF1E3C72), modifier = Modifier.size(20.dp))
                        Text(formatDisplayDate(selectedDate), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        IconButton(onClick = { onDateChange(getPreviousDate(selectedDate)) }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                        if (selectedDate != getTodayDate()) {
                            IconButton(onClick = { onDateChange(getNextDate(selectedDate)) }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
        }

        summary?.let { s ->
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SummaryChip("Hadir", s.hadir, Color(0xFF10B981), modifier = Modifier.weight(1f))
                    SummaryChip("Sakit", s.sakit, Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                    SummaryChip("Izin", s.izin, Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                    SummaryChip("Alpha", s.alpha, Color(0xFFEF4444), modifier = Modifier.weight(1f))
                }
            }
        }

        item { Text("${guruList.size} Guru", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B), modifier = Modifier.padding(start = 4.dp)) }

        items(guruList, key = { it.guru_id }) { guru ->
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(1.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(40.dp).background(getStatusColor(guru.status).copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center) {
                        Text(getStatusEmoji(guru.status), fontSize = 18.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(guru.nama, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF0F172A))
                        Text(guru.nip.ifEmpty { guru.jabatan ?: "-" }, fontSize = 12.sp, color = Color(0xFF64748B))
                        if (guru.tap_masuk != null) {
                            Text("Masuk: ${guru.tap_masuk.take(5)}${if (guru.tap_keluar != null) " | Keluar: ${guru.tap_keluar.take(5)}" else ""}",
                                fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                    StatusBadge(guru.status)
                }
            }
        }
    }
}

// --- Reusable Components ---
@Composable
fun SummaryChip(label: String, count: Int, color: Color, modifier: Modifier = Modifier) {
    Column(modifier = modifier.background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp)).padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(count.toString(), fontWeight = FontWeight.Black, fontSize = 16.sp, color = color)
        Text(label, fontSize = 9.sp, color = color.copy(alpha = 0.8f), fontWeight = FontWeight.Medium)
    }
}

@Composable
fun MiniStat(label: String, count: Int, color: Color, modifier: Modifier = Modifier) {
    Column(modifier = modifier.background(color.copy(alpha = 0.08f), RoundedCornerShape(6.dp)).padding(vertical = 5.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(count.toString(), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = color)
        Text(label, fontSize = 9.sp, color = color.copy(alpha = 0.7f), fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun StatusBadge(status: String) {
    val (label, color) = when (status.uppercase()) {
        "HADIR" -> "Hadir" to Color(0xFF10B981)
        "SAKIT" -> "Sakit" to Color(0xFF3B82F6)
        "IZIN" -> "Izin" to Color(0xFFF59E0B)
        "ALPHA" -> "Alpha" to Color(0xFFEF4444)
        "TERLAMBAT" -> "Telat" to Color(0xFF8B5CF6)
        else -> status to Color(0xFF64748B)
    }
    Box(modifier = Modifier.background(color.copy(alpha = 0.12f), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 4.dp)) {
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

fun getStatusColor(status: String) = when (status.uppercase()) {
    "HADIR" -> Color(0xFF10B981)
    "SAKIT" -> Color(0xFF3B82F6)
    "IZIN" -> Color(0xFFF59E0B)
    "ALPHA" -> Color(0xFFEF4444)
    "TERLAMBAT" -> Color(0xFF8B5CF6)
    else -> Color(0xFF94A3B8)
}

fun getStatusEmoji(status: String) = when (status.uppercase()) {
    "HADIR" -> "✅"
    "SAKIT" -> "🤒"
    "IZIN" -> "📋"
    "ALPHA" -> "❌"
    "TERLAMBAT" -> "⏰"
    else -> "❓"
}

fun getTodayDate(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
fun getPreviousDate(date: String): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()
    cal.time = sdf.parse(date) ?: Date()
    cal.add(Calendar.DAY_OF_MONTH, -1)
    return sdf.format(cal.time)
}
fun getNextDate(date: String): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()
    cal.time = sdf.parse(date) ?: Date()
    cal.add(Calendar.DAY_OF_MONTH, 1)
    return sdf.format(cal.time)
}
fun formatDisplayDate(date: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d = sdf.parse(date) ?: return date
        SimpleDateFormat("EEEE, d MMMM yyyy", Locale("id", "ID")).format(d)
    } catch (e: Exception) {
        date
    }
}
