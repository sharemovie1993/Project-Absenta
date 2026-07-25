package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.WaliKelasStrukturAssignment
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaliKelasScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: WaliKelasViewModel = viewModel()
) {
    val context = LocalContext.current

    val assignments by viewModel.assignments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()

    val searchQuery by viewModel.searchQuery.collectAsState()
    val includeInactive by viewModel.includeInactive.collectAsState()

    val canManage by viewModel.canManage.collectAsState()
    val canView by viewModel.canView.collectAsState()

    // Pagination
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // Form Dialog States
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedGuruId by remember { mutableStateOf("") }
    var selectedKelasId by remember { mutableStateOf("") }

    // Deactivation Dialog States
    var itemToDeactivate by remember { mutableStateOf<WaliKelasStrukturAssignment?>(null) }
    var itemToActivate by remember { mutableStateOf<WaliKelasStrukturAssignment?>(null) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmBulkDeactivate by remember { mutableStateOf(false) }

    val isAllSelected = remember(assignments, selectedIds) {
        assignments.isNotEmpty() && assignments.all { selectedIds.contains(it.id) }
    }

    // Dropdown Form options
    val guruOptions = viewModel.guruOptions.collectAsState().value
    val kelasOptions = viewModel.kelasOptions.collectAsState().value

    val guruDropdownOptions = remember(guruOptions) {
        guruOptions.map { DropdownOption(it.nama_guru, it.id) }
    }

    val kelasDropdownOptions = remember(kelasOptions) {
        kelasOptions.map { DropdownOption(it.nama_kelas, it.id) }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(assignments) {
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
                                Text("Penugasan Wali Kelas", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    text = "Kelompok Setup • Pemetaan Wali Kelas",
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
                                IconButton(onClick = { showConfirmBulkDeactivate = true }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Nonaktifkan Terpilih", tint = Color.White)
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
                        selectedKelasId = ""
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
                    title = "Total Kelas",
                    value = if (isLoadingStats) "..." else (stats?.total_kelas ?: 0).toString(),
                    icon = Icons.Default.Home,
                    gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Total Guru",
                    value = if (isLoadingStats) "..." else (stats?.total_guru ?: 0).toString(),
                    icon = Icons.Default.Person,
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

            // Search and Toggle Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SearchTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.searchQuery.value = it },
                    placeholder = "Cari guru atau kelas...",
                    modifier = Modifier.weight(1f)
                )

                // Toggle include inactive
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier
                        .height(56.dp)
                        .clickable { viewModel.includeInactive.value = !includeInactive }
                        .padding(horizontal = 12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Nonaktif",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B)
                        )
                        Switch(
                            checked = includeInactive,
                            onCheckedChange = { viewModel.includeInactive.value = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1E3C72))
                        )
                    }
                }
            }

            if (isLoading && assignments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (assignments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada data penugasan wali kelas", color = Color(0xFF64748B))
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
                        WaliKelasTable(
                            assignments = assignments,
                            selectedIds = selectedIds,
                            onSelectionChange = { id, checked ->
                                selectedIds = if (checked) selectedIds + id else selectedIds - id
                            },
                            onToggleSelectAll = {
                                if (isAllSelected) {
                                    selectedIds = selectedIds - assignments.map { it.id }.toSet()
                                } else {
                                    selectedIds = selectedIds + assignments.map { it.id }.toSet()
                                }
                            },
                            isAllSelected = isAllSelected,
                            currentPage = currentPage,
                            itemsPerPage = limitVal,
                            canManage = canManage,
                            onDeactivate = { item -> itemToDeactivate = item },
                            onActivate = { item -> itemToActivate = item }
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
                                        onClick = { viewModel.fetchAssignments(currentPage - 1) },
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
                                        onClick = { viewModel.fetchAssignments(currentPage + 1) },
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

    // Form Dialog (Assign Homeroom)
    if (showFormDialog) {
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = "Tambah Penugasan Wali Kelas",
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
                        text = "Pilih kelas dan tentukan guru yang akan bertugas sebagai wali kelas untuk periode aktif.",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )

                    FilterDropdown(
                        selectedValue = selectedKelasId,
                        options = kelasDropdownOptions,
                        onValueChange = { selectedKelasId = it },
                        placeholder = "Pilih Kelas",
                        modifier = Modifier.fillMaxWidth()
                    )

                    FilterDropdown(
                        selectedValue = selectedGuruId,
                        options = guruDropdownOptions,
                        onValueChange = { selectedGuruId = it },
                        placeholder = "Pilih Guru",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (selectedKelasId.isEmpty() || selectedGuruId.isEmpty()) {
                            Toast.makeText(context, "Kelas dan Guru wajib dipilih", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        viewModel.assignWaliKelas(
                            kelasId = selectedKelasId,
                            guruId = selectedGuruId,
                            onSuccess = {
                                Toast.makeText(context, "Berhasil menetapkan wali kelas", Toast.LENGTH_SHORT).show()
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
                    Text("Tugaskan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Confirm Deactivation Dialog
    itemToDeactivate?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToDeactivate = null },
            title = {
                Text(
                    text = "Nonaktifkan Wali Kelas",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Anda akan menonaktifkan ${item.Guru?.nama_guru ?: "guru ini"} sebagai wali kelas ${item.StrukturOrganisasi?.Kelas?.nama_kelas ?: "kelas ini"}. Hak akses khusus wali kelas akan dicabut.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.nonaktifWaliKelas(
                            id = item.id,
                            onSuccess = {
                                Toast.makeText(context, "Berhasil menonaktifkan wali kelas", Toast.LENGTH_SHORT).show()
                                itemToDeactivate = null
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                itemToDeactivate = null
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Nonaktifkan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToDeactivate = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Confirm Reactivation Dialog
    itemToActivate?.let { item ->
        AlertDialog(
            onDismissRequest = { itemToActivate = null },
            title = {
                Text(
                    text = "Aktifkan Penugasan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda ingin mengaktifkan kembali penugasan ${item.Guru?.nama_guru ?: "guru ini"} sebagai wali kelas ${item.StrukturOrganisasi?.Kelas?.nama_kelas ?: "kelas ini"}?",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val kelasId = item.StrukturOrganisasi?.Kelas?.id
                        val guruId = item.Guru?.id
                        if (kelasId == null || guruId == null) return@Button
                        viewModel.assignWaliKelas(
                            kelasId = kelasId,
                            guruId = guruId,
                            onSuccess = {
                                Toast.makeText(context, "Berhasil mengaktifkan kembali wali kelas", Toast.LENGTH_SHORT).show()
                                itemToActivate = null
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                itemToActivate = null
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Aktifkan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToActivate = null }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Confirm Bulk Deactivation
    if (showConfirmBulkDeactivate) {
        AlertDialog(
            onDismissRequest = { showConfirmBulkDeactivate = false },
            title = {
                Text(
                    text = "Nonaktifkan Wali Kelas Terpilih",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menonaktifkan ${selectedIds.size} penugasan wali kelas yang terpilih secara massal?",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.nonaktifMultipleWaliKelas(
                            ids = selectedIds.toList(),
                            onSuccess = { succ, fail ->
                                Toast.makeText(context, "Berhasil: $succ, Gagal: $fail", Toast.LENGTH_LONG).show()
                                showConfirmBulkDeactivate = false
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Nonaktifkan Semua", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmBulkDeactivate = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }
}

@Composable
fun WaliKelasTable(
    assignments: List<WaliKelasStrukturAssignment>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    currentPage: Int,
    itemsPerPage: Int,
    canManage: Boolean,
    onDeactivate: (WaliKelasStrukturAssignment) -> Unit,
    onActivate: (WaliKelasStrukturAssignment) -> Unit
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
                    Text(text = "Nama Wali / NIP", modifier = Modifier.width(180.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Kelas", modifier = Modifier.width(100.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Status", modifier = Modifier.width(80.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(140.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }
                
                // Table Body Rows
                assignments.forEachIndexed { index, item ->
                    val rowNum = (currentPage - 1) * itemsPerPage + index + 1
                    key(item.id) {
                        WaliKelasTableRow(
                            rowNum = rowNum,
                            item = item,
                            isSelected = selectedIds.contains(item.id),
                            onSelectionChange = { checked -> onSelectionChange(item.id, checked) },
                            canManage = canManage,
                            onDeactivate = { onDeactivate(item) },
                            onActivate = { onActivate(item) }
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
fun WaliKelasTableRow(
    rowNum: Int,
    item: WaliKelasStrukturAssignment,
    isSelected: Boolean,
    onSelectionChange: (Boolean) -> Unit,
    canManage: Boolean,
    onDeactivate: () -> Unit,
    onActivate: () -> Unit
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
            text = item.StrukturOrganisasi?.Kelas?.nama_kelas ?: "Kelas -",
            modifier = Modifier.width(100.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155)
        )
        
        Box(modifier = Modifier.width(80.dp)) {
            Surface(
                color = if (item.is_active) Color(0xFFD1FAE5) else Color(0xFFE2E8F0),
                contentColor = if (item.is_active) Color(0xFF065F46) else Color(0xFF475569),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = if (item.is_active) "AKTIF" else "NONAKTIF",
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
                if (item.is_active) {
                    IconButton(onClick = onDeactivate) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Nonaktifkan",
                            tint = Color(0xFFEF4444)
                        )
                    }
                } else {
                    IconButton(onClick = onActivate) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Aktifkan",
                            tint = Color(0xFF10B981)
                        )
                    }
                }
            } else {
                Text("-", fontSize = 11.sp, color = Color.Gray)
            }
        }
    }
}

