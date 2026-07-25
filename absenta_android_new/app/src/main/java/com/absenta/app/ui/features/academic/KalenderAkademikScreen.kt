package com.absenta.app.ui.features.academic

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.FormatListNumbered
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.KalenderService
import com.absenta.app.data.api.ReferenceService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.BulkSeedKalenderRequest
import com.absenta.app.data.model.CreateKalenderRequest
import com.absenta.app.data.model.KalenderEventItem
import com.absenta.app.data.model.KalenderStatsData
import com.absenta.app.data.model.MasterTahunPelajaranItem
import com.absenta.app.ui.components.AbsentaDropdown
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.DropdownOption
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * KalenderAkademikScreen — Layar Kalender Pendidikan & Agenda Sekolah (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/kurikulum/kalender`, `GET /stats`, `POST`, `PUT`, `DELETE`, `bulk-seed`)
 * - Tahun Pelajaran Selector (Auto-select active academic year)
 * - Dynamic Stats Header (Hari Libur, Ujian, Minggu Efektif S1/S2)
 * - Visual Monthly Calendar Grid (Tampilan Grid Kalender Bulanan per tanggal 1-31)
 * - List Agenda View & Filter Types (Libur Nasional, Libur Sekolah, Ujian, Agenda)
 * - Strict RBAC (`academic.structure.manage` / Admin / Kurikulum / Kepsek untuk aksi CRUD & Bulk Seed)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KalenderAkademikScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var eventList by remember { mutableStateOf<List<KalenderEventItem>>(emptyList()) }
    var statsData by remember { mutableStateOf<KalenderStatsData?>(null) }
    var tahunList by remember { mutableStateOf<List<MasterTahunPelajaranItem>>(emptyList()) }
    var selectedTahunId by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }
    var viewMode by remember { mutableIntStateOf(0) } // 0: Grid Kalender, 1: Daftar Event

    // Current Month Navigation for Calendar Grid
    val calendarInstance = remember { Calendar.getInstance() }
    var currentYear by remember { mutableIntStateOf(calendarInstance.get(Calendar.YEAR)) }
    var currentMonth by remember { mutableIntStateOf(calendarInstance.get(Calendar.MONTH)) } // 0-indexed

    // Capabilities & Roles
    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Form States (Create & Edit)
    var showFormModal by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<KalenderEventItem?>(null) }
    var judulInput by remember { mutableStateOf("") }
    var jenisSelected by remember { mutableStateOf("LIBUR_SEKOLAH") }
    var tglMulaiInput by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var tglSelesaiInput by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var keteranganInput by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Delete Confirmation State
    var showDeleteConfirm by remember { mutableStateOf<KalenderEventItem?>(null) }
    var showBulkSeedConfirm by remember { mutableStateOf(false) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val kalenderService = retrofit.create(KalenderService::class.java)
        val refService = retrofit.create(ReferenceService::class.java)

        try {
            // Load Tahun Pelajaran jika belum ada
            if (tahunList.isEmpty()) {
                val tpRes = refService.getTahunPelajaranList()
                if (tpRes.isSuccessful && tpRes.body()?.data != null) {
                    tahunList = tpRes.body()!!.data!!
                    if (selectedTahunId == null) {
                        selectedTahunId = tahunList.find { it.isActive }?.id ?: tahunList.firstOrNull()?.id
                    }
                }
            }

            // Load Events & Stats
            val eventsRes = kalenderService.getKalenderList(selectedTahunId)
            if (eventsRes.isSuccessful && eventsRes.body()?.data != null) {
                eventList = eventsRes.body()!!.data!!
            }

            val statsRes = kalenderService.getKalenderStats(selectedTahunId)
            if (statsRes.isSuccessful && statsRes.body()?.data != null) {
                statsData = statsRes.body()!!.data
            }
        } catch (e: Exception) {
            eventList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(selectedTahunId) {
        loadData()
    }

    // RBAC Check: Siapa yang boleh menambah/mengedit/menghapus/bulk seed?
    val canManage = remember(capabilities, userRole) {
        capabilities.contains("academic.structure.manage") ||
                userRole.uppercase().contains("ADMIN") ||
                userRole.uppercase().contains("KURIKULUM") ||
                userRole.uppercase().contains("KEPSEK")
    }

    val filteredList = remember(eventList, searchQuery, selectedFilter) {
        eventList.filter { item ->
            val matchSearch = searchQuery.isBlank() ||
                    item.displayJudul.contains(searchQuery, ignoreCase = true) ||
                    (item.keterangan?.contains(searchQuery, ignoreCase = true) == true)

            val jenisUpper = (item.jenis ?: "").uppercase()
            val matchFilter = when (selectedFilter) {
                "LIBUR_NASIONAL" -> jenisUpper == "LIBUR_NASIONAL"
                "LIBUR_SEKOLAH" -> jenisUpper == "LIBUR_SEKOLAH"
                "UJIAN" -> jenisUpper == "UJIAN" || jenisUpper == "PTS" || jenisUpper == "PAS"
                "KBM" -> jenisUpper == "KBM" || jenisUpper == "MINGGU_EFEKTIF"
                "AGENDA" -> jenisUpper == "KEGIATAN_SEKOLAH" || jenisUpper == "KEGIATAN" || jenisUpper == "AGENDA"
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val monthName = remember(currentYear, currentMonth) {
        val cal = Calendar.getInstance()
        cal.set(Calendar.YEAR, currentYear)
        cal.set(Calendar.MONTH, currentMonth)
        cal.set(Calendar.DAY_OF_MONTH, 1)
        SimpleDateFormat("MMMM yyyy", Locale("id", "ID")).format(cal.time)
    }

    fun openCreateModal() {
        editingItem = null
        judulInput = ""
        jenisSelected = "LIBUR_SEKOLAH"
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        tglMulaiInput = todayStr
        tglSelesaiInput = todayStr
        keteranganInput = ""
        showFormModal = true
    }

    fun openEditModal(item: KalenderEventItem) {
        editingItem = item
        judulInput = item.displayJudul
        jenisSelected = item.jenis ?: "LIBUR_SEKOLAH"
        tglMulaiInput = item.tanggalMulai?.take(10) ?: SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        tglSelesaiInput = item.tanggalSelesai?.take(10) ?: tglMulaiInput
        keteranganInput = item.keterangan ?: ""
        showFormModal = true
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Kalender & Agenda Pendidikan",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = { openCreateModal() },
                    containerColor = Primary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = TextPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Tambah Event", fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                }
            }
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        if (isLoading) {
            LoadingOverlay(modifier = Modifier.padding(paddingValues))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // 1. Selector Tahun Pelajaran & Action Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Dropdown Picker Tahun Pelajaran
                    val tpOptions = tahunList.map { DropdownOption(it.id, "TP ${it.tahun}", if (it.isActive) "Aktif" else "") }
                    val currentTpName = tahunList.find { it.id == selectedTahunId }?.tahun ?: "Tahun Pelajaran"

                    Box(modifier = Modifier.weight(1f)) {
                        AbsentaDropdown(
                            label = "Tahun Pelajaran",
                            selectedLabel = "TP $currentTpName",
                            options = tpOptions,
                            onOptionSelected = { opt -> selectedTahunId = opt.id }
                        )
                    }

                    if (canManage) {
                        Spacer(modifier = Modifier.width(8.dp))
                        OutlinedButton(
                            onClick = { showBulkSeedConfirm = true },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Primary),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Primary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Generate Libur", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // 2. Tab Toggle View Mode (0: Grid Kalender, 1: Daftar Event)
                TabRow(
                    selectedTabIndex = viewMode,
                    containerColor = SurfaceDark,
                    contentColor = Primary,
                    indicator = { tabPositions ->
                        TabRowDefaults.Indicator(
                            Modifier.tabIndicatorOffset(tabPositions[viewMode]),
                            color = Primary
                        )
                    }
                ) {
                    Tab(
                        selected = viewMode == 0,
                        onClick = { viewMode = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.GridView, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Grid Bulanan", fontWeight = FontWeight.Bold)
                            }
                        }
                    )
                    Tab(
                        selected = viewMode == 1,
                        onClick = { viewMode = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.FormatListNumbered, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Daftar Agenda", fontWeight = FontWeight.Bold)
                            }
                        }
                    )
                }

                // Main Scrollable Content
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 3. Backend Real-Time Stats Bar
                    item {
                        val totalEv = statsData?.totalEvents ?: eventList.size
                        val liburEv = statsData?.hariLibur ?: eventList.count { (it.jenis ?: "").uppercase().contains("LIBUR") }
                        val ujianEv = statsData?.hariUjian ?: eventList.count { (it.jenis ?: "").uppercase().contains("UJIAN") }
                        val mingguEfektif = statsData?.calculatedMingguEfektif ?: (statsData?.mingguEfektif ?: 0)

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Hari Libur",
                                value = "$liburEv Hari",
                                subtitle = "Nasional & Sekolah",
                                icon = Icons.Default.Event,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Sesi Ujian",
                                value = "$ujianEv Hari",
                                subtitle = "UTS / UAS / ANBK",
                                icon = Icons.Default.EventNote,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Minggu Efektif",
                                value = "$mingguEfektif Mgg",
                                subtitle = "KBM Sekolah",
                                icon = Icons.Default.CalendarMonth,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // VIEW MODE 0: Interactive Calendar Grid
                    if (viewMode == 0) {
                        item {
                            // Month Navigation Header
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceDark)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        IconButton(onClick = {
                                            if (currentMonth == 0) {
                                                currentMonth = 11
                                                currentYear -= 1
                                            } else {
                                                currentMonth -= 1
                                            }
                                        }) {
                                            Icon(Icons.Default.ChevronLeft, contentDescription = null, tint = TextPrimary)
                                        }

                                        Text(
                                            text = monthName,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )

                                        IconButton(onClick = {
                                            if (currentMonth == 11) {
                                                currentMonth = 0
                                                currentYear += 1
                                            } else {
                                                currentMonth += 1
                                            }
                                        }) {
                                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextPrimary)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Day Names Header (Sen, Sel, Rab, Kam, Jum, Sab, Min)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceAround
                                    ) {
                                        val daysHeader = listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min")
                                        daysHeader.forEach { d ->
                                            Text(
                                                text = d,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (d == "Min") Danger else TextSecondary,
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    // Grid Days Calculation
                                    val daysInMonthList = remember(currentYear, currentMonth, eventList) {
                                        buildCalendarDays(currentYear, currentMonth, eventList)
                                    }

                                    // Render 7-column Grid Cells
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        daysInMonthList.chunked(7).forEach { weekChunk ->
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceAround
                                            ) {
                                                weekChunk.forEach { dayCell ->
                                                    Box(
                                                        modifier = Modifier
                                                            .weight(1f)
                                                            .aspectRatio(1f)
                                                            .padding(2.dp)
                                                            .clip(RoundedCornerShape(8.dp))
                                                            .background(
                                                                if (dayCell?.isToday == true) Primary.copy(alpha = 0.25f)
                                                                else if (dayCell?.dayNumber != null) SurfaceVariantDark
                                                                else Color.Transparent
                                                            )
                                                            .border(
                                                                width = if (dayCell?.isToday == true) 1.dp else 0.dp,
                                                                color = if (dayCell?.isToday == true) Primary else Color.Transparent,
                                                                shape = RoundedCornerShape(8.dp)
                                                            ),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        if (dayCell?.dayNumber != null) {
                                                            Column(
                                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                                verticalArrangement = Arrangement.Center
                                                            ) {
                                                                Text(
                                                                    text = "${dayCell.dayNumber}",
                                                                    fontSize = 12.sp,
                                                                    fontWeight = if (dayCell.isToday) FontWeight.Bold else FontWeight.Medium,
                                                                    color = if (dayCell.isSunday) Danger else TextPrimary
                                                                )
                                                                if (dayCell.eventTypes.isNotEmpty()) {
                                                                    Spacer(modifier = Modifier.height(2.dp))
                                                                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                                                        dayCell.eventTypes.take(3).forEach { t ->
                                                                            val dotColor = when (t.uppercase()) {
                                                                                "LIBUR_NASIONAL" -> Danger
                                                                                "LIBUR_SEKOLAH" -> StatusTerlambat
                                                                                "UJIAN", "PTS", "PAS" -> StatusIzin
                                                                                else -> StatusHadir
                                                                            }
                                                                            Box(
                                                                                modifier = Modifier
                                                                                    .size(4.dp)
                                                                                    .clip(CircleShape)
                                                                                    .background(dotColor)
                                                                            )
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
                            }
                        }
                    }

                    // VIEW MODE 1 / FILTER & SEARCH BAR FOR LIST
                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari Judul Agenda / Keterangan...", color = TextSecondary) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Primary) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = SurfaceDark,
                                unfocusedContainerColor = SurfaceDark,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = Border,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // Status Filter Chips
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item { FilterChipKalender("SEMUA", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKalender("🔴 LIBUR NASIONAL", "LIBUR_NASIONAL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKalender("📙 LIBUR SEKOLAH", "LIBUR_SEKOLAH", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKalender("📝 UJIAN", "UJIAN", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKalender("📌 AGENDA SEKOLAH", "AGENDA", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // List Events
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada agenda / hari libur terdaftar pada periode ini.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            KalenderEventCardItem(
                                item = item,
                                canManage = canManage,
                                onEdit = { openEditModal(item) },
                                onDelete = { showDeleteConfirm = item }
                            )
                        }
                    }
                }
            }
        }
    }

    // Form Modal: Tambah & Edit Event
    if (showFormModal) {
        AlertDialog(
            onDismissRequest = { showFormModal = false },
            title = {
                Text(
                    text = if (editingItem == null) "Tambah Event Kalender Baru" else "Edit Event Kalender",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = judulInput,
                        onValueChange = { judulInput = it },
                        label = { Text("Judul Agenda / Event") },
                        placeholder = { Text("misal: Libur Idul Fitri / Ujian Semester 1") },
                        colors = outlinedTextFieldColorsKalender(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    val jenisOptions = listOf(
                        DropdownOption("LIBUR_NASIONAL", "🔴 Libur Nasional", "Tanggal Merah Resmi"),
                        DropdownOption("LIBUR_SEKOLAH", "📙 Libur Sekolah / Semester", "Libur Khusus Internal Sekolah"),
                        DropdownOption("UJIAN", "📝 Sesi Ujian / Evaluasi", "UTS / UAS / ANBK / Ujian Sekolah"),
                        DropdownOption("KBM", "📗 Hari Efektif KBM", "Kegiatan Pembelajaran Efektif"),
                        DropdownOption("KEGIATAN_SEKOLAH", "📌 Agenda / Peringatan Sekolah", "Upacara / Classmeeting / Event")
                    )
                    AbsentaDropdown(
                        label = "Jenis Event",
                        selectedLabel = jenisOptions.find { it.id == jenisSelected }?.label ?: "Libur Sekolah",
                        options = jenisOptions,
                        onOptionSelected = { opt -> jenisSelected = opt.id }
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = tglMulaiInput,
                            onValueChange = { tglMulaiInput = it },
                            label = { Text("Tgl Mulai (YYYY-MM-DD)") },
                            colors = outlinedTextFieldColorsKalender(),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = tglSelesaiInput,
                            onValueChange = { tglSelesaiInput = it },
                            label = { Text("Tgl Selesai (YYYY-MM-DD)") },
                            colors = outlinedTextFieldColorsKalender(),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = keteranganInput,
                        onValueChange = { keteranganInput = it },
                        label = { Text("Keterangan Tambahan") },
                        placeholder = { Text("misal: Seluruh aktivitas KBM diliburkan") },
                        colors = outlinedTextFieldColorsKalender(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && judulInput.isNotBlank() && tglMulaiInput.isNotBlank(),
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(KalenderService::class.java)

                                val req = CreateKalenderRequest(
                                    judul = judulInput,
                                    jenis = jenisSelected,
                                    tanggalMulai = tglMulaiInput,
                                    tanggalSelesai = tglSelesaiInput.ifBlank { tglMulaiInput },
                                    keterangan = keteranganInput,
                                    tahunPelajaranId = selectedTahunId
                                )

                                if (editingItem == null) {
                                    service.createKalender(req)
                                } else {
                                    service.updateKalender(editingItem!!.id, req)
                                }

                                showFormModal = false
                                loadData()
                            } catch (e: Exception) {
                            } finally {
                                isSubmitting = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text(if (isSubmitting) "Menyimpan..." else if (editingItem == null) "Simpan Event" else "Perbarui Event", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormModal = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Modal Confirmation: Delete Single Event
    if (showDeleteConfirm != null) {
        val target = showDeleteConfirm!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Event Kalender?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus '${target.displayJudul}' dari kalender sekolah?", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(KalenderService::class.java)
                                service.deleteKalender(target.id)
                                showDeleteConfirm = null
                                loadData()
                            } catch (e: Exception) {}
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger)
                ) {
                    Text("Hapus", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = null }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Modal Confirmation: Bulk Seed Hari Libur Nasional
    if (showBulkSeedConfirm) {
        AlertDialog(
            onDismissRequest = { showBulkSeedConfirm = false },
            title = { Text("Generate Libur Nasional?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Sistem akan secara otomatis menyuntikkan (seed) tanggal merah libur nasional & libur semester untuk Tahun Pelajaran aktif ini.", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(KalenderService::class.java)
                                if (selectedTahunId != null) {
                                    service.bulkSeedHolidays(BulkSeedKalenderRequest(selectedTahunId!!))
                                }
                                showBulkSeedConfirm = false
                                loadData()
                            } catch (e: Exception) {}
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Proses Generate", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBulkSeedConfirm = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

private data class CalendarDayCell(
    val dayNumber: Int?,
    val isSunday: Boolean = false,
    val isToday: Boolean = false,
    val eventTypes: List<String> = emptyList()
)

private fun buildCalendarDays(year: Int, month: Int, events: List<KalenderEventItem>): List<CalendarDayCell> {
    val cal = Calendar.getInstance()
    cal.set(Calendar.YEAR, year)
    cal.set(Calendar.MONTH, month)
    cal.set(Calendar.DAY_OF_MONTH, 1)

    val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // 1: Sunday, 2: Monday...
    val offset = if (firstDayOfWeek == Calendar.SUNDAY) 6 else firstDayOfWeek - 2 // Sen-indexed (0: Sen)
    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)

    val todayCal = Calendar.getInstance()
    val todayYear = todayCal.get(Calendar.YEAR)
    val todayMonth = todayCal.get(Calendar.MONTH)
    val todayDay = todayCal.get(Calendar.DAY_OF_MONTH)

    val cells = mutableListOf<CalendarDayCell>()

    // Offset blank days
    for (i in 0 until offset) {
        cells.add(CalendarDayCell(null))
    }

    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    // Month days
    for (d in 1..daysInMonth) {
        cal.set(Calendar.DAY_OF_MONTH, d)
        val isSunday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY
        val isToday = year == todayYear && month == todayMonth && d == todayDay

        val currentDayStr = String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month + 1, d)

        // Matches events for this day
        val dayEventTypes = events.filter { ev ->
            val start = ev.tanggalMulai?.take(10) ?: ""
            val end = (ev.tanggalSelesai?.take(10)).takeIf { !it.isNullOrBlank() } ?: start
            currentDayStr >= start && currentDayStr <= end
        }.mapNotNull { it.jenis }

        cells.add(CalendarDayCell(d, isSunday, isToday, dayEventTypes))
    }

    return cells
}

@Composable
private fun FilterChipKalender(
    label: String,
    value: String,
    currentSelected: String,
    onSelect: (String) -> Unit
) {
    val isSelected = currentSelected == value
    
    val baseModifier = Modifier
        .clip(RoundedCornerShape(20.dp))
        .background(if (isSelected) PrimaryContainer else SurfaceDark)
        .clickable { onSelect(value) }
        
    val finalModifier = if (!isSelected) {
        baseModifier.border(androidx.compose.foundation.BorderStroke(1.dp, Border), RoundedCornerShape(20.dp))
    } else {
        baseModifier
    }

    Box(
        modifier = finalModifier
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Primary else TextSecondary
        )
    }
}

@Composable
private fun KalenderEventCardItem(
    item: KalenderEventItem,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val jenisUpper = (item.jenis ?: "").uppercase()
    val badgeColor = when {
        jenisUpper == "LIBUR_NASIONAL" -> Danger
        jenisUpper == "LIBUR_SEKOLAH" -> StatusTerlambat
        jenisUpper == "UJIAN" || jenisUpper == "PTS" || jenisUpper == "PAS" -> StatusIzin
        jenisUpper == "KBM" || jenisUpper == "MINGGU_EFEKTIF" -> StatusHadir
        else -> Primary
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Border)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.displayJudul,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(badgeColor.copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = item.displayJenis,
                        color = badgeColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Rentang Tanggal & Keterangan
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceVariantDark)
                    .padding(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "📅 Tanggal: ${item.rangeDisplay}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        if (!item.keterangan.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "ℹ️ ${item.keterangan}",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    if (canManage) {
                        Row {
                            IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Primary, modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Danger, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColorsKalender() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
