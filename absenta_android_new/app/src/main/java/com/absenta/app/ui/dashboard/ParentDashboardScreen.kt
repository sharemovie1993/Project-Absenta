package com.absenta.app.ui.dashboard

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ParentService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.ChildInfo
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * ParentDashboardScreen — Dashboard utama untuk Persona Orang Tua / Wali Siswa.
 *
 * Fitur:
 * - Multi-Child Selector: memilih anak jika orang tua memiliki >1 anak
 * - Live Gate Status: tampilan real-time jam datang & pulang ananda
 *
 * @param tokenManager Manager session
 * @param onLogout Callback logout
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentDashboardScreen(
    tokenManager: TokenManager,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var children by remember { mutableStateOf<List<ChildInfo>>(emptyList()) }
    var selectedChild by remember { mutableStateOf<ChildInfo?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    suspend fun loadChildren() {
        isLoading = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(ParentService::class.java)
            val response = service.getParentDashboard()
            if (response.isSuccessful && response.body()?.data != null) {
                children = response.body()?.data?.children ?: emptyList()
                if (selectedChild == null && children.isNotEmpty()) {
                    selectedChild = children.first()
                }
            }
        } catch (e: Exception) {
            // Keep empty
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadChildren() }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Portal Orang Tua",
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
            children.isEmpty() -> EmptyState(
                message = "Belum ada data anak terhubung untuk akun ini.",
                modifier = Modifier.fillMaxSize().padding(paddingValues)
            )
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Multi-Child Selector (tampilkan jika >1 anak)
                    if (children.size > 1) {
                        item {
                            Text("Pilih Anak", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                children.forEach { child ->
                                    val isSelected = selectedChild?.id == child.id
                                    Card(
                                        modifier = Modifier
                                            .clickable { selectedChild = child }
                                            .border(
                                                width = if (isSelected) 2.dp else 1.dp,
                                                color = if (isSelected) Primary else Border,
                                                shape = RoundedCornerShape(12.dp)
                                            ),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (isSelected) SurfaceVariantDark else SurfaceDark
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text(
                                            child.nama ?: "Anak",
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (isSelected) Primary else TextPrimary,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Live Gate Status Card Anak Yang Dipilih
                    val child = selectedChild ?: children.first()
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = SurfaceDark)
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (!child.fotoUrl.isNullOrEmpty()) {
                                            AsyncImage(
                                                model = child.fotoUrl,
                                                contentDescription = child.nama,
                                                modifier = Modifier.size(48.dp).clip(CircleShape)
                                            )
                                        } else {
                                            Box(
                                                modifier = Modifier
                                                    .size(48.dp)
                                                    .clip(CircleShape)
                                                    .background(Primary.copy(alpha = 0.2f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    Icons.Default.Person,
                                                    contentDescription = null,
                                                    tint = Primary
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text(
                                                child.nama ?: "Anak",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = TextPrimary,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                "NISN: ${child.nisn ?: "-"} • ${child.kelas?.namaKelas ?: ""}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = TextSecondary
                                            )
                                        }
                                    }

                                    IconButton(onClick = { scope.launch { loadChildren() } }) {
                                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Primary)
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Live Gate Status Box
                                val gate = child.gateStatus
                                val isPresent = gate?.status == "DATANG" || gate?.waktuDatang != null
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isPresent) StatusHadir.copy(alpha = 0.15f) else SurfaceVariantDark
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = if (isPresent) StatusHadir else TextSecondary,
                                                modifier = Modifier.size(24.dp)
                                            )
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = if (isPresent) "Ananda Sudah Tiba di Sekolah" else "Belum Tap Gerbang",
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = TextPrimary,
                                                    fontWeight = FontWeight.Bold
                                                )
                                                Text(
                                                    text = if (!gate?.waktuDatang.isNullOrEmpty()) "Jam Datang: ${gate?.waktuDatang}" else "Belum ada catatan tap gerbang",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = TextSecondary
                                                )
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
    }
}
