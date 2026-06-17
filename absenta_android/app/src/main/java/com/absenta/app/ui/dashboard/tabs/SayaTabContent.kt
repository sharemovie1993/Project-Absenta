package com.absenta.app.ui.dashboard.tabs

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.ui.dashboard.DashboardViewModel
import kotlinx.coroutines.launch

@Composable
fun SayaTabContent(
    viewModel: DashboardViewModel,
    onLogout: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val userName by viewModel.userName.collectAsState()
    val userRole by viewModel.userRole.collectAsState()
    val positionCodes by viewModel.positionCodes.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Profile header card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3C72)),
                elevation = CardDefaults.cardElevation(3.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(Color.White.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = userName.take(2).uppercase().ifEmpty { "?" },
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(userName.ifEmpty { "Pengguna Absenta" }, fontWeight = FontWeight.Black, fontSize = 17.sp, color = Color.White)
                        val roleLabel = when (userRole.lowercase()) {
                            "superadmin" -> "Super Admin"
                            "admin" -> "Administrator"
                            "guru" -> "Guru / Pengajar"
                            "tu" -> "Tata Usaha"
                            "ortu" -> "Orang Tua"
                            else -> userRole.ifEmpty { "Pengguna" }
                        }
                        Text(roleLabel, fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f), modifier = Modifier.padding(top = 2.dp))
                        if (positionCodes.isNotEmpty()) {
                            Text(
                                positionCodes.take(2).joinToString(" • "),
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.65f),
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                    IconButton(onClick = { onNavigateToProfile() }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profil", tint = Color.White)
                    }
                }
            }
        }

        // Quick Actions
        item {
            Text("Menu Akun", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B), modifier = Modifier.padding(start = 4.dp))
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Column {
                    SayaMenuRow(
                        icon = Icons.Default.Person,
                        label = "Profil & Biodata",
                        subtitle = "Lihat dan edit informasi diri",
                        color = Color(0xFF3B82F6),
                        onClick = { onNavigateToProfile() }
                    )
                    HorizontalDivider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(start = 64.dp))
                    SayaMenuRow(
                        icon = Icons.Default.Notifications,
                        label = "Notifikasi",
                        subtitle = "Riwayat dan preferensi notifikasi",
                        color = Color(0xFFF59E0B),
                        onClick = { onNavigateToNotifications() }
                    )
                    HorizontalDivider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(start = 64.dp))
                    SayaMenuRow(
                        icon = Icons.Default.Lock,
                        label = "Keamanan Akun",
                        subtitle = "Ganti password dan pengaturan keamanan",
                        color = Color(0xFF8B5CF6),
                        onClick = { onNavigateToProfile() }
                    )
                }
            }
        }

        // Logout Button
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            scope.launch {
                                Log.d("AbsentaDebug", "User logging out from SAYA tab")
                                viewModel.clearSession()
                                onLogout()
                            }
                        }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Color(0xFFFEE2E2), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                    }
                    Text("Keluar dari Aplikasi", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFFEF4444))
                }
            }
        }

        item {
            Text(
                "Absenta v1.0.0 — © 2026 Absenta Platform",
                fontSize = 11.sp,
                color = Color(0xFFCBD5E1),
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
fun SayaMenuRow(
    icon: ImageVector,
    label: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(color.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
            Text(subtitle, fontSize = 12.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(top = 1.dp))
        }
        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(16.dp))
    }
}
