package com.absenta.app.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.DoorFront
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.DashboardService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.DashboardOverview
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.AnomalyAlertCard
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * ExecutiveDashboardScreen — Dashboard khusus Persona Pejabat Eksekutif (Kepala Sekolah, Wakasek).
 *
 * Menampilkan:
 * - 4 KPI Matrix Eksekutif (% Kehadiran Siswa, % Guru, Stat Izin/Sakit/Alpa, Status Gate)
 * - Anomaly Alert Cards: Peringatan otomatis anomali sistem
 *
 * @param tokenManager Manager session
 * @param onLogout Callback logout
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExecutiveDashboardScreen(
    tokenManager: TokenManager,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var overview by remember { mutableStateOf(DashboardOverview()) }
    var isLoading by remember { mutableStateOf(true) }

    suspend fun loadOverview() {
        isLoading = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(DashboardService::class.java)
            val response = service.getOverview()
            if (response.isSuccessful && response.body()?.data != null) {
                overview = response.body()!!.data!!
            }
        } catch (e: Exception) {
            // Keep default overview KPI
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadOverview() }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Dashboard Eksekutif",
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            tokenManager.clearSession()
                            onLogout()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout", tint = Primary)
                    }
                }
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        when {
            isLoading -> LoadingOverlay(modifier = Modifier.padding(paddingValues))
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text("Ringkasan Eksekutif Hari Ini", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                }

                // Row 1: KPI Siswa & Guru
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        KpiCard(
                            title = "Kehadiran Siswa",
                            value = "${overview.persentaseHadirSiswa.toInt()}%",
                            subtitle = "${overview.hadirSiswa}/${overview.totalSiswa} siswa",
                            icon = Icons.Default.School,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Kehadiran Guru",
                            value = "${overview.persentaseHadirGuru.toInt()}%",
                            subtitle = "${overview.hadirGuru}/${overview.totalGuru} guru",
                            icon = Icons.Default.Person,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Row 2: KPI Ketidakhadiran & Gate Status
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        KpiCard(
                            title = "Izin / Sakit / Alpa",
                            value = "${overview.izinSiswa + overview.sakitSiswa + overview.alpaSiswa}",
                            subtitle = "siswa tidak hadir",
                            icon = Icons.Default.Groups,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Aktivitas Gerbang",
                            value = "${overview.gateMasuk}",
                            subtitle = "tap masuk hari ini",
                            icon = Icons.Default.DoorFront,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Section: Peringatan Anomali Sistem
                if (!overview.anomali.isNullOrEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Peringatan Anomali Sistem", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    }
                    items(overview.anomali!!) { anomaly ->
                        AnomalyAlertCard(
                            type = anomaly.type,
                            message = anomaly.message,
                            severity = anomaly.severity
                        )
                    }
                }
            }
        }
    }
}
