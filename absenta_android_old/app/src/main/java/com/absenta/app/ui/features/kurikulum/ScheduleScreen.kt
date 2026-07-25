package com.absenta.app.ui.features.kurikulum

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.KurikulumService
import com.absenta.app.data.api.ScheduleEntry

val HARI_ORDER = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    var schedules by remember { mutableStateOf<List<ScheduleEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedDay by remember { mutableStateOf(0) }

    val days = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")

    LaunchedEffect(Unit) {
        Log.d("AbsentaDebug", "ScheduleScreen loaded")
        isLoading = true
        try {
            val service = ApiClient.getClient(context).create(KurikulumService::class.java)
            val resp = service.getMySchedule()
            if (resp.isSuccessful) {
                schedules = resp.body()?.data?.list ?: emptyList()
                Log.d("AbsentaDebug", "ScheduleScreen success: ${schedules.size} entries")
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "ScheduleScreen error", e)
        } finally {
            isLoading = false
        }
    }

    val selectedDayName = days[selectedDay]
    val filteredSchedules = schedules.filter { it.hari.equals(selectedDayName, ignoreCase = true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Jadwal Mengajar", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF8FAFC))
        ) {
            // Summary Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3C72)),
                elevation = CardDefaults.cardElevation(2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Total Jam Mengajar", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                        Text("${schedules.size} Sesi / Minggu", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White, modifier = Modifier.padding(top = 2.dp))
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Mapel Diampu", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                        Text(schedules.map { it.nama_mapel }.toSet().size.toString(), fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color(0xFFBAE6FD))
                    }
                }
            }

            // Day Tab Row (scrollable)
            ScrollableTabRow(
                selectedTabIndex = selectedDay,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72),
                edgePadding = 16.dp
            ) {
                days.forEachIndexed { index, day ->
                    Tab(
                        selected = selectedDay == index,
                        onClick = { selectedDay = index },
                        text = {
                            Text(
                                day.substring(0, 3).uppercase(),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedDay == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredSchedules.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color(0xFFCBD5E1))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Tidak ada jadwal mengajar hari $selectedDayName", color = Color(0xFF94A3B8), fontSize = 14.sp)
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredSchedules) { schedule ->
                        ScheduleCard(schedule)
                    }
                }
            }
        }
    }
}

@Composable
fun ScheduleCard(schedule: ScheduleEntry) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time block
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                Text(schedule.jam_mulai, fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E3C72))
                Box(modifier = Modifier.height(1.dp).width(24.dp).background(Color(0xFFBFDBFE)).padding(vertical = 4.dp))
                Text(schedule.jam_selesai, fontSize = 12.sp, color = Color(0xFF64748B))
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(schedule.nama_mapel, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                Text(schedule.nama_kelas, fontSize = 13.sp, color = Color(0xFF1E3C72), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))
                if (!schedule.ruang.isNullOrEmpty()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Icon(Icons.Default.Home, contentDescription = null, modifier = Modifier.size(13.dp), tint = Color(0xFF94A3B8))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(schedule.ruang, fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                }
            }
        }
    }
}
