package com.absenta.app.ui.dashboard.widgets

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

data class AbsentStudent(
    val id: String?,
    val nama: String,
    val status: String?
)

@Composable
fun WaliKelasSidebarPanel(
    namaKelas: String,
    attendanceRate: Double?,
    absentStudents: List<AbsentStudent>,
    onViewRekap: () -> Unit,
    onFollowUp: (AbsentStudent) -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    hasData: Boolean = false
) {
    val displayRate = attendanceRate ?: 0.0
    val isHealthy = displayRate >= 85.0

    val rateColor = when {
        attendanceRate == null -> Color(0xFF94A3B8)
        displayRate >= 90.0 -> Color(0xFF059669)
        displayRate >= 75.0 -> Color(0xFFD97706)
        else -> Color(0xFFE11D48)
    }

    val rateBg = when {
        attendanceRate == null -> Color(0xFFF8FAFC)
        displayRate >= 90.0 -> Color(0xFFECFDF5)
        displayRate >= 75.0 -> Color(0xFFFFFBEB)
        else -> Color(0xFFFFF1F2)
    }

    val rateBorder = when {
        attendanceRate == null -> Color(0xFFF1F5F9)
        displayRate >= 90.0 -> Color(0xFFD1FAE5)
        displayRate >= 75.0 -> Color(0xFFFEF3C7)
        else -> Color(0xFFFFE4E6)
    }

    val theme = getThemeForAccent("rose")

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(theme.bg.copy(alpha = 0.5f))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .background(theme.iconBg, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "WALI KELAS",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = theme.primaryText,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = namaKelas,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = if (isHealthy && attendanceRate != null) Color(0xFFECFDF5) else Color(0xFFFFF1F2),
                    border = BorderStroke(
                        1.dp,
                        if (isHealthy && attendanceRate != null) Color(0xFFD1FAE5) else Color(0xFFFFE4E6)
                    )
                ) {
                    Text(
                        text = if (isHealthy && attendanceRate != null) "Kondusif" else "Perlu Perhatian",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = if (isHealthy && attendanceRate != null) Color(0xFF059669) else Color(0xFFE11D48),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Body
            Column(modifier = Modifier.padding(16.dp)) {
                // Rate Box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(rateBg, RoundedCornerShape(10.dp))
                        .border(1.dp, rateBorder, RoundedCornerShape(10.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        if (isLoading) {
                            Box(
                                modifier = Modifier
                                    .size(60.dp, 24.dp)
                                    .background(Color(0xFFE2E8F0), RoundedCornerShape(4.dp))
                            )
                        } else {
                            Text(
                                text = if (attendanceRate == null) "—" else "${displayRate.roundToInt()}%",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = rateColor
                            )
                        }
                        Text(
                            text = if (attendanceRate == null && !isLoading) "BELUM ADA PRESENSI" else "RATE KEHADIRAN HARI INI",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                if (isHealthy && attendanceRate != null) Color(0xFFD1FAE5) else Color(0xFFFFE4E6),
                                RoundedCornerShape(8.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isHealthy && attendanceRate != null) Icons.Default.Check else Icons.Default.Warning,
                            contentDescription = null,
                            tint = rateColor,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Absent Students List
                if (isLoading) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        repeat(2) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(36.dp)
                                    .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                            )
                        }
                    }
                } else if (!hasData) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(Color(0xFFF8FAFC), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = "BELUM ADA DATA PRESENSI",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Data presensi hari ini belum masuk.",
                            fontSize = 8.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                } else if (absentStudents.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(Color(0xFFECFDF5), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF059669),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Text(
                            text = "SEMUA SISWA HADIR",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF059669),
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Kelas berjalan dengan baik hari ini!",
                            fontSize = 8.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                } else {
                    Text(
                        text = "PERLU TINDAK LANJUT (${absentStudents.size})",
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        absentStudents.take(4).forEach { s ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFFFF1F2).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFFFFE4E6), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(20.dp)
                                            .background(Color(0xFFFFE4E6), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = s.nama.take(1).uppercase(),
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFFE11D48)
                                        )
                                    }
                                    Column {
                                        Text(
                                            text = s.nama.uppercase(),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1E293B)
                                        )
                                        if (s.status != null) {
                                            Text(
                                                text = s.status.uppercase(),
                                                fontSize = 7.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFFE11D48)
                                            )
                                        }
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .background(Color.White, RoundedCornerShape(6.dp))
                                        .border(1.dp, Color(0xFFFFE4E6), RoundedCornerShape(6.dp))
                                        .clickable { onFollowUp(s) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Call,
                                        contentDescription = "Hubungi Wali Murid",
                                        tint = Color(0xFFE11D48),
                                        modifier = Modifier.size(10.dp)
                                    )
                                }
                            }
                        }

                        if (absentStudents.size > 4) {
                            Text(
                                text = "+${absentStudents.size - 4} siswa lainnya...",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFE11D48),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onViewRekap() }
                                    .padding(vertical = 4.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }

                // CTA
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFF1F5F9))
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onViewRekap() }
                        .padding(vertical = 8.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "LIHAT REKAP BULANAN",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.5.sp
                    )
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowRight,
                        contentDescription = null,
                        tint = Color(0xFFCBD5E1),
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
        }
    }
}
