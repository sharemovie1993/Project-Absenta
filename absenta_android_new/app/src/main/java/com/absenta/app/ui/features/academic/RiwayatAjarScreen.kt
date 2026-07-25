package com.absenta.app.ui.features.academic

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.absenta.app.data.model.SesiKelas
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.components.StatusBadge
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import androidx.compose.foundation.BorderStroke
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * RiwayatAjarScreen — Layar riwayat mengajar & Jurnal KBM untuk Persona Guru / Petugas.
 *
 * Fitur Lengkap:
 * - KPI Summary Statistik Mengajar (Total Jam Mengajar, Total Sesi Selesai, Rekap Siswa Hadir)
 * - Daftar Riwayat Jurnal KBM & Materi yang Dibahas
 * - Metadata Lengkap (Nama Mapel, Kelas, Tanggal, Jam, Catatan KBM)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RiwayatAjarScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    var sesiList by remember { mutableStateOf<List<SesiKelas>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    suspend fun loadRiwayat() {
        isLoading = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(SesiKelasService::class.java)
            val response = service.listSesi(onlyMe = true, summary = true)
            if (response.isSuccessful && response.body()?.data != null) {
                sesiList = response.body()!!.data!!.filter { it.resolvedStatus == "SELESAI" }
            } else {
                sesiList = emptyList()
            }
        } catch (e: Exception) {
            sesiList = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadRiwayat() }

    val totalSesiSelesai = sesiList.size
    val totalMateriRecorded = sesiList.count { it.materiDibahas != null || it.catatanKbm != null || it.progresMateri != null }
    val totalHadirSiswa = sesiList.sumOf { it.resolvedHadirCount }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Riwayat Mengajar & Jurnal KBM",
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
                // 1. KPI Mengajar Header
                item {
                    Text("Statistik Mengajar Saya", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        KpiCard(
                            title = "Sesi Selesai",
                            value = "$totalSesiSelesai",
                            subtitle = "Sesi Mengajar",
                            icon = Icons.Default.CheckCircle,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Jurnal Terisi",
                            value = "$totalMateriRecorded",
                            subtitle = "Materi KBM",
                            icon = Icons.Default.Book,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Siswa Hadir",
                            value = "$totalHadirSiswa",
                            subtitle = "Presensi",
                            icon = Icons.Default.Group,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Daftar Riwayat Jurnal Kelas", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                }

                if (sesiList.isEmpty()) {
                    item {
                        EmptyState(
                            message = "Belum ada riwayat sesi mengajar yang selesai",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp)
                        )
                    }
                } else {
                    items(sesiList) { item ->
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
                                            item.displayNama,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = TextPrimary,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            "${item.kelasNama ?: "Kelas"} • ${item.tanggalFormatted}",
                                            fontSize = 11.sp,
                                            color = TextSecondary
                                        )
                                    }

                                    StatusBadge(status = "SELESAI")
                                }

                                Divider(modifier = Modifier.padding(vertical = 10.dp), color = Border)

                                // Jurnal Materi & Catatan KBM
                                val materi = item.resolvedMateri
                                val catatan = item.resolvedCatatan

                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Book, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 6.dp))
                                        Text("Materi: $materi", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.EventNote, contentDescription = null, tint = TextSecondary, modifier = Modifier.padding(end = 6.dp))
                                        Text("Catatan: $catatan", fontSize = 11.sp, color = TextSecondary)
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Footer info: Jam & Summary Kehadiran Siswa
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 4.dp))
                                        Text(item.timeRangeDisplay, fontSize = 11.sp, color = Primary, fontWeight = FontWeight.Bold)
                                    }

                                    Text(
                                        "Hadir: ${item.resolvedHadirCount} Siswa",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = StatusHadir
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
