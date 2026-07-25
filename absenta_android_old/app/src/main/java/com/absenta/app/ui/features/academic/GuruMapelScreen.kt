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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.GuruMapelDetail
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuruMapelScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GuruMapelViewModel = viewModel()
) {
    val context = LocalContext.current

    val items by viewModel.items.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()

    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterGuruId by viewModel.filterGuruId.collectAsState()
    val filterMapelId by viewModel.filterMapelId.collectAsState()

    val canManage by viewModel.canManage.collectAsState()
    val canView by viewModel.canView.collectAsState()

    // Form states
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedGuruId by remember { mutableStateOf("") }
    var selectedMapelId by remember { mutableStateOf("") }

    // Deletion states
    var itemToDelete by remember { mutableStateOf<GuruMapelDetail?>(null) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmBulkDelete by remember { mutableStateOf(false) }

    val isAllSelected = remember(items, selectedIds) {
        items.isNotEmpty() && items.all { selectedIds.contains(it.id) }
    }

    // Dropdown Form options
    val guruOptions = viewModel.guruOptions.collectAsState().value
    val mapelOptions = viewModel.mapelOptions.collectAsState().value

    val guruFilterOptions = remember(guruOptions) {
        listOf(DropdownOption("Semua Guru", "")) + guruOptions.map { DropdownOption(it.nama_guru, it.id) }
    }

    val mapelFilterOptions = remember(mapelOptions) {
        listOf(DropdownOption("Semua Mapel", "")) + mapelOptions.map { DropdownOption(it.nama_mapel, it.id) }
    }

    val guruDropdownOptions = remember(guruOptions) {
        guruOptions.map { DropdownOption(it.nama_guru, it.id) }
    }

    val mapelDropdownOptions = remember(mapelOptions) {
        mapelOptions.map { DropdownOption(it.nama_mapel, it.id) }
    }

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
                                Text("Guru Pengampu Mapel", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    text = "Kelompok Setup • Distribusi Beban Mengajar",
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
                        selectedGuruId = ""
                        selectedMapelId = ""
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
                    title = "Total Guru",
                    value = if (isLoadingStats) "..." else (stats?.total_guru ?: 0).toString(),
                    icon = Icons.Default.Person,
                    gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Total Mapel",
                    value = if (isLoadingStats) "..." else (stats?.total_mapel ?: 0).toString(),
                    icon = Icons.Default.Star,
                    gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Total Siswa",
                    value = if (isLoadingStats) "..." else (stats?.total_siswa ?: 0).toString(),
                    icon = Icons.Default.Face,
                    gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Search Bar
            SearchTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = "Cari guru atau mata pelajaran...",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            )

            // Dropdown Filters Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    FilterDropdown(
                        selectedValue = filterGuruId,
                        options = guruFilterOptions,
                        onValueChange = { viewModel.filterGuruId.value = it },
                        placeholder = "Semua Guru",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    FilterDropdown(
                        selectedValue = filterMapelId,
                        options = mapelFilterOptions,
                        onValueChange = { viewModel.filterMapelId.value = it },
                        placeholder = "Semua Mapel",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

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
                    Text(text = "Tidak ada data guru pengampu mapel", color = Color(0xFF64748B))
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
                        GuruMapelTable(
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
                            canManage = canManage,
                            onDelete = { item -> itemToDelete = item }
                        )
                    }

                    // Total Summary Row
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
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Total Pengampu: ${items.size}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Form Dialog (Assign Teacher-Mapel)
    if (showFormDialog) {
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = "Tambah Pengampu Guru-Mapel",
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
                    Text(
                        text = "Tentukan guru pengampu untuk mata pelajaran yang tersedia.",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )

                    FilterDropdown(
                        selectedValue = selectedGuruId,
                        options = guruDropdownOptions,
                        onValueChange = { selectedGuruId = it },
                        placeholder = "Pilih Guru",
                        modifier = Modifier.fillMaxWidth()
                    )

                    FilterDropdown(
                        selectedValue = selectedMapelId,
                        options = mapelDropdownOptions,
                        onValueChange = { selectedMapelId = it },
                        placeholder = "Pilih Mata Pelajaran",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (selectedGuruId.isEmpty() || selectedMapelId.isEmpty()) {
                            Toast.makeText(context, "Guru dan Mapel wajib dipilih", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        viewModel.assignGuruMapel(
                            guruId = selectedGuruId,
                            mapelId = selectedMapelId,
                            onSuccess = {
                                Toast.makeText(context, "Berhasil menambahkan pengampu", Toast.LENGTH_SHORT).show()
                                showFormDialog = false
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Tambah", color = Color.White)
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
                    text = "Hapus Pengampu Mapel",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${item.Guru?.nama_guru ?: "guru ini"} sebagai pengampu mata pelajaran ${item.Mapel?.nama_mapel ?: "mapel ini"}?",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.removeGuruMapel(
                            id = item.id,
                            onSuccess = {
                                Toast.makeText(context, "Pengampu berhasil dihapus", Toast.LENGTH_SHORT).show()
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
                    text = "Hapus Pengampu Terpilih",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${selectedIds.size} penugasan pengampu mata pelajaran terpilih secara massal?",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.removeMultipleGuruMapel(
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
fun GuruMapelTable(
    items: List<GuruMapelDetail>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    canManage: Boolean,
    onDelete: (GuruMapelDetail) -> Unit
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
                    Text(text = "Nama Guru / NIP", modifier = Modifier.width(180.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Mata Pelajaran", modifier = Modifier.width(140.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Kode Mapel", modifier = Modifier.width(80.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }

                // Table Body Rows
                items.forEachIndexed { index, item ->
                    key(item.id) {
                        GuruMapelTableRow(
                            rowNum = index + 1,
                            item = item,
                            isSelected = selectedIds.contains(item.id),
                            onSelectionChange = { checked -> onSelectionChange(item.id, checked) },
                            canManage = canManage,
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
fun GuruMapelTableRow(
    rowNum: Int,
    item: GuruMapelDetail,
    isSelected: Boolean,
    onSelectionChange: (Boolean) -> Unit,
    canManage: Boolean,
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

        Column(modifier = Modifier.width(180.dp)) {
            Text(
                text = item.Guru?.nama_guru ?: "-",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = Color(0xFF1E293B),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (item.Guru?.nip != null) {
                Text(
                    text = "NIP: ${item.Guru.nip}",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            }
        }

        Text(
            text = item.Mapel?.nama_mapel ?: "-",
            modifier = Modifier.width(140.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Text(
            text = item.Mapel?.kode_mapel ?: "-",
            modifier = Modifier.width(80.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF475569)
        )

        Row(
            modifier = Modifier.width(100.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (canManage) {
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
