package com.absenta.app.ui.features.academic

import android.widget.Toast
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.*
import com.absenta.app.ui.components.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiswaListScreen(
    onNavigateBack: () -> Unit,
    onNavigateToGenericDetail: (String) -> Unit,
    onNavigateToRegistrasiSiswa: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SiswaListViewModel = viewModel()
) {
    val context = LocalContext.current

    // ViewModel State flows
    val siswas by viewModel.siswas.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    // Pagination State
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // Stats State
    val stats by viewModel.stats.collectAsState()
    val activeSiswaCount by viewModel.activeSiswaCount.collectAsState()
    val registeredCount by viewModel.registeredCount.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()

    // Filters State
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterKelasId by viewModel.filterKelasId.collectAsState()
    val filterStatus by viewModel.filterStatus.collectAsState()
    val filterGender by viewModel.filterGender.collectAsState()
    val kelasList by viewModel.kelasList.collectAsState()

    // Capabilities
    val canCreate by viewModel.canCreate.collectAsState()
    val canEdit by viewModel.canEdit.collectAsState()
    val canView by viewModel.canView.collectAsState()
    val canSendAccess by viewModel.canSendAccess.collectAsState()
    val isIsolatedScope by viewModel.isIsolatedScope.collectAsState()

    // UI View Mode: Card (false) vs Table (true)
    var isTableView by remember { mutableStateOf(false) }

    // Confirm dialogs states
    var siswaToDelete by remember { mutableStateOf<SiswaDetail?>(null) }
    var showConfirmDeleteAll by remember { mutableStateOf(false) }

    // CRUD dialog states
    var activeSiswaForEdit by remember { mutableStateOf<SiswaDetail?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var activeSiswaForDetail by remember { mutableStateOf<SiswaDetail?>(null) }

    // Bulk selection states
    var selectedIds by remember { mutableStateOf(emptySet<String>()) }
    var showConfirmDeleteMultiple by remember { mutableStateOf(false) }

    val isAllSelected = remember(siswas, selectedIds) {
        siswas.isNotEmpty() && siswas.all { selectedIds.contains(it.id) }
    }

    val tahunPelajaranList by viewModel.tahunPelajaranList.collectAsState()
    val semesterList by viewModel.semesterList.collectAsState()

    val hardeningStandards = remember {
        listOf(
            HardeningStandard(
                id = "fault_tolerance",
                name = "Isolasi Kesalahan (Fault Isolation)",
                description = "Membungkus list utama siswa dengan Error Boundary / state handling aman sehingga kegagalan network/API tidak mematikan fitur sidebar/navigasi.",
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
                description = "Penyaringan data, visualisasi, dan perulangan baris menggunakan key (siswa.id) di dalam Jetpack Compose untuk meredam pemuatan ulang DOM/Canvas berlebihan.",
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

    // Map filters dropdown options
    val kelasOptions = remember(kelasList) {
        val list = mutableListOf(DropdownOption("Semua Kelas", ""))
        list.addAll(kelasList.map { DropdownOption(it.nama_kelas, it.id) })
        list
    }

    val statusOptions = listOf(
        DropdownOption("Semua Status", ""),
        DropdownOption("Aktif", "AKTIF"),
        DropdownOption("Nonaktif", "NON_AKTIF"),
        DropdownOption("Mutasi", "MUTASI"),
        DropdownOption("Lulus", "LULUS")
    )

    val genderOptions = listOf(
        DropdownOption("Semua Gender", ""),
        DropdownOption("Laki-laki", "L"),
        DropdownOption("Perempuan", "P")
    )

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(siswas) {
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
                                Text("Data Siswa", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(
                                    text = "Akademik • Master Data",
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
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali")
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
                            // Toggle View Button (Card vs Table)
                            IconButton(onClick = { isTableView = !isTableView }) {
                                Icon(
                                    imageVector = if (isTableView) Icons.Default.Face else Icons.Default.List,
                                    contentDescription = "Ubah Tampilan",
                                    tint = Color.White
                                )
                            }

                            // Delete All Button (only for users with edit/create permissions, and list is not empty)
                            if (canEdit && siswas.isNotEmpty()) {
                                IconButton(onClick = { showConfirmDeleteAll = true }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus Semua", tint = Color.White)
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
            if (canCreate) {
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Siswa")
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
            // Stats Section (1 Row with 4 compact cards)
            if (canView) {
                item {
                    val totalSiswa = stats?.total_siswa ?: 0
                    val nonaktifCount = remember(totalSiswa, activeSiswaCount) {
                        java.lang.Math.max(0, totalSiswa - activeSiswaCount)
                    }
                    val unregisteredCount = remember(activeSiswaCount, registeredCount) {
                        if (registeredCount != null) java.lang.Math.max(0, activeSiswaCount - registeredCount!!) else 0
                    }
                    val isComplete = registeredCount != null && unregisteredCount == 0

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        ReusableStatsCard(
                            title = if (isIsolatedScope) "Siswa Kelas" else "Total Siswa",
                            value = if (isLoadingStats) "..." else totalSiswa.toString(),
                            icon = Icons.Default.Person,
                            gradientColors = listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                            modifier = Modifier.weight(1f),
                            isCompact = true
                        )
                        ReusableStatsCard(
                            title = "Siswa Aktif",
                            value = if (isLoadingStats) "..." else activeSiswaCount.toString(),
                            icon = Icons.Default.Face,
                            gradientColors = listOf(Color(0xFF10B981), Color(0xFF14B8A6)),
                            modifier = Modifier.weight(1f),
                            isCompact = true
                        )
                        ReusableStatsCard(
                            title = "Nonaktif",
                            value = if (isLoadingStats) "..." else nonaktifCount.toString(),
                            icon = Icons.Default.Info,
                            gradientColors = listOf(Color(0xFF94A3B8), Color(0xFF64748B)),
                            modifier = Modifier.weight(1f),
                            isCompact = true
                        )
                        ReusableStatsCard(
                            title = if (isComplete) "Registrasi" else "B. Registrasi",
                            value = if (isLoadingStats) "..." else (if (isComplete) "Lengkap" else unregisteredCount.toString()),
                            icon = Icons.Default.CheckCircle,
                            gradientColors = if (isComplete) {
                                listOf(Color(0xFF10B981), Color(0xFF14B8A6))
                            } else {
                                listOf(Color(0xFFF59E0B), Color(0xFFD97706))
                            },
                            modifier = Modifier.weight(1f),
                            isCompact = true,
                            onClick = onNavigateToRegistrasiSiswa
                        )
                    }
                }
            }

            if (canView) {
                item {
                    HardeningInspector(
                        moduleKey = "academic_siswa",
                        pageDisplayName = "Database Master Siswa (Akademik)",
                        standards = hardeningStandards,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 2.dp, vertical = 4.dp)
                    )
                }
            }

            // Filters Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            "Filter & Pencarian",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )

                        SearchTextField(
                            value = searchQuery,
                            onValueChange = { viewModel.searchQuery.value = it },
                            placeholder = "Cari nama atau NIS siswa..."
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Don't show kelas filter to Wali Kelas since they are locked to their own class
                            if (!isIsolatedScope) {
                                FilterDropdown(
                                    selectedValue = filterKelasId,
                                    options = kelasOptions,
                                    onValueChange = { viewModel.filterKelasId.value = it },
                                    placeholder = "Kelas",
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            
                            FilterDropdown(
                                selectedValue = filterStatus,
                                options = statusOptions,
                                onValueChange = { viewModel.filterStatus.value = it },
                                placeholder = "Status",
                                modifier = Modifier.weight(1f)
                            )
                        }

                        FilterDropdown(
                            selectedValue = filterGender,
                            options = genderOptions,
                            onValueChange = { viewModel.filterGender.value = it },
                            placeholder = "Jenis Kelamin",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // List or Loading/Empty States
            if (!canView) {
                item {
                    Text(
                        text = "Anda tidak memiliki akses untuk melihat daftar siswa.",
                        color = Color.Red,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(32.dp)
                    )
                }
            } else if (isLoading && siswas.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else if (siswas.isEmpty()) {
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
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Tidak Ada Data",
                                tint = Color.Gray,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Siswa Tidak Ditemukan",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color(0xFF1E293B)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Coba ubah kata kunci atau bersihkan filter pencarian.",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            } else if (isTableView) {
                // Table View Representation
                item {
                        SiswaTable(
                            siswas = siswas,
                            selectedIds = selectedIds,
                            onSelectionChange = { id, checked ->
                                selectedIds = if (checked) selectedIds + id else selectedIds - id
                            },
                            onToggleSelectAll = {
                                if (isAllSelected) {
                                    selectedIds = selectedIds - siswas.map { it.id }.toSet()
                                } else {
                                    selectedIds = selectedIds + siswas.map { it.id }.toSet()
                                }
                            },
                            isAllSelected = isAllSelected,
                            currentPage = currentPage,
                            itemsPerPage = limitVal,
                            canEdit = canEdit,
                            canSendAccess = canSendAccess,
                            onViewDetail = { siswa ->
                                activeSiswaForDetail = siswa
                            },
                            onEdit = { siswa ->
                                activeSiswaForEdit = siswa
                            },
                            onSendAccess = { siswa ->
                                viewModel.sendParentAccess(siswa.id,
                                    onSuccess = { name, phone ->
                                        Toast.makeText(context, "Akses WA berhasil dikirim ke Orang Tua $name ($phone)", Toast.LENGTH_LONG).show()
                                    },
                                    onError = { error ->
                                        Toast.makeText(context, error, Toast.LENGTH_SHORT).show()
                                    }
                                )
                            },
                            onDelete = { siswa ->
                                siswaToDelete = siswa
                            }
                        )
                    }
                } else {
                    // Card View List (Default)
                    items(siswas, key = { it.id }) { siswa ->
                        SiswaCardItem(
                            siswa = siswa,
                            isSelected = selectedIds.contains(siswa.id),
                            onSelectionChange = { checked ->
                                selectedIds = if (checked) selectedIds + siswa.id else selectedIds - siswa.id
                            },
                            canEdit = canEdit,
                            canSendAccess = canSendAccess,
                            onViewDetail = {
                                activeSiswaForDetail = siswa
                            },
                            onEdit = {
                                activeSiswaForEdit = siswa
                            },
                            onSendAccess = {
                                viewModel.sendParentAccess(siswa.id,
                                    onSuccess = { name, phone ->
                                        Toast.makeText(context, "Akses WA berhasil dikirim ke Orang Tua $name ($phone)", Toast.LENGTH_LONG).show()
                                    },
                                    onError = { error ->
                                        Toast.makeText(context, error, Toast.LENGTH_SHORT).show()
                                    }
                                )
                            },
                            onDelete = {
                                siswaToDelete = siswa
                            }
                        )
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
                            // Left: Total items
                            Text(
                                text = "Total: $totalItems Siswa",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF64748B)
                            )

                            // Middle: Previous / Page Info / Next
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                IconButton(
                                    onClick = { viewModel.fetchSiswaList(currentPage - 1) },
                                    enabled = currentPage > 1,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
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
                                    onClick = { viewModel.fetchSiswaList(currentPage + 1) },
                                    enabled = currentPage < totalPages,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                        contentDescription = "Berikutnya",
                                        tint = if (currentPage < totalPages) Color(0xFF1E3C72) else Color.Gray.copy(alpha = 0.5f)
                                    )
                                }
                            }

                            // Right: Limit Selector Dropdown
                            var limitExpanded by remember { mutableStateOf(false) }
                            val limitVal by viewModel.itemsPerPage.collectAsState()

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
                                    listOf(5, 10, 25, 50, 100).forEach { limitOption ->
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

    // Modal Delete Single
    siswaToDelete?.let { siswa ->
        ConfirmDialog(
            title = "Hapus Siswa",
            description = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus data siswa ${siswa.nama_siswa}? Tindakan ini tidak dapat dibatalkan.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            isDanger = true,
            onConfirm = {
                viewModel.deleteSiswa(siswa.id,
                    onSuccess = {
                        Toast.makeText(context, "Siswa berhasil dihapus", Toast.LENGTH_SHORT).show()
                        siswaToDelete = null
                    },
                    onError = { error ->
                        Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                        siswaToDelete = null
                    }
                )
            },
            onDismiss = { siswaToDelete = null }
        )
    }

    // Modal Delete All
    if (showConfirmDeleteAll) {
        ConfirmDialog(
            title = "Hapus Semua Siswa",
            description = {
                Text(
                    text = "PERINGATAN! Anda akan menghapus SELURUH data siswa dari sistem. Tindakan ini sangat berbahaya dan tidak dapat dibatalkan.",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFEF4444)
                )
            },
            confirmText = "Hapus Semua",
            cancelText = "Batal",
            isDanger = true,
            onConfirm = {
                viewModel.deleteAllSiswa(
                    onSuccess = {
                        Toast.makeText(context, "Semua siswa berhasil dihapus", Toast.LENGTH_SHORT).show()
                        showConfirmDeleteAll = false
                    },
                    onError = { error ->
                        Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                        showConfirmDeleteAll = false
                    }
                )
            },
            onDismiss = { showConfirmDeleteAll = false }
        )
    }

    // Modal Delete Multiple
    if (showConfirmDeleteMultiple) {
        ConfirmDialog(
            title = "Hapus Siswa Terpilih",
            description = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus ${selectedIds.size} data siswa terpilih? Tindakan ini tidak dapat dibatalkan.",
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmText = "Hapus",
            cancelText = "Batal",
            isDanger = true,
            onConfirm = {
                viewModel.deleteMultipleSiswa(
                    ids = selectedIds.toList(),
                    onSuccess = { succeeded, failed ->
                        Toast.makeText(context, "Berhasil menghapus $succeeded siswa. Gagal: $failed", Toast.LENGTH_LONG).show()
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

    // Modal Create Siswa
    if (showCreateDialog) {
        SiswaFormDialog(
            siswa = null,
            kelasList = kelasList,
            tahunPelajaranList = tahunPelajaranList,
            semesterList = semesterList,
            onDismiss = { showCreateDialog = false },
            onSave = { payload ->
                viewModel.createSiswa(payload,
                    onSuccess = {
                        Toast.makeText(context, "Siswa baru berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                        showCreateDialog = false
                    },
                    onError = { error ->
                        Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                    }
                )
            }
        )
    }

    // Modal Edit Siswa
    activeSiswaForEdit?.let { siswa ->
        SiswaFormDialog(
            siswa = siswa,
            kelasList = kelasList,
            tahunPelajaranList = tahunPelajaranList,
            semesterList = semesterList,
            onDismiss = { activeSiswaForEdit = null },
            onSave = { payload ->
                viewModel.updateSiswa(siswa.id, payload,
                    onSuccess = {
                        Toast.makeText(context, "Data siswa berhasil diperbarui", Toast.LENGTH_SHORT).show()
                        activeSiswaForEdit = null
                    },
                    onError = { error ->
                        Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                    }
                )
            }
        )
    }

    // Modal Detail Siswa
    activeSiswaForDetail?.let { siswa ->
        SiswaDetailDialog(
            siswa = siswa,
            viewModel = viewModel,
            onDismiss = { activeSiswaForDetail = null }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiswaDetailDialog(
    siswa: SiswaDetail,
    viewModel: SiswaListViewModel,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Tutup", color = Color(0xFF1E3C72), fontWeight = FontWeight.Bold)
            }
        },
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Circle Avatar
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(
                            Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF8B5CF6))),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    val initial = if (siswa.nama_siswa.isNotEmpty()) siswa.nama_siswa.take(1).uppercase() else "?"
                    Text(
                        text = initial,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = Color.White
                    )
                }

                Column {
                    Text(
                        text = siswa.nama_siswa,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = siswa.Kelas?.nama_kelas ?: "Tanpa Kelas",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                }
            }
        },
        text = {
            var selectedTab by remember { mutableStateOf(0) }
            val tabs = listOf("Profil & Wali", "Linimasa & Keluar")

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = Color(0xFF1E3C72),
                    modifier = Modifier.padding(bottom = 4.dp)
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = { Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                    }
                }

                if (selectedTab == 0) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 420.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Status Badge Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Status Siswa",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF64748B)
                            )

                            val statusColor = when (siswa.status.uppercase()) {
                                "AKTIF" -> Color(0xFF10B981)
                                "NON_AKTIF" -> Color(0xFFEF4444)
                                "MUTASI" -> Color(0xFFF59E0B)
                                "LULUS" -> Color(0xFF3B82F6)
                                else -> Color(0xFF64748B)
                            }

                            Surface(
                                color = statusColor.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = siswa.status,
                                    color = statusColor,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        HorizontalDivider(color = Color(0xFFF1F5F9))

                        // Section 1: Identitas Diri
                        Text(
                            text = "IDENTITAS DIRI",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF475569)
                        )

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DetailRow(label = "NIS / NISN", value = "${siswa.nis} / ${siswa.nisn ?: "-"}")
                            DetailRow(
                                label = "Jenis Kelamin",
                                value = if (siswa.jenis_kelamin.uppercase() == "L") "Laki-laki" else "Perempuan"
                            )
                            DetailRow(
                                label = "Tempat, Tanggal Lahir",
                                value = "${siswa.tempat_lahir ?: "-"}, ${siswa.tanggal_lahir ?: "-"}"
                            )
                            DetailRow(label = "No. RFID", value = siswa.no_rfid ?: "Belum ada RFID")
                            DetailRow(label = "Email Akun", value = siswa.User?.email ?: "Belum terdaftar email")
                        }

                        HorizontalDivider(color = Color(0xFFF1F5F9))

                        // Section 2: Kontak & Alamat
                        Text(
                            text = "KONTAK & ALAMAT",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF475569)
                        )

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DetailRow(label = "No. HP", value = siswa.no_hp ?: "-")
                            DetailRow(label = "Alamat", value = siswa.alamat ?: "-")
                        }

                        HorizontalDivider(color = Color(0xFFF1F5F9))

                        // Section 3: Orang Tua / Wali
                        Text(
                            text = "ORANG TUA / WALI",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF475569)
                        )

                        if (siswa.OrangTua.isNullOrEmpty()) {
                            Text(
                                text = "Data orang tua belum diatur.",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                style = androidx.compose.ui.text.TextStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                            )
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                siswa.OrangTua.forEach { ortu ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
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
                                                    text = ortu.nama,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFF1E293B)
                                                )
                                                Text(
                                                    text = ortu.hubungan ?: "Orang Tua/Wali",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF64748B)
                                                )
                                                Text(
                                                    text = ortu.no_hp ?: "No. HP -",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF475569),
                                                    modifier = Modifier.padding(top = 2.dp)
                                                )
                                            }

                                            if (!ortu.no_hp.isNullOrBlank()) {
                                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    // Call Button
                                                    IconButton(
                                                        onClick = {
                                                            try {
                                                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${ortu.no_hp}"))
                                                                context.startActivity(intent)
                                                            } catch (e: Exception) {
                                                                Toast.makeText(context, "Gagal melakukan panggilan", Toast.LENGTH_SHORT).show()
                                                            }
                                                        },
                                                        modifier = Modifier.size(32.dp)
                                                    ) {
                                                        Icon(
                                                            imageVector = Icons.Default.Phone,
                                                            contentDescription = "Panggil",
                                                            tint = Color(0xFF3B82F6),
                                                            modifier = Modifier.size(18.dp)
                                                        )
                                                    }

                                                    // WA Button
                                                    IconButton(
                                                        onClick = {
                                                            try {
                                                                val formattedPhone = if (ortu.no_hp.startsWith("0")) {
                                                                    "62" + ortu.no_hp.substring(1)
                                                                } else {
                                                                    ortu.no_hp
                                                                }
                                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://api.whatsapp.com/send?phone=$formattedPhone"))
                                                                context.startActivity(intent)
                                                            } catch (e: Exception) {
                                                                Toast.makeText(context, "Gagal membuka WhatsApp", Toast.LENGTH_SHORT).show()
                                                            }
                                                        },
                                                        modifier = Modifier.size(32.dp)
                                                    ) {
                                                        Icon(
                                                            imageVector = Icons.AutoMirrored.Filled.Send,
                                                            contentDescription = "WhatsApp",
                                                            tint = Color(0xFF10B981),
                                                            modifier = Modifier.size(18.dp)
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
                } else {
                    // Tab 1: Linimasa & Berkas Keluar
                    SiswaTimelineAndExitTab(
                        siswa = siswa,
                        viewModel = viewModel
                    )
                }
            }
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White
    )
}

@Composable
fun DetailRow(label: String, value: String) {
    Column {
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF94A3B8)
        )
        Text(
            text = value,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF334155)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiswaFormDialog(
    siswa: SiswaDetail?,
    kelasList: List<KelasDetail>,
    tahunPelajaranList: List<TahunPelajaranDetail>,
    semesterList: List<SemesterDetail>,
    onDismiss: () -> Unit,
    onSave: (Map<String, Any?>) -> Unit
) {
    var namaSiswa by remember { mutableStateOf(siswa?.nama_siswa ?: "") }
    var nis by remember { mutableStateOf(siswa?.nis ?: "") }
    var nisn by remember { mutableStateOf(siswa?.nisn ?: "") }
    var jenisKelamin by remember { mutableStateOf(siswa?.jenis_kelamin ?: "L") }
    var kelasId by remember { mutableStateOf(siswa?.kelas_id ?: siswa?.Kelas?.id ?: "") }
    var status by remember { mutableStateOf(siswa?.status ?: "AKTIF") }
    var noRfid by remember { mutableStateOf(siswa?.no_rfid ?: "") }
    var noHp by remember { mutableStateOf(siswa?.no_hp ?: "") }
    var alamat by remember { mutableStateOf(siswa?.alamat ?: "") }
    var tempatLahir by remember { mutableStateOf(siswa?.tempat_lahir ?: "") }
    var tanggalLahir by remember { mutableStateOf(siswa?.tanggal_lahir ?: "") }

    val defaultYearId = remember(tahunPelajaranList) {
        siswa?.tahun_pelajaran_id ?: tahunPelajaranList.find { it.is_active }?.id ?: tahunPelajaranList.firstOrNull()?.id ?: ""
    }
    val defaultSemesterId = remember(semesterList) {
        siswa?.semester_id ?: semesterList.find { it.is_active }?.id ?: semesterList.firstOrNull()?.id ?: ""
    }
    var tahunPelajaranId by remember { mutableStateOf(defaultYearId) }
    var semesterId by remember { mutableStateOf(defaultSemesterId) }

    val isFormValid = namaSiswa.isNotBlank() && nis.isNotBlank() && kelasId.isNotBlank() &&
            tahunPelajaranId.isNotBlank() && semesterId.isNotBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = {
                    if (isFormValid) {
                        val payload = mutableMapOf<String, Any?>(
                            "nama_siswa" to namaSiswa.trim(),
                            "nis" to nis.trim(),
                            "nisn" to nisn.trim().takeIf { it.isNotEmpty() },
                            "jenis_kelamin" to jenisKelamin,
                            "kelas_id" to kelasId,
                            "status" to status,
                            "no_rfid" to noRfid.trim().takeIf { it.isNotEmpty() },
                            "no_hp" to noHp.trim().takeIf { it.isNotEmpty() },
                            "alamat" to alamat.trim().takeIf { it.isNotEmpty() },
                            "tempat_lahir" to tempatLahir.trim().takeIf { it.isNotEmpty() },
                            "tanggal_lahir" to tanggalLahir.trim().takeIf { it.isNotEmpty() },
                            "tahun_pelajaran_id" to tahunPelajaranId,
                            "semester_id" to semesterId
                        )
                        onSave(payload)
                    }
                },
                enabled = isFormValid,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
            ) {
                Text("Simpan", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal", color = Color(0xFF64748B))
            }
        },
        title = {
            Text(
                text = if (siswa == null) "Tambah Siswa Baru" else "Edit Data Siswa",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color(0xFF1E293B)
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    "IDENTITAS DIRI",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    modifier = Modifier.padding(top = 4.dp)
                )

                OutlinedTextField(
                    value = namaSiswa,
                    onValueChange = { namaSiswa = it },
                    label = { Text("Nama Lengkap *") },
                    placeholder = { Text("Masukkan nama lengkap") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = nis,
                        onValueChange = { nis = it },
                        label = { Text("NIS *") },
                        placeholder = { Text("NIS") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = nisn,
                        onValueChange = { nisn = it },
                        label = { Text("NISN") },
                        placeholder = { Text("NISN") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                Text(
                    "Jenis Kelamin *",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF475569)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val genderOptionsList = listOf(
                        DropdownOption("Laki-laki (L)", "L"),
                        DropdownOption("Perempuan (P)", "P")
                    )
                    genderOptionsList.forEach { option ->
                        val isSelected = jenisKelamin == option.value
                        OutlinedButton(
                            onClick = { jenisKelamin = option.value },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isSelected) Color(0xFF1E3C72).copy(alpha = 0.08f) else Color.Transparent,
                                contentColor = if (isSelected) Color(0xFF1E3C72) else Color(0xFF475569)
                            ),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                width = if (isSelected) 2.dp else 1.dp,
                                brush = Brush.linearGradient(
                                    listOf(
                                        if (isSelected) Color(0xFF1E3C72) else Color(0xFFCBD5E1),
                                        if (isSelected) Color(0xFF2A5298) else Color(0xFFCBD5E1)
                                    )
                                )
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(option.label, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium)
                        }
                    }
                }

                HorizontalDivider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(vertical = 4.dp))

                Text(
                    "INFORMASI AKADEMIK",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )

                val kelasDropdownOptions = kelasList.map { DropdownOption(it.nama_kelas, it.id) }
                Text("Kelas *", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFF475569))
                FilterDropdown(
                    selectedValue = kelasId,
                    options = kelasDropdownOptions,
                    onValueChange = { kelasId = it },
                    placeholder = "Pilih Kelas",
                    modifier = Modifier.fillMaxWidth()
                )

                val statusDropdownOptions = listOf(
                    DropdownOption("Aktif", "AKTIF"),
                    DropdownOption("Nonaktif", "NON_AKTIF"),
                    DropdownOption("Mutasi", "MUTASI"),
                    DropdownOption("Lulus", "LULUS")
                )
                Text("Status *", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFF475569))
                FilterDropdown(
                    selectedValue = status,
                    options = statusDropdownOptions,
                    onValueChange = { status = it },
                    placeholder = "Pilih Status",
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = noRfid,
                    onValueChange = { noRfid = it },
                    label = { Text("No. RFID (Opsional)") },
                    placeholder = { Text("Masukkan RFID card") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                val tpOptions = tahunPelajaranList.map { DropdownOption(it.tahun, it.id) }
                Text("Tahun Pelajaran *", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFF475569))
                FilterDropdown(
                    selectedValue = tahunPelajaranId,
                    options = tpOptions,
                    onValueChange = { tahunPelajaranId = it },
                    placeholder = "Pilih Tahun Pelajaran",
                    modifier = Modifier.fillMaxWidth()
                )

                val semOptions = semesterList.map { DropdownOption(it.nama_semester, it.id) }
                Text("Semester *", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFF475569))
                FilterDropdown(
                    selectedValue = semesterId,
                    options = semOptions,
                    onValueChange = { semesterId = it },
                    placeholder = "Pilih Semester",
                    modifier = Modifier.fillMaxWidth()
                )

                HorizontalDivider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(vertical = 4.dp))

                Text(
                    "KONTAK & DETIL LAINNYA",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )

                OutlinedTextField(
                    value = noHp,
                    onValueChange = { noHp = it },
                    label = { Text("No. HP") },
                    placeholder = { Text("08...") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = tempatLahir,
                    onValueChange = { tempatLahir = it },
                    label = { Text("Tempat Lahir") },
                    placeholder = { Text("Tempat lahir") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = tanggalLahir,
                    onValueChange = { tanggalLahir = it },
                    label = { Text("Tanggal Lahir (YYYY-MM-DD)") },
                    placeholder = { Text("Format: YYYY-MM-DD") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = alamat,
                    onValueChange = { alamat = it },
                    label = { Text("Alamat") },
                    placeholder = { Text("Alamat tinggal") },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White
    )
}

@Composable
fun SiswaTable(
    siswas: List<SiswaDetail>,
    selectedIds: Set<String>,
    onSelectionChange: (String, Boolean) -> Unit,
    onToggleSelectAll: () -> Unit,
    isAllSelected: Boolean,
    currentPage: Int,
    itemsPerPage: Int,
    canEdit: Boolean,
    canSendAccess: Boolean,
    onViewDetail: (SiswaDetail) -> Unit,
    onEdit: (SiswaDetail) -> Unit,
    onSendAccess: (SiswaDetail) -> Unit,
    onDelete: (SiswaDetail) -> Unit
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
                    // Header Checkbox column
                    Box(
                        modifier = Modifier.width(36.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        CustomCheckbox(
                            checked = isAllSelected,
                            onCheckedChange = { onToggleSelectAll() }
                        )
                    }
                    
                    Text(text = "No", modifier = Modifier.width(30.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Nama / NIS", modifier = Modifier.width(160.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Kelas", modifier = Modifier.width(80.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "JK", modifier = Modifier.width(40.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Status", modifier = Modifier.width(80.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569))
                    Text(text = "Aksi", modifier = Modifier.width(140.dp), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF475569), textAlign = TextAlign.Center)
                }
                
                // Table Body Rows (optimized using stable key block for performance hardening)
                siswas.forEachIndexed { index, siswa ->
                    val rowNum = (currentPage - 1) * itemsPerPage + index + 1
                    key(siswa.id) {
                        SiswaTableRow(
                            rowNum = rowNum,
                            siswa = siswa,
                            isSelected = selectedIds.contains(siswa.id),
                            onSelectionChange = { checked -> onSelectionChange(siswa.id, checked) },
                            canEdit = canEdit,
                            canSendAccess = canSendAccess,
                            onViewDetail = { onViewDetail(siswa) },
                            onEdit = { onEdit(siswa) },
                            onSendAccess = { onSendAccess(siswa) },
                            onDelete = { onDelete(siswa) }
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
fun SiswaTableRow(
    rowNum: Int,
    siswa: SiswaDetail,
    isSelected: Boolean,
    onSelectionChange: (Boolean) -> Unit,
    canEdit: Boolean,
    canSendAccess: Boolean,
    onViewDetail: () -> Unit,
    onEdit: () -> Unit,
    onSendAccess: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier
            .padding(vertical = 10.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Row Checkbox column
        Box(
            modifier = Modifier.width(36.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            CustomCheckbox(
                checked = isSelected,
                onCheckedChange = onSelectionChange
            )
        }

        Text(
            text = rowNum.toString(),
            modifier = Modifier.width(30.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF475569)
        )
        
        Column(modifier = Modifier.width(160.dp)) {
            Text(
                text = siswa.nama_siswa,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = Color(0xFF1E293B),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = siswa.nis,
                fontSize = 10.sp,
                color = Color(0xFF64748B)
            )
        }
        
        Text(
            text = siswa.Kelas?.nama_kelas ?: "-",
            modifier = Modifier.width(80.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155)
        )
        
        Text(
            text = siswa.jenis_kelamin,
            modifier = Modifier.width(40.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155)
        )
        
        val statusColor = when (siswa.status.uppercase()) {
            "AKTIF" -> Color(0xFF10B981)
            "NON_AKTIF" -> Color(0xFFEF4444)
            "MUTASI" -> Color(0xFFF59E0B)
            "LULUS" -> Color(0xFF3B82F6)
            else -> Color(0xFF64748B)
        }
        
        Box(modifier = Modifier.width(80.dp)) {
            Surface(
                color = statusColor.copy(alpha = 0.12f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = siswa.status,
                    color = statusColor,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    textAlign = TextAlign.Center
                )
            }
        }
        
        Row(
            modifier = Modifier.width(140.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onViewDetail, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Info, contentDescription = "Detail", tint = Color(0xFF3B82F6), modifier = Modifier.size(16.dp))
            }
            if (canSendAccess) {
                IconButton(onClick = onSendAccess, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "WA", tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                }
            }
            if (canEdit) {
                IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
fun SiswaCardItem(
    siswa: SiswaDetail,
    isSelected: Boolean,
    onSelectionChange: (Boolean) -> Unit,
    canEdit: Boolean,
    canSendAccess: Boolean,
    onViewDetail: () -> Unit,
    onEdit: () -> Unit,
    onSendAccess: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val statusColor = when (siswa.status.uppercase()) {
        "AKTIF" -> Color(0xFF10B981)
        "NON_AKTIF" -> Color(0xFFEF4444)
        "MUTASI" -> Color(0xFFF59E0B)
        "LULUS" -> Color(0xFF3B82F6)
        else -> Color(0xFF64748B)
    }

    val genderText = when (siswa.jenis_kelamin.uppercase()) {
        "L" -> "Laki-laki"
        "P" -> "Perempuan"
        else -> siswa.jenis_kelamin
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header Row: Avatar, Name & Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Card check box column
                    CustomCheckbox(
                        checked = isSelected,
                        onCheckedChange = onSelectionChange
                    )
                    
                    Spacer(modifier = Modifier.width(10.dp))

                    // Circle Avatar
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color(0xFFE2E8F0), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        val initial = if (siswa.nama_siswa.isNotEmpty()) siswa.nama_siswa.take(1).uppercase() else "?"
                        Text(
                            text = initial,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color(0xFF475569)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = siswa.nama_siswa,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color(0xFF1E293B)
                        )
                        Text(
                            text = siswa.User?.email ?: "Belum ada email",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }

                // Status Badge
                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = siswa.status,
                        color = statusColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Body Info: Grid NIS/NISN, Kelas, Gender, RFID
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    InfoLabelValue(
                        label = "NIS / NISN",
                        value = "${siswa.nis} / ${siswa.nisn ?: "-"}",
                        modifier = Modifier.weight(1f)
                    )
                    InfoLabelValue(
                        label = "Kelas",
                        value = siswa.Kelas?.nama_kelas ?: "-",
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(modifier = Modifier.fillMaxWidth()) {
                    InfoLabelValue(
                        label = "Jenis Kelamin",
                        value = genderText,
                        modifier = Modifier.weight(1f)
                    )
                    InfoLabelValue(
                        label = "No. RFID",
                        value = siswa.no_rfid ?: "Belum Ada RFID",
                        modifier = Modifier.weight(1f),
                        isItalicIfEmpty = siswa.no_rfid == null
                    )
                }
            }

            HorizontalDivider(color = Color(0xFFF1F5F9))

            // Footer Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Aksi: Eye Icon for Detail
                IconButton(onClick = onViewDetail) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Detail Siswa",
                        tint = Color(0xFF3B82F6)
                    )
                }

                // Right Aksi: Send WA, Edit, Delete
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (canSendAccess) {
                        IconButton(onClick = onSendAccess) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Kirim Akses Ortu",
                                tint = Color(0xFF10B981)
                            )
                        }
                    }

                    if (canEdit) {
                        IconButton(onClick = onEdit) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit Siswa",
                                tint = Color(0xFFF59E0B)
                            )
                        }

                        IconButton(onClick = onDelete) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Hapus Siswa",
                                tint = Color(0xFFEF4444)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InfoLabelValue(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    isItalicIfEmpty: Boolean = false
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            fontSize = 10.sp,
            color = Color(0xFF94A3B8),
            fontWeight = FontWeight.Medium
        )
        Text(
            text = value,
            fontSize = 12.sp,
            color = if (isItalicIfEmpty) Color(0xFF94A3B8) else Color(0xFF334155),
            fontWeight = FontWeight.SemiBold,
            style = LocalTextStyle.current.copy(
                fontStyle = if (isItalicIfEmpty) androidx.compose.ui.text.font.FontStyle.Italic else androidx.compose.ui.text.font.FontStyle.Normal
            )
        )
    }
}

@Composable
fun SiswaTimelineAndExitTab(
    siswa: SiswaDetail,
    viewModel: SiswaListViewModel
) {
    val context = LocalContext.current
    val timeline by viewModel.timeline.collectAsState()
    val isLoadingTimeline by viewModel.isLoadingTimeline.collectAsState()
    val timelineError by viewModel.timelineError.collectAsState()
    val canManage by viewModel.canManage.collectAsState()

    // Trigger timeline loading
    LaunchedEffect(siswa.id) {
        viewModel.fetchSiswaTimeline(siswa.id)
    }

    // States for upload dialog
    var showUploadDocDialog by remember { mutableStateOf(false) }
    var uploadDocTitle by remember { mutableStateOf("") }
    var uploadDocCategory by remember { mutableStateOf("SURAT_PERINGATAN") }
    var selectedDocUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var selectedDocName by remember { mutableStateOf<String?>(null) }
    var isUploadingDoc by remember { mutableStateOf(false) }

    // States for complete exit dialog
    var showExitDialog by remember { mutableStateOf(false) }
    var exitStatus by remember { mutableStateOf("KELUAR") }
    var exitReason by remember { mutableStateOf("") }
    var selectedExitUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var selectedExitName by remember { mutableStateOf<String?>(null) }
    var isCompletingExit by remember { mutableStateOf(false) }

    val docFilePicker = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        uri?.let {
            selectedDocUri = it
            selectedDocName = getFileNameFromUri(context, it)
        }
    }

    val exitFilePicker = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        uri?.let {
            selectedExitUri = it
            selectedExitName = getFileNameFromUri(context, it)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 450.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Active Status indicator and Zip Download
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Status Terkini", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                        Text(
                            text = siswa.status,
                            fontSize = 14.sp,
                            color = when (siswa.status.uppercase()) {
                                "AKTIF" -> Color(0xFF10B981)
                                "NON_AKTIF" -> Color(0xFFEF4444)
                                "KELUAR", "MUTASI", "PINDAH", "DO" -> Color(0xFFEF4444)
                                "LULUS" -> Color(0xFF3B82F6)
                                else -> Color(0xFF64748B)
                            },
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Zip download button
                    Button(
                        onClick = {
                            val zipName = "Exit_Bundle_${siswa.nama_siswa.replace(" ", "_")}.zip"
                            viewModel.downloadExitBundle(
                                siswaId = siswa.id,
                                fileName = zipName,
                                onSuccess = { file ->
                                    // Open ZIP or show success toast
                                    (context as android.app.Activity).runOnUiThread {
                                        Toast.makeText(context, "Unduh berhasil: ${file.name}", Toast.LENGTH_LONG).show()
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW)
                                            val fileUri = androidx.core.content.FileProvider.getUriForFile(
                                                context,
                                                "${context.packageName}.fileprovider",
                                                file
                                            )
                                            intent.setDataAndType(fileUri, "application/zip")
                                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                            context.startActivity(intent)
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "File disimpan di folder Unduhan", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                onError = { err ->
                                    (context as android.app.Activity).runOnUiThread {
                                        Toast.makeText(context, "Gagal mengunduh ZIP: $err", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Unduh Bundel (ZIP)", fontSize = 11.sp, color = Color.White)
                    }
                }

                // Operator Actions Panel
                if (canManage && siswa.status.uppercase() == "AKTIF") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Upload doc button
                        OutlinedButton(
                            onClick = {
                                selectedDocUri = null
                                selectedDocName = null
                                uploadDocTitle = ""
                                showUploadDocDialog = true
                            },
                            modifier = Modifier.weight(1f).height(36.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("Unggah Lampiran", fontSize = 10.sp)
                        }

                        // Complete Exit Button
                        Button(
                            onClick = {
                                selectedExitUri = null
                                selectedExitName = null
                                exitReason = ""
                                showExitDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                            modifier = Modifier.weight(1f).height(36.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Icon(Icons.Default.ExitToApp, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color.White)
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("Keluarkan Siswa", fontSize = 10.sp, color = Color.White)
                        }
                    }
                }
            }
        }

        // Timeline Items
        if (isLoadingTimeline) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else if (timelineError != null) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(timelineError ?: "Gagal memuat linimasa", color = Color.Red, fontSize = 12.sp, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = { viewModel.fetchSiswaTimeline(siswa.id) }) {
                    Text("Coba Lagi", color = Color(0xFF1E3C72))
                }
            }
        } else if (timeline.isEmpty()) {
            Text(
                "Belum ada data linimasa untuk siswa ini.",
                color = Color.Gray,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                style = androidx.compose.ui.text.TextStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
            )
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                timeline.forEachIndexed { index, item ->
                    TimelineRowItem(
                        item = item,
                        siswaId = siswa.id,
                        canManage = canManage,
                        viewModel = viewModel,
                        isLast = index == timeline.lastIndex
                    )
                }
            }
        }
    }

    // Modal Form Upload Dokumen
    if (showUploadDocDialog) {
        AlertDialog(
            onDismissRequest = { if (!isUploadingDoc) showUploadDocDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        val uri = selectedDocUri
                        if (uploadDocTitle.isNotBlank() && uri != null) {
                            isUploadingDoc = true
                            val filePart = viewModel.getMultipartFromUri(uri, "file")
                            if (filePart != null) {
                                val judulPart = uploadDocTitle.trim().toRequestBody("text/plain".toMediaTypeOrNull())
                                val kategoriPart = uploadDocCategory.toRequestBody("text/plain".toMediaTypeOrNull())
                                viewModel.uploadSiswaDocument(
                                    siswaId = siswa.id,
                                    file = filePart,
                                    judul = judulPart,
                                    kategori = kategoriPart,
                                    onSuccess = {
                                        isUploadingDoc = false
                                        showUploadDocDialog = false
                                        Toast.makeText(context, "Dokumen berhasil diunggah", Toast.LENGTH_SHORT).show()
                                    },
                                    onError = { err ->
                                        isUploadingDoc = false
                                        Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                    }
                                )
                            } else {
                                isUploadingDoc = false
                                Toast.makeText(context, "Gagal memproses file", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(context, "Mohon lengkapi judul dan pilih file", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !isUploadingDoc && uploadDocTitle.isNotBlank() && selectedDocUri != null,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    if (isUploadingDoc) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White)
                    } else {
                        Text("Unggah", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showUploadDocDialog = false }, enabled = !isUploadingDoc) {
                    Text("Batal", color = Color.Gray)
                }
            },
            title = { Text("Unggah Lampiran Baru", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = uploadDocTitle,
                        onValueChange = { uploadDocTitle = it },
                        label = { Text("Judul Dokumen") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Kategori Dropdown / Selector
                    var catExpanded by remember { mutableStateOf(false) }
                    val categories = listOf(
                        "SURAT_PERINGATAN" to "Surat Peringatan (SP)",
                        "LAPORAN_BK" to "Laporan Konseling/BK",
                        "SURAT_PERNYATAAN" to "Surat Pernyataan",
                        "LAINNYA" to "Dokumen Lainnya"
                    )

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { catExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val currentCatLabel = categories.find { it.first == uploadDocCategory }?.second ?: uploadDocCategory
                                Text(currentCatLabel, color = Color.Black)
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }

                        DropdownMenu(expanded = catExpanded, onDismissRequest = { catExpanded = false }) {
                            categories.forEach { (key, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        uploadDocCategory = key
                                        catExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // File picker indicator/button
                    Button(
                        onClick = { docFilePicker.launch("application/pdf,image/*") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Gray),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(selectedDocName ?: "Pilih Berkas (PDF/Gambar)", color = Color.White)
                    }
                }
            }
        )
    }

    // Modal Form Selesaikan Proses Keluar
    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { if (!isCompletingExit) showExitDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        val uri = selectedExitUri
                        if (uri != null) {
                            isCompletingExit = true
                            val filePart = viewModel.getMultipartFromUri(uri, "file")
                            if (filePart != null) {
                                val statusPart = exitStatus.toRequestBody("text/plain".toMediaTypeOrNull())
                                val alasanPart = exitReason.trim().takeIf { it.isNotEmpty() }?.toRequestBody("text/plain".toMediaTypeOrNull())
                                viewModel.completeSiswaExit(
                                    siswaId = siswa.id,
                                    file = filePart,
                                    status = statusPart,
                                    alasan = alasanPart,
                                    onSuccess = {
                                        isCompletingExit = false
                                        showExitDialog = false
                                        Toast.makeText(context, "Siswa berhasil dinyatakan Keluar resmi", Toast.LENGTH_LONG).show()
                                    },
                                    onError = { err ->
                                        isCompletingExit = false
                                        Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                    }
                                )
                            } else {
                                isCompletingExit = false
                                Toast.makeText(context, "Gagal memproses berkas Dapodik", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(context, "Mohon unggah bukti Dapodik terlebih dahulu", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !isCompletingExit && selectedExitUri != null,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    if (isCompletingExit) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White)
                    } else {
                        Text("Keluarkan Siswa", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }, enabled = !isCompletingExit) {
                    Text("Batal", color = Color.Gray)
                }
            },
            title = { Text("Finalisasi Siswa Keluar", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFFEF4444)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Peringatan: Tindakan ini akan menonaktifkan akun siswa, menghapus RFID, dan mengubah status siswa menjadi KELUAR/MUTASI/DO secara permanen di sistem.",
                        color = Color.Red,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )

                    // Exit Status Dropdown
                    var statusExpanded by remember { mutableStateOf(false) }
                    val statusList = listOf(
                        "KELUAR" to "Keluar (Lainnya)",
                        "MUTASI" to "Pindah / Mutasi",
                        "DO" to "Dikeluarkan / Drop Out"
                    )

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { statusExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val currentLabel = statusList.find { it.first == exitStatus }?.second ?: exitStatus
                                Text(currentLabel, color = Color.Black)
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }

                        DropdownMenu(expanded = statusExpanded, onDismissRequest = { statusExpanded = false }) {
                            statusList.forEach { (key, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        exitStatus = key
                                        statusExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = exitReason,
                        onValueChange = { exitReason = it },
                        label = { Text("Alasan Keluar (Catatan)") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )

                    // Bukti Dapodik Picker
                    Button(
                        onClick = { exitFilePicker.launch("application/pdf,image/*") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.8f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(selectedExitName ?: "Unggah Bukti Dapodik (PDF/Gambar)", color = Color.White)
                    }
                }
            }
        )
    }
}

@Composable
fun TimelineRowItem(
    item: SiswaTimelineItem,
    siswaId: String,
    canManage: Boolean,
    viewModel: SiswaListViewModel,
    isLast: Boolean
) {
    val context = LocalContext.current
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Left Column: Icon & line
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(24.dp)
        ) {
            val icon = when (item.tipe) {
                "STATUS_AKADEMIK" -> Icons.Default.CheckCircle
                "PELANGGARAN" -> Icons.Default.Warning
                "DOKUMEN" -> Icons.Default.Description
                else -> Icons.Default.Info
            }
            val iconColor = when (item.tipe) {
                "STATUS_AKADEMIK" -> Color(0xFF10B981)
                "PELANGGARAN" -> Color(0xFFF59E0B)
                "DOKUMEN" -> Color(0xFF3B82F6)
                else -> Color(0xFF64748B)
            }

            Box(
                modifier = Modifier
                    .size(24.dp)
                    .background(iconColor.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(14.dp))
            }

            if (!isLast) {
                Spacer(
                    modifier = Modifier
                        .width(2.dp)
                        .height(60.dp)
                        .background(Color(0xFFE2E8F0))
                )
            }
        }

        // Right Column: Details Card
        Card(
            modifier = Modifier.weight(1f).padding(bottom = 12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF1F5F9))
        ) {
            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // Header: Title and Date
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.judul,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFF1E293B),
                        modifier = Modifier.weight(1f)
                    )
                    
                    val formattedDate = item.tanggal.take(10) // YYYY-MM-DD
                    Text(
                        text = formattedDate,
                        fontSize = 10.sp,
                        color = Color(0xFF94A3B8)
                    )
                }

                // Description
                Text(
                    text = item.keterangan,
                    fontSize = 11.sp,
                    color = Color(0xFF475569)
                )

                // Extra info based on type
                if (item.tipe == "PELANGGARAN" && item.poin != null) {
                    Text(
                        text = "+${item.poin} Poin Pelanggaran",
                        color = Color(0xFFEF4444),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Attachment links
                if (item.tipe == "DOKUMEN" && !item.file_url.isNullOrEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Clickable File name to trigger download
                        TextButton(
                            onClick = {
                                val fileName = item.file_name ?: "dokumen_${item.id}.pdf"
                                viewModel.downloadDocument(
                                    siswaId = siswaId,
                                    docId = item.id,
                                    fileName = fileName,
                                    onSuccess = { file ->
                                        (context as android.app.Activity).runOnUiThread {
                                            Toast.makeText(context, "Unduh berhasil: ${file.name}", Toast.LENGTH_LONG).show()
                                            try {
                                                val intent = Intent(Intent.ACTION_VIEW)
                                                val mimeType = if (fileName.endsWith(".pdf", ignoreCase = true)) "application/pdf" else "image/*"
                                                val fileUri = androidx.core.content.FileProvider.getUriForFile(
                                                    context,
                                                    "${context.packageName}.fileprovider",
                                                    file
                                                )
                                                intent.setDataAndType(fileUri, mimeType)
                                                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                                context.startActivity(intent)
                                            } catch (e: Exception) {
                                                Toast.makeText(context, "File disimpan di folder Unduhan", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    },
                                    onError = { err ->
                                        (context as android.app.Activity).runOnUiThread {
                                            Toast.makeText(context, "Gagal mengunduh berkas: $err", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                )
                            },
                            contentPadding = PaddingValues(0.dp),
                            modifier = Modifier.height(24.dp)
                        ) {
                            Icon(Icons.Default.Attachment, contentDescription = null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(item.file_name ?: "Unduh Berkas", fontSize = 10.sp, textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline)
                        }

                        // Trash button to delete document (BK, Kesiswaan, Manage)
                        if (canManage) {
                            IconButton(
                                onClick = { showDeleteConfirm = true },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444), modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                // Subtitle: uploaded by
                Text(
                    text = "Oleh: ${item.user_name}",
                    fontSize = 9.sp,
                    color = Color(0xFF94A3B8),
                    style = androidx.compose.ui.text.TextStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                )
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteSiswaDocument(
                            siswaId = siswaId,
                            docId = item.id,
                            onSuccess = {
                                showDeleteConfirm = false
                                Toast.makeText(context, "Dokumen berhasil dihapus", Toast.LENGTH_SHORT).show()
                            },
                            onError = { err ->
                                Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                            }
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Hapus", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Batal", color = Color.Gray)
                }
            },
            title = { Text("Hapus Lampiran", fontWeight = FontWeight.Bold, fontSize = 14.sp) },
            text = { Text("Apakah Anda yakin ingin menghapus lampiran '${item.judul}'? Tindakan ini tidak dapat dibatalkan.", fontSize = 12.sp) }
        )
    }
}

fun getFileNameFromUri(context: android.content.Context, uri: android.net.Uri): String {
    var name = "file"
    val cursor = context.contentResolver.query(uri, null, null, null, null)
    cursor?.use {
        if (it.moveToFirst()) {
            val idx = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (idx != -1) {
                name = it.getString(idx)
            }
        }
    }
    return name
}

