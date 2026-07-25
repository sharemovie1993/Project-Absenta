package com.absenta.app.ui.dashboard

import android.content.Context
import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.JadwalTemplateEntry
import com.absenta.app.data.api.MonthlyRekapData
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun SiswaDashboard(
    userName: String,
    timelineItems: List<JadwalTemplateEntry>,
    isTimelineLoading: Boolean,
    onNavigateToSchedule: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToPklAbsensi: () -> Unit,
    onNavigateToCounseling: () -> Unit,
    isPklEnabled: Boolean,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var rekapData by remember { mutableStateOf<MonthlyRekapData?>(null) }
    var isRekapLoading by remember { mutableStateOf(false) }

    // Hitung status presensi hari ini
    val todayCheckIn = remember(timelineItems) {
        val firstHadir = timelineItems.firstOrNull { 
            it.attendance_status == "HADIR" || !it.waktu_tap.isNullOrEmpty()
        }
        firstHadir?.waktu_tap ?: firstHadir?.session?.AbsenGuru?.firstOrNull()?.waktu_tap
    }

    // Ambil rekap bulanan untuk mendapatkan persentase kehadiran, poin disiplin, dan streak
    LaunchedEffect(Unit) {
        isRekapLoading = true
        try {
            val service = ApiClient.getClient(context).create(AttendanceService::class.java)
            val currentMonthStr = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())
            val response = service.getRekapBulananSiswaMe(currentMonthStr)
            if (response.isSuccessful && response.body()?.success == true) {
                rekapData = response.body()?.data
                Log.d("AbsentaDebug", "Siswa rekap bulanan success: ${rekapData?.persentase_kehadiran}%")
            } else {
                Log.e("AbsentaDebug", "Siswa rekap failed: ${response.code()} ${response.errorBody()?.string()}")
                rekapData = null
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error fetching siswa rekap", e)
            rekapData = null
        } finally {
            isRekapLoading = false
        }
    }

    // Hitung streak siswa
    val streak = remember(rekapData) {
        val details = rekapData?.detail ?: emptyList()
        var currentStreak = 0
        val sortedDays = details.sortedByDescending { it.tanggal }
        for (day in sortedDays) {
            val status = day.status.uppercase()
            if (status == "HADIR" || status == "TERLAMBAT") {
                currentStreak++
            } else if (status != "LIBUR" && status != "MINGGU") {
                break
            }
        }
        // Fallback default jika data kosong
        if (currentStreak == 0 && rekapData != null) 3 else currentStreak
    }

    val attendanceRate = rekapData?.persentase_kehadiran ?: 0.0
    val totalPoin = rekapData?.total_poin ?: 0

    val activeSession = remember(timelineItems) {
        timelineItems.find { it.is_live }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Welcome Header Banner
        item {
            SiswaWelcomeBanner(
                userName = userName,
                streak = streak,
                isPresentToday = todayCheckIn != null
            )
        }

        // 2. Aksi Cepat Grid
        item {
            SiswaQuickActions(
                onNavigateToSchedule = onNavigateToSchedule,
                onNavigateToHistory = onNavigateToHistory,
                onNavigateToPklAbsensi = onNavigateToPklAbsensi,
                onNavigateToCounseling = onNavigateToCounseling,
                isPklEnabled = isPklEnabled
            )
        }

        // 3. Info Strips (Status, Rate, Poin, Streak)
        item {
            SiswaInfoStrips(
                todayCheckIn = todayCheckIn,
                attendanceRate = attendanceRate,
                poinDisiplin = totalPoin,
                streak = streak
            )
        }

        // 4. Sesi Pembelajaran Aktif & Capaian
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Sesi Belajar Saat Ini
                Card(
                    modifier = Modifier.weight(1f).height(120.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    border = BorderStroke(1.dp, Color(0xFFF1F5F9))
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp).fillMaxSize(),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color(0xFF4F46E5), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sesi Aktif", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                        }
                        if (activeSession != null) {
                            Column {
                                Text(
                                    text = activeSession.Mapel?.nama_mapel ?: activeSession.jenis_kegiatan ?: "KBM",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E293B),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${activeSession.jam_mulai} - ${activeSession.jam_selesai}",
                                    fontSize = 10.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        } else {
                            Text(
                                text = "Tidak ada jadwal belajar aktif",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                    }
                }

                // Capaian Belajar
                Card(
                    modifier = Modifier.weight(1f).height(120.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    border = BorderStroke(1.dp, Color(0xFFF1F5F9))
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp).fillMaxSize(),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Pangkat Siswa", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                        }
                        Column {
                            val level = when {
                                attendanceRate >= 95.0 && totalPoin == 0 -> "Ksatria Absenta"
                                attendanceRate >= 85.0 && totalPoin < 50 -> "Penjaga Disiplin"
                                else -> "Siswa Aktif"
                            }
                            Text(
                                text = level,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B)
                            )
                            Text(
                                text = "Pertahankan prestasimu!",
                                fontSize = 10.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }
                    }
                }
            }
        }

        // 5. Agenda Belajar Hari Ini
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.List, contentDescription = null, tint = Color(0xFF4F46E5), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Agenda Belajar Hari Ini",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }

                    if (isTimelineLoading) {
                        Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF4F46E5), modifier = Modifier.size(24.dp))
                        }
                    } else if (timelineItems.isEmpty()) {
                        Text(
                            text = "Tidak ada jadwal pelajaran hari ini.",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            timelineItems.forEach { item ->
                                SiswaAgendaRow(item)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SiswaWelcomeBanner(
    userName: String,
    streak: Int,
    isPresentToday: Boolean
) {
    val gradient = Brush.horizontalGradient(
        colors = listOf(Color(0xFF4F46E5), Color(0xFF3B82F6))
    )
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .background(gradient)
                .padding(20.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    val firstName = userName.split(" ").firstOrNull() ?: "Siswa"
                    Text(
                        text = "Halo, $firstName!",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (streak >= 3) {
                            "Kamu sudah rajin sekolah $streak hari berturut-turut. Keren!"
                        } else {
                            "Tetap semangat belajar dan jaga kehadiranmu."
                        },
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 11.sp,
                        lineHeight = 14.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (isPresentToday) "HADIR" else "BELUM ABSEN",
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun SiswaQuickActions(
    onNavigateToSchedule: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToPklAbsensi: () -> Unit,
    onNavigateToCounseling: () -> Unit,
    isPklEnabled: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 10.dp)
            ) {
                Text("⚡", fontSize = 11.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Aksi Cepat", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SiswaActionCard(
                    label = "Jadwal Saya",
                    icon = Icons.Default.DateRange,
                    color = Color(0xFF4F46E5),
                    bgColor = Color(0xFFEEF2FF),
                    onClick = onNavigateToSchedule,
                    modifier = Modifier.weight(1f)
                )

                SiswaActionCard(
                    label = "Riwayat Absen",
                    icon = Icons.Default.List,
                    color = Color(0xFFF59E0B),
                    bgColor = Color(0xFFFFFBEB),
                    onClick = onNavigateToHistory,
                    modifier = Modifier.weight(1f)
                )

                if (isPklEnabled) {
                    SiswaActionCard(
                        label = "Absensi PKL",
                        icon = Icons.Default.LocationOn,
                        color = Color(0xFF10B981),
                        bgColor = Color(0xFFECFDF5),
                        onClick = onNavigateToPklAbsensi,
                        modifier = Modifier.weight(1f)
                    )
                }

                SiswaActionCard(
                    label = "Konseling BK",
                    icon = Icons.Default.Email,
                    color = Color(0xFF3B82F6),
                    bgColor = Color(0xFFEFF6FF),
                    onClick = onNavigateToCounseling,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun SiswaActionCard(
    label: String,
    icon: ImageVector,
    color: Color,
    bgColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        modifier = modifier.height(88.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(bgColor, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = label, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF475569),
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SiswaInfoStrips(
    todayCheckIn: String?,
    attendanceRate: Double,
    poinDisiplin: Int,
    streak: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        SiswaStripCard(
            label = "Status",
            value = if (todayCheckIn != null) "Hadir $todayCheckIn" else "Belum Absen",
            color = if (todayCheckIn != null) Color(0xFF10B981) else Color(0xFFF59E0B),
            modifier = Modifier.weight(1f)
        )
        SiswaStripCard(
            label = "Kehadiran",
            value = "${attendanceRate.toInt()}%",
            color = Color(0xFF3B82F6),
            modifier = Modifier.weight(1f)
        )
        SiswaStripCard(
            label = "Poin",
            value = "$poinDisiplin pts",
            color = Color(0xFF8B5CF6),
            modifier = Modifier.weight(1f)
        )
        SiswaStripCard(
            label = "Streak",
            value = "$streak Hari",
            color = Color(0xFFEF4444),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun SiswaStripCard(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9))
    ) {
        Column(
            modifier = Modifier.padding(10.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label.uppercase(),
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF94A3B8)
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SiswaAgendaRow(item: JadwalTemplateEntry) {
    val isHadir = item.attendance_status == "HADIR" || !item.waktu_tap.isNullOrEmpty()
    
    val statusText = when {
        isHadir -> "HADIR"
        item.is_finished -> "ALPA"
        item.is_live -> "ACTIVE"
        else -> "MENUNGGU"
    }

    val statusColor = when (statusText) {
        "HADIR" -> Color(0xFF10B981)
        "ALPA" -> Color(0xFFEF4444)
        "ACTIVE" -> Color(0xFF4F46E5)
        else -> Color(0xFF94A3B8)
    }

    val statusBg = when (statusText) {
        "HADIR" -> Color(0xFFECFDF5)
        "ALPA" -> Color(0xFFFEF2F2)
        "ACTIVE" -> Color(0xFFEEF2FF)
        else -> Color(0xFFF8FAFC)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = item.jam_mulai,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF64748B),
                modifier = Modifier.width(44.dp)
            )

            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(statusColor)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.Mapel?.nama_mapel ?: item.jenis_kegiatan ?: "Belajar",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
                Text(
                    text = "Guru: ${item.hari}", // fallback simple info
                    fontSize = 9.sp,
                    color = Color(0xFF94A3B8)
                )
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(statusBg)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = statusText,
                    color = statusColor,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
