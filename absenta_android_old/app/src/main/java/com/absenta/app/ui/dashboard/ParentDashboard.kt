package com.absenta.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ParentService
import com.absenta.app.data.api.StudentDashboardData

@Composable
fun ParentDashboard(
    modifier: Modifier = Modifier,
    userName: String = "Orang Tua Siswa"
) {
    val context = LocalContext.current
    var children by remember { mutableStateOf<List<StudentDashboardData>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val service = ApiClient.getClient(context).create(ParentService::class.java)
            val response = service.getParentDashboard()
            if (response.isSuccessful && response.body()?.success == true) {
                children = response.body()?.data?.siswa ?: emptyList()
            }
        } catch (e: Exception) {
            android.util.Log.e("AbsentaDebug", "ParentDashboard API load error", e)
        } finally {
            isLoading = false
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)), // Slate-50 background
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Header Banner
        item {
            WelcomeBanner(userName = userName)
        }

        // Section Title
        item {
            Text(
                text = "Kehadiran Anak Anda",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B),
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }

        if (isLoading) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            }
        } else if (children.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Text(
                        text = "Belum ada data siswa terasosiasi.",
                        fontSize = 14.sp,
                        color = Color(0xFF64748B),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                    )
                }
            }
        } else {
            items(children) { child ->
                ChildAttendanceCard(child = child)
            }
        }
    }
}

@Composable
fun WelcomeBanner(userName: String) {
    val gradient = Brush.horizontalGradient(
        colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))
    )
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .background(gradient)
                .padding(24.dp)
                .fillMaxWidth()
        ) {
            Column {
                Text(
                    text = "Halo, Selamat Datang!",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp
                )
                Text(
                    text = userName,
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Text(
                    text = "Semua sistem absensi berjalan lancar hari ini.",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 12.dp)
                )
            }
        }
    }
}

@Composable
fun ChildAttendanceCard(child: StudentDashboardData) {
    val todayStatus = child.status_kehadiran_hari_ini?.status?.uppercase() ?: "BELUM_ABSEN"
    val statusLabel = child.status_kehadiran_hari_ini?.label ?: "Belum Absen"
    val todayTime = child.status_kehadiran_hari_ini?.waktu_masuk

    val statusColor = when (todayStatus) {
        "HADIR" -> Color(0xFF10B981) // Emerald Green
        "TERLAMBAT" -> Color(0xFFF59E0B) // Amber Yellow
        "IZIN", "SAKIT", "DISPEN" -> Color(0xFF3B82F6) // Blue
        else -> Color(0xFFEF4444) // Rose Red
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            // Header: Name & Class
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = child.nama_siswa,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = child.kelas,
                        fontSize = 13.sp,
                        color = Color(0xFF64748B)
                    )
                }

                // Today Status Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = statusLabel,
                        color = statusColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = Color(0xFFE2E8F0))

            // Attendance details / time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Jam Masuk Hari Ini:",
                    fontSize = 13.sp,
                    color = Color(0xFF64748B)
                )
                Text(
                    text = todayTime ?: "--:--",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0F172A)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Monthly stats layout
            val summary = child.ringkasan_kehadiran
            val hadirCount = summary?.hadir ?: 0
            val terlambatCount = summary?.terlambat ?: 0
            val izinCount = (summary?.izin ?: 0) + (summary?.sakit ?: 0) + (summary?.dispen ?: 0)
            val alpaCount = summary?.alpa ?: 0

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatItem(label = "Hadir", count = hadirCount, color = Color(0xFF10B981))
                StatItem(label = "Terlambat", count = terlambatCount, color = Color(0xFFF59E0B))
                StatItem(label = "Izin/Sakit", count = izinCount, color = Color(0xFF3B82F6))
                StatItem(label = "Alpa", count = alpaCount, color = Color(0xFFEF4444))
            }
        }
    }
}

@Composable
fun StatItem(label: String, count: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = count.toString(),
                color = color,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Text(
            text = label,
            fontSize = 11.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
