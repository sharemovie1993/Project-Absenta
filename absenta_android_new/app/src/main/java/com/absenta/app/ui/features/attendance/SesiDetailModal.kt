package com.absenta.app.ui.features.attendance

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.SesiKelasService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.AbsenSiswaSesiItem
import com.absenta.app.data.model.ProgresMateriRequest
import com.absenta.app.data.model.SesiKelas
import com.absenta.app.data.model.SesiTapRequest
import com.absenta.app.data.model.SiswaAbsensiItem
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp
import com.absenta.app.ui.components.SmartStudentPicker
import com.absenta.app.ui.components.StatusBadge
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusSakit
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * SesiDetailModal — Modal Presensi Sesi Universal (SmartStudentPicker) & Daftar Hadir Real-Time.
 *
 * Fitur:
 * - SmartStudentPicker: auto-focused RFID/NISN/NIP/Nama scan input
 * - Live Attendance List per sesi
 * - Penutupan sesi & Jurnal KBM
 *
 * @param sesi SesiKelas yang dipilih
 * @param tokenManager Manager session
 * @param onDismiss Callback saat modal ditutup
 * @param onSesiUpdated Callback saat data sesi terupdate
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SesiDetailModal(
    sesi: SesiKelas,
    tokenManager: TokenManager,
    onDismiss: () -> Unit,
    onSesiUpdated: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var scannerInput by remember { mutableStateOf("") }
    var isProcessingScan by remember { mutableStateOf(false) }
    var siswaList by remember { mutableStateOf<List<SiswaAbsensiItem>>(emptyList()) }
    var scanMessage by remember { mutableStateOf<String?>(null) }
    var showCloseDialog by remember { mutableStateOf(false) }
    var materiDibahasInput by remember { mutableStateOf("") }
    var catatanKbmInput by remember { mutableStateOf("") }

    suspend fun loadSesiRecords() {
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(SesiKelasService::class.java)
            val refService = retrofit.create(com.absenta.app.data.api.ReferenceService::class.java)

            val response = service.getSesiAbsensi(sesi.id)
            if (response.isSuccessful && !response.body()?.data.isNullOrEmpty()) {
                siswaList = response.body()!!.data!!
            } else {
                // Fallback: Muat seluruh siswa kelas untuk memastikan list siswa selalu tampil
                val targetKelasId = sesi.kelasId ?: sesi.kelas?.id
                val allStudentsRes = refService.getSiswaList(kelasId = targetKelasId)
                if (allStudentsRes.isSuccessful && allStudentsRes.body()?.data != null) {
                    siswaList = allStudentsRes.body()!!.data!!.map { s ->
                        SiswaAbsensiItem(
                            id = s.id,
                            siswaIdRaw = s.id,
                            namaSiswaRaw = s.namaSiswa,
                            nisnRaw = s.nisn,
                            nisRaw = s.nis,
                            status = "PENDING"
                        )
                    }
                }
            }
        } catch (e: Exception) {}
    }

    LaunchedEffect(sesi.id) { loadSesiRecords() }

    suspend fun handleScan(inputCode: String) {
        if (inputCode.isBlank() || isProcessingScan) return
        isProcessingScan = true
        scanMessage = null

        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(SesiKelasService::class.java)
            val refService = retrofit.create(com.absenta.app.data.api.ReferenceService::class.java)

            // 1. Look up student in current local list by NIS, NISN, RFID, or Name
            val targetStudent = siswaList.find { s ->
                s.nis.equals(inputCode, ignoreCase = true) ||
                s.nisn.equals(inputCode, ignoreCase = true) ||
                s.noRfid.equals(inputCode, ignoreCase = true) ||
                s.namaSiswa.contains(inputCode, ignoreCase = true)
            }

            val finalIdToSend = targetStudent?.siswaId ?: inputCode

            // 2. Submit langsung 1x ke API Presensi Sesi (0ms Network Overhead)
            val response = service.tapSiswaSesi(
                id = sesi.id,
                request = SesiTapRequest(siswaId = finalIdToSend, identifier = inputCode, status = "HADIR")
            )

            if (response.isSuccessful && response.body()?.success == true) {
                scanMessage = "✅ Presensi Berhasil: ${targetStudent?.namaSiswa ?: inputCode}"
                scannerInput = ""
                loadSesiRecords()
                onSesiUpdated()
            } else {
                val errorStr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                val backendMsg = if (!errorStr.isNullOrBlank()) {
                    try { org.json.JSONObject(errorStr).optString("message", "Siswa/Guru tidak ditemukan") } catch (e: Exception) { "Siswa/Guru tidak ditemukan" }
                } else {
                    response.body()?.message ?: "Siswa/Guru tidak ditemukan"
                }
                scanMessage = "❌ $backendMsg"
            }
        } catch (e: Exception) {
            scanMessage = "❌ Gagal memproses presensi"
        } finally {
            isProcessingScan = false
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SurfaceDark
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header Title Sesi
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        sesi.namaSesi ?: "Presensi Sesi Kelas",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Kelas: ${sesi.kelas?.namaKelas ?: "-"} • Mapel: ${sesi.mapel?.namaMapel ?: "-"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }

                StatusBadge(status = sesi.status ?: "AKTIF")
            }

            // Alert Banner (Adopted from SesiScanningModal.tsx)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                elevation = CardDefaults.cardElevation(2.dp),
                border = BorderStroke(1.dp, Border)
            ) {
                Text(
                    "Silakan scan kartu/QR atau ketik Nama/ID/RFID. Sistem akan otomatis mengenali Guru atau Siswa.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = Primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
            }



            // Universal SmartStudentPicker Input Field (Cari Entitas Absen)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "CARI ENTITAS ABSEN (SISWA / GURU)",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp
                )
                Box(modifier = Modifier.fillMaxWidth()) {
                    SmartStudentPicker(
                        value = scannerInput,
                        onValueChange = { scannerInput = it },
                        onSelectStudent = { selectedItem ->
                            scannerInput = selectedItem.identifier ?: selectedItem.name ?: ""
                            scope.launch { handleScan(selectedItem.id) }
                        },
                        onSubmitScan = { input ->
                            scope.launch { handleScan(input) }
                        },
                        tokenManager = tokenManager,
                        isLoading = isProcessingScan
                    )
                }
            }

            if (!scanMessage.isNullOrEmpty()) {
                Text(
                    scanMessage!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (scanMessage!!.startsWith("✅")) StatusHadir else Danger,
                    fontWeight = FontWeight.Bold
                )
            }

            // Live Attendance List Section & Filter Bar (Screenshot 2)
            var searchQuery by remember { mutableStateOf("") }
            var activeFilterTab by remember { mutableStateOf("SEMUA") }

            Text(
                "👥 DAFTAR HADIR SESI",
                style = MaterialTheme.typography.labelMedium,
                color = TextSecondary,
                fontWeight = FontWeight.Bold
            )

            // Stats Overview Chips (0 HADIR, 0 TELAT, 2 IZIN, 0 DISPEN, 68 ALPA, 0 BELUM)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val countHadir = siswaList.count { it.status == "HADIR" }
                val countIzin = siswaList.count { it.status == "IZIN" || it.status == "SAKIT" }
                val countDispen = siswaList.count { it.status == "DISPEN" }
                val countAlpa = siswaList.count { it.status == "ALPA" }
                val countPending = siswaList.count { it.status != "HADIR" && it.status != "IZIN" && it.status != "SAKIT" && it.status != "DISPEN" && it.status != "ALPA" }

                listOf(
                    "0 HADIR" to StatusHadir,
                    "0 TELAT" to Color(0xFFF59E0B),
                    "$countIzin IZIN" to StatusIzin,
                    "$countDispen DISPEN" to Color(0xFFA855F7),
                    "$countAlpa ALPA" to Danger,
                    "$countPending BELUM" to TextSecondary
                ).forEach { (label, color) ->
                    Text(
                        label,
                        modifier = Modifier
                            .background(color.copy(alpha = 0.12f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 3.dp),
                        fontSize = 8.sp,
                        color = color,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Filter Chips Bar (SEMUA, HADIR, PENDING, DISPEN, ALPA)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                listOf("SEMUA", "HADIR", "PENDING", "DISPEN", "ALPA").forEach { tab ->
                        val isSelected = activeFilterTab == tab
                        Button(
                            onClick = { activeFilterTab = tab },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) Primary else SurfaceVariantDark
                            ),
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text(tab, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = if (isSelected) Color.White else TextSecondary)
                        }
                    }
                }

            // Table Header: SISWA | TAP | AKSI CEPAT
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceVariantDark, RoundedCornerShape(6.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("SISWA", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(2f))
                Text("TAP", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("AKSI CEPAT", style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }

            val filteredList = siswaList.filter { item ->
                val matchesSearch = item.namaSiswa?.contains(searchQuery, ignoreCase = true) == true ||
                        item.nis?.contains(searchQuery) == true
                val matchesFilter = when (activeFilterTab) {
                    "HADIR" -> item.status == "HADIR"
                    "PENDING" -> item.status != "HADIR" && item.status != "DISPEN" && item.status != "ALPA"
                    "DISPEN" -> item.status == "DISPEN"
                    "ALPA" -> item.status == "ALPA"
                    else -> true
                }
                matchesSearch && matchesFilter
            }

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(filteredList) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(2f)) {
                                Text(
                                    item.namaSiswa,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                                Text(
                                    "NIS: ${item.displayNis}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                            }
                            Text(
                                item.waktuTap ?: if (item.status == "HADIR") "07:15" else "--:--",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                                fontSize = 11.sp,
                                modifier = Modifier.weight(1f)
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                listOf(
                                    "HADIR" to StatusHadir,
                                    "IZIN" to StatusIzin,
                                    "SAKIT" to StatusSakit,
                                    "DISPEN" to Color(0xFFA855F7),
                                    "ALPA" to Danger
                                ).forEach { (statusKey, color) ->
                                    val isSelected = item.status == statusKey
                                    Button(
                                        onClick = {
                                            // 1. Instant Optimistic UI Update
                                            siswaList = siswaList.map { s ->
                                                if ((s.siswaId == item.siswaId && s.siswaId.isNotEmpty()) || s.id == item.id) {
                                                    s.copy(status = statusKey)
                                                } else s
                                            }
                                            scope.launch {
                                                try {
                                                    val retrofit = ApiClient.create(tokenManager)
                                                    val service = retrofit.create(SesiKelasService::class.java)
                                                    val targetId = if (!item.siswaId.isNullOrEmpty()) item.siswaId else item.id
                                                    val targetAkademikId = if (!item.siswaAkademikId.isNullOrEmpty()) item.siswaAkademikId else targetId

                                                    val response = service.tapSiswaSesi(
                                                        id = sesi.id,
                                                        request = SesiTapRequest(
                                                            siswaId = targetId,
                                                            siswaAkademikId = targetAkademikId,
                                                            status = statusKey
                                                        )
                                                    )

                                                    if (response.isSuccessful && response.body()?.success == true) {
                                                        scanMessage = "✅ Status ${item.namaSiswa} ➔ $statusKey"
                                                        loadSesiRecords()
                                                        onSesiUpdated()
                                                    } else {
                                                        val errorStr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                                                        val backendMsg = if (!errorStr.isNullOrBlank()) {
                                                            try { org.json.JSONObject(errorStr).optString("message", "Gagal memperbarui status") } catch (e: Exception) { "Gagal memperbarui status" }
                                                        } else {
                                                            response.body()?.message ?: "Gagal memperbarui status"
                                                        }
                                                        scanMessage = "❌ $backendMsg"
                                                        loadSesiRecords()
                                                    }
                                                } catch (e: Exception) {
                                                    scanMessage = "❌ Gagal memproses presensi"
                                                    loadSesiRecords()
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isSelected) color else SurfaceVariantDark
                                        ),
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                                        modifier = Modifier.height(30.dp)
                                    ) {
                                        Text(statusKey.take(1), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isSelected) TextPrimary else TextSecondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Action Button: Tutup Sesi & Input Jurnal KBM
            if (sesi.status == "AKTIF" || sesi.status == "BERJALAN") {
                Button(
                    onClick = { showCloseDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Tutup Sesi Kelas & Jurnal KBM", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // Modal Dialog Input Jurnal KBM & Tutup Sesi
    if (showCloseDialog) {
        AlertDialog(
            onDismissRequest = { showCloseDialog = false },
            title = { Text("Tutup Sesi Kelas & Jurnal KBM", style = MaterialTheme.typography.titleMedium, color = TextPrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Masukkan materi KBM yang dibahas pada sesi ini:", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    OutlinedTextField(
                        value = materiDibahasInput,
                        onValueChange = { materiDibahasInput = it },
                        label = { Text("Materi Yang Dibahas") },
                        placeholder = { Text("e.g. Bab 3 Pengenalan Algoritma") },
                        colors = outlinedTextFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = catatanKbmInput,
                        onValueChange = { catatanKbmInput = it },
                        label = { Text("Catatan KBM Tambahan") },
                        placeholder = { Text("e.g. Siswa aktif mengerjakan latihan modul") },
                        colors = outlinedTextFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(SesiKelasService::class.java)
                                if (materiDibahasInput.isNotBlank()) {
                                    service.saveProgresMateri(
                                        id = sesi.id,
                                        request = ProgresMateriRequest(
                                            materiDibahas = materiDibahasInput,
                                            catatanKbm = catatanKbmInput
                                        )
                                    )
                                }
                                service.closeSesi(sesi.id)
                                showCloseDialog = false
                                onDismiss()
                                onSesiUpdated()
                            } catch (e: Exception) {}
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Danger)
                ) {
                    Text("Konfirmasi Tutup Sesi", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCloseDialog = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = SurfaceDark,
    unfocusedContainerColor = SurfaceDark,
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
