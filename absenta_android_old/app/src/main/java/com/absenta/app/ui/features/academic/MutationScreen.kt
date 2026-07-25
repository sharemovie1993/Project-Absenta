package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.SiswaDetail
import com.absenta.app.ui.components.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MutationScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MutationViewModel = viewModel()
) {
    val context = LocalContext.current

    val siswas by viewModel.siswas.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()
    val executing by viewModel.executing.collectAsState()

    // Reference options
    val kelasList by viewModel.kelasList.collectAsState()

    // Selected filters
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterKelasId by viewModel.filterKelasId.collectAsState()

    // Pagination
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // RBAC
    val canManage by viewModel.canManage.collectAsState()

    // Bulk selection state
    var selectedSiswaIds by remember { mutableStateOf(setOf<String>()) }

    // Dialog state
    var showMutationDialog by remember { mutableStateOf(false) }
    var showGraduationDialog by remember { mutableStateOf(false) }

    // Mutation fields
    var mutationStatus by remember { mutableStateOf("PINDAH") } // PINDAH, KELUAR, TIDAK_AKTIF
    val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    var mutationDate by remember { mutableStateOf(todayStr) }
    var mutationReason by remember { mutableStateOf("") }

    val kelasOptions = remember(kelasList) {
        listOf(DropdownOption("Semua Kelas", "")) + kelasList.map { DropdownOption(it.nama_kelas, it.id) }
    }

    val mutationStatusOptions = listOf(
        DropdownOption("Pindah Sekolah", "PINDAH"),
        DropdownOption("Keluar / Drop Out", "KELUAR"),
        DropdownOption("Tidak Aktif", "TIDAK_AKTIF")
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
            selectedSiswaIds = emptySet()
            viewModel.resetSuccessMessage()
        }
    }

    // Reset selection if list changes dramatically
    LaunchedEffect(siswas) {
        // Keep only selections that are still in the list, or just clear them
        selectedSiswaIds = selectedSiswaIds.intersect(siswas.map { it.id }.toSet())
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
                            Text("Mutasi & Kelulusan Massal", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kelompok Setup • Pembaruan Status Siswa",
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
        bottomBar = {
            if (selectedSiswaIds.isNotEmpty() && canManage) {
                Surface(
                    tonalElevation = 8.dp,
                    shadowElevation = 8.dp,
                    color = Color.White,
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${selectedSiswaIds.size} siswa terpilih",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFF1E293B)
                        )

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { showMutationDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.ExitToApp, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Mutasikan", fontSize = 12.sp)
                            }

                            Button(
                                onClick = { showGraduationDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Luluskan", fontSize = 12.sp)
                            }
                        }
                    }
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
                    title = "Total Siswa Aktif",
                    value = if (isLoadingStats) "..." else (stats?.total_siswa ?: 0).toString(),
                    icon = Icons.Default.Person,
                    gradientColors = listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Total Kelas",
                    value = if (isLoadingStats) "..." else (stats?.total_kelas ?: 0).toString(),
                    icon = Icons.Default.Home,
                    gradientColors = listOf(Color(0xFF0EA5E9), Color(0xFF2563EB)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Siswa Terpilih",
                    value = selectedSiswaIds.size.toString(),
                    icon = Icons.Default.CheckCircle,
                    gradientColors = if (selectedSiswaIds.isEmpty()) {
                        listOf(Color(0xFF94A3B8), Color(0xFF64748B))
                    } else {
                        listOf(Color(0xFFF59E0B), Color(0xFFD97706))
                    },
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Filters & Actions Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Daftar Siswa Status Aktif",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFF1E293B)
                        )

                        if (siswas.isNotEmpty() && canManage) {
                            val allOnPageSelected = siswas.all { selectedSiswaIds.contains(it.id) }
                            TextButton(
                                onClick = {
                                    if (allOnPageSelected) {
                                        selectedSiswaIds = selectedSiswaIds - siswas.map { it.id }.toSet()
                                    } else {
                                        selectedSiswaIds = selectedSiswaIds + siswas.map { it.id }.toSet()
                                    }
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Icon(
                                    imageVector = if (allOnPageSelected) Icons.Default.Clear else Icons.Default.Check,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (allOnPageSelected) "Batal Semua" else "Pilih Semua Halaman",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(modifier = Modifier.weight(3f)) {
                            SearchTextField(
                                value = searchQuery,
                                onValueChange = { viewModel.searchQuery.value = it },
                                placeholder = "Cari nama siswa...",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        Box(modifier = Modifier.weight(2f)) {
                            FilterDropdown(
                                selectedValue = filterKelasId,
                                options = kelasOptions,
                                onValueChange = { viewModel.filterKelasId.value = it },
                                placeholder = "Semua Kelas",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            if (isLoading && siswas.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (siswas.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada siswa aktif yang ditemukan", color = Color(0xFF64748B))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(siswas, key = { it.id }) { siswa ->
                        val isSelected = selectedSiswaIds.contains(siswa.id)
                        Card(
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFFEFF6FF) else Color.White
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = canManage) {
                                    selectedSiswaIds = if (isSelected) {
                                        selectedSiswaIds - siswa.id
                                    } else {
                                        selectedSiswaIds + siswa.id
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (canManage) {
                                    Checkbox(
                                        checked = isSelected,
                                        onCheckedChange = { checked ->
                                            selectedSiswaIds = if (checked == true) {
                                                selectedSiswaIds + siswa.id
                                            } else {
                                                selectedSiswaIds - siswa.id
                                            }
                                        },
                                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFF1E3C72))
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = siswa.nama_siswa,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF0F172A)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "NIS: ${siswa.nis} | Kelas: ${siswa.Kelas?.nama_kelas ?: "-"}",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }

                                Surface(
                                    color = Color(0xFFD1FAE5),
                                    contentColor = Color(0xFF065F46),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.wrapContentSize()
                                ) {
                                    Text(
                                        text = siswa.status,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Pagination Control
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
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
                                        onClick = { viewModel.fetchSiswaList(currentPage - 1) },
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
                                        onClick = { viewModel.fetchSiswaList(currentPage + 1) },
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

    // Dialog Mutasi
    if (showMutationDialog) {
        AlertDialog(
            onDismissRequest = { showMutationDialog = false },
            title = {
                Text(
                    text = "Mutasi Masal (${selectedSiswaIds.size} Siswa)",
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
                        text = "Ubah status siswa terpilih menjadi tidak aktif / mutasi keluar.",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )

                    Column {
                        Text("Status Mutasi", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(4.dp))
                        FilterDropdown(
                            selectedValue = mutationStatus,
                            options = mutationStatusOptions,
                            onValueChange = { mutationStatus = it },
                            placeholder = "Pilih Status",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = mutationDate,
                        onValueChange = { mutationDate = it },
                        label = { Text("Tanggal Mutasi (YYYY-MM-DD)", fontSize = 12.sp) },
                        placeholder = { Text(todayStr) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = mutationReason,
                        onValueChange = { mutationReason = it },
                        label = { Text("Alasan / Keterangan", fontSize = 12.sp) },
                        placeholder = { Text("Contoh: Pindah sekolah ke luar kota") },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.executeBulkUpdate(
                            ids = selectedSiswaIds.toList(),
                            status = mutationStatus,
                            dateStr = mutationDate,
                            reason = mutationReason
                        ) {
                            showMutationDialog = false
                            mutationReason = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    enabled = !executing
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Simpan Mutasi")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showMutationDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Dialog Luluskan
    if (showGraduationDialog) {
        AlertDialog(
            onDismissRequest = { showGraduationDialog = false },
            title = {
                Text(
                    text = "Luluskan Masal (${selectedSiswaIds.size} Siswa)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Apakah Anda yakin ingin meluluskan ${selectedSiswaIds.size} siswa terpilih secara massal?",
                        fontSize = 13.sp,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Tindakan ini akan mengubah status siswa menjadi LULUS secara permanen untuk periode akademik saat ini.",
                        fontSize = 12.sp,
                        color = Color(0xFFDC2626),
                        fontWeight = FontWeight.Medium
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.executeBulkUpdate(
                            ids = selectedSiswaIds.toList(),
                            status = "LULUS",
                            dateStr = todayStr,
                            reason = "Kelulusan Massal"
                        ) {
                            showGraduationDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    enabled = !executing
                ) {
                    if (executing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Ya, Luluskan")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showGraduationDialog = false }) {
                    Text("Batal", color = Color(0xFF64748B))
                }
            }
        )
    }
}
