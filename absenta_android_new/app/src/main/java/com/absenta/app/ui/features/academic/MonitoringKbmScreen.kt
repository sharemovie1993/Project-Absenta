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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.LockClock
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.SesiKelasService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.SesiKelasItem
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
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

/**
 * MonitoringKbmScreen — Pemantauan KBM Real-Time Seluruh Kelas (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/attendance/sesi-absensi/today`, `PATCH /status`)
 * - Format Jam WIB Presisi (`07:30 – 09:00 WIB`)
 * - Dynamic RBAC Guard (`academic.teaching.rekap` / Guru Piket / Kurikulum / Kepsek / Admin)
 * - Detail Modal & Sesi Closing Action
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonitoringKbmScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var sesiList by remember { mutableStateOf<List<SesiKelasItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    // Modal Detail State
    var selectedSesiDetail by remember { mutableStateOf<SesiKelasItem?>(null) }
    var isClosingSesi by remember { mutableStateOf(false) }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(SesiKelasService::class.java)

        try {
            val response = service.listSesi()
            if (response.isSuccessful && response.body()?.data != null) {
                sesiList = response.body()!!.data!!
            }
        } catch (e: Exception) {
            sesiList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val canManageSesi = remember(capabilities, userRole) {
        capabilities.contains("attendance.sessions.update.attendance") ||
                userRole.uppercase().contains("KURIKULUM") ||
                userRole.uppercase().contains("KEPSEK") ||
                userRole.uppercase().contains("ADMIN")
    }

    val filteredList = remember(sesiList, searchQuery, selectedFilter) {
        sesiList.filter { item ->
            val matchSearch = searchQuery.isBlank() ||
                    item.displayGuru.contains(searchQuery, ignoreCase = true) ||
                    item.displayMapel.contains(searchQuery, ignoreCase = true) ||
                    item.displayKelas.contains(searchQuery, ignoreCase = true)

            val statusUpper = (item.status ?: "OPEN").uppercase()
            val hasJurnal = !item.jurnalKbm.isNullOrBlank()

            val matchFilter = when (selectedFilter) {
                "LIVE" -> statusUpper == "OPEN"
                "CLOSED" -> statusUpper == "CLOSED"
                "JURNAL" -> hasJurnal
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val totalSesi = sesiList.size
    val liveCount = sesiList.count { (it.status ?: "OPEN").uppercase() == "OPEN" }
    val closedCount = sesiList.count { (it.status ?: "").uppercase() == "CLOSED" }
    val jurnalCount = sesiList.count { !it.jurnalKbm.isNullOrBlank() }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Live Monitoring KBM Real-Time",
                onNavigateBack = onNavigateBack
            )
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
                            text = "Ringkasan Pembelajaran Hari Ini (Seluruh Kelas)",
                            style = MaterialTheme.typography.labelMedium,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Sesi Live",
                                value = "$liveCount",
                                subtitle = "Berlangsung",
                                icon = Icons.Default.PlayCircle,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Sesi Selesai",
                                value = "$closedCount",
                                subtitle = "KBM Ditutup",
                                icon = Icons.Default.CheckCircle,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Jurnal KBM",
                                value = "$jurnalCount",
                                subtitle = "Materi Terisi",
                                icon = Icons.Default.Book,
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
                            placeholder = { Text("Cari Guru / Mapel / Kelas...", color = TextSecondary) },
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
                            item { FilterChipKbm("SEMUA ($totalSesi)", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKbm("🟢 BERLANGSUNG ($liveCount)", "LIVE", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKbm("✅ SELESAI ($closedCount)", "CLOSED", selectedFilter) { selectedFilter = it } }
                            item { FilterChipKbm("📖 ADA JURNAL ($jurnalCount)", "JURNAL", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // 4. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada sesi KBM berlangsung pada filter ini.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            SesiKbmCardItemFull(
                                item = item,
                                onClick = { selectedSesiDetail = item }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modal Detail Sesi KBM & Closing Action
    if (selectedSesiDetail != null) {
        val target = selectedSesiDetail!!
        val isLive = (target.status ?: "OPEN").uppercase() == "OPEN"

        AlertDialog(
            onDismissRequest = { selectedSesiDetail = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Class, contentDescription = null, tint = Primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Detail Sesi KBM ${target.displayKelas}", color = TextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("📖 Mata Pelajaran: ${target.displayMapel}", fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("👤 Guru Pengajar: ${target.displayGuru}", color = TextSecondary)
                    Text("⏰ Waktu Pelajaran: ${target.waktuDisplay}", color = TextSecondary)
                    Text("📌 Status Sesi: ${if (isLive) "🟢 BERLANGSUNG (LIVE)" else "✅ SELESAI (CLOSED)"}", color = if (isLive) StatusHadir else StatusIzin, fontWeight = FontWeight.Bold)

                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceVariantDark)
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("📝 Jurnal / Materi KBM:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = target.jurnalKbm.ifEmpty { "Jurnal materi pembelajaran belum diisi guru." },
                                fontSize = 12.sp,
                                color = TextPrimary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                if (isLive && canManageSesi) {
                    Button(
                        enabled = !isClosingSesi,
                        onClick = {
                            scope.launch {
                                isClosingSesi = true
                                try {
                                    val retrofit = ApiClient.create(tokenManager)
                                    val service = retrofit.create(SesiKelasService::class.java)
                                    service.closeSesi(target.id, mapOf("status" to "CLOSED"))
                                    selectedSesiDetail = null
                                    loadData()
                                } catch (e: Exception) {
                                } finally {
                                    isClosingSesi = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Danger)
                    ) {
                        Icon(Icons.Default.LockClock, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isClosingSesi) "Menutup..." else "Tutup Sesi KBM", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(onClick = { selectedSesiDetail = null }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                        Text("Tutup Modal", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                if (isLive && canManageSesi) {
                    TextButton(onClick = { selectedSesiDetail = null }) {
                        Text("Batal", color = TextSecondary)
                    }
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
private fun FilterChipKbm(
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
private fun SesiKbmCardItemFull(
    item: SesiKelasItem,
    onClick: () -> Unit
) {
    val statusUpper = (item.status ?: "OPEN").uppercase()
    val isLive = statusUpper == "OPEN"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
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
                        text = item.displayMapel,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "🏫 Kelas: ${item.displayKelas} | 👤 ${item.displayGuru}",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background((if (isLive) StatusHadir else StatusIzin).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = if (isLive) "🟢 BERLANGSUNG" else "✅ SELESAI",
                        color = if (isLive) StatusHadir else StatusIzin,
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
                    Text(
                        text = "⏰ Jam KBM: ${item.waktuDisplay}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )

                    if (!item.jurnalKbm.isNullOrBlank()) {
                        Text(
                            text = "📖 Jurnal Terisi",
                            fontSize = 11.sp,
                            color = StatusHadir,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
