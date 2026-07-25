package com.absenta.app.ui.features.academic

import com.absenta.app.data.api.*
import androidx.compose.ui.text.style.TextAlign
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SemesterListScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SemesterListViewModel = viewModel()
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val semesters by viewModel.semesters.collectAsState()
    val activeSemester by viewModel.activeSemester.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()

    val searchQuery by viewModel.searchQuery.collectAsState()

    val canCreate by viewModel.canCreate.collectAsState()
    val canEdit by viewModel.canEdit.collectAsState()
    val canView by viewModel.canView.collectAsState()

    // Pagination State
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // Form Dialog states
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedItemForEdit by remember { mutableStateOf<SemesterDetail?>(null) }
    var formNamaSemesterInput by remember { mutableStateOf("") }
    var formIsActiveInput by remember { mutableStateOf(false) }

    // Delete confirm state
    var itemToDelete by remember { mutableStateOf<SemesterDetail?>(null) }
    var isTableView by remember { mutableStateOf(false) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmDeleteMultiple by remember { mutableStateOf(false) }

    val isAllSelected = remember(semesters, selectedIds) {
        semesters.isNotEmpty() && semesters.all { selectedIds.contains(it.id) }
    }

    // Hardening standard list initialized to FAILED/UNAUDITED
    val hardeningStandards = remember {
        listOf(
            HardeningStandard(
                id = "fault_tolerance",
                name = "Isolasi Kesalahan (Fault Isolation)",
                description = "Membungkus list utama dengan penanganan state aman sehingga kegagalan network/API tidak mematikan fitur sidebar/navigasi.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "network_fallback",
                name = "Penanganan API & Fallback Recovery",
                description = "Mengamankan pemuatan data stats dan list dengan kueri REST terisolasi & stats loader adaptif.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "dom_churn_protection",
                name = "Optimasi DOM Churn (Render Optimization)",
                description = "Penyaringan data, visualisasi, dan perulangan baris menggunakan key (semester.id) di dalam Jetpack Compose untuk meredam pemuatan ulang DOM/Canvas berlebihan.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "architectural_table_pagination",
                name = "Standarisasi Pagination Halaman",
                description = "Mewajibkan implementasi kontrol pagination (limit dropdown, next, previous) yang sejajar untuk mencegah OOM.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "rbac_protection",
                name = "Proteksi Otorisasi Klien (RBAC Shielding)",
                description = "Membatasi render tombol aksi tambah, ubah, hapus, dan pengiriman akses berdasarkan status otorisasi fungsional pengguna.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "bulk_selection_standard",
                name = "Standardisasi Aksi Masal (Bulk Selection)",
                description = "Menyediakan checkbox massal (bulk selection) untuk melakukan aksi kolektif seperti hapus terpilih.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            ),
            HardeningStandard(
                id = "shared_components",
                name = "Standardisasi Shared UI Components",
                description = "Memverifikasi apakah halaman menggunakan komponen bersama dari package ui.components untuk mencegah redundansi visual.",
                status = "FAILED",
                details = "Belum diaudit. Silakan jalankan audit kode."
            )
        )
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(semesters) {
        selectedIds = emptySet()
    }

    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        if (selectedIds.isNotEmpty()) {
                            Brush.linearGradient(colors = listOf(Color(0xFF0F172A), Color(0xFF1E293B)))
                        } else {
                            Brush.linearGradient(colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298)))
                        }
                    )
            ) {
                TopAppBar(
                    title = {
                        if (selectedIds.isNotEmpty()) {
                            Text("${selectedIds.size} terpilih", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        } else {
                            Text("Data Semester", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    },
                    navigationIcon = {
                        if (selectedIds.isNotEmpty()) {
                            IconButton(onClick = { selectedIds = emptySet() }) {
                                Icon(Icons.Default.Close, contentDescription = "Batal Pilih", tint = Color.White)
                            }
                        } else {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                            }
                        }
                    },
                    actions = {
                        if (selectedIds.isNotEmpty()) {
                            if (canEdit) {
                                IconButton(onClick = { showConfirmDeleteMultiple = true }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus Terpilih", tint = Color.White)
                                }
                            }
                        } else {
                            IconButton(onClick = { isTableView = !isTableView }) {
                                Icon(
                                    imageVector = if (isTableView) Icons.Default.Face else Icons.Default.List,
                                    contentDescription = "Ubah Tampilan",
                                    tint = Color.White
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    )
                )
            }
        },
        floatingActionButton = {
            if (canCreate) {
                FloatingActionButton(
                    onClick = {
                        selectedItemForEdit = null
                        formNamaSemesterInput = ""
                        formIsActiveInput = false
                        showFormDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Tambah")
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
            // Stats Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ReusableStatsCard(
                    title = "Total Semester",
                    value = if (isLoadingStats) "..." else totalItems.toString(),
                    icon = Icons.Default.DateRange,
                    gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Semester Aktif",
                    value = if (isLoadingStats) "..." else (activeSemester?.nama_semester ?: "Tidak ada"),
                    icon = Icons.Default.CheckCircle,
                    gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Hardening Inspector
            HardeningInspector(
                moduleKey = "academic_semester",
                pageDisplayName = "Semester",
                standards = hardeningStandards,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Search Bar
            SearchTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = "Cari semester...",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (isLoading && semesters.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (semesters.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada data semester", color = Color(0xFF64748B))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isTableView) {
                        item {
                            SemesterTable(
                                semesters = semesters,
                                selectedIds = selectedIds,
                                onSelectionChange = { id, checked ->
                                    selectedIds = if (checked) selectedIds + id else selectedIds - id
                                },
                                onToggleSelectAll = {
                                    if (isAllSelected) {
                                        selectedIds = selectedIds - semesters.map { it.id }.toSet()
                                    } else {
                                        selectedIds = selectedIds + semesters.map { it.id }.toSet()
                                    }
                                },
                                isAllSelected = isAllSelected,
                                currentPage = currentPage,
                                itemsPerPage = limitVal,
                                canEdit = canEdit,
                                onActivate = { sem ->
                                    viewModel.activateSemester(
                                        id = sem.id,
                                        onShadowSuccess = {
                                            Toast.makeText(context, "Berhasil mengaktifkan semester", Toast.LENGTH_SHORT).show()
                                        },
                                        onError = {
                                            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                                        }
                                    )
                                },
                                onEdit = { sem ->
                                    selectedItemForEdit = sem
                                    formNamaSemesterInput = sem.nama_semester
                                    formIsActiveInput = sem.is_active
                                    showFormDialog = true
                                },
                                onDelete = { sem ->
                                    itemToDelete = sem
                                }
                            )
                        }
                    } else {
                        items(semesters, key = { it.id }) { sem ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        CustomCheckbox(
                                            checked = selectedIds.contains(sem.id),
                                            onCheckedChange = { checked ->
                                                selectedIds = if (checked) selectedIds + sem.id else selectedIds - sem.id
                                            }
                                        )
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(
                                                    color = if (sem.is_active) Color(0xFF10B981) else Color(0xFF94A3B8),
                                                    shape = CircleShape
                                                )
                                        )
                                        Column {
                                            Text(
                                                text = sem.nama_semester,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = Color(0xFF0F172A)
                                            )
                                            Text(
                                                text = if (sem.is_active) "Semester Aktif" else "Selesai",
                                                fontSize = 12.sp,
                                                color = Color(0xFF64748B)
                                            )
                                        }
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        if (!sem.is_active && canEdit) {
                                            TextButton(
                                                onClick = {
                                                    viewModel.activateSemester(
                                                        id = sem.id,
                                                        onShadowSuccess = {
                                                            Toast.makeText(context, "Berhasil mengaktifkan semester", Toast.LENGTH_SHORT).show()
                                                        },
                                                        onError = {
                                                            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                                                        }
                                                    )
                                                }
                                            ) {
                                                Text("Aktifkan", color = Color(0xFF1E3C72), fontWeight = FontWeight.Bold)
                                            }
                                        }

                                        if (canEdit) {
                                            IconButton(
                                                onClick = {
                                                    selectedItemForEdit = sem
                                                    formNamaSemesterInput = sem.nama_semester
                                                    formIsActiveInput = sem.is_active
                                                    showFormDialog = true
                                                }
                                            ) {
                                                Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF3B82F6))
                                            }

                                            if (!sem.is_active) {
                                                IconButton(onClick = { itemToDelete = sem }) {
                                                    Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Pagination Row
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Total: $totalItems Semester",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B)
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    IconButton(
                                        onClick = { viewModel.fetchSemesterList(currentPage - 1) },
                                        enabled = currentPage > 1,
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.KeyboardArrowLeft,
                                            contentDescription = "Sebelumnya",
                                            tint = if (currentPage > 1) Color(0xFF1E3C72) else Color.Gray.copy(alpha = 0.5f)
                                        )
                                    }

                                    Text(
                                        text = "$currentPage / $totalPages",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF1E293B),
                                        modifier = Modifier.padding(horizontal = 4.dp)
                                    )

                                    IconButton(
                                        onClick = { viewModel.fetchSemesterList(currentPage + 1) },
                                        enabled = currentPage < totalPages,
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.KeyboardArrowRight,
                                            contentDescription = "Berikutnya",
                                            tint = if (currentPage < totalPages) Color(0xFF1E3C72) else Color.Gray.copy(alpha = 0.5f)
                                        )
                                    }
                                }

                                var limitExpanded by remember { mutableStateOf(false) }
                                Box {
                                    TextButton(
                                        onClick = { limitExpanded = true },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFF1E3C72))
                                    ) {
                                        Text(
                                            text = "Limit: $limitVal",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Icon(
                                            imageVector = Icons.Default.ArrowDropDown,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }

                                    DropdownMenu(
                                        expanded = limitExpanded,
                                        onDismissRequest = { limitExpanded = false },
                                        modifier = Modifier.background(Color.White)
                                    ) {
                                        listOf(5, 10, 25, 50).forEach { limitOption ->
                                            DropdownMenuItem(
                                                text = { Text("$limitOption data", fontSize = 12.sp) },
                                                onClick = {
                                                    viewModel.itemsPerPage.value = limitOption
                                                    limitExpanded = false
                                                }
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

    // Form Add/Edit Dialog
    if (showFormDialog) {
        var localError by remember { mutableStateOf<String?>(null) }
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = if (selectedItemForEdit == null) "Tambah Semester Baru" else "Edit Semester",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = formNamaSemesterInput,
                        onValueChange = { 
                            formNamaSemesterInput = it
                            localError = null
                        },
                        label = { Text("Nama Semester") },
                        placeholder = { Text("Contoh: Ganjil, Genap") },
                        singleLine = true,
                        isError = localError != null,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Set Aktif")
                        Switch(
                            checked = formIsActiveInput,
                            onCheckedChange = { formIsActiveInput = it }
                        )
                    }

                    if (localError != null) {
                        Text(text = localError!!, color = Color.Red, fontSize = 11.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmedName = formNamaSemesterInput.trim()
                        if (trimmedName.isEmpty()) {
                            localError = "Nama semester wajib diisi"
                            return@Button
                        }
                        
                        val payload = mapOf(
                            "nama_semester" to trimmedName,
                            "is_active" to formIsActiveInput
                        )

                        if (selectedItemForEdit == null) {
                            viewModel.createSemester(
                                body = payload,
                                onSuccess = {
                                    showFormDialog = false
                                    Toast.makeText(context, "Semester berhasil dibuat", Toast.LENGTH_SHORT).show()
                                },
                                onError = { localError = it }
                            )
                        } else {
                            viewModel.updateSemester(
                                id = selectedItemForEdit!!.id,
                                body = payload,
                                onSuccess = {
                                    showFormDialog = false
                                    Toast.makeText(context, "Semester berhasil diperbarui", Toast.LENGTH_SHORT).show()
                                },
                                onError = { localError = it }
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Simpan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Delete Confirm Dialog
    itemToDelete?.let { sem ->
        ConfirmDialog(
            title = "Hapus Semester",
            description = {
                Text(text = "Apakah Anda yakin ingin menghapus Semester ${sem.nama_semester}? Data absensi dan jadwal terkait dengan semester ini mungkin akan terganggu.")
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            onConfirm = {
                viewModel.deleteSemester(
                    id = sem.id,
                    onSuccess = {
                        itemToDelete = null
                        Toast.makeText(context, "Semester berhasil dihapus", Toast.LENGTH_SHORT).show()
                    },
                    onError = {
                        itemToDelete = null
                        Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                    }
                )
            },
            onDismiss = { itemToDelete = null }
        )
    }

    // Modal Delete Multiple
    if (showConfirmDeleteMultiple) {
        ConfirmDialog(
            title = "Hapus Semester Terpilih",
            description = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${selectedIds.size} semester terpilih? Tindakan ini tidak dapat dibatalkan.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            isDanger = true,
            onConfirm = {
                viewModel.deleteMultipleSemester(
                    ids = selectedIds.toList(),
                    onSuccess = { succeeded, failed ->
                        Toast.makeText(context, "Berhasil menghapus $succeeded semester. Gagal: $failed", Toast.LENGTH_LONG).show()
                        selectedIds = emptySet()
                        showConfirmDeleteMultiple = false
                    },
                    onError = { error ->
                        Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                        showConfirmDeleteMultiple = false
                    }
                )
            },
            onDismiss = { showConfirmDeleteMultiple = false }
        )
    }
}

// Extension function to match specific callback name
private fun SemesterListViewModel.activateSemester(id: String, onShadowSuccess: () -> Unit, onError: (String) -> Unit) {
    this.activateSemester(id, onSuccess = onShadowSuccess, onError = onError)
}

@Composable
fun SemesterTable(
    semesters: List<SemesterDetail>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    currentPage: Int,
    itemsPerPage: Int,
    canEdit: Boolean,
    onActivate: (SemesterDetail) -> Unit,
    onEdit: (SemesterDetail) -> Unit,
    onDelete: (SemesterDetail) -> Unit
) {
    val scrollState = rememberScrollState()
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(scrollState)
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .background(Color(0xFFF1F5F9))
                        .padding(vertical = 12.dp, horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier.width(36.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        CustomCheckbox(
                            checked = isAllSelected,
                            onCheckedChange = { onToggleSelectAll() }
                        )
                    }
                    Text(text = "No", modifier = Modifier.width(50.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Nama Semester", modifier = Modifier.width(200.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Status Aktif", modifier = Modifier.width(120.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(220.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }
                
                // Body rows
                semesters.forEachIndexed { index, sem ->
                    val rowNum = (currentPage - 1) * itemsPerPage + index + 1
                    key(sem.id) {
                        Row(
                            modifier = Modifier.padding(vertical = 8.dp, horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier.width(36.dp),
                                contentAlignment = Alignment.CenterStart
                            ) {
                                CustomCheckbox(
                                    checked = selectedIds.contains(sem.id),
                                    onCheckedChange = { checked -> onSelectionChange(sem.id, checked) }
                                )
                            }
                            Text(text = rowNum.toString(), modifier = Modifier.width(50.dp), fontSize = 13.sp, color = Color(0xFF1E293B))
                            Text(text = sem.nama_semester, modifier = Modifier.width(200.dp), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                            
                            Box(modifier = Modifier.width(120.dp)) {
                                val statusColor = if (sem.is_active) Color(0xFF10B981) else Color(0xFF94A3B8)
                                val statusText = if (sem.is_active) "Aktif" else "Selesai"
                                Box(
                                    modifier = Modifier
                                        .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(text = statusText, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            
                            Row(
                                modifier = Modifier.width(220.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!sem.is_active && canEdit) {
                                    TextButton(onClick = { onActivate(sem) }) {
                                        Text("Aktifkan", color = Color(0xFF1E3C72), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                                if (canEdit) {
                                    IconButton(onClick = { onEdit(sem) }) {
                                        Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
                                    }
                                }
                                if (canEdit && !sem.is_active) {
                                    IconButton(onClick = { onDelete(sem) }) {
                                        Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                        }
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                    }
                }
            }
            TableScrollbar(
                scrollState = scrollState,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, bottom = 8.dp, top = 4.dp)
            )
        }
    }
}
