package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.SiswaDetail
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegistrasiSiswaScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RegistrasiSiswaViewModel = viewModel()
) {
    val context = LocalContext.current

    val siswas by viewModel.siswas.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val globalStats by viewModel.globalStats.collectAsState()
    val isLoadingStats by viewModel.isLoadingStats.collectAsState()

    // Reference options
    val kelasList by viewModel.kelasList.collectAsState()
    val tahunPelajaranList by viewModel.tahunPelajaranList.collectAsState()
    val semesterList by viewModel.semesterList.collectAsState()

    // Selected filters
    val selectedKelasId by viewModel.selectedKelasId.collectAsState()
    val selectedTahunPelajaranId by viewModel.selectedTahunPelajaranId.collectAsState()
    val selectedSemesterId by viewModel.selectedSemesterId.collectAsState()
    val akademikFilter by viewModel.akademikFilter.collectAsState()

    // Status map
    val checkingMap by viewModel.checkingMap.collectAsState()

    // Sync state
    val syncLoading by viewModel.syncLoading.collectAsState()
    val syncResult by viewModel.syncResult.collectAsState()

    val searchQuery by viewModel.searchQuery.collectAsState()

    // Pagination
    val currentPage by viewModel.currentPage.collectAsState()
    val totalPages by viewModel.totalPages.collectAsState()
    val totalItems by viewModel.totalItems.collectAsState()
    val limitVal by viewModel.itemsPerPage.collectAsState()

    // UI Dialog State
    var showHistoryDialogForSiswa by remember { mutableStateOf<SiswaDetail?>(null) }

    // Map filters
    val kelasOptions = remember(kelasList) {
        listOf(DropdownOption("Semua Kelas", "")) + kelasList.map { DropdownOption(it.nama_kelas, it.id) }
    }

    val tahunPelajaranOptions = remember(tahunPelajaranList) {
        tahunPelajaranList.map { DropdownOption(it.tahun, it.id) }
    }

    val semesterOptions = remember(semesterList) {
        semesterList.map { DropdownOption(it.nama_semester, it.id) }
    }

    val statusOptions = listOf(
        DropdownOption("Semua Status Registrasi", "ALL"),
        DropdownOption("Sudah Terdaftar", "TERDAFTAR"),
        DropdownOption("Belum Terdaftar", "BELUM")
    )

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(syncResult) {
        syncResult?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.resetSyncResult()
        }
    }

    // Filter students locally based on registration status map
    val filteredSiswas = remember(siswas, akademikFilter, checkingMap) {
        when (akademikFilter) {
            "TERDAFTAR" -> siswas.filter { checkingMap[it.id] != null }
            "BELUM" -> siswas.filter { checkingMap[it.id] == null }
            else -> siswas
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
                            Text("Registrasi Siswa Massal", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kelompok Setup • Aktivasi Semesteran",
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
                val totalActive = globalStats?.total_active ?: 0
                val registered = globalStats?.registered ?: 0
                val unregistered = java.lang.Math.max(0, totalActive - registered)

                ReusableStatsCard(
                    title = "Total Siswa Aktif",
                    value = if (isLoadingStats) "..." else totalActive.toString(),
                    icon = Icons.Default.Person,
                    gradientColors = listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Sudah Terdaftar",
                    value = if (isLoadingStats) "..." else registered.toString(),
                    icon = Icons.Default.CheckCircle,
                    gradientColors = listOf(Color(0xFF10B981), Color(0xFF14B8A6)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
                ReusableStatsCard(
                    title = "Belum Terdaftar",
                    value = if (isLoadingStats) "..." else unregistered.toString(),
                    icon = Icons.Default.Warning,
                    gradientColors = listOf(Color(0xFFF59E0B), Color(0xFFD97706)),
                    modifier = Modifier.weight(1f),
                    isCompact = true
                )
            }

            // Sync Card & Sync Button
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Sinkronisasi Registrasi Siswa",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color(0xFF1E293B)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Gunakan tombol di bawah untuk mendaftarkan data akademik siswa secara massal untuk tahun pelajaran dan semester yang aktif.",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { viewModel.syncStudents() },
                        enabled = !syncLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (syncLoading) {
                            CircularProgressIndicator(
                                color = Color.White,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Melakukan Sinkronisasi...", color = Color.White)
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sinkronkan Sekarang", color = Color.White)
                        }
                    }
                }
            }

            // Search Bar
            SearchTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = "Cari nama siswa...",
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
                        selectedValue = selectedTahunPelajaranId,
                        options = tahunPelajaranOptions,
                        onValueChange = { viewModel.selectedTahunPelajaranId.value = it },
                        placeholder = "Tahun Pelajaran",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    FilterDropdown(
                        selectedValue = selectedSemesterId,
                        options = semesterOptions,
                        onValueChange = { viewModel.selectedSemesterId.value = it },
                        placeholder = "Semester",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    FilterDropdown(
                        selectedValue = selectedKelasId,
                        options = kelasOptions,
                        onValueChange = { viewModel.selectedKelasId.value = it },
                        placeholder = "Semua Kelas",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    FilterDropdown(
                        selectedValue = akademikFilter,
                        options = statusOptions,
                        onValueChange = { viewModel.akademikFilter.value = it },
                        placeholder = "Filter Registrasi",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            if (isLoading && filteredSiswas.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredSiswas.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Tidak ada data siswa", color = Color(0xFF64748B))
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredSiswas, key = { it.id }) { siswa ->
                        val isRegistered = checkingMap[siswa.id] != null
                        val regStatus = checkingMap[siswa.id] ?: "BELUM AKTIF"

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
                                    Spacer(modifier = Modifier.height(6.dp))

                                    // Registration Status Badge
                                    Surface(
                                        color = if (isRegistered) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                                        contentColor = if (isRegistered) Color(0xFF065F46) else Color(0xFF991B1B),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.wrapContentSize()
                                    ) {
                                        Text(
                                            text = if (isRegistered) "TERDAFTAR ($regStatus)" else "BELUM AKTIF",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                        )
                                    }
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    IconButton(
                                        onClick = { showHistoryDialogForSiswa = siswa }
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Info,
                                            contentDescription = "Riwayat Registrasi",
                                            tint = Color(0xFF3B82F6)
                                        )
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

    // Student History / Detail Dialog
    showHistoryDialogForSiswa?.let { siswa ->
        AlertDialog(
            onDismissRequest = { showHistoryDialogForSiswa = null },
            title = {
                Text(
                    text = "Riwayat Akademik",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                ) {
                    Text(
                        text = "Nama: ${siswa.nama_siswa}",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "NIS: ${siswa.nis}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Status Registrasi Saat Ini:",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFF1E293B)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    val isRegistered = checkingMap[siswa.id] != null
                    val regStatus = checkingMap[siswa.id] ?: "BELUM AKTIF"
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (isRegistered) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isRegistered) Icons.Default.CheckCircle else Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (isRegistered) Color(0xFF059669) else Color(0xFFDC2626)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isRegistered) "Siswa Terdaftar Aktif ($regStatus) untuk Tahun Pelajaran & Semester ini." else "Siswa belum terdaftar untuk Tahun Pelajaran & Semester ini.",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (isRegistered) Color(0xFF065F46) else Color(0xFF991B1B)
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showHistoryDialogForSiswa = null }) {
                    Text("Tutup", color = Color(0xFF1E3C72))
                }
            }
        )
    }
}
