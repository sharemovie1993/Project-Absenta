package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.JenisKegiatanMaster
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JenisKegiatanScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: JenisKegiatanViewModel = viewModel()
) {
    val context = LocalContext.current

    val items by viewModel.items.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    val searchQuery by viewModel.searchQuery.collectAsState()

    val canManage by viewModel.canManage.collectAsState()

    // Pagination
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // Form Dialog States
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedItemForEdit by remember { mutableStateOf<JenisKegiatanMaster?>(null) }
    var formNama by remember { mutableStateOf("") }
    var formTipe by remember { mutableStateOf("KBM") }
    var formUrutan by remember { mutableStateOf("1") }
    var formAktif by remember { mutableStateOf(true) }

    // Deletion states
    var itemToDelete by remember { mutableStateOf<JenisKegiatanMaster?>(null) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmBulkDelete by remember { mutableStateOf(false) }

    val isAllSelected = remember(items, selectedIds) {
        items.isNotEmpty() && items.all { selectedIds.contains(it.id) }
    }

    val tipeOptions = listOf(
        DropdownOption("Kegiatan Belajar Mengajar (KBM)", "KBM"),
        DropdownOption("Ekstrakurikuler (Ekskul)", "EKskul"),
        DropdownOption("Bimbingan Konseling (BK)", "BK"),
        DropdownOption("Lain-lain", "Lainnya")
    )

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(items) {
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
                            Column {
                                Text("Kategori & Jenis Kegiatan", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    text = "Kelompok Setup • Master Klasifikasi Aktivitas",
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                            }
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
                            if (canManage) {
                                IconButton(onClick = { showConfirmBulkDelete = true }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus Terpilih", tint = Color.White)
                                }
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
            if (canManage) {
                FloatingActionButton(
                    onClick = {
                        selectedItemForEdit = null
                        formNama = ""
                        formTipe = "KBM"
                        formUrutan = "1"
                        formAktif = true
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
                val activeCount = remember(items) { items.count { it.aktif } }
                ReusableStatsCard(
                    title = "Total Kategori",
                    value = if (isLoading) "..." else totalItems.toString(),
                    icon = Icons.Default.List,
                    gradientColors = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Kategori Aktif",
                    value = if (isLoading) "..." else activeCount.toString(),
                    icon = Icons.Default.CheckCircle,
                    gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Search Bar
            SearchTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = "Cari nama kategori...",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            )

            if (isLoading && items.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (items.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada data kategori kegiatan", color = Color(0xFF64748B))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        JenisKegiatanTable(
                            items = items,
                            selectedIds = selectedIds,
                            onSelectionChange = { id, checked ->
                                selectedIds = if (checked) selectedIds + id else selectedIds - id
                            },
                            onToggleSelectAll = {
                                if (isAllSelected) {
                                    selectedIds = selectedIds - items.map { it.id }.toSet()
                                } else {
                                    selectedIds = selectedIds + items.map { it.id }.toSet()
                                }
                            },
                            isAllSelected = isAllSelected,
                            currentPage = currentPage,
                            itemsPerPage = limitVal,
                            canManage = canManage,
                            onEdit = { item ->
                                selectedItemForEdit = item
                                formNama = item.nama
                                formTipe = item.tipe
                                formUrutan = (item.urutan ?: 1).toString()
                                formAktif = item.aktif
                                showFormDialog = true
                            },
                            onDelete = { item -> itemToDelete = item }
                        )
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
                                    text = "Total: $totalItems",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B)
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    IconButton(
                                        onClick = { viewModel.fetchJenisKegiatanList(currentPage - 1) },
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
                                        onClick = { viewModel.fetchJenisKegiatanList(currentPage + 1) },
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

    // Form Dialog (Create/Edit Category)
    if (showFormDialog) {
        val isEdit = selectedItemForEdit != null

        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = if (isEdit) "Ubah Kategori Kegiatan" else "Tambah Kategori Kegiatan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = formNama,
                        onValueChange = { formNama = it },
                        label = { Text("Nama Kategori") },
                        placeholder = { Text("Contoh: KBM Harian, Ekstrakurikuler Pramuka") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    FilterDropdown(
                        selectedValue = formTipe,
                        options = tipeOptions,
                        onValueChange = { formTipe = it },
                        placeholder = "Pilih Tipe",
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = formUrutan,
                        onValueChange = { formUrutan = it },
                        label = { Text("Urutan Prioritas") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Status Aktif",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF475569)
                        )
                        Switch(
                            checked = formAktif,
                            onCheckedChange = { formAktif = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1E3C72))
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (formNama.trim().isEmpty()) {
                            Toast.makeText(context, "Nama kategori wajib diisi", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        val urutanVal = formUrutan.toIntOrNull() ?: 1

                        if (isEdit) {
                            viewModel.updateJenisKegiatan(
                                id = selectedItemForEdit!!.id,
                                nama = formNama,
                                tipe = formTipe,
                                urutan = urutanVal,
                                aktif = formAktif,
                                onSuccess = {
                                    Toast.makeText(context, "Berhasil mengubah kategori", Toast.LENGTH_SHORT).show()
                                    showFormDialog = false
                                },
                                onError = { err ->
                                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                }
                            )
                        } else {
                            viewModel.createJenisKegiatan(
                                nama = formNama,
                                tipe = formTipe,
                                urutan = urutanVal,
                                aktif = formAktif,
                                onSuccess = {
                                    Toast.makeText(context, "Berhasil menambahkan kategori", Toast.LENGTH_SHORT).show()
                                    showFormDialog = false
                                },
                                onError = { err ->
                                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                }
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(if (isEdit) "Simpan" else "Tambah", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Confirm Delete Dialog
    itemToDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            title = {
                Text(
                    text = "Hapus Kategori Kegiatan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus kategori '${item.nama}'? Menghapus kategori ini dapat berdampak pada data absensi terkait.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteJenisKegiatan(
                            id = item.id,
                            onSuccess = {
                                Toast.makeText(context, "Kategori berhasil dihapus", Toast.LENGTH_SHORT).show()
                                itemToDelete = null
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                itemToDelete = null
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Hapus", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToDelete = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Confirm Bulk Delete Dialog
    if (showConfirmBulkDelete) {
        AlertDialog(
            onDismissRequest = { showConfirmBulkDelete = false },
            title = {
                Text(
                    text = "Hapus Kategori Terpilih",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${selectedIds.size} kategori kegiatan terpilih secara massal? Aksi ini dapat mempengaruhi absensi terkait.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteMultipleJenisKegiatan(
                            ids = selectedIds.toList(),
                            onSuccess = { succ, fail ->
                                Toast.makeText(context, "Berhasil: $succ, Gagal: $fail", Toast.LENGTH_LONG).show()
                                showConfirmBulkDelete = false
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Hapus Semua", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmBulkDelete = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }
}

@Composable
fun JenisKegiatanTable(
    items: List<JenisKegiatanMaster>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    currentPage: Int,
    itemsPerPage: Int,
    canManage: Boolean,
    onEdit: (JenisKegiatanMaster) -> Unit,
    onDelete: (JenisKegiatanMaster) -> Unit
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
                // Table Header Row
                Row(
                    modifier = Modifier
                        .background(Color(0xFFF1F5F9))
                        .padding(vertical = 12.dp, horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (canManage) {
                        Box(
                            modifier = Modifier.width(36.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            CustomCheckbox(
                                checked = isAllSelected,
                                onCheckedChange = { onToggleSelectAll() }
                            )
                        }
                    }

                    Text(text = "No", modifier = Modifier.width(30.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Nama Kategori", modifier = Modifier.width(180.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Tipe", modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Urutan", modifier = Modifier.width(60.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Status", modifier = Modifier.width(80.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(140.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }

                // Table Body Rows
                items.forEachIndexed { index, item ->
                    val rowNum = (currentPage - 1) * itemsPerPage + index + 1
                    key(item.id) {
                        JenisKegiatanTableRow(
                            rowNum = rowNum,
                            item = item,
                            isSelected = selectedIds.contains(item.id),
                            onSelectionChange = { checked -> onSelectionChange(item.id, checked) },
                            canManage = canManage,
                            onEdit = { onEdit(item) },
                            onDelete = { onDelete(item) }
                        )
                    }
                    HorizontalDivider(color = Color(0xFFF1F5F9))
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

@Composable
fun JenisKegiatanTableRow(
    rowNum: Int,
    item: JenisKegiatanMaster,
    isSelected: Boolean,
    onSelectionChange: (Boolean) -> Unit,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier
            .padding(vertical = 10.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (canManage) {
            Box(
                modifier = Modifier.width(36.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                CustomCheckbox(
                    checked = isSelected,
                    onCheckedChange = onSelectionChange
                )
            }
        }

        Text(
            text = rowNum.toString(),
            modifier = Modifier.width(30.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF475569)
        )

        Text(
            text = item.nama,
            modifier = Modifier.width(180.dp),
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            color = Color(0xFF1E293B),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Text(
            text = item.tipe,
            modifier = Modifier.width(100.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155)
        )

        Text(
            text = (item.urutan ?: 0).toString(),
            modifier = Modifier.width(60.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF475569)
        )

        Box(modifier = Modifier.width(80.dp)) {
            Surface(
                color = if (item.aktif) Color(0xFFD1FAE5) else Color(0xFFE2E8F0),
                contentColor = if (item.aktif) Color(0xFF065F46) else Color(0xFF475569),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = if (item.aktif) "AKTIF" else "NONAKTIF",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }

        Row(
            modifier = Modifier.width(140.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (canManage) {
                IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Ubah",
                        tint = Color(0xFF3B82F6)
                    )
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Hapus",
                        tint = Color(0xFFEF4444)
                    )
                }
            }
        }
    }
}
