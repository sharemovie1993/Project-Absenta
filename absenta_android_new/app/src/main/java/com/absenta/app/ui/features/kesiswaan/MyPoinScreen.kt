package com.absenta.app.ui.features.kesiswaan

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.KesiswaanService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.PoinItem
import com.absenta.app.data.model.ReportPelanggaranRequest
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.components.SmartStudentPicker
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import androidx.compose.foundation.BorderStroke
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * MyPoinScreen — Layar Pelaporan Pelanggaran & Prestasi Siswa (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/kesiswaan/pelanggaran`, `POST`, `DELETE`, `GET /api/kesiswaan/prestasi`)
 * - Smart Student Picker Integration
 * - Dynamic RBAC Guard (`affairs.violations.report` / Guru / Kesiswaan / Admin)
 * - Dual Tab View: Pelanggaran vs Prestasi
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPoinScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var pelanggaranList by remember { mutableStateOf<List<PoinItem>>(emptyList()) }
    var prestasiList by remember { mutableStateOf<List<PoinItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Pelanggaran, 1: Prestasi

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Form State
    var showFormModal by remember { mutableStateOf(false) }
    var selectedSiswaId by remember { mutableStateOf("") }
    var selectedSiswaName by remember { mutableStateOf("") }
    var jenisPelanggaranInput by remember { mutableStateOf("") }
    var poinInput by remember { mutableStateOf("5") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Delete confirmation
    var showDeleteConfirm by remember { mutableStateOf<PoinItem?>(null) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(KesiswaanService::class.java)

        try {
            val response = service.getMyPoin()
            if (response.isSuccessful && response.body()?.data != null) {
                pelanggaranList = response.body()!!.data!!.items
            }

            val prestasiRes = service.getPrestasiList()
            if (prestasiRes.isSuccessful && prestasiRes.body()?.data != null) {
                prestasiList = prestasiRes.body()!!.data!!.items
            }
        } catch (e: Exception) {
            pelanggaranList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val isSiswaOrParent = userRole.uppercase().contains("SISWA") || userRole.uppercase().contains("PARENT")

    val canReport = remember(capabilities, userRole, isSiswaOrParent) {
        !isSiswaOrParent && (
                capabilities.contains("affairs.violations.report") ||
                        userRole.uppercase().contains("GURU") ||
                        userRole.uppercase().contains("KESISWAAN") ||
                        userRole.uppercase().contains("ADMIN")
                )
    }

    val activeList = if (selectedTab == 0) pelanggaranList else prestasiList

    val filteredList = remember(activeList, searchQuery) {
        activeList.filter { item ->
            searchQuery.isBlank() ||
                    item.displayPelanggaran.contains(searchQuery, ignoreCase = true) ||
                    item.displaySiswa.contains(searchQuery, ignoreCase = true)
        }
    }

    val totalPelanggaranPoin = pelanggaranList.sumOf { it.poin ?: 0 }
    val totalPrestasiPoin = prestasiList.sumOf { it.poin ?: 0 }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Poin & Kedisiplinan Siswa",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (canReport) {
                FloatingActionButton(
                    onClick = {
                        selectedSiswaId = ""
                        selectedSiswaName = ""
                        jenisPelanggaranInput = ""
                        poinInput = if (selectedTab == 0) "5" else "10"
                        showFormModal = true
                    },
                    containerColor = Primary,
                    contentColor = OnPrimary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = OnPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (selectedTab == 0) "Lapor Pelanggaran" else "Tambah Prestasi", fontWeight = FontWeight.Bold, color = OnPrimary)
                    }
                }
            }
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        if (isLoading) {
            LoadingOverlay(modifier = Modifier.padding(paddingValues))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Tab Navigation
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = SurfaceDark,
                    contentColor = Primary,
                    indicator = { tabPositions ->
                        TabRowDefaults.Indicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = Primary
                        )
                    }
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp), tint = Danger)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Pelanggaran (Poin Minus)", fontWeight = FontWeight.Bold)
                            }
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.EmojiEvents, contentDescription = null, modifier = Modifier.size(16.dp), tint = StatusHadir)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Prestasi (Poin Plus)", fontWeight = FontWeight.Bold)
                            }
                        }
                    )
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 1. KPI Cards Header
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Poin Pelanggaran",
                                value = "$totalPelanggaranPoin Poin",
                                subtitle = "Akumulasi Minus",
                                icon = Icons.Default.Warning,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Poin Prestasi",
                                value = "$totalPrestasiPoin Poin",
                                subtitle = "Akumulasi Plus",
                                icon = Icons.Default.EmojiEvents,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // 2. Search Field
                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari Nama Siswa atau Deskripsi...", color = TextSecondary) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Primary) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = SurfaceDark,
                                unfocusedContainerColor = SurfaceDark,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = Border,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // 3. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = if (selectedTab == 0) "Belum ada catatan pelanggaran siswa." else "Belum ada catatan prestasi siswa.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            PoinCardItemFull(
                                item = item,
                                canDelete = canReport,
                                onDelete = { showDeleteConfirm = item }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modal Form: Lapor Pelanggaran / Prestasi
    if (showFormModal) {
        AlertDialog(
            onDismissRequest = { showFormModal = false },
            title = {
                Text(
                    text = if (selectedTab == 0) "Lapor Pelanggaran Siswa" else "Catat Prestasi Siswa",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SmartStudentPicker(
                        value = selectedSiswaName,
                        onValueChange = { selectedSiswaName = it },
                        onSelectStudent = { student ->
                            selectedSiswaId = student.id
                            selectedSiswaName = student.name ?: "Siswa"
                        },
                        onSubmitScan = { rfid ->
                            selectedSiswaName = rfid
                        },
                        tokenManager = tokenManager
                    )

                    OutlinedTextField(
                        value = jenisPelanggaranInput,
                        onValueChange = { jenisPelanggaranInput = it },
                        label = { Text(if (selectedTab == 0) "Jenis / Uraian Pelanggaran" else "Nama / Judul Prestasi") },
                        placeholder = { Text(if (selectedTab == 0) "misal: Terlambat Masuk Sekolah / Atribut Tidak Lengkap" else "misal: Juara 1 LKS Kedisiplinan") },
                        colors = outlinedTextFieldColorsPoin(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = poinInput,
                        onValueChange = { poinInput = it },
                        label = { Text("Bobot Poin") },
                        placeholder = { Text("5") },
                        colors = outlinedTextFieldColorsPoin(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && selectedSiswaId.isNotBlank() && jenisPelanggaranInput.isNotBlank(),
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(KesiswaanService::class.java)

                                val req = ReportPelanggaranRequest(
                                    siswaId = selectedSiswaId,
                                    jenisPelanggaran = jenisPelanggaranInput,
                                    poin = poinInput.toIntOrNull() ?: 5,
                                    tanggal = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                )

                                if (selectedTab == 0) {
                                    service.reportPelanggaran(req)
                                } else {
                                    service.createPrestasi(req)
                                }

                                showFormModal = false
                                loadData()
                            } catch (e: Exception) {
                            } finally {
                                isSubmitting = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text(if (isSubmitting) "Menyimpan..." else "Simpan Laporan", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormModal = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Modal Confirmation: Delete Item
    if (showDeleteConfirm != null) {
        val target = showDeleteConfirm!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Catatan Poin?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus catatan poin '${target.displayPelanggaran}' untuk '${target.displaySiswa}'?", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(KesiswaanService::class.java)
                                if (selectedTab == 0) {
                                    service.deletePelanggaran(target.id)
                                } else {
                                    service.deletePrestasi(target.id)
                                }
                                showDeleteConfirm = null
                                loadData()
                            } catch (e: Exception) {}
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger)
                ) {
                    Text("Hapus", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = null }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
private fun PoinCardItemFull(
    item: PoinItem,
    canDelete: Boolean,
    onDelete: () -> Unit
) {
    val poinVal = item.poin ?: 0
    val isPelanggaran = poinVal > 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background((if (isPelanggaran) Danger else StatusHadir).copy(alpha = 0.12f))
                    .padding(10.dp)
            ) {
                Icon(
                    imageVector = if (isPelanggaran) Icons.Default.Warning else Icons.Default.EmojiEvents,
                    contentDescription = null,
                    tint = if (isPelanggaran) Danger else StatusHadir
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.displaySiswa,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = item.displayPelanggaran,
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "📅 ${item.tanggalFormatted}",
                    fontSize = 10.sp,
                    color = TextSecondary
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isPelanggaran) Danger else StatusHadir).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = "${if (isPelanggaran) "-" else "+"}${item.poin} Poin",
                        color = if (isPelanggaran) Danger else StatusHadir,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }

                if (canDelete) {
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Danger, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColorsPoin() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
