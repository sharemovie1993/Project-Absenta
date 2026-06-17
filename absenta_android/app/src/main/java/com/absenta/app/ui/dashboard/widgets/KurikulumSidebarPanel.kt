package com.absenta.app.ui.dashboard.widgets

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

@Composable
fun KurikulumSidebarPanel(
    healthScore: Int,
    activeClasses: Int,
    totalClasses: Int,
    teacherPresent: Int,
    totalTeachers: Int,
    supervisionCount: Int,
    onMonitor: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val theme = getThemeForAccent("purple")

    val healthColor = when {
        healthScore >= 80 -> Color(0xFF059669)
        healthScore >= 60 -> Color(0xFFD97706)
        else -> Color(0xFFE11D48)
    }

    val healthBg = when {
        healthScore >= 80 -> Color(0xFFECFDF5)
        healthScore >= 60 -> Color(0xFFFFFBEB)
        else -> Color(0xFFFFF1F2)
    }

    val healthBorder = when {
        healthScore >= 80 -> Color(0xFFD1FAE5)
        healthScore >= 60 -> Color(0xFFFEF3C7)
        else -> Color(0xFFFFE4E6)
    }

    val healthLabel = when {
        healthScore >= 80 -> "Sehat"
        healthScore >= 60 -> "Perlu Perhatian"
        else -> "Kritis"
    }

    val kbmPercent = if (totalClasses > 0) (activeClasses.toFloat() / totalClasses.toFloat() * 100).roundToInt() else 0
    val guruPercent = if (totalTeachers > 0) (teacherPresent.toFloat() / totalTeachers.toFloat() * 100).roundToInt() else 0

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
                            imageVector = Icons.Default.Book,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "STAF KURIKULUM",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = theme.primaryText,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Monitoring KBM Global",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(100.dp),
                    color = healthBg,
                    border = BorderStroke(1.dp, healthBorder)
                ) {
                    Text(
                        text = healthLabel,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = healthColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Body
            Column(modifier = Modifier.padding(16.dp)) {
                // Health Score Box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(healthBg, RoundedCornerShape(10.dp))
                        .border(1.dp, healthBorder, RoundedCornerShape(10.dp))
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
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "$healthScore",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = healthColor
                                )
                                Text(
                                    text = "/100",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = healthColor.copy(alpha = 0.6f),
                                    modifier = Modifier.padding(bottom = 3.dp, start = 1.dp)
                                )
                            }
                        }
                        Text(
                            text = "KBM HEALTH SCORE",
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
                            .background(healthBorder, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = healthColor,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Stats Grid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // KBM Kelas Aktif
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                            .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "KELAS KBM",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (isLoading) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(0.5f)
                                    .height(16.dp)
                                    .background(Color(0xFFE2E8F0), RoundedCornerShape(4.dp))
                            )
                        } else {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "$activeClasses",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E293B)
                                )
                                Text(
                                    text = "/$totalClasses",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF94A3B8),
                                    modifier = Modifier.padding(bottom = 1.dp, start = 1.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { kbmPercent.toFloat() / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp),
                                color = theme.primaryText,
                                trackColor = Color(0xFFE2E8F0),
                                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                            )
                            Text(
                                text = "$kbmPercent% aktif",
                                fontSize = 8.sp,
                                color = Color(0xFF64748B),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }

                    // Kehadiran Guru
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                            .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = "KEHADIRAN GURU",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (isLoading) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(0.5f)
                                    .height(16.dp)
                                    .background(Color(0xFFE2E8F0), RoundedCornerShape(4.dp))
                            )
                        } else {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "$teacherPresent",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E293B)
                                )
                                if (totalTeachers > 0) {
                                    Text(
                                        text = "/$totalTeachers",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF94A3B8),
                                        modifier = Modifier.padding(bottom = 1.dp, start = 1.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            if (totalTeachers > 0) {
                                LinearProgressIndicator(
                                    progress = { guruPercent.toFloat() / 100f },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(4.dp),
                                    color = Color(0xFF4F46E5),
                                    trackColor = Color(0xFFE2E8F0),
                                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                                )
                                Text(
                                    text = "$guruPercent% hadir",
                                    fontSize = 8.sp,
                                    color = Color(0xFF64748B),
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }
                }

                // Supervision Alert
                if (supervisionCount > 0 && !isLoading) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(theme.bg.copy(alpha = 0.8f), RoundedCornerShape(8.dp))
                            .border(1.dp, theme.border, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = "$supervisionCount Supervisi sedang berjalan",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = theme.primaryText
                        )
                    }
                }

                // Monitoring CTA
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFF1F5F9))
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onMonitor() }
                        .padding(vertical = 8.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "PANTAU KBM SEKOLAH",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.5.sp
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = "Buka",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = theme.primaryText
                        )
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowRight,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }
    }
}
