package com.absenta.app.ui.features.academic

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ReferenceService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.JadwalHarian
import com.absenta.app.data.model.MasterSemesterItem
import com.absenta.app.data.model.MasterTahunPelajaranItem
import com.absenta.app.ui.components.AbsentaDropdown
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.DropdownOption
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * MyScheduleScreen — Layar jadwal pelajaran mingguan (Persona Siswa & Guru).
 *
 * Fitur Lengkap:
 * - Dropdown Filter Master Tahun Pelajaran & Semester
 * - Filter Tab Selector Hari Interaktif (Senin - Jumat)
 * - Live Class Period Active Indicator ("🟢 SEDANG BERLANGSUNG")
 * - Card Metadata: Jam Ke-, Ruangan, Guru Pengajar, Duration
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyScheduleScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    var allSchedules by remember { mutableStateOf<List<JadwalHarian>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Master Filters
    var tahunList by remember { mutableStateOf<List<MasterTahunPelajaranItem>>(emptyList()) }
    var semesterList by remember { mutableStateOf<List<MasterSemesterItem>>(emptyList()) }
    var selectedTahun by remember { mutableStateOf<MasterTahunPelajaranItem?>(null) }
    var selectedSemester by remember { mutableStateOf<MasterSemesterItem?>(null) }

    val calendar = remember { Calendar.getInstance() }
    val todayIndonesian = remember {
        when (calendar.get(Calendar.DAY_OF_WEEK)) {
            Calendar.MONDAY -> "SENIN"
            Calendar.TUESDAY -> "SELASA"
            Calendar.WEDNESDAY -> "RABU"
            Calendar.THURSDAY -> "KAMIS"
            Calendar.FRIDAY -> "JUMAT"
            else -> "SENIN"
        }
    }
    val nowTimeStr = remember { SimpleDateFormat("HH:mm", Locale.getDefault()).format(calendar.time) }

    val hariList = remember { listOf("SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SEMUA") }
    var selectedHari by remember { mutableStateOf(todayIndonesian) }

    suspend fun loadSchedule() {
        isLoading = true
        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(AcademicService::class.java)
        val refService = retrofit.create(ReferenceService::class.java)

        try {
            val response = service.getMySchedule()
            if (response.isSuccessful && response.body()?.data != null) {
                allSchedules = response.body()!!.data!!
            }
        } catch (e: Exception) {}

        try {
            val resTahun = refService.getTahunPelajaranList()
            if (resTahun.isSuccessful && resTahun.body()?.data != null) {
                tahunList = resTahun.body()!!.data!!
                if (selectedTahun == null && tahunList.isNotEmpty()) {
                    selectedTahun = tahunList.find { it.isActive } ?: tahunList.first()
                }
            }
        } catch (e: Exception) {}

        try {
            val resSemester = refService.getSemesterList()
            if (resSemester.isSuccessful && resSemester.body()?.data != null) {
                semesterList = resSemester.body()!!.data!!
                if (selectedSemester == null && semesterList.isNotEmpty()) {
                    selectedSemester = semesterList.find { it.isActive } ?: semesterList.first()
                }
            }
        } catch (e: Exception) {}

        isLoading = false
    }

    LaunchedEffect(Unit) { loadSchedule() }

    val filteredSchedules = remember(allSchedules, selectedHari) {
        if (selectedHari == "SEMUA") allSchedules
        else allSchedules.filter { it.hari.equals(selectedHari, ignoreCase = true) }
    }

    val mergedSchedules = remember(filteredSchedules, todayIndonesian, nowTimeStr) {
        mergeContiguousJadwal(filteredSchedules, todayIndonesian, nowTimeStr)
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Jadwal Pelajaran",
                onNavigateBack = onNavigateBack
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        when {
            isLoading -> LoadingOverlay(modifier = Modifier.padding(paddingValues))
            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Filter Dropdowns Row: Tahun Pelajaran & Semester
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        val tahunOptions = tahunList.map {
                            DropdownOption(id = it.id, label = it.tahun ?: "Tahun ${it.id}")
                        }
                        AbsentaDropdown(
                            label = "Tahun Pelajaran",
                            selectedLabel = selectedTahun?.tahun ?: "Pilih Tahun",
                            options = tahunOptions,
                            onOptionSelected = { opt ->
                                selectedTahun = tahunList.find { it.id == opt.id }
                            },
                            modifier = Modifier.weight(1f)
                        )

                        val semesterOptions = semesterList.map {
                            DropdownOption(id = it.id, label = it.namaSemester ?: "Semester ${it.id}")
                        }
                        AbsentaDropdown(
                            label = "Semester",
                            selectedLabel = selectedSemester?.namaSemester ?: "Pilih Semester",
                            options = semesterOptions,
                            onOptionSelected = { opt ->
                                selectedSemester = semesterList.find { it.id == opt.id }
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Filter Tab Selector Hari (SENIN - JUMAT)
                item {
                    Text("Pilih Hari", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(hariList) { hari ->
                            val isSelected = selectedHari.equals(hari, ignoreCase = true)
                            val isToday = todayIndonesian.equals(hari, ignoreCase = true)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (isSelected) Primary else SurfaceDark)
                                    .border(1.dp, if (isSelected) Primary else Border, RoundedCornerShape(20.dp))
                                    .clickable { selectedHari = hari }
                                    .padding(horizontal = 14.dp, vertical = 7.dp)
                            ) {
                                Text(
                                    text = if (isToday) "📍 $hari" else hari,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) BackgroundDark else TextPrimary
                                )
                            }
                        }
                    }
                }

                if (mergedSchedules.isEmpty()) {
                    item {
                        EmptyState(
                            message = if (selectedHari == "SEMUA") "Belum ada jadwal pelajaran terdaftar" else "Tidak ada jadwal pelajaran untuk hari $selectedHari",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp)
                        )
                    }
                } else {
                    items(mergedSchedules) { item ->
                        val isOngoing = item.isOngoing

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isOngoing) Primary.copy(alpha = 0.08f) else SurfaceDark
                            ),
                            elevation = CardDefaults.cardElevation(2.dp),
                            border = if (isOngoing) BorderStroke(1.5.dp, Primary) else BorderStroke(1.dp, Border)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Text(
                                            item.mataPelajaran,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = TextPrimary,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    if (isOngoing) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(StatusHadir.copy(alpha = 0.2f))
                                                .padding(horizontal = 8.dp, vertical = 3.dp)
                                        ) {
                                            Text("🟢 SEDANG BERLANGSUNG", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = StatusHadir)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Time Range
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Primary, modifier = Modifier.padding(end = 4.dp))
                                        val timeText = if (!item.jamMulai.isNullOrEmpty() && !item.jamSelesai.isNullOrEmpty()) {
                                            "${item.jamMulai} – ${item.jamSelesai}"
                                        } else item.jamKeDisplay
                                        Text(timeText, fontSize = 12.sp, color = Primary, fontWeight = FontWeight.SemiBold)
                                    }

                                    // Jam Ke- Range
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Class, contentDescription = null, tint = TextSecondary, modifier = Modifier.padding(end = 4.dp))
                                        Text(item.jamKeDisplay, fontSize = 12.sp, color = TextSecondary)
                                    }

                                    // Ruangan
                                    val ruangan = item.namaKelas
                                    if (!ruangan.isNullOrEmpty()) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.MeetingRoom, contentDescription = null, tint = TextSecondary, modifier = Modifier.padding(end = 4.dp))
                                            Text(ruangan, fontSize = 12.sp, color = TextSecondary)
                                        }
                                    }
                                }

                                val guruName = item.namaGuru
                                if (!guruName.isNullOrEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Person, contentDescription = null, tint = TextSecondary, modifier = Modifier.padding(end = 4.dp))
                                        Text(guruName, fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Data class representing merged contiguous schedule slots */
data class MergedJadwalItem(
    val id: String,
    val hari: String?,
    val mataPelajaran: String,
    val namaGuru: String?,
    val namaKelas: String?,
    val jamMulai: String?,
    val jamSelesai: String?,
    val jamKeDisplay: String,
    val isOngoing: Boolean
)

/** Helper function to merge contiguous slots of the same mapel, guru, and kelas */
private fun mergeContiguousJadwal(items: List<JadwalHarian>, todayIndonesian: String, nowTimeStr: String): List<MergedJadwalItem> {
    if (items.isEmpty()) return emptyList()

    val result = mutableListOf<MergedJadwalItem>()
    val groupedByHari = items.groupBy { it.hari ?: "LAINNYA" }

    for ((_, dayItems) in groupedByHari) {
        val sorted = dayItems.sortedBy { it.jamKe }
        var currentGroup = mutableListOf<JadwalHarian>()

        for (item in sorted) {
            if (currentGroup.isEmpty()) {
                currentGroup.add(item)
            } else {
                val prev = currentGroup.last()
                val isSameMapel = prev.mataPelajaran.trim().equals(item.mataPelajaran.trim(), ignoreCase = true)
                val isSameGuru = (prev.namaGuru ?: "").trim().equals((item.namaGuru ?: "").trim(), ignoreCase = true)
                val isSameKelas = (prev.namaKelas ?: "").trim().equals((item.namaKelas ?: "").trim(), ignoreCase = true)
                val isContiguous = (item.jamKe == prev.jamKe + 1) || (!prev.jamSelesai.isNullOrEmpty() && prev.jamSelesai == item.jamMulai)

                if (isSameMapel && isSameGuru && isSameKelas && isContiguous) {
                    currentGroup.add(item)
                } else {
                    result.add(createMergedItem(currentGroup, todayIndonesian, nowTimeStr))
                    currentGroup = mutableListOf(item)
                }
            }
        }
        if (currentGroup.isNotEmpty()) {
            result.add(createMergedItem(currentGroup, todayIndonesian, nowTimeStr))
        }
    }
    return result
}

private fun createMergedItem(group: List<JadwalHarian>, todayIndonesian: String, nowTimeStr: String): MergedJadwalItem {
    val first = group.first()
    val last = group.last()
    val firstSlot = first.jamKe
    val lastSlot = last.jamKe
    val jamKeDisplay = if (group.size > 1) "Jam ke-$firstSlot s/d $lastSlot" else "Jam ke-$firstSlot"

    val jamMulai = first.jamMulai
    val jamSelesai = last.jamSelesai
    val isToday = todayIndonesian.equals(first.hari, ignoreCase = true)
    val isOngoing = isToday && !jamMulai.isNullOrEmpty() && !jamSelesai.isNullOrEmpty() &&
            nowTimeStr >= jamMulai && nowTimeStr <= jamSelesai

    return MergedJadwalItem(
        id = first.id,
        hari = first.hari,
        mataPelajaran = first.mataPelajaran,
        namaGuru = first.namaGuru,
        namaKelas = first.namaKelas,
        jamMulai = jamMulai,
        jamSelesai = jamSelesai,
        jamKeDisplay = jamKeDisplay,
        isOngoing = isOngoing
    )
}


