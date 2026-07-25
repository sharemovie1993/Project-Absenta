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
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExitToApp
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
import com.absenta.app.data.api.PiketService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.CreatePermitRequest
import com.absenta.app.data.model.IzinKeluarSiswaItem
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
 * SuratIzinPiketScreen — Layar Buku Piket & Penerbitan Surat Izin Siswa (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/kesiswaan/piket`, `POST`, `PATCH /kembali`, `DELETE`)
 * - Smart Student Picker Integration (Pencarian UUID Siswa secara presisi)
 * - Dynamic RBAC Guard (`affairs.permits.manage` / Guru Piket / Kesiswaan / Admin)
 * - Real-Time Action Button `✅ Konfirmasi Siswa Sudah Kembali`
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuratIzinPiketScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var permitsList by remember { mutableStateOf<List<IzinKeluarSiswaItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Form State
    var showFormModal by remember { mutableStateOf(false) }
    var selectedSiswaId by remember { mutableStateOf("") }
    var selectedSiswaName by remember { mutableStateOf("") }

    var tipeIzinSelected by remember { mutableStateOf("IZIN_KELUAR") }
    var alasanInput by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Delete & Return Confirmations
    var showDeleteConfirm by remember { mutableStateOf<IzinKeluarSiswaItem?>(null) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(PiketService::class.java)

        try {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val response = service.getDailyPermits(todayStr)
            if (response.isSuccessful && response.body()?.data != null) {
                permitsList = response.body()!!.data!!
            }
        } catch (e: Exception) {
            permitsList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val canManage = remember(capabilities, userRole) {
        capabilities.contains("affairs.permits.manage") ||
                userRole.uppercase().contains("PIKET") ||
                userRole.uppercase().contains("KESISWAAN") ||
                userRole.uppercase().contains("GURU") ||
                userRole.uppercase().contains("ADMIN")
    }

    val filteredList = remember(permitsList, searchQuery, selectedFilter) {
        permitsList.filter { item ->
            val matchSearch = searchQuery.isBlank() ||
                    item.displayNamaSiswa.contains(searchQuery, ignoreCase = true) ||
                    (item.alasan ?: "").contains(searchQuery, ignoreCase = true) ||
                    item.displayTipeIzin.contains(searchQuery, ignoreCase = true)

            val statusUpper = (item.status ?: "DISETUJUI").uppercase()
            val matchFilter = when (selectedFilter) {
                "DILUAR" -> statusUpper == "DISETUJUI" || statusUpper == "IZIN"
                "KEMBALI" -> statusUpper == "KEMBALI" || statusUpper == "SELESAI"
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val totalPermits = permitsList.size
    val diluarCount = permitsList.count { (it.status ?: "DISETUJUI").uppercase() == "DISETUJUI" }
    val kembaliCount = permitsList.count { (it.status ?: "").uppercase() == "KEMBALI" }

    fun markReturnedAction(item: IzinKeluarSiswaItem) {
        scope.launch {
            try {
                val retrofit = ApiClient.create(tokenManager)
                val service = retrofit.create(PiketService::class.java)
                service.markReturned(item.id)
                loadData()
            } catch (e: Exception) {}
        }
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Buku Piket & Surat Izin Siswa",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (canManage) {
                FloatingActionButton(
                    onClick = {
                        selectedSiswaId = ""
                        selectedSiswaName = ""
                        tipeIzinSelected = "IZIN_KELUAR"
                        alasanInput = ""
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
                        Text("Terbitkan Surat Izin", fontWeight = FontWeight.Bold, color = OnPrimary)
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
                            text = "Rekapituasi Surat Izin Siswa Hari Ini",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Total Surat Izin",
                                value = "$totalPermits",
                                subtitle = "Diterbitkan Hari Ini",
                                icon = Icons.Default.ExitToApp,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Di Luar / Izin",
                                value = "$diluarCount",
                                subtitle = "Belum Kembali",
                                icon = Icons.Default.ExitToApp,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Sudah Kembali",
                                value = "$kembaliCount",
                                subtitle = "Terverifikasi Piket",
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
                            placeholder = { Text("Cari Nama Siswa / Alasan Izin...", color = TextSecondary) },
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
                            item { FilterChipPiket("SEMUA ($totalPermits)", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipPiket("⏳ DI LUAR / IZIN ($diluarCount)", "DILUAR", selectedFilter) { selectedFilter = it } }
                            item { FilterChipPiket("✅ SUDAH KEMBALI ($kembaliCount)", "KEMBALI", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // 4. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada surat izin diterbitkan hari ini.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            PermitCardItemFull(
                                item = item,
                                canManage = canManage,
                                onMarkReturned = { markReturnedAction(item) },
                                onDelete = { showDeleteConfirm = item }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modal Form: Terbitkan Surat Izin Baru
    if (showFormModal) {
        AlertDialog(
            onDismissRequest = { showFormModal = false },
            title = {
                Text(
                    text = "Penerbitan Surat Izin Keluar Siswa",
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
                        DropdownOption("IZIN_KELUAR", "🚗 Izin Keluar Sementara", "Siswa akan kembali ke sekolah"),
                        DropdownOption("PULANG_AWAL", "🏠 Izin Pulang Awal", "Siswa tidak kembali lagi ke sekolah hari ini"),
                        DropdownOption("IZIN_JURUSAN", "🛠️ Izin Kegiatan Jurusan", "Siswa izin keluar untuk tugas sekolah/jurusan")
                    )
                    AbsentaDropdown(
                        label = "Jenis Surat Izin",
                        selectedLabel = tipeOptions.find { it.id == tipeIzinSelected }?.label ?: "Izin Keluar",
                        options = tipeOptions,
                        onOptionSelected = { opt -> tipeIzinSelected = opt.id }
                    )

                    OutlinedTextField(
                        value = alasanInput,
                        onValueChange = { alasanInput = it },
                        label = { Text("Alasan / Keperluan Izin") },
                        placeholder = { Text("misal: Sakit berobat ke puskesmas / Ada urusan keluarga") },
                        colors = outlinedTextFieldColorsPiket(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && selectedSiswaId.isNotBlank() && alasanInput.isNotBlank(),
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(PiketService::class.java)

                                val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())

                                val req = CreatePermitRequest(
                                    siswaAkademikId = selectedSiswaId,
                                    alasan = alasanInput,
                                    tipeIzin = tipeIzinSelected,
                                    jamKeluar = nowIso
                                )

                                service.createPermit(req)
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
                    Text(if (isSubmitting) "Menerbitkan..." else "Terbitkan Surat Izin", fontWeight = FontWeight.Bold)
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

    // Modal Confirmation: Delete Permit
    if (showDeleteConfirm != null) {
        val target = showDeleteConfirm!!
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Surat Izin?", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus surat izin '${target.displayNamaSiswa}'?", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(PiketService::class.java)
                                service.deletePermit(target.id)
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
private fun FilterChipPiket(
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
private fun PermitCardItemFull(
    item: IzinKeluarSiswaItem,
    canManage: Boolean,
    onMarkReturned: () -> Unit,
    onDelete: () -> Unit
) {
    val statusUpper = (item.status ?: "DISETUJUI").uppercase()
    val isKembali = statusUpper == "KEMBALI" || statusUpper == "SELESAI"

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
                        text = "Jenis: ${item.displayTipeIzin} | Kelas: ${item.displayKelas}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isKembali) StatusHadir else StatusIzin).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = if (isKembali) "✅ SUDAH KEMBALI" else "⏳ DI LUAR",
                        color = if (isKembali) StatusHadir else StatusIzin,
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
                Column {
                    Text(
                        text = "ℹ️ Alasan: ${item.alasan}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "⏰ Jam Keluar: ${item.displayJamKeluar}${if (item.displayJamKembali.isNotBlank()) " | Jam Kembali: ${item.displayJamKembali}" else ""}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            if (canManage) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (!isKembali) {
                        Button(
                            onClick = onMarkReturned,
                            colors = ButtonDefaults.buttonColors(containerColor = StatusHadir),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("✅ Konfirmasi Siswa Kembali", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Text(
                            text = "Terverifikasi Kembali ke Sekolah",
                            fontSize = 11.sp,
                            color = StatusHadir,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Danger, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColorsPiket() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
