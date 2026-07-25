package com.absenta.app.ui.dashboard.widgets

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.JadwalTemplateEntry
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun StaffScheduleWidget(
    timelineItems: List<JadwalTemplateEntry>,
    isLoading: Boolean,
    onAction: (JadwalTemplateEntry) -> Unit,
    onOpenJournal: (String, JadwalTemplateEntry) -> Unit,
    modifier: Modifier = Modifier
) {
    val activeSession = remember(timelineItems) {
        timelineItems.find { it.is_live }
    }

    val formattedDate = remember {
        val sdf = SimpleDateFormat("EEEE, d MMMM yyyy", Locale("id", "ID"))
        sdf.format(Date())
    }

    if (isLoading) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .height(200.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(
                        color = Color(0xFF4F46E5),
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "SINKRONISASI JADWAL...",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 1.sp
                    )
                }
            }
        }
        return
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Inside Card
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.DateRange,
                        contentDescription = null,
                        tint = Color(0xFF4F46E5),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sesi Pengajaran Hari Ini",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF334155),
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .height(12.dp)
                            .width(1.dp)
                            .background(Color(0xFFE2E8F0))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = formattedDate,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8)
                    )
                }
                if (timelineItems.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFEEF2FF))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "${timelineItems.size} Sesi",
                            color = Color(0xFF4F46E5),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            // Spotlight Active Session
            if (activeSession != null) {
                SpotlightSessionCard(
                    session = activeSession,
                    onAction = { onAction(activeSession) },
                    onOpenJournal = { sessionId -> onOpenJournal(sessionId, activeSession) }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Timeline List (Filter out live session to avoid redundancy)
            val listItems = remember(timelineItems) {
                timelineItems.filter { !it.is_live }
            }

            if (listItems.isEmpty() && activeSession == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFCBD5E1),
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Belum Ada Sesi Pengajaran",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 1.sp,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Jadwal mengajar Anda hari ini kosong.",
                            fontSize = 9.sp,
                            color = Color(0xFFCBD5E1),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listItems.forEach { item ->
                        TimelineListItem(
                            item = item,
                            onClick = { onAction(item) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SpotlightSessionCard(
    session: JadwalTemplateEntry,
    onAction: () -> Unit,
    onOpenJournal: (String) -> Unit
) {
    val gradient = Brush.linearGradient(
        colors = listOf(Color(0xFF4F46E5), Color(0xFF2563EB))
    )

    // Pulse animation for Live indicator
    val infiniteTransition = rememberInfiniteTransition(label = "live_pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "live_pulse_alpha"
    )

    val isGuruHadir = session.attendance_status == "HADIR" || !session.waktu_tap.isNullOrEmpty() ||
            (session.session?.AbsenGuru?.firstOrNull()?.waktu_tap != null)

    val teacherStatus = when {
        isGuruHadir -> {
            val isTerlambat = session.session?.AbsenGuru?.firstOrNull()?.is_terlambat == true
            if (isTerlambat) "TERLAMBAT" else "TEPAT_WAKTU"
        }
        session.is_finished -> "ALPA"
        else -> "BELUM_HADIR"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onAction),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .background(gradient)
                .padding(14.dp)
                .fillMaxWidth()
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = alpha))
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "SESI BERLANGSUNG",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                    }

                    // Live Attendance Status Badge
                    when (teacherStatus) {
                        "TEPAT_WAKTU" -> {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.White.copy(alpha = 0.15f))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(10.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Tepat Waktu", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        "TERLAMBAT" -> {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.White.copy(alpha = 0.15f))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(10.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Terlambat", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = session.Mapel?.nama_mapel ?: session.jenis_kegiatan ?: "Kegiatan",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.85f),
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = session.Kelas?.nama_kelas ?: "-",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.85f),
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${session.jam_mulai} - ${session.jam_selesai}",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onAction,
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                        modifier = Modifier.height(26.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "DASHBOARD SESI",
                            color = Color(0xFF4F46E5),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    if (isGuruHadir && session.session?.id != null) {
                        Button(
                            onClick = { onOpenJournal(session.session.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.15f)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                            modifier = Modifier.height(26.dp),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "JURNAL KBM",
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineListItem(
    item: JadwalTemplateEntry,
    onClick: () -> Unit
) {
    val isGuruHadir = item.attendance_status == "HADIR" || !item.waktu_tap.isNullOrEmpty() ||
            (item.session?.AbsenGuru?.firstOrNull()?.waktu_tap != null)

    val teacherStatus = when {
        isGuruHadir -> {
            val isTerlambat = item.session?.AbsenGuru?.firstOrNull()?.is_terlambat == true
            if (isTerlambat) "TERLAMBAT" else "TEPAT_WAKTU"
        }
        item.is_finished -> "ALPA"
        else -> "BELUM_HADIR"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time Block (Left)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier
                    .width(52.dp)
                    .padding(end = 8.dp)
            ) {
                Text(
                    text = item.jam_mulai,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
                Box(
                    modifier = Modifier
                        .height(8.dp)
                        .width(1.dp)
                        .background(Color(0xFFE2E8F0))
                        .padding(vertical = 2.dp)
                )
                Text(
                    text = item.jam_selesai,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF94A3B8)
                )
            }

            Box(
                modifier = Modifier
                    .height(28.dp)
                    .width(1.dp)
                    .background(Color(0xFFF1F5F9))
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Info Block (Center)
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.Mapel?.nama_mapel ?: item.jenis_kegiatan ?: "KBM",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFF1E293B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    Spacer(modifier = Modifier.width(4.dp))

                    // Status Badge
                    when (teacherStatus) {
                        "TEPAT_WAKTU" -> {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(0xFFECFDF5))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("Tepat Waktu", color = Color(0xFF10B981), fontSize = 8.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        "TERLAMBAT" -> {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(0xFFFFFBEB))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("Terlambat", color = Color(0xFFF59E0B), fontSize = 8.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        "ALPA" -> {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(0xFFFEF2F2))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("Alpa", color = Color(0xFFEF4444), fontSize = 8.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = item.Kelas?.nama_kelas ?: "-",
                            color = Color(0xFF64748B),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val statusText = when {
                            item.is_finished -> {
                                val closedBy = if (item.session?.is_auto_closed == true) "Sistem" else "Petugas"
                                "Selesai by $closedBy"
                            }
                            item.is_live -> "Berlangsung"
                            else -> "Belum Mulai"
                        }
                        val statusColor = when {
                            item.is_finished -> Color(0xFF10B981)
                            item.is_live -> Color(0xFF3B82F6)
                            else -> Color(0xFF94A3B8)
                        }

                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = statusColor,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = statusText,
                            color = statusColor,
                            fontSize = 9.sp,
                            fontWeight = if (item.is_live || item.is_finished) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
