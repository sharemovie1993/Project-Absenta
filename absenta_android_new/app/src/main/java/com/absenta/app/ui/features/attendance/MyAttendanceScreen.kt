package com.absenta.app.ui.features.attendance

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBackIosNew
import androidx.compose.material.icons.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.AttendanceRecord
import com.absenta.app.data.model.AttendanceSummary
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.components.StatusBadge
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusAlpa
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * MyAttendanceScreen — Layar rekap absensi harian untuk Persona Siswa & Orang Tua.
 *
 * Fitur Lengkap:
 * - Dynamic Month Navigator (Prev/Next Bulan)
 * - KPI Summary Cards (Hadir %, Hadir, Terlambat, Sakit/Izin, Alpa)
 * - Status Filter Chips (Semua, Hadir, Terlambat, Izin/Sakit, Alpa)
 * - Detail Timeline Dialog saat record diklik (Jam Datang Gerbang, Jam Pulang Gerbang, Sesi Kelas)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAttendanceScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var summary by remember { mutableStateOf(AttendanceSummary(hadir = 0, izin = 0, sakit = 0, alpa = 0, persentaseHadir = 100.0)) }
    var records by remember { mutableStateOf<List<AttendanceRecord>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf("SEMUA") }
    var selectedRecordDetail by remember { mutableStateOf<AttendanceRecord?>(null) }

    val calendar = remember { Calendar.getInstance() }
    var selectedBulan by remember { mutableStateOf(SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(calendar.time)) }
    var monthDisplayLabel by remember { mutableStateOf(SimpleDateFormat("MMMM yyyy", Locale("id", "ID")).format(calendar.time)) }

    fun updateMonthDisplay() {
        val sdfFormat = SimpleDateFormat("yyyy-MM", Locale.getDefault())
        val dateObj = try { sdfFormat.parse(selectedBulan) } catch (e: Exception) { null }
        if (dateObj != null) {
            monthDisplayLabel = SimpleDateFormat("MMMM yyyy", Locale("id", "ID")).format(dateObj)
        }
    }

    suspend fun loadData() {
        isLoading = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(AttendanceService::class.java)
            val response = service.getMyAttendance(bulan = selectedBulan)
            if (response.isSuccessful && response.body()?.data != null) {
                val data = response.body()!!.data!!
                summary = data.resolvedSummary
                records = data.records ?: emptyList()
            } else {
                records = emptyList()
            }
        } catch (e: Exception) {
            records = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(selectedBulan) {
        updateMonthDisplay()
        loadData()
    }

    val filteredRecords = remember(records, selectedFilter) {
        when (selectedFilter) {
            "HADIR" -> records.filter { (it.status ?: "").uppercase().contains("HADIR") && !(it.isTerlambat ?: false) }
            "TERLAMBAT" -> records.filter { (it.isTerlambat ?: false) || (it.status ?: "").uppercase().contains("TERLAMBAT") }
            "IZIN" -> records.filter { (it.status ?: "").uppercase().let { s -> s.contains("IZIN") || s.contains("SAKIT") } }
            "ALPA" -> records.filter { (it.status ?: "").uppercase().contains("ALPA") }
            else -> records
        }
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Rekap Absensi Saya",
                onNavigateBack = onNavigateBack
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        when {
            isLoading -> LoadingOverlay(modifier = Modifier.padding(paddingValues))
            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 1. Month Switcher Bar
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = {
                                try {
                                    val sdf = SimpleDateFormat("yyyy-MM", Locale.getDefault())
                                    val d = sdf.parse(selectedBulan) ?: Calendar.getInstance().time
                                    val cal = Calendar.getInstance().apply { time = d; add(Calendar.MONTH, -1) }
                                    selectedBulan = sdf.format(cal.time)
                                } catch (e: Exception) {}
                            }) {
                                Icon(Icons.Default.ArrowBackIosNew, contentDescription = "Bulan Lalu", tint = Primary, modifier = Modifier.padding(4.dp))
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.EventAvailable, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 6.dp))
                                Text(
                                    monthDisplayLabel.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TextPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            IconButton(onClick = {
                                try {
                                    val sdf = SimpleDateFormat("yyyy-MM", Locale.getDefault())
                                    val d = sdf.parse(selectedBulan) ?: Calendar.getInstance().time
                                    val cal = Calendar.getInstance().apply { time = d; add(Calendar.MONTH, 1) }
                                    selectedBulan = sdf.format(cal.time)
                                } catch (e: Exception) {}
                            }) {
                                Icon(Icons.Default.ArrowForwardIos, contentDescription = "Bulan Depan", tint = Primary, modifier = Modifier.padding(4.dp))
                            }
                        }
                    }
                }

                // 2. Summary KPI Cards
                item {
                    Text("Ringkasan Kehadiran Bulan Ini", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        KpiCard(
                            title = "Hadir",
                            value = "${summary.hadir}",
                            subtitle = "Hari",
                            icon = Icons.Default.CheckCircle,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Terlambat",
                            value = "${summary.terlambat ?: 0}",
                            subtitle = "Hari",
                            icon = Icons.Default.Warning,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Izin / Sakit",
                            value = "${summary.izin + summary.sakit}",
                            subtitle = "Hari",
                            icon = Icons.Default.Info,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        KpiCard(
                            title = "Tanpa Keterangan",
                            value = "${summary.alpa}",
                            subtitle = "Hari (Alpa)",
                            icon = Icons.Default.Close,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Tingkat Kehadiran",
                            value = "${summary.persentaseHadir.toInt()}%",
                            subtitle = "Persentase",
                            icon = Icons.Default.EventAvailable,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // 3. Status Filter Chips
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Filter Riwayat", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))

                    val filterOptions = listOf("SEMUA", "HADIR", "TERLAMBAT", "IZIN", "ALPA")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(filterOptions) { opt ->
                            val isSelected = selectedFilter == opt
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (isSelected) Primary.copy(alpha = 0.12f) else SurfaceDark)
                                    .border(1.dp, if (isSelected) Primary else Border, RoundedCornerShape(20.dp))
                                    .clickable { selectedFilter = opt }
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = opt,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Primary else TextPrimary
                                )
                            }
                        }
                    }
                }

                // 4. Daily Attendance Records List
                if (filteredRecords.isEmpty()) {
                    item {
                        EmptyState(
                            message = "Tidak ada catatan absensi untuk filter $selectedFilter pada $monthDisplayLabel",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp)
                        )
                    }
                } else {
                    items(filteredRecords) { record ->
                        val isTerlambat = record.isTerlambat == true || (record.status ?: "").uppercase().contains("TERLAMBAT")
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedRecordDetail = record },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                            elevation = CardDefaults.cardElevation(2.dp),
                            border = BorderStroke(1.dp, Border)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        record.tanggal ?: "-",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    val jamDatang = record.jamDatang ?: record.waktuTap ?: "-"
                                    val jamPulang = record.jamPulang ?: "-"
                                    Text(
                                        "Datang: $jamDatang ${if (jamPulang != "-") "• Pulang: $jamPulang" else ""}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary
                                    )
                                }

                                StatusBadge(status = if (isTerlambat) "TERLAMBAT" else (record.status ?: "HADIR"))
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal Detail Record Timeline
    if (selectedRecordDetail != null) {
        val rec = selectedRecordDetail!!
        AlertDialog(
            onDismissRequest = { selectedRecordDetail = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Detail Absensi Harian", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TextPrimary)
                    IconButton(onClick = { selectedRecordDetail = null }) {
                        Icon(Icons.Default.Close, contentDescription = "Tutup", tint = TextSecondary)
                    }
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(rec.tanggal ?: "-", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = Primary)
                    Divider(color = Border)

                    // Gate In Record
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = StatusHadir, modifier = Modifier.padding(end = 8.dp))
                        Column {
                            Text("Absensi Gerbang (Datang)", fontSize = 11.sp, color = TextSecondary)
                            Text(rec.jamDatang ?: rec.waktuTap ?: "Belum Tap", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }

                    // Gate Out Record
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = StatusIzin, modifier = Modifier.padding(end = 8.dp))
                        Column {
                            Text("Absensi Gerbang (Pulang)", fontSize = 11.sp, color = TextSecondary)
                            Text(rec.jamPulang ?: "Belum Pulang", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                    }

                    // Keterangan / Status
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 8.dp))
                        Column {
                            Text("Status & Catatan", fontSize = 11.sp, color = TextSecondary)
                            Text(rec.keterangan ?: rec.status ?: "Hadir Tepat Waktu", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                        }
                    }
                }
            },
            confirmButton = {},
            containerColor = SurfaceDark
        )
    }
}

