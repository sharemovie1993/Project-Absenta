package com.absenta.app.ui.dashboard.widgets

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class QuickActionItem(
    val label: String,
    val icon: ImageVector,
    val iconColor: Color,
    val backgroundColor: Color,
    val onClick: () -> Unit
)

@Composable
fun StaffWelcomeQuickActionsCard(
    userName: String,
    positionCodes: List<String>,
    isWaliKelas: Boolean,
    isKurikulum: Boolean,
    onNavigateToSchedule: () -> Unit,
    onNavigateToTeachingJournal: () -> Unit,
    onNavigateToViolations: () -> Unit,
    onNavigateToGenericDetail: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val actions = remember(isWaliKelas, isKurikulum, onNavigateToSchedule, onNavigateToTeachingJournal, onNavigateToViolations, onNavigateToGenericDetail) {
        val list = mutableListOf<QuickActionItem>()

        list.add(
            QuickActionItem(
                label = "Jadwal Saya",
                icon = Icons.Default.DateRange,
                iconColor = Color(0xFF3B82F6),
                backgroundColor = Color(0xFFEFF6FF),
                onClick = onNavigateToSchedule
            )
        )

        list.add(
            QuickActionItem(
                label = "Riwayat Ajar",
                icon = Icons.Default.List,
                iconColor = Color(0xFF6366F1),
                backgroundColor = Color(0xFFEEF2FF),
                onClick = onNavigateToTeachingJournal
            )
        )

        if (isWaliKelas) {
            list.add(
                QuickActionItem(
                    label = "Kelas Saya",
                    icon = Icons.Default.Person,
                    iconColor = Color(0xFFF43F5E),
                    backgroundColor = Color(0xFFFFF1F2),
                    onClick = { onNavigateToGenericDetail("Siswa") }
                )
            )
        }

        if (isKurikulum) {
            list.add(
                QuickActionItem(
                    label = "Monitoring KBM",
                    icon = Icons.Default.List,
                    iconColor = Color(0xFF8B5CF6),
                    backgroundColor = Color(0xFFF5F3FF),
                    onClick = { onNavigateToGenericDetail("Monitoring KBM") }
                )
            )
        }

        list.add(
            QuickActionItem(
                label = "Catat Pelanggaran",
                icon = Icons.Default.Warning,
                iconColor = Color(0xFFF59E0B),
                backgroundColor = Color(0xFFFEF3C7),
                onClick = onNavigateToViolations
            )
        )

        list
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Sekat 1: Sapaan (Welcome Header)
            val gradient = Brush.horizontalGradient(
                colors = listOf(Color(0xFFEFF6FF).copy(alpha = 0.5f), Color(0xFFEFF6FF).copy(alpha = 0.8f))
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(gradient)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Avatar
                val initials = userName.take(1).uppercase().ifEmpty { "?" }
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color(0xFF4F46E5), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initials,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Greeting & Info
                val firstName = userName.split(" ").firstOrNull() ?: "Guru"
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Halo, $firstName!",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Selamat mengabdi hari ini. Mari cetak masa depan bangsa melalui pendidikan berkualitas.",
                        fontSize = 11.sp,
                        color = Color(0xFF64748B),
                        lineHeight = 14.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Jabatan Badge
                // Jabatan Badge — sesuai frontend jabatanLabel:
                // isWaliKelas, isKurikulum, isKesiswaan, isSarpras, isHubin, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang
                val parts = mutableListOf<String>()
                if (positionCodes.any { it.equals("WALIKELAS", ignoreCase = true) || it.equals("WALI", ignoreCase = true) || it.equals("HOMEROOM", ignoreCase = true) } || isWaliKelas)
                    parts.add("Wali Kelas")
                if (positionCodes.any { it.equals("KURIKULUM", ignoreCase = true) } || isKurikulum)
                    parts.add("Kurikulum")
                if (positionCodes.any { it.equals("KESISWAAN", ignoreCase = true) || it.equals("PIKET", ignoreCase = true) })
                    parts.add("Kesiswaan")
                if (positionCodes.any { it.equals("SARPRAS", ignoreCase = true) || it.equals("SARANA", ignoreCase = true) })
                    parts.add("Sarpras")
                if (positionCodes.any { it.equals("HUBIN", ignoreCase = true) || it.equals("HUBUNGAN_INDUSTRI", ignoreCase = true) })
                    parts.add("Hubin")
                if (positionCodes.any { it.equals("TOOLMAN", ignoreCase = true) || it.equals("TOOL_MAN", ignoreCase = true) || it.equals("PENJAGA_LAB", ignoreCase = true) })
                    parts.add("Toolman")
                if (positionCodes.any { it.equals("KAPROG", ignoreCase = true) || it.equals("KEPALA_PROGRAM", ignoreCase = true) })
                    parts.add("Kaprog")
                if (positionCodes.any { it.equals("KABENG", ignoreCase = true) || it.equals("KEPALA_BENGKEL", ignoreCase = true) })
                    parts.add("Kabeng")
                if (positionCodes.any { it.equals("BPBK", ignoreCase = true) || it.equals("BK", ignoreCase = true) || it.equals("BIMBINGAN_KONSELING", ignoreCase = true) || it.equals("KONSELING", ignoreCase = true) })
                    parts.add("BK")
                if (positionCodes.any { it.equals("BKK", ignoreCase = true) || it.equals("BURSA_KERJA", ignoreCase = true) })
                    parts.add("BKK")
                if (positionCodes.any { it.equals("GERBANG", ignoreCase = true) || it.equals("OPERATOR_GERBANG", ignoreCase = true) || it.equals("GATE", ignoreCase = true) })
                    parts.add("Gerbang")
                if (positionCodes.any { it.equals("TU", ignoreCase = true) || it.equals("TATA_USAHA", ignoreCase = true) })
                    parts.add("TU")
                if (positionCodes.any { it.equals("KEPALA_SEKOLAH", ignoreCase = true) || it.equals("KEPSEK", ignoreCase = true) })
                    parts.add("Kepala Sekolah")

                val label = if (parts.isEmpty()) {
                    "Guru"
                } else if (parts.size > 2) {
                    parts.take(2).joinToString(" & ") + "..."
                } else {
                    parts.joinToString(" & ")
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFFDBEAFE))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = label.uppercase(),
                        color = Color(0xFF1E40AF),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Divider
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color(0xFFE2E8F0))
            )

            // Sekat 2: Aksi Cepat
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 12.dp)
                ) {
                    Text(text = "⚡", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Aksi Cepat",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF475569)
                    )
                }

                // Grid Layout chunked by 2
                val chunks = actions.chunked(2)
                chunks.forEachIndexed { index, chunk ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        chunk.forEach { action ->
                            QuickActionCard(
                                label = action.label,
                                icon = action.icon,
                                iconColor = action.iconColor,
                                backgroundColor = action.backgroundColor,
                                onClick = action.onClick,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        // Fill remaining space if odd number of items
                        if (chunk.size < 2) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }

                    // Spacing between rows
                    if (index < chunks.lastIndex) {
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    label: String,
    icon: ImageVector,
    iconColor: Color,
    backgroundColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(backgroundColor, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = iconColor,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF475569),
                textAlign = TextAlign.Center,
                lineHeight = 14.sp
            )
        }
    }
}
