package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.StrukturOrganisasi
import com.absenta.app.ui.components.*

enum class StrukturTab(val label: String) {
    PIMPINAN("Pimpinan"),
    KAPROG("Kaprog"),
    KABENG("Kabeng"),
    TOOLMAN("Toolman"),
    WALI_KELAS("Wali Kelas"),
    BP_BK("BP/BK"),
    PETUGAS_KELAS("Petugas Kelas"),
    KOPERASI("Koperasi")
}

fun getTabForPosition(kode: String): StrukturTab {
    return when (kode) {
        "KEPALA_SEKOLAH", "KURIKULUM", "KESISWAAN", "HUBIN", "SARPRAS", "TU", "BKK" -> StrukturTab.PIMPINAN
        "KAPROG" -> StrukturTab.KAPROG
        "KABENG" -> StrukturTab.KABENG
        "TOOLMAN" -> StrukturTab.TOOLMAN
        "WALIKELAS" -> StrukturTab.WALI_KELAS
        "BPBK" -> StrukturTab.BP_BK
        "PETUGAS_KELAS", "GERBANG", "PETUGAS_ABSENSI" -> StrukturTab.PETUGAS_KELAS
        "KETUA_KOPERASI", "BENDAHARA_KOPERASI", "SEKRETARIS_KOPERASI", "MANAJER_TOKO_KOPERASI", "PENGAWAS_KOPERASI" -> StrukturTab.KOPERASI
        else -> StrukturTab.PIMPINAN
    }
}

data class UnifiedAssignment(
    val id: String,
    val name: String,
    val isGuru: Boolean,
    val detailText: String,
    val targetId: String
)

