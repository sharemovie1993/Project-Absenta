package com.absenta.app.ui.features.kurikulum

import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import com.absenta.app.ui.components.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeachingJournalScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val contentResolver = context.contentResolver

    val sessionManager = remember { SessionManager(context) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val isLocked = !enabledFeatures.contains("ABSENSI")
    val isUserAdmin = userRole == "ADMIN"

    var guruId by remember { mutableStateOf<String?>(null) }
    var rawSessions by remember { mutableStateOf<List<SesiAbsensiEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Filter & Search states
    var searchQuery by remember { mutableStateOf("") }
    val calendar = remember { Calendar.getInstance() }
    var selectedMonth by remember { mutableStateOf(calendar.get(Calendar.MONTH)) }
    var selectedYear by remember { mutableStateOf(calendar.get(Calendar.YEAR)) }

    // Dialog states
    var selectedSesiForDetail by remember { mutableStateOf<SesiAbsensiEntry?>(null) }
    var showDetailPresensiDialog by remember { mutableStateOf(false) }
    var detailPresensiList by remember { mutableStateOf<List<SesiAbsenSiswaEntry>>(emptyList()) }
    var isDetailLoading by remember { mutableStateOf(false) }

    var selectedSesiForJournal by remember { mutableStateOf<SesiAbsensiEntry?>(null) }
    var showJournalDialog by remember { mutableStateOf(false) }
    var isJournalReadOnly by remember { mutableStateOf(false) }

    // Journal Form State
    var formJudulMateri by remember { mutableStateOf("") }
    var formDeskripsi by remember { mutableStateOf("") }
    var formPencapaian by remember { mutableStateOf(0) }
    var formKendala by remember { mutableStateOf("") }
    var isSubmittingJournal by remember { mutableStateOf(false) }
    var showConfirmSaveDialog by remember { mutableStateOf(false) }

    // CSV Export State
    var csvStringToSave by remember { mutableStateOf<String?>(null) }

    val fileSaverLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        uri?.let {
            try {
                contentResolver.openOutputStream(it)?.bufferedWriter()?.use { writer ->
                    writer.write(csvStringToSave ?: "")
                }
                Toast.makeText(context, "Buku Jurnal Riwayat berhasil diunduh!", Toast.LENGTH_LONG).show()
                csvStringToSave = null
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal mengunduh file: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Helper functions for Date parsing and display formatting
    fun formatDisplayDate(dateStr: String): String {
        return try {
            val cleanStr = dateStr.replace("Z", "+0000")
            val parser = if (cleanStr.contains("T")) {
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            } else {
                SimpleDateFormat("yyyy-MM-dd", Locale.US)
            }
            val date = parser.parse(cleanStr) ?: Date()
            val dayName = SimpleDateFormat("EEEE", Locale("id", "ID")).format(date)
            val day = SimpleDateFormat("dd", Locale("id", "ID")).format(date)
            val monthYear = SimpleDateFormat("MMMM yyyy", Locale("id", "ID")).format(date)
            "$day $monthYear • $dayName"
        } catch (e: Exception) {
            dateStr
        }
    }

    fun getGroupDateKey(dateStr: String): String {
        return try {
            val parser = if (dateStr.contains("T")) {
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            } else {
                SimpleDateFormat("yyyy-MM-dd", Locale.US)
            }
            val date = parser.parse(dateStr.replace("Z", "+0000")) ?: Date()
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)
        } catch (e: Exception) {
            dateStr
        }
    }

    fun formatDisplayTime(waktuMulai: String, waktuSelesai: String?): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            val start = parser.parse(waktuMulai.replace("Z", "+0000")) ?: Date()
            val startTime = SimpleDateFormat("HH:mm", Locale.US).format(start)
            
            if (!waktuSelesai.isNullOrEmpty()) {
                val end = parser.parse(waktuSelesai.replace("Z", "+0000")) ?: Date()
                val endTime = SimpleDateFormat("HH:mm", Locale.US).format(end)
                "$startTime - $endTime"
            } else {
                startTime
            }
        } catch (e: Exception) {
            try {
                val startPart = waktuMulai.substringAfter("T").substringBefore(":")
                val startMin = waktuMulai.substringAfter("T").substringAfter(":").substringBefore(":")
                val endPart = waktuSelesai?.substringAfter("T")?.substringBefore(":") ?: ""
                val endMin = waktuSelesai?.substringAfter("T")?.substringAfter(":")?.substringBefore(":") ?: ""
                if (endPart.isNotEmpty()) {
                    "$startPart:$startMin - $endPart:$endMin"
                } else {
                    "$startPart:$startMin"
                }
            } catch (ex: Exception) {
                waktuMulai
            }
        }
    }

    // Load Guru Profile and KBM Sessions
    fun loadData() {
        scope.launch {
            isLoading = true
            try {
                val client = ApiClient.getClient(context)
                val academicService = client.create(AcademicService::class.java)
                val attendanceService = client.create(AttendanceService::class.java)

                // 1. Get Guru ID from current user context
                val guruMeResp = academicService.getGuruMe()
                if (guruMeResp.isSuccessful && guruMeResp.body()?.success == true) {
                    val gId = guruMeResp.body()?.data?.id
                    guruId = gId
                    
                    if (gId != null) {
                        // 2. Fetch Sessions List
                        val sessionsResp = attendanceService.getSesiAbsensiList(
                            guruId = gId,
                            summary = true,
                            journals = true
                        )
                        if (sessionsResp.isSuccessful && sessionsResp.body()?.success == true) {
                            rawSessions = sessionsResp.body()?.data ?: emptyList()
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading Jurnal Mengajar", e)
                Toast.makeText(context, "Gagal memuat data: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    // Filter & group sessions in memory
    val filteredSessions = remember(rawSessions, searchQuery, selectedMonth, selectedYear) {
        rawSessions.filter { session ->
            // Check month and year
            try {
                val cleanStr = session.tanggal.replace("Z", "+0000")
                val parser = if (cleanStr.contains("T")) {
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                } else {
                    SimpleDateFormat("yyyy-MM-dd", Locale.US)
                }
                val date = parser.parse(cleanStr)
                if (date != null) {
                    val cal = Calendar.getInstance().apply { time = date }
                    val isCorrectMonth = cal.get(Calendar.MONTH) == selectedMonth && cal.get(Calendar.YEAR) == selectedYear
                    if (!isCorrectMonth) return@filter false
                }
            } catch (e: Exception) {
                // If parsing fails, skip filtering by date to avoid crashing
            }

            // Check search query
            if (searchQuery.isNotEmpty()) {
                val q = searchQuery.lowercase()
                val matchKelas = session.Kelas?.nama_kelas?.lowercase()?.contains(q) == true
                val matchMapel = session.Mapel?.nama_mapel?.lowercase()?.contains(q) == true
                val matchKegiatan = session.jenis_kegiatan.lowercase().contains(q)
                matchKelas || matchMapel || matchKegiatan
            } else {
                true
            }
        }
    }

    // Group sessions by date descending
    val groupedSessions = remember(filteredSessions) {
        val groups = filteredSessions.groupBy { getGroupDateKey(it.tanggal) }
        groups.keys.sortedDescending().map { dateKey ->
            val sessionsInDate = groups[dateKey] ?: emptyList()
            // Sort sessions in the same date by waktu_mulai descending
            val sortedSessions = sessionsInDate.sortedByDescending { it.waktu_mulai }
            dateKey to sortedSessions
        }
    }

    // Compute stats
    val statsCalculation = remember(filteredSessions) {
        val totalSesi = filteredSessions.size
        val totalHadir = filteredSessions.sumOf { it.summary?.HADIR ?: 0 }
        val totalSiswa = filteredSessions.sumOf { it.summary?.TOTAL ?: 0 }
        val avgKehadiran = if (totalSiswa > 0) Math.round((totalHadir.toDouble() / totalSiswa.toDouble()) * 100).toInt() else 0
        val jurnalTerisi = filteredSessions.count { it.ProgresMateri != null }
        Triple(totalSesi, jurnalTerisi, avgKehadiran)
    }

    // Handle CSV Export
    fun handleExport() {
        if (filteredSessions.isEmpty()) {
            Toast.makeText(context, "Tidak ada data untuk diekspor", Toast.LENGTH_SHORT).show()
            return
        }

        val headers = listOf("Tanggal", "Waktu", "Kelas", "Mata Pelajaran", "Kehadiran Siswa", "Materi Jurnal")
        val rows = filteredSessions.map { s ->
            val date = s.tanggal.substringBefore("T")
            val time = formatDisplayTime(s.waktu_mulai, s.waktu_selesai)
            val kelas = s.Kelas?.nama_kelas ?: "-"
            val mapel = s.Mapel?.nama_mapel ?: s.jenis_kegiatan
            val kehadiran = "${s.summary?.HADIR ?: 0} / ${s.summary?.TOTAL ?: 0}"
            val jurnal = s.ProgresMateri?.judul_materi ?: "-"
            listOf(date, time, kelas, mapel, kehadiran, jurnal)
        }

        val csvContent = buildString {
            append(headers.joinToString(","))
            append("\n")
            rows.forEach { row ->
                append(row.joinToString(",") { cell -> "\"${cell.replace("\"", "\"\"")}\"" })
                append("\n")
            }
        }

        csvStringToSave = csvContent
        val fileName = "Riwayat_Ajar_${selectedYear}_${selectedMonth + 1}.csv"
        fileSaverLauncher.launch(fileName)
    }

    // Load student list when selectedSesiForDetail changes
    LaunchedEffect(selectedSesiForDetail) {
        if (selectedSesiForDetail != null) {
            isDetailLoading = true
            try {
                val client = ApiClient.getClient(context)
                val attendanceService = client.create(AttendanceService::class.java)
                val resp = attendanceService.getSesiAbsenSiswa(selectedSesiForDetail!!.id)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    detailPresensiList = resp.body()?.data ?: emptyList()
                } else {
                    detailPresensiList = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading student attendance list", e)
                Toast.makeText(context, "Gagal memuat detail presensi", Toast.LENGTH_SHORT).show()
                detailPresensiList = emptyList()
            } finally {
                isDetailLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))))
            ) {
                TopAppBar(
                    title = {
                        Column {
                            Text("Riwayat Mengajar", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Jejak langkah pendidikan dan progres KBM Anda",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )
            }
        }
    ) { paddingValues ->
        if (isLoading) {
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
                // 1. Premium Warning Banner (If Locked)
                if (isLocked) {
                    item {
                        PremiumFeatureBanner(
                            moduleName = "ABSENSI",
                            featureName = "Riwayat Mengajar & Jurnal",
                            isUserAdmin = isUserAdmin,
                            onUpgradeClick = {
                                Toast.makeText(context, "Silakan upgrade paket absensi Anda melalui webapp", Toast.LENGTH_LONG).show()
                            }
                        )
                    }
                }

                // 2. Stats Section
                item {
                    val (statsTotalSesi, statsTuntasJurnal, statsAvgKehadiran) = statsCalculation
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ReusableStatsCard(
                            title = "Total Sesi",
                            value = statsTotalSesi.toString(),
                            icon = Icons.Default.DateRange,
                            gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF4F46E5)),
                            modifier = Modifier.weight(1f),
                            subtitle = "Sesi bulan ini",
                            isCompact = true
                        )
                        ReusableStatsCard(
                            title = "Tuntas Jurnal",
                            value = statsTuntasJurnal.toString(),
                            icon = Icons.Default.Book,
                            gradientColors = listOf(Color(0xFFF59E0B), Color(0xFFEA580C)),
                            modifier = Modifier.weight(1f),
                            subtitle = "Materi terisi",
                            isCompact = true
                        )
                        ReusableStatsCard(
                            title = "Rata Kehadiran",
                            value = "$statsAvgKehadiran%",
                            icon = Icons.Default.CheckCircle,
                            gradientColors = listOf(Color(0xFF10B981), Color(0xFF0D9488)),
                            modifier = Modifier.weight(1f),
                            subtitle = "Rasio siswa hadir",
                            isCompact = true
                        )
                    }
                }

                // 3. Filter Toolbar Section
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            SearchTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = "Cari kelas, mapel, atau kegiatan..."
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val monthOptions = listOf(
                                    DropdownOption("Januari", "0"), DropdownOption("Februari", "1"),
                                    DropdownOption("Maret", "2"), DropdownOption("April", "3"),
                                    DropdownOption("Mei", "4"), DropdownOption("Juni", "5"),
                                    DropdownOption("Juli", "6"), DropdownOption("Agustus", "7"),
                                    DropdownOption("September", "8"), DropdownOption("Oktober", "9"),
                                    DropdownOption("November", "10"), DropdownOption("Desember", "11")
                                )
                                FilterDropdown(
                                    selectedValue = selectedMonth.toString(),
                                    options = monthOptions,
                                    onValueChange = { selectedMonth = it.toInt() },
                                    placeholder = "Bulan",
                                    modifier = Modifier.weight(1.3f)
                                )

                                val yearsList = listOf(
                                    DropdownOption((selectedYear - 1).toString(), (selectedYear - 1).toString()),
                                    DropdownOption(selectedYear.toString(), selectedYear.toString()),
                                    DropdownOption((selectedYear + 1).toString(), (selectedYear + 1).toString())
                                )
                                FilterDropdown(
                                    selectedValue = selectedYear.toString(),
                                    options = yearsList,
                                    onValueChange = { selectedYear = it.toInt() },
                                    placeholder = "Tahun",
                                    modifier = Modifier.weight(1f)
                                )

                                Button(
                                    onClick = { handleExport() },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (isLocked) Color(0xFFE2E8F0) else Color(0xFF1E3C72)
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    contentPadding = PaddingValues(0.dp),
                                    modifier = Modifier
                                        .size(48.dp)
                                        .aspectRatio(1f),
                                    enabled = !isLocked && filteredSessions.isNotEmpty()
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Export CSV",
                                        tint = if (isLocked) Color(0xFF94A3B8) else Color.White
                                    )
                                }
                            }
                        }
                    }
                }

                // 4. Grouped Timeline Sesi
                if (groupedSessions.isEmpty()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 48.dp, horizontal = 24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(72.dp)
                                        .background(Color(0xFFF1F5F9), RoundedCornerShape(20.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.History,
                                        contentDescription = null,
                                        tint = Color(0xFFCBD5E1),
                                        modifier = Modifier.size(36.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "Riwayat Kosong",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 18.sp,
                                    color = Color(0xFF0F172A)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Anda belum memiliki catatan sesi mengajar pada periode terpilih.",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF94A3B8),
                                    modifier = Modifier.padding(horizontal = 24.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    groupedSessions.forEach { (dateKey, sessions) ->
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF1F5F9)),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Text(
                                        text = formatDisplayDate(dateKey),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1E3C72),
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(1.dp)
                                        .background(Color(0xFFE2E8F0))
                                )
                            }
                        }

                        items(sessions) { sesi ->
                            SessionCard(
                                sesi = sesi,
                                isLocked = isLocked,
                                onOpenJournal = {
                                    selectedSesiForJournal = sesi
                                    formJudulMateri = sesi.ProgresMateri?.judul_materi ?: ""
                                    formDeskripsi = sesi.ProgresMateri?.deskripsi ?: ""
                                    formPencapaian = sesi.ProgresMateri?.pencapaian_persen ?: 0
                                    formKendala = sesi.ProgresMateri?.kendala ?: ""
                                    isJournalReadOnly = isLocked
                                    showJournalDialog = true
                                },
                                onViewDetail = {
                                    selectedSesiForDetail = sesi
                                    showDetailPresensiDialog = true
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // 1. Dialog Detail Presensi Siswa
    if (showDetailPresensiDialog && selectedSesiForDetail != null) {
        AlertDialog(
            onDismissRequest = { showDetailPresensiDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Daftar Hadir Siswa",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF0F172A)
                    )
                }
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)) {
                    Text(
                        text = "Kelas: ${selectedSesiForDetail?.Kelas?.nama_kelas ?: "-"} • Mapel: ${selectedSesiForDetail?.Mapel?.nama_mapel ?: selectedSesiForDetail?.jenis_kegiatan}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    
                    if (isDetailLoading) {
                        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF1E3C72))
                        }
                    } else if (detailPresensiList.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            Text("Tidak ada rekaman presensi siswa.", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(detailPresensiList) { record ->
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF1F5F9))
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = record.Siswa?.nama_siswa ?: "Siswa Tidak Dikenal",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Color(0xFF1E293B)
                                            )
                                            Text(
                                                text = "NIS: ${record.Siswa?.nis ?: "-"}",
                                                fontSize = 11.sp,
                                                color = Color(0xFF64748B)
                                            )
                                        }

                                        // Status badge
                                        val (badgeColor, textColor, label) = when (record.status.uppercase()) {
                                            "HADIR" -> Triple(Color(0xFFD1FAE5), Color(0xFF047857), "Hadir")
                                            "TERLAMBAT" -> Triple(Color(0xFFFEF3C7), Color(0xFFD97706), "Terlambat")
                                            "SAKIT" -> Triple(Color(0xFFF3E8FF), Color(0xFF7E22CE), "Sakit")
                                            "IZIN" -> Triple(Color(0xFFDBEAFE), Color(0xFF1D4ED8), "Izin")
                                            "ALPA" -> Triple(Color(0xFFFEE2E2), Color(0xFFB91C1C), "Alpa")
                                            else -> Triple(Color(0xFFF1F5F9), Color(0xFF475569), record.status)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .background(badgeColor, RoundedCornerShape(6.dp))
                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = label,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black,
                                                color = textColor
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showDetailPresensiDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Tutup", fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(16.dp),
            containerColor = Color.White
        )
    }

    // 2. Dialog Formulir Jurnal KBM
    if (showJournalDialog && selectedSesiForJournal != null) {
        AlertDialog(
            onDismissRequest = { showJournalDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0xFFEEF2F6), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Book,
                            contentDescription = null,
                            tint = Color(0xFF4F46E5),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (isJournalReadOnly) "Detail Jurnal KBM" else "Isi Jurnal KBM",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF0F172A)
                    )
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 450.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Warning Banner (if editable)
                    if (!isJournalReadOnly) {
                        item {
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)), // amber-100
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Info,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            text = "Penting",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF92400E)
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Jurnal ini akan menjadi laporan progres pembelajaran yang dapat dilihat oleh Kurikulum dan Kepala Sekolah.",
                                            fontSize = 10.sp,
                                            color = Color(0xFFB45309),
                                            lineHeight = 14.sp
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Input Form Fields
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Judul Materi
                            Text("Judul Materi / Topik", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            OutlinedTextField(
                                value = formJudulMateri,
                                onValueChange = { formJudulMateri = it },
                                placeholder = { Text("Contoh: Pengenalan React Hooks") },
                                enabled = !isJournalReadOnly,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    disabledContainerColor = Color(0xFFF8FAFC),
                                    disabledBorderColor = Color(0xFFE2E8F0),
                                    disabledTextColor = Color(0xFF1E293B)
                                )
                            )

                            // Ringkasan Pembahasan
                            Text("Ringkasan Pembahasan", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            OutlinedTextField(
                                value = formDeskripsi,
                                onValueChange = { formDeskripsi = it },
                                placeholder = { Text("Apa saja yang dibahas hari ini?") },
                                enabled = !isJournalReadOnly,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 3,
                                colors = OutlinedTextFieldDefaults.colors(
                                    disabledContainerColor = Color(0xFFF8FAFC),
                                    disabledBorderColor = Color(0xFFE2E8F0),
                                    disabledTextColor = Color(0xFF1E293B)
                                )
                            )

                            // Pencapaian %
                            Text("Pencapaian (%)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            Box(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = if (formPencapaian == 0 && !isJournalReadOnly) "" else formPencapaian.toString(),
                                    onValueChange = {
                                        val clean = it.filter { char -> char.isDigit() }
                                        formPencapaian = if (clean.isEmpty()) 0 else {
                                            val num = clean.toInt()
                                            if (num > 100) 100 else num
                                        }
                                    },
                                    placeholder = { Text("0") },
                                    enabled = !isJournalReadOnly,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        disabledContainerColor = Color(0xFFF8FAFC),
                                        disabledBorderColor = Color(0xFFE2E8F0),
                                        disabledTextColor = Color(0xFF1E293B)
                                    )
                                )
                                Text(
                                    text = "%",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF94A3B8),
                                    modifier = Modifier
                                        .align(Alignment.CenterEnd)
                                        .padding(end = 16.dp)
                                )
                            }

                            // Kendala / Catatan Khusus
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Kendala / Catatan Khusus", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            }
                            OutlinedTextField(
                                value = formKendala,
                                onValueChange = { formKendala = it },
                                placeholder = { Text("Siswa kurang fokus, koneksi lambat, dsb.") },
                                enabled = !isJournalReadOnly,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2,
                                colors = OutlinedTextFieldDefaults.colors(
                                    disabledContainerColor = Color(0xFFF8FAFC),
                                    disabledBorderColor = Color(0xFFE2E8F0),
                                    disabledTextColor = Color(0xFF1E293B)
                                )
                            )
                        }
                    }
                }
            },
            confirmButton = {
                if (isJournalReadOnly) {
                    Button(
                        onClick = { showJournalDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Tutup", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = {
                            if (formJudulMateri.trim().isEmpty()) {
                                Toast.makeText(context, "Judul materi wajib diisi", Toast.LENGTH_SHORT).show()
                            } else {
                                showConfirmSaveDialog = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                        shape = RoundedCornerShape(10.dp),
                        enabled = !isSubmittingJournal
                    ) {
                        if (isSubmittingJournal) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Simpan Jurnal", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            dismissButton = {
                if (!isJournalReadOnly) {
                    TextButton(onClick = { showJournalDialog = false }) {
                        Text("Batal", color = Color(0xFF64748B))
                    }
                }
            },
            shape = RoundedCornerShape(16.dp),
            containerColor = Color.White
        )
    }

    // 3. Dialog Konfirmasi Simpan Jurnal KBM
    if (showConfirmSaveDialog && selectedSesiForJournal != null) {
        ConfirmDialog(
            title = "Simpan Jurnal KBM?",
            description = {
                Text(
                    text = "Pastikan data yang Anda isi sudah benar. Jurnal yang disimpan akan tercatat secara permanen di sistem.",
                    fontSize = 13.sp,
                    color = Color(0xFF1E293B),
                    lineHeight = 18.sp
                )
            },
            confirmText = "Ya, Simpan",
            cancelText = "Periksa Lagi",
            onConfirm = {
                showConfirmSaveDialog = false
                isSubmittingJournal = true
                scope.launch {
                    try {
                        val client = ApiClient.getClient(context)
                        val attendanceService = client.create(AttendanceService::class.java)
                        
                        val payload = ProgresMateriRequest(
                            judul_materi = formJudulMateri.trim(),
                            deskripsi = formDeskripsi.trim().ifEmpty { null },
                            pencapaian_persen = formPencapaian,
                            kendala = formKendala.trim().ifEmpty { null }
                        )

                        val resp = attendanceService.upsertProgresMateri(
                            sesiId = selectedSesiForJournal!!.id,
                            payload = payload
                        )

                        if (resp.isSuccessful && resp.body()?.success == true) {
                            Toast.makeText(context, "Jurnal KBM berhasil disimpan", Toast.LENGTH_SHORT).show()
                            showJournalDialog = false
                            selectedSesiForJournal = null
                            loadData() // Refresh list
                        } else {
                            Toast.makeText(context, resp.body()?.message ?: "Gagal menyimpan Jurnal KBM", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        Log.e("AbsentaDebug", "Error upserting progres materi", e)
                        Toast.makeText(context, "Terjadi kesalahan: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                    } finally {
                        isSubmittingJournal = false
                    }
                }
            },
            onDismiss = { showConfirmSaveDialog = false }
        )
    }
}

@Composable
fun PremiumFeatureBanner(
    moduleName: String,
    featureName: String,
    isUserAdmin: Boolean,
    onUpgradeClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)), // light amber
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A)), // amber border
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color(0xFFFEF3C7), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Terkunci",
                    tint = Color(0xFFD97706),
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Layanan $moduleName",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFD97706),
                        modifier = Modifier
                            .background(Color(0xFFFEF3C7), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                    Text(
                        text = "• Preview Mode",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Fitur $featureName Belum Aktif",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isUserAdmin) {
                        "Upgrade paket Anda untuk mulai menggunakan fitur ini secara penuh. Hubungi Admin atau Upgrade Modul $moduleName untuk akses penuh."
                    } else {
                        "Upgrade paket Anda untuk mulai menggunakan fitur ini secara penuh. Silakan hubungi Administrator Sekolah Anda untuk mengaktifkan modul $moduleName."
                    },
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 16.sp
                )
                if (isUserAdmin) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onUpgradeClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Upgrade Sekarang", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun SessionCard(
    sesi: SesiAbsensiEntry,
    isLocked: Boolean,
    onOpenJournal: () -> Unit,
    onViewDetail: () -> Unit
) {
    // Determine subject name or activity name
    val subjectName = sesi.Mapel?.nama_mapel ?: sesi.jenis_kegiatan

    fun formatDisplayTimeLocal(waktuMulai: String, waktuSelesai: String?): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            val start = parser.parse(waktuMulai.replace("Z", "+0000")) ?: Date()
            val startTime = SimpleDateFormat("HH:mm", Locale.US).format(start)
            
            if (!waktuSelesai.isNullOrEmpty()) {
                val end = parser.parse(waktuSelesai.replace("Z", "+0000")) ?: Date()
                val endTime = SimpleDateFormat("HH:mm", Locale.US).format(end)
                "$startTime - $endTime"
            } else {
                startTime
            }
        } catch (e: Exception) {
            waktuMulai
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: Mapel and status badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = subjectName,
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "${sesi.Kelas?.nama_kelas ?: "-"} • ${formatDisplayTimeLocal(sesi.waktu_mulai, sesi.waktu_selesai)}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                // Journal status badge
                val hasJournal = sesi.ProgresMateri != null
                val badgeColor = if (hasJournal) Color(0xFFD1FAE5) else Color(0xFFFEE2E2)
                val textColor = if (hasJournal) Color(0xFF047857) else Color(0xFFB91C1C)
                val label = if (hasJournal) "✓ Jurnal Terisi" else "⚠️ Jurnal Kosong"

                Box(
                    modifier = Modifier
                        .background(badgeColor, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = label,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = textColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Body: Journal topic (if populated)
            if (sesi.ProgresMateri != null) {
                Surface(
                    color = Color(0xFFF8FAFC),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Materi: ${sesi.ProgresMateri.judul_materi}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        if (!sesi.ProgresMateri.deskripsi.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = sesi.ProgresMateri.deskripsi,
                                fontSize = 12.sp,
                                color = Color(0xFF475569)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Pencapaian: ",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF64748B)
                            )
                            Text(
                                text = "${sesi.ProgresMateri.pencapaian_persen}%",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1E3C72)
                            )
                            if (!sesi.ProgresMateri.kendala.isNullOrEmpty()) {
                                Spacer(modifier = Modifier.width(12.dp))
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Ada kendala",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFD97706)
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Info bar: student attendance count summary
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF94A3B8),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                val hadir = sesi.summary?.HADIR ?: 0
                val total = sesi.summary?.TOTAL ?: 0
                Text(
                    text = "Kehadiran Siswa: $hadir / $total",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF64748B)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Footer: Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Button 1: Journal action (Isi or Detail)
                val isFilled = sesi.ProgresMateri != null
                val btnColor = if (isFilled) Color(0xFFEEF2F6) else Color(0xFF4F46E5)
                val btnTextColor = if (isFilled) Color(0xFF475569) else Color.White
                val btnLabel = when {
                    isLocked -> "Detail Jurnal"
                    isFilled -> "Edit Jurnal"
                    else -> "Isi Jurnal"
                }

                Button(
                    onClick = onOpenJournal,
                    colors = ButtonDefaults.buttonColors(containerColor = btnColor),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = btnLabel,
                        fontWeight = FontWeight.Bold,
                        color = btnTextColor,
                        fontSize = 12.sp
                    )
                }

                // Button 2: Student attendance details
                OutlinedButton(
                    onClick = onViewDetail,
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF475569)),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = "Detail Presensi",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}
