package com.absenta.app.ui.features.attendance

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JadwalTemplateScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }

    // User session variables
    var userName by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("") }
    var userCapabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var myGuruId by remember { mutableStateOf("") }
    var myKelasId by remember { mutableStateOf("") }

    // Feature gating
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val isLocked = enabledFeatures.isNotEmpty() && !enabledFeatures.contains("ABSENSI")

    // Filter states
    var selectedTahunId by remember { mutableStateOf("") }
    var selectedSemesterId by remember { mutableStateOf("") }
    var selectedKelasId by remember { mutableStateOf("") }
    var selectedGuruId by remember { mutableStateOf("") }

    // Filter master list data
    var tahunPelajaranList by remember { mutableStateOf<List<TahunPelajaranDetail>>(emptyList()) }
    var semesterList by remember { mutableStateOf<List<SemesterDetail>>(emptyList()) }
    var kelasList by remember { mutableStateOf<List<KelasDetail>>(emptyList()) }
    var guruList by remember { mutableStateOf<List<GuruDetail>>(emptyList()) }
    var mapelList by remember { mutableStateOf<List<MapelDetail>>(emptyList()) }

    // Schedules data states
    var jadwalTemplates by remember { mutableStateOf<List<JadwalTemplateEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var refreshKey by remember { mutableStateOf(0) }

    // UI View states
    var viewMode by remember { mutableStateOf("grid") } // "grid" or "list"
    var selectedDayIndex by remember { mutableStateOf(0) }
    val days = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")

    // CRUD state dialogs
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedSlotToEdit by remember { mutableStateOf<JadwalTemplateEntry?>(null) }
    var showDeleteConfirmDialog by remember { mutableStateOf<JadwalTemplateEntry?>(null) }

    // Load initial context & filters
    LaunchedEffect(Unit) {
        userName = sessionManager.userNameFlow.first() ?: "Pengguna"
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        myGuruId = "" // dynamic lookup logic below
        myKelasId = sessionManager.waliKelasDiFlow.first() ?: ""

        try {
            val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
            
            // 1. Fetch active school year & list
            val tpResponse = academicService.getTahunPelajaran(1, 20)
            if (tpResponse.isSuccessful && tpResponse.body()?.success == true) {
                tahunPelajaranList = tpResponse.body()?.data ?: emptyList()
                val activeTp = tahunPelajaranList.find { it.is_active } ?: tahunPelajaranList.firstOrNull()
                if (activeTp != null) {
                    selectedTahunId = activeTp.id
                    
                    // 2. Fetch semesters for school year
                    val semResponse = academicService.getSemester(1, 20)
                    if (semResponse.isSuccessful && semResponse.body()?.success == true) {
                        semesterList = semResponse.body()?.data ?: emptyList()
                        val activeSem = semesterList.find { it.is_active } ?: semesterList.firstOrNull()
                        if (activeSem != null) {
                            selectedSemesterId = activeSem.id
                        }
                    }
                }
            }

            // 3. Fetch Kelas & Guru for filters & forms
            val kelasResponse = academicService.getKelas(1, 100)
            if (kelasResponse.isSuccessful) {
                kelasList = kelasResponse.body()?.data ?: emptyList()
            }
            val guruResponse = academicService.getGuru(1, 100)
            if (guruResponse.isSuccessful) {
                guruList = guruResponse.body()?.data ?: emptyList()
                // Find current user's guru profile if they are GURU
                if (userRole == "GURU" || userRole == "TEACHER") {
                    val matchingGuru = guruList.find { it.nama_guru.equals(userName, ignoreCase = true) }
                    if (matchingGuru != null) {
                        myGuruId = matchingGuru.id
                        selectedGuruId = matchingGuru.id
                    }
                }
            }

            // 4. Fetch Mapel for form dialog
            val mapelResponse = academicService.getMapel(1, 200)
            if (mapelResponse.isSuccessful) {
                mapelList = mapelResponse.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading academic filters", e)
        }
    }

    // Load templates on filters or refresh changes
    fun loadSchedules() {
        if (selectedTahunId.isEmpty() || selectedSemesterId.isEmpty()) return
        scope.launch {
            isLoading = true
            try {
                val apiService = ApiClient.getClient(context).create(AttendanceService::class.java)
                val response = apiService.getJadwalTemplate(
                    kelasId = selectedKelasId.ifEmpty { null },
                    guruId = selectedGuruId.ifEmpty { null },
                    tahunPelajaranId = selectedTahunId.ifEmpty { null },
                    semesterId = selectedSemesterId.ifEmpty { null }
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    jadwalTemplates = response.body()?.data ?: emptyList()
                    Log.d("AbsentaDebug", "Jadwal templates fetched successfully: ${jadwalTemplates.size} items")
                } else {
                    jadwalTemplates = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error fetching schedules", e)
                Toast.makeText(context, "Gagal memuat jadwal: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedTahunId, selectedSemesterId, selectedKelasId, selectedGuruId, refreshKey) {
        loadSchedules()
    }

    val isGuru = userRole == "GURU" || userRole == "TEACHER"
    val canManage = isGuru || userCapabilities.contains("attendance.schedules.create") || userCapabilities.contains("attendance.schedules.update") || userCapabilities.contains("attendance.schedules.delete")

    // Filter lists based on selected day tab
    val selectedDayName = days[selectedDayIndex]
    val filteredTemplates = jadwalTemplates.filter { it.hari.equals(selectedDayName, ignoreCase = true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Jadwal Pelajaran", fontWeight = FontWeight.Bold, color = Color.White) },
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
        },
        floatingActionButton = {
            if (canManage && !isLocked) {
                FloatingActionButton(
                    onClick = {
                        selectedSlotToEdit = null
                        showFormDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Slot")
                }
            }
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
            // 1. Header Card (Visual Gradient)
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(4.dp, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                ) {
                    Box(
                        modifier = Modifier
                            .background(
                                brush = Brush.verticalGradient(
                                    colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))
                                )
                            )
                            .padding(24.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DateRange,
                                        contentDescription = "Jadwal",
                                        tint = Color.White,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = "Template KBM",
                                        fontSize = 12.sp,
                                        color = Color.White.copy(alpha = 0.7f),
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "Jadwal Pelajaran",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Lihat dan kelola template jadwal pelajaran mingguan untuk otomatisasi absensi harian.",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }

            // 2. Premium Gating Banner (Non-intrusive preview mode)
            if (isLocked) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        border = BorderStroke(1.dp, Color(0xFFFDE68A))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(Color(0xFFFEF3C7), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = "Locked",
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Fitur Premium Belum Aktif",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF78350F)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Modul ABSENSI belum aktif sepenuhnya. Anda hanya dapat melihat jadwal pelajaran dalam mode preview.",
                                    fontSize = 10.sp,
                                    color = Color(0xFF92400E),
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }
                }
            }

            // 3. Filters Section
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(2.dp, RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.List, contentDescription = null, tint = Color(0xFF1E3C72), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Filter Jadwal", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                        }
                        
                        Divider(color = Color(0xFFF1F5F9))

                        // Year & Semester Pickers
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Tahun Pelajaran Dropdown
                            Box(modifier = Modifier.weight(1f)) {
                                var expanded by remember { mutableStateOf(false) }
                                val selectedLabel = tahunPelajaranList.find { it.id == selectedTahunId }?.tahun ?: "Pilih Tahun"
                                
                                OutlinedButton(
                                    onClick = { expanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(selectedLabel, fontSize = 11.sp, maxLines = 1)
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    tahunPelajaranList.forEach { tp ->
                                        DropdownMenuItem(
                                            text = { Text(tp.tahun + if (tp.is_active) " (Aktif)" else "") },
                                            onClick = {
                                                selectedTahunId = tp.id
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Semester Dropdown
                            Box(modifier = Modifier.weight(1f)) {
                                var expanded by remember { mutableStateOf(false) }
                                val selectedLabel = semesterList.find { it.id == selectedSemesterId }?.nama_semester ?: "Pilih Semester"
                                
                                OutlinedButton(
                                    onClick = { expanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(selectedLabel, fontSize = 11.sp, maxLines = 1)
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    semesterList.forEach { sem ->
                                        DropdownMenuItem(
                                            text = { Text(sem.nama_semester) },
                                            onClick = {
                                                selectedSemesterId = sem.id
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        // Kelas & Guru Pickers (Only visible for non-students or non-locked or if needed)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Kelas Filter Dropdown
                            Box(modifier = Modifier.weight(1f)) {
                                var expanded by remember { mutableStateOf(false) }
                                val selectedLabel = kelasList.find { it.id == selectedKelasId }?.nama_kelas ?: "Semua Kelas"
                                
                                OutlinedButton(
                                    onClick = { expanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(selectedLabel, fontSize = 11.sp, maxLines = 1)
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    DropdownMenuItem(
                                        text = { Text("Semua Kelas") },
                                        onClick = {
                                            selectedKelasId = ""
                                            expanded = false
                                        }
                                    )
                                    kelasList.forEach { kelas ->
                                        DropdownMenuItem(
                                            text = { Text(kelas.nama_kelas) },
                                            onClick = {
                                                selectedKelasId = kelas.id
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Guru Filter Dropdown (Disable/Lock if user is Guru to default to themselves)
                            Box(modifier = Modifier.weight(1f)) {
                                var expanded by remember { mutableStateOf(false) }
                                val selectedLabel = if (isGuru && myGuruId.isNotEmpty()) userName else (guruList.find { it.id == selectedGuruId }?.nama_guru ?: "Semua Guru")
                                
                                OutlinedButton(
                                    onClick = { if (!isGuru) expanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    enabled = !isGuru
                                ) {
                                    Text(selectedLabel, fontSize = 11.sp, maxLines = 1)
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    DropdownMenuItem(
                                        text = { Text("Semua Guru") },
                                        onClick = {
                                            selectedGuruId = ""
                                            expanded = false
                                        }
                                    )
                                    guruList.forEach { guru ->
                                        DropdownMenuItem(
                                            text = { Text(guru.nama_guru) },
                                            onClick = {
                                                selectedGuruId = guru.id
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 4. View Mode Switcher
            if (canManage && !isLocked) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Button(
                            onClick = { viewMode = "grid" },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (viewMode == "grid") Color.White else Color.Transparent,
                                contentColor = if (viewMode == "grid") Color(0xFF1E3C72) else Color.Gray
                            ),
                            elevation = null
                        ) {
                            Icon(Icons.Default.Home, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Visual Grid", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = { viewMode = "list" },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (viewMode == "list") Color.White else Color.Transparent,
                                contentColor = if (viewMode == "list") Color(0xFF1E3C72) else Color.Gray
                            ),
                            elevation = null
                        ) {
                            Icon(Icons.Default.List, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Daftar Kelola", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Loading state
            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else {
                if (viewMode == "grid") {
                    // Day Tabs selector
                    item {
                        ScrollableTabRow(
                            selectedTabIndex = selectedDayIndex,
                            containerColor = Color.White,
                            contentColor = Color(0xFF1E3C72),
                            edgePadding = 0.dp,
                            modifier = Modifier.shadow(1.dp, RoundedCornerShape(12.dp)).clip(RoundedCornerShape(12.dp))
                        ) {
                            days.forEachIndexed { index, day ->
                                Tab(
                                    selected = selectedDayIndex == index,
                                    onClick = { selectedDayIndex = index },
                                    text = {
                                        Text(
                                            text = day.substring(0, 3).uppercase(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (selectedDayIndex == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                        )
                                    }
                                )
                            }
                        }
                    }

                    if (filteredTemplates.isEmpty()) {
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
                                    Icon(Icons.Default.DateRange, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(40.dp))
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "Tidak ada jadwal untuk hari $selectedDayName",
                                        color = Color.Gray,
                                        fontSize = 13.sp,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    } else {
                        // Render filtered templates
                        items(filteredTemplates) { item ->
                            JadwalTemplateRowItem(
                                item = item,
                                canManage = canManage && !isLocked,
                                onEdit = {
                                    selectedSlotToEdit = item
                                    showFormDialog = true
                                },
                                onDelete = {
                                    showDeleteConfirmDialog = item
                                }
                            )
                        }
                    }
                } else {
                    // List Management View: shows all templates grouped or flat
                    if (jadwalTemplates.isEmpty()) {
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
                                    Icon(Icons.Default.Info, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(40.dp))
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "Belum ada template jadwal untuk filter ini.",
                                        color = Color.Gray,
                                        fontSize = 13.sp,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    } else {
                        items(jadwalTemplates) { item ->
                            JadwalTemplateRowItem(
                                item = item,
                                canManage = canManage && !isLocked,
                                onEdit = {
                                    selectedSlotToEdit = item
                                    showFormDialog = true
                                },
                                onDelete = {
                                    showDeleteConfirmDialog = item
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // --- Add/Edit Dialog Form ---
    if (showFormDialog) {
        var formDay by remember { mutableStateOf(selectedSlotToEdit?.hari ?: "SENIN") }
        var formJamMulai by remember { mutableStateOf(selectedSlotToEdit?.jam_mulai ?: "07:00") }
        var formJamSelesai by remember { mutableStateOf(selectedSlotToEdit?.jam_selesai ?: "08:30") }
        var formKelasId by remember { mutableStateOf(selectedSlotToEdit?.kelas_id ?: selectedKelasId) }
        var formMapelId by remember { mutableStateOf(selectedSlotToEdit?.mapel_id ?: "") }
        var formGuruId by remember { mutableStateOf(selectedSlotToEdit?.guru_id ?: selectedGuruId) }
        var formJenisKegiatan by remember { mutableStateOf(selectedSlotToEdit?.jenis_kegiatan ?: "KBM") }

        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = if (selectedSlotToEdit == null) "Tambah Slot Jadwal" else "Edit Slot Jadwal",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Day Picker
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        OutlinedTextField(
                            value = formDay,
                            onValueChange = {},
                            label = { Text("Hari") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            listOf("SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU").forEach { d ->
                                DropdownMenuItem(text = { Text(d) }, onClick = {
                                    formDay = d
                                    expanded = false
                                })
                            }
                        }
                    }

                    // Jam Mulai & Selesai
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = formJamMulai,
                                onValueChange = { formJamMulai = it },
                                label = { Text("Mulai (HH:mm)") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = formJamSelesai,
                                onValueChange = { formJamSelesai = it },
                                label = { Text("Selesai (HH:mm)") },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Kelas Dropdown
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        val label = kelasList.find { it.id == formKelasId }?.nama_kelas ?: "Pilih Kelas"
                        OutlinedTextField(
                            value = label,
                            onValueChange = {},
                            label = { Text("Kelas") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            kelasList.forEach { k ->
                                DropdownMenuItem(text = { Text(k.nama_kelas) }, onClick = {
                                    formKelasId = k.id
                                    expanded = false
                                })
                            }
                        }
                    }

                    // Mapel Dropdown
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        val label = mapelList.find { it.id == formMapelId }?.nama_mapel ?: "Pilih Mapel"
                        OutlinedTextField(
                            value = label,
                            onValueChange = {},
                            label = { Text("Mata Pelajaran") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            mapelList.forEach { m ->
                                DropdownMenuItem(text = { Text(m.nama_mapel) }, onClick = {
                                    formMapelId = m.id
                                    expanded = false
                                })
                            }
                        }
                    }

                    // Guru Dropdown
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        val label = guruList.find { it.id == formGuruId }?.nama_guru ?: "Pilih Guru"
                        OutlinedTextField(
                            value = label,
                            onValueChange = {},
                            label = { Text("Guru") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            guruList.forEach { g ->
                                DropdownMenuItem(text = { Text(g.nama_guru) }, onClick = {
                                    formGuruId = g.id
                                    expanded = false
                                })
                            }
                        }
                    }

                    // Jenis Kegiatan Text
                    item {
                        OutlinedTextField(
                            value = formJenisKegiatan,
                            onValueChange = { formJenisKegiatan = it },
                            label = { Text("Jenis Kegiatan") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (selectedTahunId.isEmpty() || selectedSemesterId.isEmpty() || formKelasId.isEmpty()) {
                            Toast.makeText(context, "Lengkapi isian tahun, semester, dan kelas", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        
                        val payload = CreateJadwalPayload(
                            tahun_pelajaran_id = selectedTahunId,
                            semester_id = selectedSemesterId,
                            kelas_id = formKelasId,
                            hari = formDay,
                            jam_mulai = formJamMulai,
                            jam_selesai = formJamSelesai,
                            mapel_id = formMapelId.ifEmpty { null },
                            guru_id = formGuruId.ifEmpty { null },
                            jenis_kegiatan = formJenisKegiatan
                        )

                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(AttendanceService::class.java)
                                val response = if (selectedSlotToEdit == null) {
                                    service.createJadwalTemplate(payload)
                                } else {
                                    service.updateJadwalTemplate(selectedSlotToEdit!!.id, payload)
                                }

                                if (response.isSuccessful && response.body()?.success == true) {
                                    Toast.makeText(context, "Slot jadwal berhasil disimpan", Toast.LENGTH_SHORT).show()
                                    showFormDialog = false
                                    refreshKey++
                                } else {
                                    Toast.makeText(context, response.body()?.message ?: "Gagal menyimpan", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal", color = Color.Gray)
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }

    // --- Delete Confirmation Dialog ---
    if (showDeleteConfirmDialog != null) {
        val slot = showDeleteConfirmDialog!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = null },
            title = { Text("Hapus Jadwal?", fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus slot jadwal hari ${slot.hari} pukul ${slot.jam_mulai} - ${slot.jam_selesai}? Tindakan ini tidak dapat dibatalkan.") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(AttendanceService::class.java)
                                val response = service.deleteJadwalTemplate(slot.id)
                                if (response.isSuccessful && response.body()?.success == true) {
                                    Toast.makeText(context, "Jadwal berhasil dihapus", Toast.LENGTH_SHORT).show()
                                    refreshKey++
                                } else {
                                    Toast.makeText(context, response.body()?.message ?: "Gagal menghapus", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                            } finally {
                                showDeleteConfirmDialog = null
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Ya, Hapus")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = null }) {
                    Text("Batal", color = Color.Gray)
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }
}

@Composable
fun JadwalTemplateRowItem(
    item: JadwalTemplateEntry,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time interval visual card
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .background(Color(0xFFEFF6FF), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                Text(item.jam_mulai, fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E3C72))
                Box(modifier = Modifier.height(1.dp).width(24.dp).background(Color(0xFFBFDBFE)).padding(vertical = 3.dp))
                Text(item.jam_selesai, fontSize = 11.sp, color = Color(0xFF64748B))
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Info details
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = item.jenis_kegiatan?.uppercase() ?: "KBM",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF64748B)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = item.hari.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.LightGray
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.Mapel?.nama_mapel ?: "Tidak Ada Pelajaran",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A)
                )
                Text(
                    text = "Kelas: ${item.Kelas?.nama_kelas ?: "-"}",
                    fontSize = 11.sp,
                    color = Color(0xFF1E3C72),
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 2.dp)
                )
                
                val teacherName = item.Guru?.User?.full_name
                if (!teacherName.isNullOrEmpty()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Icon(Icons.Default.AccountBox, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color.LightGray)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = teacherName,
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            // Edit / Delete buttons if canManage
            if (canManage) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onEdit) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}
