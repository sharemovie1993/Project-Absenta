package com.absenta.app.ui.features.academic

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AssignmentTurnedIn
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ReferenceService
import com.absenta.app.data.api.SupervisiService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.CreateSupervisiRequest
import com.absenta.app.data.model.MasterGuruItem
import com.absenta.app.data.model.SupervisiItem
import com.absenta.app.ui.components.AbsentaDropdown
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.DropdownOption
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import androidx.compose.foundation.BorderStroke
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * SupervisiKbmScreen — Layar Penilaian & Form Supervisi KBM Pengajaran Guru (Fase 4 Roadmap).
 *
 * Diperuntukkan untuk Kepala Sekolah, Kurikulum, Pengawas, & Guru yang disupervisi.
 *
 * Fitur:
 * - Form Evaluasi & Penilaian Supervisi KBM Guru
 * - KPI Rata-rata Skor Penilaian & Jumlah Supervisi
 * - Pencarian Guru / Mapel / Kelas
 * - Detail Catatan & Target Pembelajaran
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupervisiKbmScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var supervisiList by remember { mutableStateOf<List<SupervisiItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("") }

    // Modal state untuk Supervisi Baru
    var showCreateModal by remember { mutableStateOf(false) }
    var guruList by remember { mutableStateOf<List<MasterGuruItem>>(emptyList()) }
    var selectedGuru by remember { mutableStateOf<MasterGuruItem?>(null) }
    var kelasInput by remember { mutableStateOf("") }
    var mapelInput by remember { mutableStateOf("") }
    var nilaiInput by remember { mutableStateOf("85") }
    var catatanInput by remember { mutableStateOf("") }
    var targetInput by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    suspend fun loadData() {
        isLoading = true
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""
        val retrofit = ApiClient.create(tokenManager)
        val supervisiService = retrofit.create(SupervisiService::class.java)
        val refService = retrofit.create(ReferenceService::class.java)

        try {
            val res = supervisiService.getSupervisiList()
            if (res.isSuccessful && res.body()?.data != null) {
                supervisiList = res.body()!!.data!!
            }
        } catch (e: Exception) {
            supervisiList = emptyList()
        }

        try {
            val resGuru = refService.getGuruList()
            if (resGuru.isSuccessful && resGuru.body()?.data != null) {
                guruList = resGuru.body()!!.data!!
            }
        } catch (e: Exception) {}

        isLoading = false
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val isSiswa = userRole.uppercase().contains("SISWA")
    val isParent = userRole.uppercase().contains("PARENT")

    val filteredList = remember(supervisiList, searchQuery) {
        supervisiList.filter { item ->
            searchQuery.isBlank() ||
                    item.namaGuru.contains(searchQuery, ignoreCase = true) ||
                    (item.mapel?.contains(searchQuery, ignoreCase = true) == true) ||
                    (item.kelas?.contains(searchQuery, ignoreCase = true) == true) ||
                    (item.catatan?.contains(searchQuery, ignoreCase = true) == true)
        }
    }

    val totalSupervisi = supervisiList.size
    val avgScore = if (totalSupervisi > 0) {
        supervisiList.mapNotNull { it.nilai }.average().let { if (it.isNaN()) 0 else it.toInt() }
    } else 0
    val verifiedCount = supervisiList.count { it.isVerified == true || (it.nilai ?: 0) >= 75 }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Supervisi KBM & Pengajaran",
                onNavigateBack = onNavigateBack
            )
        },
        floatingActionButton = {
            if (!isSiswa && !isParent) {
                FloatingActionButton(
                    onClick = { showCreateModal = true },
                    containerColor = Primary,
                    contentColor = OnPrimary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Input Form Supervisi", fontWeight = FontWeight.Bold)
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
                    // 1. KPI Cards Row
                    item {
                        Text(
                            text = "Ringkasan Evaluasi KBM Pengajaran",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Total Supervisi",
                                value = "$totalSupervisi",
                                subtitle = "Sesi Ter-evaluasi",
                                icon = Icons.Default.RateReview,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Rata-rata Skor",
                                value = if (avgScore > 0) "$avgScore" else "-",
                                subtitle = "Skor Pengajaran",
                                icon = Icons.Default.Star,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Tuntas / Baik",
                                value = "$verifiedCount",
                                subtitle = "Supervisi Tuntas",
                                icon = Icons.Default.AssignmentTurnedIn,
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
                            placeholder = { Text("Cari Nama Guru, Mapel, atau Kelas...", color = TextSecondary) },
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

                    // 3. List Item Supervisi
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada catatan evaluasi supervisi pengajaran guru.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            SupervisiCardItem(item = item)
                        }
                    }
                }
            }
        }
    }

    // Modal Input Form Penilaian Supervisi Baru
    if (showCreateModal) {
        AlertDialog(
            onDismissRequest = { showCreateModal = false },
            title = {
                Text(
                    "Form Evaluasi Supervisi Guru",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Searchable Dropdown Guru
                    val guruOptions = guruList.map {
                        DropdownOption(
                            id = it.id,
                            label = it.namaGuru ?: "Guru ${it.id}",
                            subtitle = "NIP: ${it.nip ?: "-"}"
                        )
                    }
                    AbsentaDropdown(
                        label = "Pilih Guru yang Disupervisi",
                        selectedLabel = selectedGuru?.namaGuru ?: "Cari & Pilih Guru",
                        options = guruOptions,
                        onOptionSelected = { opt ->
                            selectedGuru = guruList.find { it.id == opt.id }
                        }
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = mapelInput,
                            onValueChange = { mapelInput = it },
                            label = { Text("Mata Pelajaran") },
                            placeholder = { Text("misal: Matematika") },
                            colors = outlinedTextFieldColorsSupervisi(),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = kelasInput,
                            onValueChange = { kelasInput = it },
                            label = { Text("Kelas") },
                            placeholder = { Text("misal: X RPL 1") },
                            colors = outlinedTextFieldColorsSupervisi(),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = nilaiInput,
                        onValueChange = { nilaiInput = it },
                        label = { Text("Skor Penilaian (0 - 100)") },
                        colors = outlinedTextFieldColorsSupervisi(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = catatanInput,
                        onValueChange = { catatanInput = it },
                        label = { Text("Catatan Evaluasi / Masukan") },
                        placeholder = { Text("misal: Metode pembelajaran sangat komunikatif, penguasaan kelas baik") },
                        colors = outlinedTextFieldColorsSupervisi(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = targetInput,
                        onValueChange = { targetInput = it },
                        label = { Text("Target Pembelajaran / Rencana Tindak Lanjut") },
                        placeholder = { Text("misal: Peningkatan penggunaan media digital KBM") },
                        colors = outlinedTextFieldColorsSupervisi(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting && selectedGuru != null,
                    onClick = {
                        scope.launch {
                            isSubmitting = true
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(SupervisiService::class.java)
                                service.createSupervisi(
                                    CreateSupervisiRequest(
                                        guruId = selectedGuru!!.id,
                                        tanggal = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
                                        kelas = kelasInput.ifBlank { "Semua Kelas" },
                                        mapel = mapelInput.ifBlank { "Umum" },
                                        nilai = nilaiInput.toIntOrNull() ?: 85,
                                        catatan = catatanInput,
                                        targetPembelajaran = targetInput,
                                        status = "COMPLETED"
                                    )
                                )
                                showCreateModal = false
                                loadData()
                            } catch (e: Exception) {
                            } finally {
                                isSubmitting = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text(if (isSubmitting) "Menyimpan..." else "Simpan Evaluasi", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateModal = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
private fun SupervisiCardItem(item: SupervisiItem) {
    val nilai = item.nilai ?: 0
    val isGoodScore = nilai >= 80

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
                        text = item.namaGuru,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Mapel: ${item.mapel ?: "-"} • Kelas: ${item.kelas ?: "-"}",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isGoodScore) StatusHadir else StatusTerlambat).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = "Skor: ${item.nilaiFormatted}",
                        color = if (isGoodScore) StatusHadir else StatusTerlambat,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Catatan Supervisi
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(SurfaceVariantDark)
                    .padding(10.dp)
            ) {
                Column {
                    Text(
                        text = "📝 Evaluasi: ${item.catatan?.ifBlank { "Evaluasi KBM berjalan lancar." } ?: "Evaluasi KBM berjalan lancar."}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    if (!item.targetPembelajaran.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "🎯 Target: ${item.targetPembelajaran}",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Tanggal: ${item.tanggalFormatted}",
                    fontSize = 11.sp,
                    color = TextSecondary
                )
                Text(
                    text = "Supervisor: ${item.namaSupervisor}",
                    fontSize = 11.sp,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun outlinedTextFieldColorsSupervisi() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