fun getUnifiedAssignments(item: StrukturOrganisasi): List<UnifiedAssignment> {
    val list = mutableListOf<UnifiedAssignment>()
    
    // Map from members if tree/slot data is populated
    item.members?.forEach { m ->
        val isGuru = m.type == "GURU"
        list.add(
            UnifiedAssignment(
                id = m.id,
                name = m.name,
                isGuru = isGuru,
                detailText = if (isGuru) "Guru • ${item.kode}" else "Siswa • ${item.kode}",
                targetId = m.id
            )
        )
    }
    
    // Fallback to organizationalAssigns if members is empty/null
    if (list.isEmpty()) {
        item.organizationalAssigns?.forEach { a ->
            val isGuru = a.User?.Guru != null
            val name = a.User?.Guru?.nama_guru ?: a.User?.Siswa?.nama_siswa ?: "User: ${a.user_id}"
            val targetId = a.User?.Guru?.id ?: a.User?.Siswa?.id ?: ""
            list.add(
                UnifiedAssignment(
                    id = a.id,
                    name = name,
                    isGuru = isGuru,
                    detailText = if (isGuru) "Guru • ${a.position_id}" else "Siswa • ${a.position_id}",
                    targetId = targetId
                )
            )
        }
    }
    
    return list
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StrukturOrganisasiScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: StrukturOrganisasiViewModel = viewModel()
) {
    val context = LocalContext.current

    val strukturs by viewModel.strukturs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val executing by viewModel.executing.collectAsState()

    // References
    val kelasList by viewModel.kelasList.collectAsState()
    val jurusanList by viewModel.jurusanList.collectAsState()
    val guruList by viewModel.guruList.collectAsState()
    val siswaList by viewModel.siswaList.collectAsState()

    // Filters
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterActive by viewModel.filterActive.collectAsState()

    // Permissions
    val canManage by viewModel.canManage.collectAsState()

    // Selected tab state
    var selectedTab by remember { mutableStateOf(StrukturTab.PIMPINAN) }

    // Expanded states for grade levels (tingkat)
    val expandedTingkatMap = remember { mutableStateMapOf<Int, Boolean>() }

    // Dialog state
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedStrukturForEdit by remember { mutableStateOf<StrukturOrganisasi?>(null) }
    var showDeleteConfirmDialog by remember { mutableStateOf<StrukturOrganisasi?>(null) }

    // Assignment Dialogs
    var showAssignGuruDialogForStruktur by remember { mutableStateOf<StrukturOrganisasi?>(null) }
    var showAssignSiswaDialogForStruktur by remember { mutableStateOf<StrukturOrganisasi?>(null) }

    // Form inputs state
    var kodeInput by remember { mutableStateOf("") }
    var namaInput by remember { mutableStateOf("") }
    var deskripsiInput by remember { mutableStateOf("") }
    var scopeInput by remember { mutableStateOf("attendance") }
    var scopeTypeInput by remember { mutableStateOf("global") }
    var selectedUnitId by remember { mutableStateOf("") }
    var selectedKelasId by remember { mutableStateOf("") }
    var isActiveInput by remember { mutableStateOf(true) }

    // Assignment input state
    var selectedGuruIdForAssign by remember { mutableStateOf("") }
    var selectedSiswaIdForAssign by remember { mutableStateOf("") }
    var assignmentPositionId by remember { mutableStateOf("MEMBER") }

    val scopeOptions = listOf(
        DropdownOption("Attendance (Absensi)", "attendance"),
        DropdownOption("Academic (Kurikulum)", "academic"),
        DropdownOption("Student (Kesiswaan)", "student"),
        DropdownOption("Admin (TU/Kantor)", "admin"),
        DropdownOption("Facility (Sarpras)", "facility")
    )

    val scopeTypeOptions = listOf(
        DropdownOption("Global (Seluruh Sekolah)", "global"),
        DropdownOption("Per Jurusan / Unit", "unit"),
        DropdownOption("Per Kelas", "kelas")
    )

    val activeOptions = listOf(
        DropdownOption("Semua Status", "ALL"),
        DropdownOption("Aktif Saja", "AKTIF"),
        DropdownOption("Tidak Aktif Saja", "INAKTIF")
    )

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(successMessage) {
        successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.resetSuccessMessage()
        }
    }

    // Populate form for Edit
    LaunchedEffect(selectedStrukturForEdit) {
        selectedStrukturForEdit?.let {
            kodeInput = it.kode ?: ""
            namaInput = it.nama ?: ""
            deskripsiInput = it.deskripsi ?: ""
            scopeInput = it.scope ?: "attendance"
            scopeTypeInput = it.scope_type ?: "global"
            selectedUnitId = it.unit_id ?: ""
            selectedKelasId = it.kelas_id ?: ""
            isActiveInput = it.is_active
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
                            Text("Struktur Organisasi", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kelompok Setup • Jabatan & Hirarki",
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
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = {
                        selectedStrukturForEdit = null
                        kodeInput = ""
                        namaInput = ""
                        deskripsiInput = ""
                        scopeInput = "attendance"
                        scopeTypeInput = "global"
                        selectedUnitId = ""
                        selectedKelasId = ""
                        isActiveInput = true
                        showFormDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Jabatan")
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Search & Filter Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(modifier = Modifier.weight(3f)) {
                            SearchTextField(
                                value = searchQuery,
                                onValueChange = { viewModel.searchQuery.value = it },
                                placeholder = "Cari nama/kode jabatan...",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        Box(modifier = Modifier.weight(2f)) {
                            FilterDropdown(
                                selectedValue = when (filterActive) {
                                    true -> "AKTIF"
                                    false -> "INAKTIF"
                                    else -> "ALL"
                                },
                                options = activeOptions,
                                onValueChange = {
                                    viewModel.filterActive.value = when (it) {
                                        "AKTIF" -> true
                                        "INAKTIF" -> false
                                        else -> null
                                    }
                                },
                                placeholder = "Filter Status",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            // Category Tabs
            ScrollableTabRow(
                selectedTabIndex = selectedTab.ordinal,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72),
                edgePadding = 16.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                StrukturTab.values().forEach { tab ->
                    Tab(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        text = {
                            Text(
                                text = tab.label,
                                fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 13.sp
                            )
                        }
                    )
                }
            }

            val filteredStrukturs = remember(strukturs, selectedTab) {
                strukturs.filter { getTabForPosition(it.kode ?: "") == selectedTab }
            }

            val groupedData = remember(filteredStrukturs, kelasList) {
                val classBased = mutableMapOf<Int, MutableList<StrukturOrganisasi>>()
                val nonClassBased = mutableListOf<StrukturOrganisasi>()

                filteredStrukturs.forEach { item ->
                    val kelasId = item.kelas_id
                    if (!kelasId.isNullOrBlank()) {
                        var tingkat = item.tingkat
                        if (tingkat == null) {
                            val kelasDetail = kelasList.find { it.id == kelasId }
                            tingkat = kelasDetail?.tingkat
                        }
                        if (tingkat == null) {
                            val nameToParse = item.kelas_name ?: item.nama
                            tingkat = when {
                                nameToParse.contains("XII", ignoreCase = true) || nameToParse.contains("12") -> 12
                                nameToParse.contains("XI", ignoreCase = true) || nameToParse.contains("11") -> 11
                                nameToParse.contains("X", ignoreCase = true) || nameToParse.contains("10") -> 10
                                else -> 0
                            }
                        }
                        classBased.getOrPut(tingkat) { mutableListOf() }.add(item)
                    } else {
                        nonClassBased.add(item)
                    }
                }

                classBased.forEach { (_, list) ->
                    list.sortBy { it.nama }
                }

                Pair(classBased.toSortedMap(), nonClassBased.toList())
            }

            val classBasedMap = groupedData.first
            val nonClassBasedList = groupedData.second

            if (isLoading && strukturs.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredStrukturs.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada jabatan ditemukan di kategori ini", color = Color(0xFF64748B))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Render non-class based positions first
                    if (nonClassBasedList.isNotEmpty()) {
                        items(nonClassBasedList, key = { item -> "${item.id}_${item.unit_id ?: ""}_${item.kelas_id ?: ""}" }) { item ->
                            StrukturOrganisasiVerticalCard(
                                item = item,
                                canManage = canManage,
                                onEdit = { selectedStrukturForEdit = item; showFormDialog = true },
                                onDelete = { showDeleteConfirmDialog = item },
                                onAssignGuru = { showAssignGuruDialogForStruktur = item },
                                onAssignSiswa = { showAssignSiswaDialogForStruktur = item },
                                onRemoveGuru = { guruId -> viewModel.removeGuru(item.id, guruId) },
                                onRemoveSiswa = { siswaId -> viewModel.removeSiswa(item.id, siswaId) }
                            )
                        }
                    }

                    // Render class based positions grouped by grade level (tingkat)
                    classBasedMap.forEach { (tingkat, itemsInTingkat) ->
                        val isExpanded = expandedTingkatMap[tingkat] ?: false

                        item(key = "header_tingkat_$tingkat") {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { expandedTingkatMap[tingkat] = !isExpanded }
                                    .padding(vertical = 4.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Menu,
                                            contentDescription = null,
                                            tint = Color(0xFF475569),
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            text = if (tingkat > 0) "Tingkat $tingkat" else "Tingkat Tidak Diketahui",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color(0xFF1E293B)
                                        )
                                        Surface(
                                            color = Color(0xFFE2E8F0),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                text = "${itemsInTingkat.size} Jabatan",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF475569),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Icon(
                                        imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                                        tint = Color(0xFF64748B),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }

                        if (isExpanded) {
                            items(itemsInTingkat, key = { item -> "${item.id}_${item.unit_id ?: ""}_${item.kelas_id ?: ""}" }) { item ->
                                StrukturOrganisasiVerticalCard(
                                    item = item,
                                    canManage = canManage,
                                    onEdit = { selectedStrukturForEdit = item; showFormDialog = true },
                                    onDelete = { showDeleteConfirmDialog = item },
                                    onAssignGuru = { showAssignGuruDialogForStruktur = item },
                                    onAssignSiswa = { showAssignSiswaDialogForStruktur = item },
                                    onRemoveGuru = { guruId -> viewModel.removeGuru(item.id, guruId) },
                                    onRemoveSiswa = { siswaId -> viewModel.removeSiswa(item.id, siswaId) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialog Create/Edit Struktur
    if (showFormDialog) {
        val isEdit = selectedStrukturForEdit != null

        val kelasFormOptions = remember(kelasList) {
            kelasList.map { DropdownOption(it.nama_kelas, it.id) }
        }

        val jurusanFormOptions = remember(jurusanList) {
            jurusanList.map { DropdownOption(it.nama, it.id) }
        }

        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = if (isEdit) "Edit Jabatan" else "Buat Jabatan Baru",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = kodeInput,
                        onValueChange = { kodeInput = it.uppercase() },
                        label = { Text("Kode Jabatan *", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: WAKASEK_SARPRAS") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isEdit
                    )

                    OutlinedTextField(
                        value = namaInput,
                        onValueChange = { namaInput = it },
                        label = { Text("Nama Jabatan *", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: Wakasek Sarana & Prasarana") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = deskripsiInput,
                        onValueChange = { deskripsiInput = it },
                        label = { Text("Deskripsi / Tugas Jabatan", fontSize = 12.sp) },
                        placeholder = { Text("Tuliskan deskripsi ringkas...") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )

                    Column {
                        Text("Scope Modul *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(4.dp))
                        FilterDropdown(
                            selectedValue = scopeInput,
                            options = scopeOptions,
                            onValueChange = { scopeInput = it },
                            placeholder = "Pilih Scope Modul",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Column {
                        Text("Tipe Cakupan Wilayah *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(4.dp))
                        FilterDropdown(
                            selectedValue = scopeTypeInput,
                            options = scopeTypeOptions,
                            onValueChange = { scopeTypeInput = it },
                            placeholder = "Pilih Tipe",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    if (scopeTypeInput == "unit") {
                        Column {
                            Text("Hubungkan ke Jurusan *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            Spacer(modifier = Modifier.height(4.dp))
                            FilterDropdown(
                                selectedValue = selectedUnitId,
                                options = jurusanFormOptions,
                                onValueChange = { selectedUnitId = it },
                                placeholder = "Pilih Jurusan",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    if (scopeTypeInput == "kelas") {
                        Column {
                            Text("Hubungkan ke Kelas *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                            Spacer(modifier = Modifier.height(4.dp))
                            FilterDropdown(
                                selectedValue = selectedKelasId,
                                options = kelasFormOptions,
                                onValueChange = { selectedKelasId = it },
                                placeholder = "Pilih Kelas",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isActiveInput,
                            onCheckedChange = { isActiveInput = it == true }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Jabatan Aktif", fontSize = 13.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val payload = mapOf(
                            "kode" to kodeInput.trim(),
                            "nama" to namaInput.trim(),
                            "deskripsi" to deskripsiInput.trim(),
                            "scope" to scopeInput,
                            "scope_type" to scopeTypeInput,
                            "unit_id" to if (scopeTypeInput == "unit") selectedUnitId else null,
                            "kelas_id" to if (scopeTypeInput == "kelas") selectedKelasId else null,
                            "is_active" to isActiveInput
                        )

                        if (isEdit) {
                            viewModel.updateStrukturOrganisasi(selectedStrukturForEdit!!.id, payload) {
                                showFormDialog = false
                            }
                        } else {
                            viewModel.createStrukturOrganisasi(payload) {
                                showFormDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !executing && kodeInput.isNotBlank() && namaInput.isNotBlank()
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text(if (isEdit) "Simpan" else "Buat")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Dialog Assign Guru
    showAssignGuruDialogForStruktur?.let { struktur ->
        val guruOptions = remember(guruList) {
            guruList.map { DropdownOption(it.nama_guru, it.id) }
        }

        AlertDialog(
            onDismissRequest = { showAssignGuruDialogForStruktur = null },
            title = {
                Text(
                    text = "Tugaskan Guru ke ${struktur.nama}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column {
                        Text("Pilih Guru *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(4.dp))
                        FilterDropdown(
                            selectedValue = selectedGuruIdForAssign,
                            options = guruOptions,
                            onValueChange = { selectedGuruIdForAssign = it },
                            placeholder = "Pilih Guru",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = assignmentPositionId,
                        onValueChange = { assignmentPositionId = it.uppercase() },
                        label = { Text("ID Posisi / Peran Detail", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: KETUA, SEKRETARIS, ANGGOTA") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.assignGuru(
                            strukturId = struktur.id,
                            guruId = selectedGuruIdForAssign,
                            positionId = assignmentPositionId,
                            unitId = struktur.unit_id,
                            kelasId = struktur.kelas_id
                        ) {
                            showAssignGuruDialogForStruktur = null
                            selectedGuruIdForAssign = ""
                            assignmentPositionId = "MEMBER"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !executing && selectedGuruIdForAssign.isNotBlank()
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Tugaskan")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showAssignGuruDialogForStruktur = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Dialog Assign Siswa
    showAssignSiswaDialogForStruktur?.let { struktur ->
        val siswaOptions = remember(siswaList, struktur) {
            val filteredSiswa = if (!struktur.kelas_id.isNullOrBlank()) {
                siswaList.filter { it.kelas_id == struktur.kelas_id }
            } else {
                siswaList
            }
            filteredSiswa.map { DropdownOption(it.nama_siswa, it.id) }
        }

        AlertDialog(
            onDismissRequest = { showAssignSiswaDialogForStruktur = null },
            title = {
                Text(
                    text = "Tugaskan Siswa ke ${struktur.nama}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column {
                        Text("Pilih Siswa *", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(4.dp))
                        FilterDropdown(
                            selectedValue = selectedSiswaIdForAssign,
                            options = siswaOptions,
                            onValueChange = { selectedSiswaIdForAssign = it },
                            placeholder = "Pilih Siswa",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = assignmentPositionId,
                        onValueChange = { assignmentPositionId = it.uppercase() },
                        label = { Text("ID Posisi / Peran Detail", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: KETUA_OSIS, ANGGOTA") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.assignSiswa(
                            strukturId = struktur.id,
                            siswaId = selectedSiswaIdForAssign,
                            positionId = assignmentPositionId,
                            unitId = struktur.unit_id,
                            kelasId = struktur.kelas_id
                        ) {
                            showAssignSiswaDialogForStruktur = null
                            selectedSiswaIdForAssign = ""
                            assignmentPositionId = "MEMBER"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !executing && selectedSiswaIdForAssign.isNotBlank()
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Tugaskan")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showAssignSiswaDialogForStruktur = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Dialog Delete Confirm
    showDeleteConfirmDialog?.let { struktur ->
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = null },
            title = { Text("Hapus Jabatan", fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus jabatan '${struktur.nama}'? Seluruh data penugasan personil di dalamnya juga akan terhapus.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteStrukturOrganisasi(struktur.id)
                        showDeleteConfirmDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    enabled = !executing
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Hapus")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }
}

@Composable
fun StrukturOrganisasiVerticalCard(
    item: StrukturOrganisasi,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onAssignGuru: () -> Unit,
    onAssignSiswa: () -> Unit,
    onRemoveGuru: (String) -> Unit,
    onRemoveSiswa: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val headerGradient = remember(item) {
        when {
            item.kode.contains("KOPERASI") -> Brush.horizontalGradient(listOf(Color(0xFF059669), Color(0xFF047857)))
            item.kode == "WALIKELAS" -> Brush.horizontalGradient(listOf(Color(0xFFD97706), Color(0xFFB45309)))
            item.kode in listOf("KAPROG", "KABENG", "TOOLMAN") -> Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF3730A3)))
            item.kode in listOf("PETUGAS_KELAS", "GERBANG", "PETUGAS_ABSENSI") -> Brush.horizontalGradient(listOf(Color(0xFF0284C7), Color(0xFF0369A1)))
            else -> Brush.horizontalGradient(listOf(Color(0xFF1E3C72), Color(0xFF2A5298)))
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(headerGradient)
                    .padding(vertical = 10.dp, horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val displayName = remember(item) {
                        when {
                            !item.kelas_name.isNullOrBlank() -> "${item.nama} - ${item.kelas_name}"
                            !item.unit_kode.isNullOrBlank() -> "${item.nama} - ${item.unit_kode}"
                            !item.unit_name.isNullOrBlank() -> "${item.nama} - ${item.unit_name}"
                            else -> item.nama
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = displayName,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = item.kode,
                                color = Color.White.copy(alpha = 0.8f),
                                fontWeight = FontWeight.Medium,
                                fontSize = 9.sp
                            )
                            Surface(
                                color = if (item.is_active) Color(0xFFD1FAE5).copy(alpha = 0.2f) else Color(0xFFFEE2E2).copy(alpha = 0.2f),
                                contentColor = if (item.is_active) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = if (item.is_active) "AKTIF" else "INAKTIF",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    if (canManage) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(
                                onClick = onEdit,
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            IconButton(
                                onClick = onDelete,
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Hapus",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (!item.deskripsi.isNullOrBlank()) {
                    Text(
                        text = item.deskripsi,
                        color = Color(0xFF64748B),
                        fontSize = 11.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }

                val assigns = remember(item) { getUnifiedAssignments(item) }
                if (assigns.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Belum ada personel ditugaskan",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    assigns.forEach { assign ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (assign.isGuru) Icons.Default.AccountBox else Icons.Default.Person,
                                    contentDescription = null,
                                    tint = if (assign.isGuru) Color(0xFF6366F1) else Color(0xFF10B981),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = assign.name,
                                        color = Color(0xFF1E293B),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = assign.detailText,
                                        color = Color(0xFF64748B),
                                        fontSize = 9.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            if (canManage) {
                                IconButton(
                                    onClick = {
                                        if (assign.isGuru) {
                                            onRemoveGuru(assign.targetId)
                                        } else {
                                            onRemoveSiswa(assign.targetId)
                                        }
                                    },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Hapus Penugasan",
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                if (canManage) {
                    Spacer(modifier = Modifier.height(6.dp))
                    val isPetugasKelas = item.kode == "PETUGAS_KELAS"
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (!isPetugasKelas) {
                            Button(
                                onClick = onAssignGuru,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(32.dp),
                                contentPadding = PaddingValues(0.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEEF2FF), contentColor = Color(0xFF4338CA)),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Guru", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        if (isPetugasKelas) {
                            Button(
                                onClick = onAssignSiswa,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(32.dp),
                                contentPadding = PaddingValues(0.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFECFDF5), contentColor = Color(0xFF047857)),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Siswa", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

