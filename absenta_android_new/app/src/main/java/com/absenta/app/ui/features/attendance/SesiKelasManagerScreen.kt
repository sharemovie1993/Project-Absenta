package com.absenta.app.ui.features.attendance

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import java.util.TimeZone
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.WarningContainer
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EditCalendar
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.ReferenceService
import com.absenta.app.data.api.SesiKelasService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.CreateSesiManualRequest
import com.absenta.app.data.model.MarkGateAbsenceRequest
import com.absenta.app.data.model.MasterGuruItem
import com.absenta.app.data.model.MasterJenisKegiatanItem
import com.absenta.app.data.model.MasterKelasItem
import com.absenta.app.data.model.MasterMapelItem
import com.absenta.app.data.model.NotPresentStudentItem
import com.absenta.app.data.model.ProgresMateriRequest
import com.absenta.app.data.model.SesiKelas
import com.absenta.app.ui.components.AbsentaDropdown
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.DropdownOption
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.components.StatusBadge
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusSakit
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import com.absenta.app.ui.theme.OnPrimary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * SesiKelasManagerScreen — Layar Operasional Petugas Kelas (/attendance/ops).
 *
 * UX Flow:
 * 1. Default Tab: **CEK MANUAL** (Siswa yang belum tap di gerbang arah datang).
 *    - Menampilkan list siswa dengan 5 tombol aksi: HADIR, SAKIT, IZIN, DISPEN, ALPA.
 *    - Setelah list Cek Manual dinyatakan CLEAR, UX secara otomatis berpindah ke **MANAJEMEN SESI**.
 * 2. Tab 2: **MANAJEMEN SESI** (Sesi Aktif Hari Ini, Histori Kebelakang, & 2 Mode Pembuatan Sesi).
 *
 * @param tokenManager Manager session
 * @param onNavigateBack Callback tombol kembali
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SesiKelasManagerScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit,
    onNavigateToRiwayatAjar: (() -> Unit)? = null
) {
    val scope = rememberCoroutineScope()

    // Top Level Tab: 0 = CEK MANUAL (Default), 1 = MANAJEMEN SESI
    var selectedTopTab by remember { mutableIntStateOf(0) }

    // Cek Manual State
    var notPresentStudents by remember { mutableStateOf<List<NotPresentStudentItem>>(emptyList()) }
    var confirmedCount by remember { mutableIntStateOf(0) }
    var isLoadingCekManual by remember { mutableStateOf(true) }
    var isGridView by remember { mutableStateOf(true) }
    var actionMessage by remember { mutableStateOf<String?>(null) }

    // Manajemen Sesi State
    var selectedSesiTab by remember { mutableIntStateOf(0) } // 0 = Hari Ini, 1 = Histori
    var filterOnlyMe by remember { mutableStateOf(true) } // Default: Sesi Saya
    var sesiList by remember { mutableStateOf<List<SesiKelas>>(emptyList()) }
    var isLoadingSesi by remember { mutableStateOf(false) }

    // Selected Session Modal, Delete & Jurnal State
    var selectedSesiForModal by remember { mutableStateOf<SesiKelas?>(null) }
    var sesiToDelete by remember { mutableStateOf<SesiKelas?>(null) }
    var selectedSesiForJurnal by remember { mutableStateOf<SesiKelas?>(null) }

    // Creation Option Selection Sheet State
    var showCreateOptionsSheet by remember { mutableStateOf(false) }
    var showManualCreateDialog by remember { mutableStateOf(false) }

    // Master Reference Options
    var kelasList by remember { mutableStateOf<List<MasterKelasItem>>(emptyList()) }
    var mapelList by remember { mutableStateOf<List<MasterMapelItem>>(emptyList()) }
    var guruList by remember { mutableStateOf<List<MasterGuruItem>>(emptyList()) }
    var jenisKegiatanList by remember { mutableStateOf<List<MasterJenisKegiatanItem>>(emptyList()) }

    val context = LocalContext.current
    var officerKelasId by remember { mutableStateOf<String?>(null) }

    // Form State untuk "Buat Sesi Absensi Manual" (Smart Auto-Fill & Date/Time Pickers)
    val todayDateFormatted = remember { SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date()) }
    val todayApiDate = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }

    var selectedKelas by remember { mutableStateOf<MasterKelasItem?>(null) }
    var selectedJenisKegiatan by remember { mutableStateOf<MasterJenisKegiatanItem?>(null) }
    var selectedGuru by remember { mutableStateOf<MasterGuruItem?>(null) }
    var selectedMapel by remember { mutableStateOf<MasterMapelItem?>(null) }
    var tanggalInput by remember { mutableStateOf(todayDateFormatted) }
    var dateApiFormatted by remember { mutableStateOf(todayApiDate) }
    var timeMulaiOnly by remember { mutableStateOf("07:00") }
    var timeSelesaiOnly by remember { mutableStateOf("09:00") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Helper Dialog untuk DatePicker & TimePicker Native Android
    fun openDatePicker() {
        val cal = java.util.Calendar.getInstance()
        DatePickerDialog(
            context,
            { _, y, m, d ->
                val displayStr = String.format(Locale.getDefault(), "%02d/%02d/%04d", d, m + 1, y)
                val apiStr = String.format(Locale.getDefault(), "%04d-%02d-%02d", y, m + 1, d)
                tanggalInput = displayStr
                dateApiFormatted = apiStr
            },
            cal.get(java.util.Calendar.YEAR),
            cal.get(java.util.Calendar.MONTH),
            cal.get(java.util.Calendar.DAY_OF_MONTH)
        ).show()
    }

    fun openTimePicker(initialTime: String, onTimeSelected: (String) -> Unit) {
        val parts = initialTime.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 7
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0

        TimePickerDialog(
            context,
            { _, selectedH, selectedM ->
                val formatted = String.format(Locale.getDefault(), "%02d:%02d", selectedH, selectedM)
                onTimeSelected(formatted)
            },
            h,
            m,
            true
        ).show()
    }

    // Load Data Cek Manual (Siswa Belum Tap Gerbang terfilter kelas_id Petugas Kelas)
    suspend fun loadCekManual() {
        isLoadingCekManual = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(AttendanceService::class.java)
            val sesiService = retrofit.create(SesiKelasService::class.java)

            var userKelasId: String? = null

            // 1. Coba dapatkan kelas_id langsung dari endpoint dedicated Petugas Check
            try {
                val checkRes = sesiService.checkPetugasActive()
                if (checkRes.isSuccessful && checkRes.body()?.data?.managedKelasIds?.isNotEmpty() == true) {
                    userKelasId = checkRes.body()!!.data!!.managedKelasIds!!.first()
                }
            } catch (e: Exception) {}

            // 2. Fallback: Dapatkan dari profile pengguna
            if (userKelasId.isNullOrEmpty()) {
                try {
                    val profileService = retrofit.create(com.absenta.app.data.api.ProfileService::class.java)
                    val profileRes = profileService.getMyProfile()
                    if (profileRes.isSuccessful && profileRes.body()?.data != null) {
                        val profileData = profileRes.body()!!.data!!
                        userKelasId = profileData.siswa?.kelas?.id
                    }
                } catch (e: Exception) {}
            }

            officerKelasId = userKelasId

            val response = service.getNotPresentStudents(kelasId = userKelasId)
            if (response.isSuccessful && response.body()?.data != null) {
                notPresentStudents = response.body()!!.data!!
            }

            // Adopsi getGerbangStats persis dari useGerbangAttendanceData.ts (Line 54)
            try {
                val statsRes = service.getGerbangStats(kelasId = userKelasId)
                if (statsRes.isSuccessful && statsRes.body()?.data != null) {
                    val s = statsRes.body()!!.data!!
                    val entered = maxOf(s.studentsEntered, s.currentlyPresent)
                    confirmedCount = if (entered > 0) entered else maxOf(0, (s.totalStudentsTarget - notPresentStudents.size))
                }
            } catch (e: Exception) {}
        } catch (e: Exception) {}
        isLoadingCekManual = false
    }

    // Load Sesi Absensi List
    suspend fun loadSesi() {
        isLoadingSesi = true
        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(SesiKelasService::class.java)
        val refService = retrofit.create(ReferenceService::class.java)

        try {
            val filterDate = if (selectedSesiTab == 0) todayApiDate else null
            val response = service.listSesi(
                tanggal = filterDate,
                guruId = if (filterOnlyMe) "me" else null,
                onlyMe = if (filterOnlyMe) true else null
            )
            if (response.isSuccessful && response.body()?.data != null) {
                sesiList = response.body()!!.data!!
            }
        } catch (e: Exception) {}

        try {
            val resKelas = refService.getKelasList()
            if (resKelas.isSuccessful && resKelas.body()?.data != null) {
                kelasList = resKelas.body()!!.data!!
                if (selectedKelas == null && kelasList.isNotEmpty()) {
                    selectedKelas = if (!officerKelasId.isNullOrEmpty()) {
                        kelasList.find { it.id == officerKelasId } ?: kelasList.firstOrNull()
                    } else {
                        kelasList.firstOrNull()
                    }
                }
            }
        } catch (e: Exception) {}

        try {
            val resMapel = refService.getMapelList()
            if (resMapel.isSuccessful && resMapel.body()?.data != null) {
                mapelList = resMapel.body()!!.data!!
            }
        } catch (e: Exception) {}

        try {
            val resGuru = refService.getGuruList()
            if (resGuru.isSuccessful && resGuru.body()?.data != null) {
                guruList = resGuru.body()!!.data!!
            }
        } catch (e: Exception) {}

        try {
            val resJenis = refService.getJenisKegiatanList()
            if (resJenis.isSuccessful && resJenis.body()?.data != null) {
                jenisKegiatanList = resJenis.body()!!.data!!
            }
        } catch (e: Exception) {}

        isLoadingSesi = false
    }

    // Process Cek Manual Action per Student
    suspend fun handleMarkAbsence(siswaId: String, namaSiswa: String, status: String) {
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(AttendanceService::class.java)
            val response = service.markGateAbsence(MarkGateAbsenceRequest(siswaId = siswaId, status = status))

            if (response.isSuccessful) {
                confirmedCount++
                notPresentStudents = notPresentStudents.filterNot { it.id == siswaId }
                actionMessage = "✅ Presensi $namaSiswa ($status) Berhasil Dicatat"

                // Auto-transition to Manajemen Sesi when list becomes clear
                if (notPresentStudents.isEmpty()) {
                    delay(800)
                    actionMessage = "🎉 Cek Manual Clear! Mengalihkan otomatis ke Manajemen Sesi..."
                    delay(1200)
                    selectedTopTab = 1
                    loadSesi()
                }
            } else {
                actionMessage = "❌ Gagal mencatat presensi $namaSiswa"
            }
        } catch (e: Exception) {
            actionMessage = "❌ Terjadi kesalahan jaringan"
        }
    }

    LaunchedEffect(Unit) {
        loadCekManual()
    }

    LaunchedEffect(selectedTopTab, selectedSesiTab, filterOnlyMe) {
        if (selectedTopTab == 1) {
            loadSesi()
        }
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Operasional Presensi Kelas",
                onNavigateBack = onNavigateBack,
                actions = {
                    if (onNavigateToRiwayatAjar != null) {
                        IconButton(onClick = onNavigateToRiwayatAjar) {
                            Icon(Icons.Default.Book, contentDescription = "Riwayat Mengajar & Jurnal KBM", tint = Primary)
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            if (selectedTopTab == 1) {
                FloatingActionButton(
                    onClick = { showCreateOptionsSheet = true },
                    containerColor = Primary,
                    contentColor = OnPrimary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Sesi Baru")
                }
            }
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // ── Top Bar Navigation Tabs: CEK MANUAL (Default) vs MANAJEMEN SESI ──────────
            TabRow(
                selectedTabIndex = selectedTopTab,
                containerColor = SurfaceDark,
                contentColor = Primary,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTopTab]),
                        color = Primary
                    )
                }
            ) {
                Tab(
                    selected = selectedTopTab == 0,
                    onClick = { selectedTopTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("CEK MANUAL", fontWeight = if (selectedTopTab == 0) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                )
                Tab(
                    selected = selectedTopTab == 1,
                    onClick = { selectedTopTab = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("MANAJEMEN SESI", fontWeight = if (selectedTopTab == 1) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                )
            }

            if (!actionMessage.isNullOrEmpty()) {
                Text(
                    actionMessage!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = Primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // ── VIEW TAB 0: CEK MANUAL (Siswa Belum Tap Gerbang) ──────────────────────────
            if (selectedTopTab == 0) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp)
                ) {
                    Spacer(modifier = Modifier.height(12.dp))

                    // Stat Cards: MASIH DINANTI & SIAP BELAJAR
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Masih Dinanti Card (Pending Gate Taps)
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF3B171E))
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFEF4444).copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Schedule, contentDescription = null, tint = Danger, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("MASIH DINANTI", style = MaterialTheme.typography.labelSmall, color = Danger, fontWeight = FontWeight.Bold)
                                    Text(
                                        "${notPresentStudents.size}",
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextPrimary
                                    )
                                }
                            }
                        }

                        // Siap Belajar Card (Confirmed Students)
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = com.absenta.app.ui.theme.SuccessContainer)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(StatusHadir.copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.TrendingUp, contentDescription = null, tint = StatusHadir, modifier = Modifier.size(24.dp))
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("SIAP BELAJAR", style = MaterialTheme.typography.labelSmall, color = StatusHadir, fontWeight = FontWeight.Bold)
                                    Text(
                                        "$confirmedCount",
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextPrimary
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Title Header & Grid/List View Toggle Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Daftar Kehadiran Siswa", style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                            Text("Mendukung setiap langkah siswa menuju kelas", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }

                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(SurfaceDark)
                        ) {
                            IconButton(onClick = { isGridView = true }) {
                                Icon(Icons.Default.GridView, contentDescription = "Grid View", tint = if (isGridView) Primary else TextSecondary)
                            }
                            IconButton(onClick = { isGridView = false }) {
                                Icon(Icons.Default.FormatListBulleted, contentDescription = "List View", tint = if (!isGridView) Primary else TextSecondary)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    when {
                        isLoadingCekManual -> LoadingOverlay(modifier = Modifier.weight(1f))
                        notPresentStudents.isEmpty() -> {
                            Box(
                                modifier = Modifier.weight(1f).fillMaxWidth(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusHadir, modifier = Modifier.size(64.dp))
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text("🎉 Cek Manual Clear!", style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                                    Text("Semua siswa kelas sudah terkonfirmasi di gerbang / disetujui", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Button(
                                        onClick = { selectedTopTab = 1 },
                                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                                    ) {
                                        Text("Lanjut ke Manajemen Sesi", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                        isGridView -> {
                            // Grid Mode (Kategori Kotak seperti Screenshot 1)
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(2),
                                contentPadding = PaddingValues(bottom = 24.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                items(notPresentStudents) { student ->
                                    CekManualGridCard(
                                        student = student,
                                        onAction = { status ->
                                            scope.launch { handleMarkAbsence(student.id, student.namaSiswa ?: "Siswa", status) }
                                        }
                                    )
                                }
                            }
                        }
                        else -> {
                            // Table/List Mode (Row seperti Screenshot 2)
                            LazyColumn(
                                contentPadding = PaddingValues(bottom = 24.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                items(notPresentStudents) { student ->
                                    CekManualRowCard(
                                        student = student,
                                        onAction = { status ->
                                            scope.launch { handleMarkAbsence(student.id, student.namaSiswa ?: "Siswa", status) }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── VIEW TAB 1: MANAJEMEN SESI ────────────────────────────────────────────────
            if (selectedTopTab == 1) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tab Selector Sesi (Hari Ini vs Histori Kebelakang)
                    TabRow(
                        selectedTabIndex = selectedSesiTab,
                        containerColor = SurfaceDark,
                        contentColor = Primary,
                        indicator = { tabPositions ->
                            TabRowDefaults.SecondaryIndicator(
                                modifier = Modifier.tabIndicatorOffset(tabPositions[selectedSesiTab]),
                                color = Primary
                            )
                        }
                    ) {
                        Tab(
                            selected = selectedSesiTab == 0,
                            onClick = { selectedSesiTab = 0 },
                            text = { Text("Sesi Aktif Hari Ini", fontWeight = if (selectedSesiTab == 0) FontWeight.Bold else FontWeight.Normal) }
                        )
                        Tab(
                            selected = selectedSesiTab == 1,
                            onClick = { selectedSesiTab = 1 },
                            text = { Text("Histori Sesi Kebelakang", fontWeight = if (selectedSesiTab == 1) FontWeight.Bold else FontWeight.Normal) }
                        )
                    }

                    // Scope Filter Chips: [ 👤 Sesi Saya ] vs [ 🏫 Semua Sesi Sekolah ]
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (filterOnlyMe) PrimaryContainer else SurfaceDark)
                                .border(if (!filterOnlyMe) BorderStroke(1.dp, Border) else BorderStroke(0.dp, Color.Transparent), RoundedCornerShape(20.dp))
                                .clickable { filterOnlyMe = true }
                        ) {
                            Text(
                                "👤 Sesi Saya",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                color = if (filterOnlyMe) Primary else TextSecondary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (!filterOnlyMe) PrimaryContainer else SurfaceDark)
                                .border(if (filterOnlyMe) BorderStroke(1.dp, Border) else BorderStroke(0.dp, Color.Transparent), RoundedCornerShape(20.dp))
                                .clickable { filterOnlyMe = false }
                        ) {
                            Text(
                                "🏫 Semua Sesi Sekolah",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                color = if (!filterOnlyMe) Primary else TextSecondary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }

                    when {
                        isLoadingSesi -> LoadingOverlay(modifier = Modifier.weight(1f))
                        sesiList.isEmpty() -> EmptyState(
                            message = if (selectedSesiTab == 0) "Belum ada sesi kelas aktif hari ini. Tekan + untuk Tarik dari Jadwal atau Buat Manual."
                            else "Belum ada riwayat sesi kebelakang.",
                            modifier = Modifier.weight(1f)
                        )
                        else -> LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(sesiList) { item ->
                                val cardStatus = item.resolvedStatus
                                val cardBg = when (cardStatus) {
                                    "BERLANGSUNG" -> PrimaryContainer
                                    "SELESAI" -> Color(0xFFECFDF5)
                                    "TERLEWAT" -> SurfaceVariantDark
                                    else -> SurfaceDark
                                }
                                val cardBorder = when (cardStatus) {
                                    "BERLANGSUNG" -> Primary
                                    "SELESAI" -> StatusHadir.copy(alpha = 0.5f)
                                    "TERLEWAT" -> Border
                                    else -> Border
                                }

                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, cardBorder, RoundedCornerShape(14.dp))
                                        .clickable { selectedSesiForModal = item },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = cardBg)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        // Header Row: Kelas • Time & Status Badge
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(
                                                    item.kelas?.namaKelas ?: "Kelas Sesi",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = Color(0xFFA855F7),
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Text("•", color = TextSecondary)
                                                Text(
                                                    if (item.timeRangeDisplay != "-") item.timeRangeDisplay else "07:00 – 09:00",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    color = TextSecondary,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            StatusBadge(status = cardStatus)
                                        }

                                        // Subject Title
                                        Text(
                                            item.mapel?.namaMapel ?: item.namaSesi ?: "Sesi Absensi Kelas",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = TextPrimary,
                                            fontWeight = FontWeight.Bold
                                        )

                                        // Stats & Teacher Row
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            // Hadir Stat
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier
                                                    .background(SurfaceVariantDark, RoundedCornerShape(10.dp))
                                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Column {
                                                    Text("HADIR", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp)
                                                    Text("${item.totalHadir} / ${item.totalSiswa}", style = MaterialTheme.typography.labelMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                                                }
                                            }

                                            // Teacher Stat
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier
                                                    .background(Color(0xFF10B981).copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Column {
                                                    Text("PENGAJAR", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp)
                                                    Text(item.guru?.namaGuru ?: "Petugas Kelas", style = MaterialTheme.typography.labelMedium, color = StatusHadir, fontWeight = FontWeight.Bold, maxLines = 1)
                                                }
                                            }
                                        }

                                        // Divider
                                        Spacer(modifier = Modifier.height(2.dp))

                                        // Footer Badges & Actions
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Text(
                                                    "KBM",
                                                    modifier = Modifier.background(SurfaceVariantDark, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = TextSecondary,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 10.sp
                                                )
                                                
                                                // Badge Sumber Sesi (⚙ SISTEM vs 👤 MANUAL)
                                                if (item.isOtomatisSistem) {
                                                    Text(
                                                        "⚙ SISTEM",
                                                        modifier = Modifier.background(Color(0xFF3B82F6).copy(alpha = 0.15f), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = Primary,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 10.sp
                                                    )
                                                } else {
                                                    Text(
                                                        "👤 MANUAL",
                                                        modifier = Modifier.background(Color(0xFFF59E0B).copy(alpha = 0.15f), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = Color(0xFFD97706),
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 10.sp
                                                    )
                                                }
                                            }

                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                                val isFinished = cardStatus == "SELESAI"

                                                // Rule 1: Tombol Hapus Sesi HANYA TAMPIL jika sesi BELUM SELESAI (!isFinished)
                                                if (!isFinished) {
                                                    IconButton(
                                                        onClick = { sesiToDelete = item },
                                                        modifier = Modifier.size(32.dp)
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Delete,
                                                            contentDescription = "Hapus Sesi",
                                                            tint = Danger,
                                                            modifier = Modifier.size(18.dp)
                                                        )
                                                    }
                                                }

                                                // Rule 2: Tombol Jurnal Ajar HANYA TAMPIL jika sesi SUDAH SELESAI (isFinished)
                                                if (isFinished) {
                                                    Button(
                                                        onClick = { selectedSesiForJurnal = item },
                                                        colors = ButtonDefaults.buttonColors(containerColor = Primary.copy(alpha = 0.12f)),
                                                        shape = RoundedCornerShape(8.dp),
                                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                                        modifier = Modifier.height(32.dp)
                                                    ) {
                                                        Text("📖 JURNAL AJAR", style = MaterialTheme.typography.labelSmall, color = Primary, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                                                    }
                                                }

                                                Button(
                                                    onClick = { selectedSesiForModal = item },
                                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFA855F7).copy(alpha = 0.15f)),
                                                    shape = RoundedCornerShape(8.dp),
                                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                    modifier = Modifier.height(32.dp)
                                                ) {
                                                    Text("LOG HADIR", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA855F7), fontWeight = FontWeight.Bold, fontSize = 10.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Presensi Universal Modal per Sesi
        selectedSesiForModal?.let { sesi ->
            SesiDetailModal(
                sesi = sesi,
                tokenManager = tokenManager,
                onDismiss = { selectedSesiForModal = null },
                onSesiUpdated = { scope.launch { loadSesi() } }
            )
        }

        // Dialog Konfirmasi Hapus Sesi
        if (sesiToDelete != null) {
            AlertDialog(
                onDismissRequest = { sesiToDelete = null },
                title = { Text("Hapus Sesi Absensi?", fontWeight = FontWeight.Bold, color = TextPrimary) },
                text = { Text("Apakah Anda yakin ingin menghapus sesi absensi ${sesiToDelete?.namaSesi ?: "ini"}? Data sesi ini tidak dapat dikembalikan.", color = TextSecondary) },
                confirmButton = {
                    Button(
                        onClick = {
                            val targetId = sesiToDelete!!.id
                            sesiToDelete = null
                            scope.launch {
                                try {
                                    val retrofit = ApiClient.create(tokenManager)
                                    val service = retrofit.create(SesiKelasService::class.java)
                                    val res = service.deleteSesi(targetId)
                                    if (res.isSuccessful) {
                                        actionMessage = "🗑️ Sesi Absensi Berhasil Dihapus!"
                                        loadSesi()
                                    } else {
                                        actionMessage = "❌ Gagal menghapus sesi: ${res.message()}"
                                    }
                                } catch (e: Exception) {
                                    actionMessage = "❌ Gagal menghapus sesi"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Danger)
                    ) {
                        Text("Hapus Sesi", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { sesiToDelete = null }) {
                        Text("Batal", color = TextSecondary)
                    }
                },
                containerColor = SurfaceDark,
                shape = RoundedCornerShape(20.dp)
            )
        }

        // Dialog Input/Lihat Jurnal Ajar (Hanya Sesi SELESAI)
        if (selectedSesiForJurnal != null) {
            var materiInput by remember { mutableStateOf("") }
            var catatanInput by remember { mutableStateOf("") }

            AlertDialog(
                onDismissRequest = { selectedSesiForJurnal = null },
                title = { Text("Jurnal Ajar KBM", fontWeight = FontWeight.Bold, color = TextPrimary) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Materi & Catatan KBM Sesi (${selectedSesiForJurnal?.mapel?.namaMapel ?: "KBM"}):", color = TextSecondary, fontSize = 12.sp)
                        OutlinedTextField(
                            value = materiInput,
                            onValueChange = { materiInput = it },
                            label = { Text("Materi Yang Dibahas") },
                            placeholder = { Text("e.g. Bab 3 Pengenalan Algoritma") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary,
                                focusedBorderColor = Primary, unfocusedBorderColor = Border,
                                focusedLabelColor = Primary, unfocusedLabelColor = TextSecondary, cursorColor = Primary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = catatanInput,
                            onValueChange = { catatanInput = it },
                            label = { Text("Catatan KBM Tambahan") },
                            placeholder = { Text("e.g. Siswa aktif mengerjakan latihan") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary,
                                focusedBorderColor = Primary, unfocusedBorderColor = Border,
                                focusedLabelColor = Primary, unfocusedLabelColor = TextSecondary, cursorColor = Primary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val targetId = selectedSesiForJurnal!!.id
                            val m = materiInput
                            val c = catatanInput
                            selectedSesiForJurnal = null
                            scope.launch {
                                try {
                                    val retrofit = ApiClient.create(tokenManager)
                                    val service = retrofit.create(SesiKelasService::class.java)
                                    service.saveProgresMateri(targetId, ProgresMateriRequest(materiDibahas = m, catatanKbm = c))
                                    actionMessage = "✅ Jurnal Ajar Berhasil Disimpan!"
                                } catch (e: Exception) {
                                    actionMessage = "❌ Gagal menyimpan Jurnal Ajar"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Text("Simpan Jurnal", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { selectedSesiForJurnal = null }) {
                        Text("Tutup", color = TextSecondary)
                    }
                },
                containerColor = SurfaceDark,
                shape = RoundedCornerShape(20.dp)
            )
        }

        // BottomSheet Pilihan Mode Pembuatan Sesi (2 Options)
        if (showCreateOptionsSheet) {
            ModalBottomSheet(
                onDismissRequest = { showCreateOptionsSheet = false },
                containerColor = BackgroundDark
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text("Pilihan Pembuatan Sesi Kelas", style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                    Text("Pilih cara pembuatan sesi kelas untuk operasional presensi hari ini:", style = MaterialTheme.typography.bodySmall, color = TextSecondary)

                    // Option 1: Tarik dari Jadwal
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showCreateOptionsSheet = false
                                scope.launch {
                                    isLoadingSesi = true
                                    try {
                                        val retrofit = ApiClient.create(tokenManager)
                                        val service = retrofit.create(SesiKelasService::class.java)
                                        val res = service.generateFromTemplate()
                                        if (res.isSuccessful) {
                                            actionMessage = "✅ Sesi berhasil ditarik dari Jadwal Mengajar KBM!"
                                        } else {
                                            actionMessage = "ℹ️ Sesi jadwal mengajar sudah dibuat sebelumnya"
                                        }
                                        loadSesi()
                                    } catch (e: Exception) {
                                        actionMessage = "❌ Gagal menarik sesi dari jadwal"
                                    } finally {
                                        isLoadingSesi = false
                                    }
                                }
                            },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 12.dp))
                            Column {
                                Text("⚡ Tarik dari Jadwal", style = MaterialTheme.typography.titleSmall, color = TextPrimary, fontWeight = FontWeight.Bold)
                                Text("Membuat sesi otomatis dari Jadwal Pelajaran KBM hari ini", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                    }

                    // Option 2: Buat Sesi Absensi Manual
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showCreateOptionsSheet = false
                                showManualCreateDialog = true
                            },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.EditCalendar, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 12.dp))
                            Column {
                                Text("📝 Buat Sesi Absensi Manual", style = MaterialTheme.typography.titleSmall, color = TextPrimary, fontWeight = FontWeight.Bold)
                                Text("Input manual Kelas, Jenis Kegiatan, Guru, Mapel & Jam", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                }
            }
        }

        // Modal Dialog "Buat Sesi Absensi Manual"
        if (showManualCreateDialog) {
            // Auto-select kelas petugas kelas yang login jika belum terpilih
            LaunchedEffect(Unit) {
                if (selectedKelas == null && kelasList.isNotEmpty()) {
                    selectedKelas = if (!officerKelasId.isNullOrEmpty()) {
                        kelasList.find { it.id == officerKelasId } ?: kelasList.firstOrNull()
                    } else {
                        kelasList.firstOrNull()
                    }
                }
            }

            AlertDialog(
                onDismissRequest = { showManualCreateDialog = false },
                title = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Buat Sesi Absensi Manual", style = MaterialTheme.typography.titleMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                        IconButton(onClick = { showManualCreateDialog = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Tutup", tint = TextSecondary)
                        }
                    }
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 1. Pilih Kelas (Otomatis Terseleksi ke Kelas Petugas yang Login)
                        val kelasOptions = kelasList.map { DropdownOption(id = it.id, label = it.namaKelas ?: "Kelas ${it.id}") }
                        AbsentaDropdown(
                            label = "Kelas Petugas",
                            selectedLabel = selectedKelas?.namaKelas ?: "Pilih Kelas",
                            options = kelasOptions,
                            onOptionSelected = { opt -> selectedKelas = kelasList.find { it.id == opt.id } }
                        )

                        // 2. Jenis Kegiatan & Picker Tanggal Otomatis
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val jenisOptions = if (jenisKegiatanList.isEmpty()) listOf(DropdownOption(id = "KBM", label = "KBM Reguler"))
                            else jenisKegiatanList.map { DropdownOption(id = it.id, label = it.namaKegiatan) }

                            Box(modifier = Modifier.weight(1f)) {
                                AbsentaDropdown(
                                    label = "Jenis Kegiatan",
                                    selectedLabel = selectedJenisKegiatan?.namaKegiatan ?: "KBM Reguler",
                                    options = jenisOptions,
                                    onOptionSelected = { opt -> selectedJenisKegiatan = jenisKegiatanList.find { it.id == opt.id } }
                                )
                            }

                            // Picker Tanggal (Klik untuk membuka DatePickerDialog Native)
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { openDatePicker() }
                            ) {
                                OutlinedTextField(
                                    value = tanggalInput,
                                    onValueChange = {},
                                    readOnly = true,
                                    enabled = false,
                                    label = { Text("Tanggal") },
                                    leadingIcon = { Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = Primary) },
                                    singleLine = true,
                                    colors = outlinedTextFieldColors(),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        val guruOptions = guruList.map { DropdownOption(id = it.id, label = it.namaGuru ?: "Guru ${it.id}") }
                        AbsentaDropdown(
                            label = "Guru Pengajar (Opsional)",
                            selectedLabel = selectedGuru?.namaGuru ?: "",
                            options = guruOptions,
                            onOptionSelected = { opt -> selectedGuru = guruList.find { it.id == opt.id } }
                        )

                        val mapelOptions = mapelList.map { DropdownOption(id = it.id, label = it.namaMapel ?: "Mapel ${it.id}") }
                        AbsentaDropdown(
                            label = "Mata Pelajaran (Opsional)",
                            selectedLabel = selectedMapel?.namaMapel ?: "",
                            options = mapelOptions,
                            onOptionSelected = { opt -> selectedMapel = mapelList.find { it.id == opt.id } }
                        )

                        // 3. Smart Time Picker: Waktu Mulai & Waktu Selesai (Klik untuk TimePickerDialog)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { openTimePicker(timeMulaiOnly) { timeMulaiOnly = it } }
                            ) {
                                OutlinedTextField(
                                    value = timeMulaiOnly,
                                    onValueChange = {},
                                    readOnly = true,
                                    enabled = false,
                                    label = { Text("Waktu Mulai") },
                                    leadingIcon = { Icon(Icons.Default.Schedule, contentDescription = null, tint = Primary) },
                                    singleLine = true,
                                    colors = outlinedTextFieldColors(),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { openTimePicker(timeSelesaiOnly) { timeSelesaiOnly = it } }
                            ) {
                                OutlinedTextField(
                                    value = timeSelesaiOnly,
                                    onValueChange = {},
                                    readOnly = true,
                                    enabled = false,
                                    label = { Text("Waktu Selesai") },
                                    leadingIcon = { Icon(Icons.Default.Schedule, contentDescription = null, tint = StatusHadir) },
                                    singleLine = true,
                                    colors = outlinedTextFieldColors(),
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        // 4. Quick Schedule Preset Chips (Pilihan Jam Otomatis Instan)
                        Text("PILIHAN WAKTU OTOMATIS", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                Triple("Pagi", "07:00", "09:00"),
                                Triple("Siang", "09:15", "11:30"),
                                Triple("Sore", "12:30", "15:00")
                            ).forEach { (label, start, end) ->
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(SurfaceVariantDark)
                                        .border(1.dp, Border, RoundedCornerShape(8.dp))
                                        .clickable {
                                            timeMulaiOnly = start
                                            timeSelesaiOnly = end
                                        }
                                        .padding(vertical = 6.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("$start-$end", fontSize = 8.sp, color = TextSecondary)
                                    }
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        enabled = !isSubmitting && selectedKelas != null,
                        onClick = {
                            scope.launch {
                                isSubmitting = true
                                try {
                                    fun convertLocalToUtcIso(dateStr: String, timeStr: String, tzId: String = "Asia/Jakarta"): String {
                                        return try {
                                            val sdfInput = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                                            sdfInput.timeZone = TimeZone.getTimeZone(tzId)
                                            val date = sdfInput.parse("$dateStr $timeStr:00")
                                            if (date != null) {
                                                val sdfOutput = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                                sdfOutput.timeZone = TimeZone.getTimeZone("UTC")
                                                sdfOutput.format(date)
                                            } else {
                                                "$dateStr $timeStr:00"
                                            }
                                        } catch (e: Exception) {
                                            "$dateStr $timeStr:00"
                                        }
                                    }

                                    val tenantTz = tokenManager.getTenantTimezone()
                                    val fullWaktuMulai = convertLocalToUtcIso(dateApiFormatted, timeMulaiOnly, tenantTz)
                                    val fullWaktuSelesai = convertLocalToUtcIso(dateApiFormatted, timeSelesaiOnly, tenantTz)

                                    val retrofit = ApiClient.create(tokenManager)
                                    val service = retrofit.create(SesiKelasService::class.java)
                                    service.createSesiManual(
                                        CreateSesiManualRequest(
                                            namaSesi = "Sesi ${selectedMapel?.namaMapel ?: selectedJenisKegiatan?.namaKegiatan ?: "KBM"}",
                                            kelasId = selectedKelas!!.id,
                                            guruId = selectedGuru?.id ?: guruList.firstOrNull()?.id,
                                            mapelId = selectedMapel?.id,
                                            jenisKegiatanId = selectedJenisKegiatan?.id,
                                            tanggal = dateApiFormatted,
                                            waktuMulai = fullWaktuMulai,
                                            waktuSelesai = fullWaktuSelesai
                                        )
                                    )
                                    showManualCreateDialog = false
                                    actionMessage = "✅ Sesi Absensi Manual (${selectedKelas?.namaKelas}) Berhasil Dibuat!"
                                    loadSesi()
                                } catch (e: Exception) {
                                    actionMessage = "❌ Gagal membuat sesi manual: ${e.message}"
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Text(if (isSubmitting) "Menyimpan..." else "Simpan", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { showManualCreateDialog = false }) {
                        Text("Batal", color = TextSecondary)
                    }
                },
                containerColor = SurfaceDark,
                shape = RoundedCornerShape(20.dp)
            )
        }
    }
}

/** Cek Manual Grid Card (Persis Screenshot 1) */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CekManualGridCard(
    student: NotPresentStudentItem,
    onAction: (status: String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar Initial Circle
            val initials = student.namaSiswa?.split(" ")
                ?.take(2)
                ?.mapNotNull { it.firstOrNull()?.uppercase() }
                ?.joinToString("") ?: "S"

            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(SurfaceVariantDark),
                contentAlignment = Alignment.Center
            ) {
                Text(initials, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                student.namaSiswa ?: "Siswa",
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                "NIS: ${student.displayNis}",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Main HADIR Button (Full Green Button)
            Button(
                onClick = { onAction("HADIR") },
                colors = ButtonDefaults.buttonColors(containerColor = StatusHadir),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(34.dp),
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("HADIR", fontSize = 11.sp, fontWeight = FontWeight.Black)
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Action Buttons Row: SAKIT | IZIN
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                OutlinedButton(
                    onClick = { onAction("SAKIT") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(30.dp),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("SAKIT", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = StatusSakit)
                }

                OutlinedButton(
                    onClick = { onAction("IZIN") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(30.dp),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("IZIN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = StatusIzin)
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Action Buttons Row: DISPEN | ALPA
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                OutlinedButton(
                    onClick = { onAction("DISPEN") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(30.dp),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("DISPEN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFA855F7))
                }

                OutlinedButton(
                    onClick = { onAction("ALPA") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(30.dp),
                    contentPadding = PaddingValues(2.dp)
                ) {
                    Text("ALPA", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Danger)
                }
            }
        }
    }
}

/** Cek Manual Table Row Card (Persis Screenshot 2) */
@Composable
private fun CekManualRowCard(
    student: NotPresentStudentItem,
    onAction: (status: String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    student.namaSiswa ?: "Siswa",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "NIS: ${student.displayNis}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Button(
                    onClick = { onAction("HADIR") },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusHadir),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    Text("HADIR", fontSize = 10.sp, fontWeight = FontWeight.Black)
                }

                OutlinedButton(
                    onClick = { onAction("SAKIT") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp)
                ) {
                    Text("SAKIT", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusSakit)
                }

                OutlinedButton(
                    onClick = { onAction("IZIN") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp)
                ) {
                    Text("IZIN", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusIzin)
                }

                OutlinedButton(
                    onClick = { onAction("DISPEN") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp)
                ) {
                    Text("DISPEN", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFA855F7))
                }

                OutlinedButton(
                    onClick = { onAction("ALPA") },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp)
                ) {
                    Text("ALPA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Danger)
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
