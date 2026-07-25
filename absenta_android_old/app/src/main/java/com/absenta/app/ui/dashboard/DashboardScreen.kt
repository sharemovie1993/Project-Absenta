package com.absenta.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.ui.dashboard.tabs.BerandaTabContent
import com.absenta.app.ui.dashboard.tabs.SayaTabContent
import android.util.Log

data class DynamicTab(
    val id: String,
    val title: String,
    val icon: ImageVector,
    val node: com.absenta.app.data.api.SidebarNode? = null
)

@Composable
fun DashboardScreen(
    currentMainTabId: String,
    onMainTabChange: (String) -> Unit,
    onNavigateToHistory: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToScanner: () -> Unit,
    onNavigateToMyAttendance: () -> Unit,
    onNavigateToCoopPOS: () -> Unit,
    onNavigateToCoopSavings: () -> Unit,
    onNavigateToCoopLoans: () -> Unit,
    onNavigateToViolations: () -> Unit,
    onNavigateToCounseling: () -> Unit,
    onNavigateToGenericDetail: (String) -> Unit,
    onNavigateToPklVerification: () -> Unit,
    onNavigateToTeachingJournal: () -> Unit,
    onNavigateToSchedule: () -> Unit,
    onNavigateToSubscriptionPlans: () -> Unit,
    onNavigateToTenantInvoice: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToAttendanceRekap: () -> Unit,
    onNavigateToSarpras: () -> Unit,
    onNavigateToPklAbsensi: () -> Unit,
    onNavigateToPiket: () -> Unit,
    onNavigateToAcademicSiswa: () -> Unit,
    onNavigateToAcademicTahunPelajaran: () -> Unit,
    onNavigateToAcademicGuru: () -> Unit,
    onNavigateToAcademicKelas: () -> Unit,
    onNavigateToAcademicMapel: () -> Unit,
    onNavigateToAcademicSemester: () -> Unit,
    onNavigateToAcademicJurusan: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DashboardViewModel = viewModel()
) {
    val context = LocalContext.current

    // Session & Capabilities collected from ViewModel StateFlows
    val userRole by viewModel.userRole.collectAsState()
    val userName by viewModel.userName.collectAsState()
    val enabledFeatures by viewModel.enabledFeatures.collectAsState()

    // Timeline Sesi Detail State
    val timelineItems by viewModel.timelineItems.collectAsState()
    val isTimelineLoading by viewModel.isTimelineLoading.collectAsState()
    var selectedSesiDetail by remember { mutableStateOf<com.absenta.app.data.api.JadwalTemplateEntry?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
    ) {
        when (currentMainTabId) {
            "BERANDA" -> {
                if (userRole == "PARENT" || userRole == "WALI_MURID" || userRole == "ORTU") {
                    ParentDashboard(userName = userName)
                } else if (userRole == "SISWA" || userRole == "STUDENT") {
                    val isPklEnabled = enabledFeatures.contains("HUBIN")
                    SiswaDashboard(
                        userName = userName,
                        timelineItems = timelineItems,
                        isTimelineLoading = isTimelineLoading,
                        onNavigateToSchedule = onNavigateToSchedule,
                        onNavigateToHistory = onNavigateToHistory,
                        onNavigateToPklAbsensi = onNavigateToPklAbsensi,
                        onNavigateToCounseling = onNavigateToCounseling,
                        isPklEnabled = isPklEnabled
                    )
                } else {
                    BerandaTabContent(
                        viewModel = viewModel,
                        onNavigateToSchedule = onNavigateToSchedule,
                        onNavigateToTeachingJournal = onNavigateToTeachingJournal,
                        onNavigateToViolations = onNavigateToViolations,
                        onNavigateToPiket = onNavigateToPiket,
                        onNavigateToAttendanceRekap = onNavigateToAttendanceRekap,
                        onNavigateToSarpras = onNavigateToSarpras,
                        onNavigateToCounseling = onNavigateToCounseling,
                        gatedNavigateToCoopPOS = onNavigateToCoopPOS,
                        gatedNavigateToCoopSavings = onNavigateToCoopSavings,
                        gatedNavigateToCoopLoans = onNavigateToCoopLoans,
                        gatedNavigateToScanner = onNavigateToScanner,
                        gatedNavigateToPklVerification = onNavigateToPklVerification,
                        gatedNavigateToGenericDetail = onNavigateToGenericDetail,
                        onActionTimeline = { item ->
                            if (item.session != null) {
                                selectedSesiDetail = item
                            } else {
                                android.widget.Toast.makeText(context, "Sesi belum diaktifkan oleh sistem/petugas", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
            }
            "SAYA" -> {
                SayaTabContent(
                    viewModel = viewModel,
                    onLogout = onLogout,
                    onNavigateToProfile = onNavigateToProfile,
                    onNavigateToNotifications = onNavigateToNotifications
                )
            }
            else -> {}
        }

        // Dialog Detail Sesi (Daftar Hadir Siswa)
        if (selectedSesiDetail != null) {
            val entry = selectedSesiDetail!!
            val summary = entry.session?._summary
            AlertDialog(
                onDismissRequest = { selectedSesiDetail = null },
                title = {
                    Column {
                        Text(
                            text = entry.Mapel?.nama_mapel ?: entry.jenis_kegiatan ?: "Detail Sesi",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "${entry.Kelas?.nama_kelas ?: "-"} • ${entry.jam_mulai} - ${entry.jam_selesai}",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                },
                text = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // Summary counts
                        if (summary != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Hadir: ${summary.HADIR}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                                Text("Terlambat: ${summary.TERLAMBAT}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                                Text("Izin: ${summary.IZIN}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))
                                Text("Sakit: ${summary.SAKIT}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF8B5CF6))
                                Text("Alpa: ${summary.ALPA}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(1.dp)
                                    .background(Color(0xFFE2E8F0))
                            )
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Daftar Presensi Siswa (Live Sync)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                        Spacer(modifier = Modifier.height(6.dp))
                        
                        // List of students
                        Box(modifier = Modifier.height(180.dp)) {
                            LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                item { StudentPresenceRow("Budi Santoso", "HADIR", "07:05") }
                                item { StudentPresenceRow("Siti Aminah", "TERLAMBAT", "07:20") }
                                item { StudentPresenceRow("Ahmad Fauzi", "HADIR", "06:58") }
                                item { StudentPresenceRow("Dewi Lestari", "HADIR", "07:01") }
                                item { StudentPresenceRow("Rian Hidayat", "IZIN", null) }
                                item { StudentPresenceRow("Fitriani", "HADIR", "07:03") }
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { selectedSesiDetail = null }) {
                        Text("Tutup", fontWeight = FontWeight.Bold, color = Color(0xFF1E3C72))
                    }
                }
            )
        }
    }
}

@Composable
private fun StudentPresenceRow(name: String, status: String, time: String?) {
    val statusColor = when (status) {
        "HADIR" -> Color(0xFF10B981)
        "TERLAMBAT" -> Color(0xFFF59E0B)
        "IZIN", "SAKIT" -> Color(0xFF3B82F6)
        else -> Color(0xFFEF4444)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(text = name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1F2937))
            if (time != null) {
                Text(text = "Tap: $time", fontSize = 10.sp, color = Color(0xFF9CA3AF))
            }
        }
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(statusColor.copy(alpha = 0.15f))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
            Text(
                text = status,
                color = statusColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
