package com.absenta.app.ui.features.academic

import com.absenta.app.data.api.*
import androidx.compose.ui.text.style.TextAlign

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
fun JurusanListScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: JurusanListViewModel = viewModel()
) {
    val context = LocalContext.current

    val jurusans by viewModel.jurusans.collectAsState()
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
    var selectedItemForEdit by remember { mutableStateOf<JurusanDetail?>(null) }
    var formNamaInput by remember { mutableStateOf("") }
    var formKodeInput by remember { mutableStateOf("") }
    var formSingkatanInput by remember { mutableStateOf("") }

    // Delete confirm state
    var itemToDelete by remember { mutableStateOf<JurusanDetail?>(null) }
    var isTableView by remember { mutableStateOf(false) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmDeleteMultiple by remember { mutableStateOf(false) }

    val isAllSelected = remember(jurusans, selectedIds) {
        jurusans.isNotEmpty() && jurusans.all { selectedIds.contains(it.id) }
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
                description = "Penyaringan data, visualisasi, dan perulangan baris menggunakan key (jurusan.id) di dalam Jetpack Compose untuk meredam pemuatan ulang DOM/Canvas berlebihan.",
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

    LaunchedEffect(jurusans) {
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
                            Text("Data Jurusan", fontWeight = FontWeight.Bold, fontSize = 18.sp)
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
                        formNamaInput = ""
                        formKodeInput = ""
                        formSingkatanInput = ""
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
                    title = "Total Jurusan",
                    value = if (isLoadingStats) "..." else totalItems.toString(),
                    icon = Icons.Default.Star,
                    gradientColors = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Hardening Inspector
            HardeningInspector(
                moduleKey = "academic_jurusan",
                pageDisplayName = "Jurusan",
                standards = hardeningStandards,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Search Bar
            SearchTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = "Cari nama jurusan...",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (isLoading && jurusans.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (jurusans.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada data jurusan", color = Color(0xFF64748B))
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
                            JurusanTable(
                                jurusans = jurusans,
                                selectedIds = selectedIds,
                                onSelectionChange = { id, checked ->
                                    selectedIds = if (checked) selectedIds + id else selectedIds - id
                                },
                                onToggleSelectAll = {
                                    if (isAllSelected) {
                                        selectedIds = selectedIds - jurusans.map { it.id }.toSet()
                                    } else {
                                        selectedIds = selectedIds + jurusans.map { it.id }.toSet()
                                    }
                                },
                                isAllSelected = isAllSelected,
                                currentPage = currentPage,
                                itemsPerPage = limitVal,
                                canEdit = canEdit,
                                onEdit = { jur ->
                                    selectedItemForEdit = jur
                                    formNamaInput = jur.nama
                                    formKodeInput = jur.kode ?: ""
                                    formSingkatanInput = jur.singkatan ?: ""
                                    showFormDialog = true
                                },
                                onDelete = { jur ->
                                    itemToDelete = jur
                                }
                            )
                        }
                    } else {
                        items(jurusans, key = { it.id }) { jur ->
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
                                            checked = selectedIds.contains(jur.id),
                                            onCheckedChange = { checked ->
                                                selectedIds = if (checked) selectedIds + jur.id else selectedIds - jur.id
                                            }
                                        )
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .background(Color(0xFFFEF3C7), CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Star,
                                                contentDescription = null,
                                                tint = Color(0xFFD97706)
                                            )
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = jur.nama,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = Color(0xFF0F172A)
                                            )
                                            Text(
                                                text = "Kode: ${jur.kode ?: "-"} | Singkatan: ${jur.singkatan ?: "-"}",
                                                fontSize = 12.sp,
                                                color = Color(0xFF64748B)
                                            )
                                        }
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        if (canEdit) {
                                            IconButton(
                                                onClick = {
                                                    selectedItemForEdit = jur
                                                    formNamaInput = jur.nama
                                                    formKodeInput = jur.kode ?: ""
                                                    formSingkatanInput = jur.singkatan ?: ""
                                                    showFormDialog = true
                                                }
                                            ) {
                                                Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF3B82F6))
                                            }

                                            IconButton(onClick = { itemToDelete = jur }) {
                                                Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444))
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
                                    text = "Total: $totalItems Jurusan",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B)
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    IconButton(
                                        onClick = { viewModel.fetchJurusanList(currentPage - 1) },
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
                                        onClick = { viewModel.fetchJurusanList(currentPage + 1) },
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
                    text = if (selectedItemForEdit == null) "Tambah Jurusan Baru" else "Edit Jurusan",
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
                        value = formNamaInput,
                        onValueChange = { 
                            formNamaInput = it
                            localError = null
                        },
                        label = { Text("Nama Jurusan") },
                        placeholder = { Text("Contoh: Rekayasa Perangkat Lunak") },
                        singleLine = true,
                        isError = localError != null,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = formKodeInput,
                        onValueChange = { formKodeInput = it },
                        label = { Text("Kode Jurusan (Opsional)") },
                        placeholder = { Text("Contoh: RPL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = formSingkatanInput,
                        onValueChange = { formSingkatanInput = it },
                        label = { Text("Singkatan (Opsional)") },
                        placeholder = { Text("Contoh: RPL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (localError != null) {
                        Text(text = localError!!, color = Color.Red, fontSize = 11.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmedName = formNamaInput.trim()
                        if (trimmedName.isEmpty()) {
                            localError = "Nama jurusan wajib diisi"
                            return@Button
                        }
                        
                        val payload = mapOf(
                            "nama" to trimmedName,
                            "kode" to formKodeInput.trim().takeIf { it.isNotEmpty() },
                            "singkatan" to formSingkatanInput.trim().takeIf { it.isNotEmpty() }
                        )

                        if (selectedItemForEdit == null) {
                            viewModel.createJurusan(
                                body = payload,
                                onSuccess = {
                                    showFormDialog = false
                                    Toast.makeText(context, "Jurusan berhasil dibuat", Toast.LENGTH_SHORT).show()
                                },
                                onError = { localError = it }
                            )
                        } else {
                            viewModel.updateJurusan(
                                id = selectedItemForEdit!!.id,
                                body = payload,
                                onSuccess = {
                                    showFormDialog = false
                                    Toast.makeText(context, "Jurusan berhasil diperbarui", Toast.LENGTH_SHORT).show()
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
    itemToDelete?.let { jur ->
        ConfirmDialog(
            title = "Hapus Jurusan",
            description = {
                Text(text = "Apakah Anda yakin ingin menghapus Jurusan ${jur.nama}? Seluruh data murid dan kelas di bawah jurusan ini mungkin akan terpengaruh.")
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            onConfirm = {
                viewModel.deleteJurusan(
                    id = jur.id,
                    onSuccess = {
                        itemToDelete = null
                        Toast.makeText(context, "Jurusan berhasil dihapus", Toast.LENGTH_SHORT).show()
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
            title = "Hapus Jurusan Terpilih",
            description = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${selectedIds.size} jurusan terpilih? Tindakan ini tidak dapat dibatalkan.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            isDanger = true,
            onConfirm = {
                viewModel.deleteMultipleJurusan(
                    ids = selectedIds.toList(),
                    onSuccess = { succeeded, failed ->
                        Toast.makeText(context, "Berhasil menghapus $succeeded jurusan. Gagal: $failed", Toast.LENGTH_LONG).show()
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

@Composable
fun JurusanTable(
    jurusans: List<JurusanDetail>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    currentPage: Int,
    itemsPerPage: Int,
    canEdit: Boolean,
    onEdit: (JurusanDetail) -> Unit,
    onDelete: (JurusanDetail) -> Unit
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
                    Text(text = "Nama Jurusan", modifier = Modifier.width(200.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Kode", modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Singkatan", modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(140.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }
                
                // Body rows
                jurusans.forEachIndexed { index, jur ->
                    val rowNum = (currentPage - 1) * itemsPerPage + index + 1
                    key(jur.id) {
                        Row(
                            modifier = Modifier.padding(vertical = 8.dp, horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier.width(36.dp),
                                contentAlignment = Alignment.CenterStart
                            ) {
                                CustomCheckbox(
                                    checked = selectedIds.contains(jur.id),
                                    onCheckedChange = { checked -> onSelectionChange(jur.id, checked) }
                                )
                            }
                            Text(text = rowNum.toString(), modifier = Modifier.width(50.dp), fontSize = 13.sp, color = Color(0xFF1E293B))
                            Text(text = jur.nama, modifier = Modifier.width(200.dp), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                            Text(text = jur.kode ?: "-", modifier = Modifier.width(100.dp), fontSize = 13.sp, color = Color(0xFF475569))
                            Text(text = jur.singkatan ?: "-", modifier = Modifier.width(100.dp), fontSize = 13.sp, color = Color(0xFF475569))
                            
                            Row(
                                modifier = Modifier.width(140.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (canEdit) {
                                    IconButton(onClick = { onEdit(jur) }) {
                                        Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
                                    }
                                    IconButton(onClick = { onDelete(jur) }) {
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
