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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import com.absenta.app.data.api.BpbkService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.CreateKonselingRequest
import com.absenta.app.data.model.KonselingItem
import com.absenta.app.ui.components.AbsentaDropdown
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.DropdownOption
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
import com.absenta.app.ui.theme.StatusIzin
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
 * BpbkKonselingScreen — Layar Layanan Bimbingan Konseling / BK Siswa (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/bpbk/konseling`, `POST`, `PUT`, `DELETE`)
 * - Smart Student Picker Integration (Pencarian UUID Siswa secara presisi)
 * - Dynamic RBAC Guard (`bk.counseling.manage` / Guru BK / Kesiswaan / Admin)
 * - Status Filter Chips (Individu, Kelompok, Klasikal, Proses, Selesai)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BpbkKonselingScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var konselingList by remember { mutableStateOf<List<KonselingItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Form State (Create & Edit)
    var showFormModal by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<KonselingItem?>(null) }
    var selectedSiswaId by remember { mutableStateOf("") }
    var selectedSiswaName by remember { mutableStateOf("") }

    var tipeSelected by remember { mutableStateOf("INDIVIDU") }
    var masalahInput by remember { mutableStateOf("") }
    var solusiInput by remember { mutableStateOf("") }
    var statusSelected by remember { mutableStateOf("PROSES") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Delete confirmation
    var showDeleteConfirm by remember { mutableStateOf<KonselingItem?>(null) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(BpbkService::class.java)

        try {
            val response = service.getKonselingList()
            if (response.isSuccessful && response.body()?.data != null) {
                konselingList = response.body()!!.data!!.list ?: emptyList()
            }
        } catch (e: Exception) {
            konselingList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val canManage = remember(capabilities, userRole) {
        capabilities.contains("bk.counseling.manage") ||
                userRole.uppercase().contains("BPBK") ||
                userRole.uppercase().contains("BK") ||
                userRole.uppercase().contains("KESISWAAN") ||
                userRole.uppercase().contains("ADMIN")
    }

    val filteredList = remember(konselingList, searchQuery, selectedFilter) {
        konselingList.filter { item ->
            val matchSearch = searchQuery.isBlank() ||
                    item.displayNamaSiswa.contains(searchQuery, ignoreCase = true) ||
                    (item.masalah?.contains(searchQuery, ignoreCase = true) == true) ||
                    (item.solusi?.contains(searchQuery, ignoreCase = true) == true)

            val tipeUpper = (item.tipe ?: "").uppercase()
            val statusUpper = (item.status ?: "").uppercase()

            val matchFilter = when (selectedFilter) {
                "INDIVIDU" -> tipeUpper == "INDIVIDU"
                "KELOMPOK" -> tipeUpper == "KELOMPOK"
                "KLASIKAL" -> tipeUpper == "KLASIKAL"
                "PROSES" -> statusUpper == "PROSES"
                "SELESAI" -> statusUpper == "SELESAI"
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val totalKonseling = konselingList.size
    val prosesCount = konselingList.count { (it.status ?: "PROSES").uppercase() == "PROSES" }
    val selesaiCount = konselingList.count { (it.status ?: "").uppercase() == "SELESAI" }

    fun openCreateModal() {
        editingItem = null
        selectedSiswaId = ""
        selectedSiswaName = ""
        tipeSelected = "INDIVIDU"
        masalahInput = ""
        solusiInput = ""
        statusSelected = "PROSES"
        showFormModal = true
    }

    fun openEditModal(item: KonselingItem) {
        editingItem = item
        selectedSiswaId = item.siswaId ?: ""
        selectedSiswaName = item.displayNamaSiswa
        tipeSelected = item.tipe ?: "INDIVIDU"
        masalahInput = item.masalah ?: ""
        solusiInput = item.solusi ?: ""
        statusSelected = item.status ?: "PROSES"
        showFormModal = true
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Layanan Bimbingan Konseling",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = { openCreateModal() },
                    containerColor = Primary,
                    contentColor = OnPrimary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = OnPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Catat Konseling", fontWeight = FontWeight.Bold, color = OnPrimary)
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
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 1. KPI Header
                    item {
                        Text(
                            text = "Rekapitulasi Layanan Bimbingan Konseling",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Total Sesi",
                                value = "$totalKonseling",
                                subtitle = "Bimbingan BK",
                                icon = Icons.Default.Psychology,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Dalam Proses",
                                value = "$prosesCount",
                                subtitle = "Penanganan BK",
                                icon = Icons.Default.Person,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Selesai",
                                value = "$selesaiCount",
                                subtitle = "Tuntas Teratasi",
                                icon = Icons.Default.CheckCircle,
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
                            placeholder = { Text("Cari Nama Siswa / Uraian Masalah...", color = TextSecondary) },
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

                    // 3. Filter Chips
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item { FilterChipBk("SEMUA", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipBk("👤 INDIVIDU", "INDIVIDU", selectedFilter) { selectedFilter = it } }
                            item { FilterChipBk("👥 KELOMPOK", "KELOMPOK", selectedFilter) { selectedFilter = it } }
                            item { FilterChipBk("🏫 KLASIKAL", "KLASIKAL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipBk("⏳ PROSES", "PROSES", selectedFilter) { selectedFilter = it } }
                            item { FilterChipBk("✅ SELESAI", "SELESAI", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // 4. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada catatan bimbingan konseling terdaftar.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            KonselingCardItem(
                                item = item,
                                canManage = canManage,
                                onEdit = { openEditModal(item) },
                                onDelete = { showDeleteConfirm = item }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modal Form: Create / Edit Konseling
    if (showFormModal) {
        AlertDialog(
            onDismissRequest = { showFormModal = false },
            title = {
                Text(
                    text = if (editingItem == null) "Catat Konseling Siswa Baru" else "Edit Catatan Konseling",
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

                    val tipeOptions = listOf(
                        DropdownOption("INDIVIDU", "👤 Konseling Individu", "Bimbingan Tatap Muka Perorangan"),
                        DropdownOption("KELOMPOK", "👥 Konseling Kelompok", "Bimbingan Diskusi Kelompok Siswa"),
                        DropdownOption("KLASIKAL", "🏫 Bimbingan Klasikal", "Bimbingan Seluruh Anggota Kelas")
                    )
                    AbsentaDropdown(
                        label = "Tipe Bimbingan",
                        selectedLabel = tipeOptions.find { it.id == tipeSelected }?.label ?: "Individu",
                        options = tipeOptions,
                        onOptionSelected = { opt -> tipeSelected = opt.id }
                    )

                    OutlinedTextField(
                        value = masalahInput,
                        onValueChange = { masalahInput = it },
                        label = { Text("Uraian Masalah / Topik Bimbingan") },
                        placeholder = { Text("misal: Menurunnya motivasi belajar di kelas") },
                        colors = outlinedTextFieldColorsBk(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = solusiInput,
                        onValueChange = { solusiInput = it },
                        label = { Text("Rencana Solusi / Tindak Lanjut") },
                        placeholder = { Text("misal: Diberikan konseling motivasi & monitoring mingguan") },
                        colors = outlinedTextFieldColorsBk(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    val statusOptions = listOf(
                        DropdownOption("PROSES", "⏳ Dalam Penanganan (Proses)", "Konseling masih berjalan"),
                        DropdownOption("SELESAI", "✅ Selesai (Tuntas)", "Permasalahan telah teratasi")
                    )
                    AbsentaDropdown(
                        label = "Status Penanganan",
                        selectedLabel = statusOptions.find { it.id == statusSelected }?.label ?: "Proses",
                        options = statusOptions,
                        onOptionSelected = { opt -> statusSelected = opt.id }
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && selectedSiswaId.isNotBlank() && masalahInput.isNotBlank(),
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(BpbkService::class.java)

                                val req = CreateKonselingRequest(
                                    siswaId = selectedSiswaId,
                                    tipe = tipeSelected,
                                    masalah = masalahInput,
                                    solusi = solusiInput,
                                    status = statusSelected
                                )

                                if (editingItem == null) {
                                    service.createKonseling(req)
                                } else {
                                    service.updateKonseling(editingItem!!.id, req)
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
                    Text(if (isSubmitting) "Menyimpan..." else if (editingItem == null) "Simpan Konseling" else "Perbarui Konseling", fontWeight = FontWeight.Bold)
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

    // Modal Confirmation: Delete Konseling
    if (showDeleteConfirm != null) {
        val target = showDeleteConfirm!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Catatan Konseling?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus catatan konseling untuk '${target.displayNamaSiswa}'?", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(BpbkService::class.java)
                                service.deleteKonseling(target.id)
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
private fun FilterChipBk(
    label: String,
    value: String,
    currentSelected: String,
    onSelect: (String) -> Unit
) {
    val isSelected = currentSelected == value
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (isSelected) PrimaryContainer else SurfaceDark)
            .clickable { onSelect(value) }
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Primary else TextSecondary
        )
    }
}

@Composable
private fun KonselingCardItem(
    item: KonselingItem,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val statusUpper = (item.status ?: "PROSES").uppercase()
    val isSelesai = statusUpper == "SELESAI"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Border)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.displayNamaSiswa,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Tipe: ${item.displayTipe} | Tgl: ${item.tanggalFormatted}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isSelesai) StatusHadir else StatusIzin).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = if (isSelesai) "✅ SELESAI" else "⏳ PROSES",
                        color = if (isSelesai) StatusHadir else StatusIzin,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceVariantDark)
                    .padding(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "📌 Masalah: ${item.displayMasalah}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        if (!item.solusi.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "💡 Solusi: ${item.solusi}",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    if (canManage) {
                        Row {
                            IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Primary, modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Danger, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColorsBk() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
