package com.absenta.app.ui.dashboard.widgets

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class SidebarStatItem(
    val label: String,
    val value: String,
    val sub: String? = null,
    val highlight: Boolean = false
)

data class SidebarActionItem(
    val label: String,
    val onClick: () -> Unit
)

data class AccentTheme(
    val primaryText: Color,
    val bg: Color,
    val border: Color,
    val iconBg: Color
)

fun getThemeForAccent(accent: String): AccentTheme {
    return when (accent.lowercase()) {
        "emerald" -> AccentTheme(Color(0xFF059669), Color(0xFFECFDF5), Color(0xFFD1FAE5), Color(0xFFECFDF5))
        "indigo" -> AccentTheme(Color(0xFF4F46E5), Color(0xFFEEF2FF), Color(0xFFE0E7FF), Color(0xFFEEF2FF))
        "orange" -> AccentTheme(Color(0xFFEA580C), Color(0xFFFFF7ED), Color(0xFFFFEDD5), Color(0xFFFFF7ED))
        "violet" -> AccentTheme(Color(0xFF7C3AED), Color(0xFFF5F3FF), Color(0xFFEDE9FE), Color(0xFFF5F3FF))
        "stone" -> AccentTheme(Color(0xFF57534E), Color(0xFFF5F5F4), Color(0xFFE7E5E4), Color(0xFFF5F5F4))
        "pink" -> AccentTheme(Color(0xFFDB2777), Color(0xFFFDF2F8), Color(0xFFFCE7F3), Color(0xFFFDF2F8))
        "rose" -> AccentTheme(Color(0xFFE11D48), Color(0xFFFFF1F2), Color(0xFFFFE4E6), Color(0xFFFFF1F2))
        "sky" -> AccentTheme(Color(0xFF0284C7), Color(0xFFF0F9FF), Color(0xFFE0F2FE), Color(0xFFF0F9FF))
        "teal" -> AccentTheme(Color(0xFF0D9488), Color(0xFFF0FDFA), Color(0xFFCCFBF1), Color(0xFFF0FDFA))
        "amber" -> AccentTheme(Color(0xFFD97706), Color(0xFFFFFBEB), Color(0xFFFEF3C7), Color(0xFFFFFBEB))
        "purple" -> AccentTheme(Color(0xFF9333EA), Color(0xFFFAF5FF), Color(0xFFF3E8FF), Color(0xFFFAF5FF))
        else -> AccentTheme(Color(0xFF4F46E5), Color(0xFFEEF2FF), Color(0xFFE0E7FF), Color(0xFFEEF2FF)) // default indigo
    }
}

@Composable
fun BaseSidebarPanel(
    accentColor: String,
    icon: ImageVector,
    roleLabel: String,
    panelTitle: String,
    modifier: Modifier = Modifier,
    statusLabel: String? = null,
    statusOk: Boolean = true,
    stats: List<SidebarStatItem> = emptyList(),
    alertText: String? = null,
    actions: List<SidebarActionItem> = emptyList(),
    isLoading: Boolean = false
) {
    val theme = getThemeForAccent(accentColor)

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
                            imageVector = icon,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Column {
                        Text(
                            text = roleLabel.uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = theme.primaryText,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = panelTitle,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }
                }

                if (statusLabel != null) {
                    Surface(
                        shape = RoundedCornerShape(100.dp),
                        color = if (statusOk) theme.bg else Color(0xFFF1F5F9),
                        border = BorderStroke(
                            1.dp,
                            if (statusOk) theme.border else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.padding(start = 8.dp)
                    ) {
                        Text(
                            text = statusLabel,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = if (statusOk) theme.primaryText else Color(0xFF64748B),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Body
            Column(modifier = Modifier.padding(16.dp)) {
                // Stats Grid (max 2 stats for consistent operational dashboard look)
                if (stats.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        stats.take(2).forEach { s ->
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                                    .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(10.dp))
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = s.label.uppercase(),
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
                                            .height(20.dp)
                                            .background(Color(0xFFE2E8F0), RoundedCornerShape(4.dp))
                                    )
                                } else {
                                    Text(
                                        text = s.value,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (s.highlight) theme.primaryText else Color(0xFF1E293B)
                                    )
                                    if (s.sub != null) {
                                        Text(
                                            text = s.sub,
                                            fontSize = 8.sp,
                                            color = Color(0xFF64748B),
                                            modifier = Modifier.padding(top = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Alert Text
                if (alertText != null && !isLoading) {
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
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = theme.primaryText,
                            modifier = Modifier.size(11.dp)
                        )
                        Text(
                            text = alertText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = theme.primaryText
                        )
                    }
                }

                // Actions List
                if (actions.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    Spacer(modifier = Modifier.height(4.dp))
                    actions.forEach { a ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { a.onClick() }
                                .padding(vertical = 8.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = a.label,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF475569)
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
    }
}
