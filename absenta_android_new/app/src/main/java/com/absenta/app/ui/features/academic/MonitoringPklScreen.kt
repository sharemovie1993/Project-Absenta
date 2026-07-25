package com.absenta.app.ui.features.academic

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
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
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.CreatePklPenempatanRequest
import com.absenta.app.data.model.MitraPklInfo
import com.absenta.app.data.model.PklItem
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
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * MonitoringPklScreen — Layar Monitoring Penempatan PKL / Prakerin Siswa di Industri (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/hubin/penempatan`, `POST`, `PUT`, `DELETE`, `GET /api/hubin/mitra`)
 * - Smart Student Picker Integration
 * - Perusahaan Mitra Dropdown
 * - Dynamic RBAC Guard (`hubin.pkl.manage` / Hubin / Admin)
 * - Status Filter Chips (Semua, Aktif, Selesai)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonitoringPklScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var pklList by remember { mutableStateOf<List<PklItem>>(emptyList()) }
    var mitraList by remember { mutableStateOf<List<MitraPklInfo>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Form State (Create & Edit)
    var showFormModal by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<PklItem?>(null) }

    var selectedSiswaId by remember { mutableStateOf("") }
    var selectedSiswaName by remember { mutableStateOf("") }
    var selectedMitraId by remember { mutableStateOf("") }
    var tglMulaiInput by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var tglSelesaiInput by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var statusSelected by remember { mutableStateOf("AKTIF") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Delete confirmation
    var showDeleteConfirm by remember { mutableStateOf<PklItem?>(null) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(HubinService::class.java)

        try {
            val response = service.getPklList()
            if (response.isSuccessful && response.body()?.data != null) {
                pklList = response.body()!!.data!!.list ?: emptyList()
            }

            val mitraRes = service.getMitraList()
            if (mitraRes.isSuccessful && mitraRes.body()?.data != null) {
                mitraList = mitraRes.body()!!.data!!
            }
        } catch (e: Exception) {
            pklList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val canManage = remember(capabilities, userRole) {
        capabilities.contains("hubin.pkl.manage") ||
                userRole.uppercase().contains("HUBIN") ||
                userRole.uppercase().contains("ADMIN")
    }

    val filteredList = remember(pklList, searchQuery, selectedFilter) {
        pklList.filter { item ->
            val matchSearch = searchQuery.isBlank() ||
                    item.displayNamaSiswa.contains(searchQuery, ignoreCase = true) ||
                    item.displayPerusahaan.contains(searchQuery, ignoreCase = true)

            val statusUpper = (item.status ?: "AKTIF").uppercase()
            val matchFilter = when (selectedFilter) {
                "AKTIF" -> statusUpper == "AKTIF" || statusUpper == "BERJALAN"
                "SELESAI" -> statusUpper == "SELESAI"
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val totalCount = pklList.size
    val aktifCount = pklList.count { (it.status ?: "AKTIF").uppercase() == "AKTIF" }
    val selesaiCount = pklList.count { (it.status ?: "").uppercase() == "SELESAI" }

    fun openCreateModal() {
        editingItem = null
        selectedSiswaId = ""
        selectedSiswaName = ""
        selectedMitraId = mitraList.firstOrNull()?.id ?: ""
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        tglMulaiInput = todayStr
        tglSelesaiInput = todayStr
        statusSelected = "AKTIF"
        showFormModal = true
    }

    fun openEditModal(item: PklItem) {
        editingItem = item
        selectedSiswaId = item.siswaId ?: ""
        selectedSiswaName = item.displayNamaSiswa
        selectedMitraId = item.mitraId ?: ""
        tglMulaiInput = item.tanggalMulai?.take(10) ?: SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        tglSelesaiInput = item.tanggalSelesai?.take(10) ?: tglMulaiInput
        statusSelected = item.status ?: "AKTIF"
        showFormModal = true
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Monitoring PKL Industri",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = { openCreateModal() },
                    containerColor = Primary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = TextPrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Tambah Penempatan", fontWeight = FontWeight.Bold, color = TextPrimary)
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
                    // 1. KPI Cards Header
                    item {
                        Text(
                            text = "Penempatan PKL / Prakerin Siswa Industri",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Total Siswa PKL",
                                value = "$totalCount",
                                subtitle = "Terdaftar Industri",
                                icon = Icons.Default.Business,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Aktif Industri",
                                value = "$aktifCount",
                                subtitle = "Berjalan PKL",
                                icon = Icons.Default.CheckCircle,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Selesai PKL",
                                value = "$selesaiCount",
                                subtitle = "Tuntas Prakerin",
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
                            placeholder = { Text("Cari Nama Siswa atau Mitra Industri...", color = TextSecondary) },
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
                            item { FilterChipPkl("SEMUA", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipPkl("🟢 AKTIF PKL", "AKTIF", selectedFilter) { selectedFilter = it } }
                            item { FilterChipPkl("✅ SELESAI", "SELESAI", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // 4. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada data penempatan PKL terdaftar.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            PklCardItemFull(
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

    // Modal Form: Create / Edit Penempatan PKL
    if (showFormModal) {
        AlertDialog(
            onDismissRequest = { showFormModal = false },
            title = {
                Text(
                    text = if (editingItem == null) "Tambah Penempatan PKL Baru" else "Edit Penempatan PKL",
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

                    val mitraOptions = mitraList.map { DropdownOption(it.id ?: "", it.nama ?: "Perusahaan Mitra", it.alamat ?: "") }
                    val currentMitraName = mitraList.find { it.id == selectedMitraId }?.nama ?: "Pilih Perusahaan Mitra"

                    AbsentaDropdown(
                        label = "Mitra Industri PKL",
                        selectedLabel = currentMitraName,
                        options = mitraOptions,
                        onOptionSelected = { opt -> selectedMitraId = opt.id }
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = tglMulaiInput,
                            onValueChange = { tglMulaiInput = it },
                            label = { Text("Tgl Mulai (YYYY-MM-DD)") },
                            colors = outlinedTextFieldColorsPkl(),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = tglSelesaiInput,
                            onValueChange = { tglSelesaiInput = it },
                            label = { Text("Tgl Selesai (YYYY-MM-DD)") },
                            colors = outlinedTextFieldColorsPkl(),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    val statusOptions = listOf(
                        DropdownOption("AKTIF", "🟢 Aktif (Berjalan PKL)", "Siswa sedang aktif PKL"),
                        DropdownOption("SELESAI", "✅ Selesai (Tuntas)", "PKL telah selesai sepenuhnya")
                    )
                    AbsentaDropdown(
                        label = "Status PKL",
                        selectedLabel = statusOptions.find { it.id == statusSelected }?.label ?: "Aktif",
                        options = statusOptions,
                        onOptionSelected = { opt -> statusSelected = opt.id }
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && selectedSiswaId.isNotBlank() && selectedMitraId.isNotBlank(),
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(HubinService::class.java)

                                val req = CreatePklPenempatanRequest(
                                    siswaId = selectedSiswaId,
                                    mitraId = selectedMitraId,
                                    tanggalMulai = tglMulaiInput,
                                    tanggalSelesai = tglSelesaiInput,
                                    status = statusSelected
                                )

                                if (editingItem == null) {
                                    service.createPenempatan(req)
                                } else {
                                    service.updatePenempatan(editingItem!!.id, req)
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
                    Text(if (isSubmitting) "Menyimpan..." else if (editingItem == null) "Simpan Penempatan" else "Perbarui Penempatan", fontWeight = FontWeight.Bold)
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

    // Modal Confirmation: Delete Penempatan
    if (showDeleteConfirm != null) {
        val target = showDeleteConfirm!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Penempatan PKL?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus penempatan PKL '${target.displayNamaSiswa}' di '${target.displayPerusahaan}'?", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(HubinService::class.java)
                                service.deletePenempatan(target.id)
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
private fun FilterChipPkl(
    label: String,
    value: String,
    currentSelected: String,
    onSelect: (String) -> Unit
) {
    val isSelected = currentSelected == value
    
    val baseModifier = Modifier
        .clip(RoundedCornerShape(20.dp))
        .background(if (isSelected) PrimaryContainer else SurfaceDark)
        .clickable { onSelect(value) }
        
    val finalModifier = if (!isSelected) {
        baseModifier.border(BorderStroke(1.dp, Border), RoundedCornerShape(20.dp))
    } else {
        baseModifier
    }

    Box(
        modifier = finalModifier
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
private fun PklCardItemFull(
    item: PklItem,
    canManage: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val statusUpper = (item.status ?: "AKTIF").uppercase()
    val isAktif = statusUpper == "AKTIF" || statusUpper == "BERJALAN"

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
                Text(
                    text = item.displayNamaSiswa,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isAktif) StatusHadir else StatusIzin).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = if (isAktif) "🟢 AKTIF PKL" else "✅ SELESAI",
                        color = if (isAktif) StatusHadir else StatusIzin,
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
                            text = "🏢 Perusahaan: ${item.displayPerusahaan}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        if (!item.mitra?.alamat.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "📍 Alamat: ${item.mitra?.alamat}",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "📅 Periode: ${item.rangeFormatted}",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "👤 Pembimbing: ${item.displayPembimbing}",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
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
private fun outlinedTextFieldColorsPkl() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
