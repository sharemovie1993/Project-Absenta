package com.absenta.app.ui.features.notification

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.FormatListNumbered
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.NotificationService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.NotificationItem
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.EmptyState
import com.absenta.app.ui.components.KpiCard
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

/**
 * NotificationScreen — Layar Pengumuman Sekolah & Notifikasi Push (Full Parity with Web & Backend).
 *
 * Mendukung:
 * - 1:1 API Parity (`GET /api/notifications/my`, `GET /stats`, `GET /logs`)
 * - Mark All As Read & Mark Individual As Read with local state tracking
 * - Tab Toggle: Pemberitahuan Saya vs Log Notifikasi Sistem (RBAC `notify.view.logs`)
 * - Status Filter Chips (Semua, Unread, WhatsApp, Email, Sistem)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var notifications by remember { mutableStateOf<List<NotificationItem>>(emptyList()) }
    var logsList by remember { mutableStateOf<List<NotificationItem>>(emptyList()) }
    var readIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var isLoading by remember { mutableStateOf(true) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }
    var viewTab by remember { mutableIntStateOf(0) } // 0: Pesan Saya, 1: Log Sistem

    var capabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var userRole by remember { mutableStateOf("") }

    suspend fun loadData() {
        isLoading = true
        capabilities = tokenManager.getCapabilities()
        userRole = tokenManager.userRoleFlow.firstOrNull() ?: ""

        val retrofit = ApiClient.create(tokenManager)
        val service = retrofit.create(NotificationService::class.java)

        try {
            val response = service.getMyNotifications()
            if (response.isSuccessful && response.body()?.data != null) {
                notifications = response.body()!!.data!!.items
            }

            if (capabilities.contains("notify.view.logs") || userRole.uppercase().contains("ADMIN")) {
                val logsRes = service.getNotificationLogs()
                if (logsRes.isSuccessful && logsRes.body()?.data != null) {
                    logsList = logsRes.body()!!.data!!.items
                }
            }
        } catch (e: Exception) {
            notifications = emptyList()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val canViewLogs = remember(capabilities, userRole) {
        capabilities.contains("notify.view.logs") || userRole.uppercase().contains("ADMIN")
    }

    val activeList = if (viewTab == 0) notifications else logsList

    val filteredList = remember(activeList, searchQuery, selectedFilter, readIds) {
        activeList.filter { n ->
            val matchSearch = searchQuery.isBlank() ||
                    n.displayJudul.contains(searchQuery, ignoreCase = true) ||
                    n.displayPesan.contains(searchQuery, ignoreCase = true)

            val typeUpper = (n.tipe ?: "").uppercase()
            val isRead = readIds.contains(n.id) || n.isRead
            val matchFilter = when (selectedFilter) {
                "UNREAD" -> !isRead
                "WHATSAPP" -> typeUpper.contains("WA") || typeUpper.contains("WHATSAPP")
                "EMAIL" -> typeUpper.contains("EMAIL")
                "SYSTEM" -> typeUpper.contains("SYSTEM") || typeUpper.contains("PUSH") || typeUpper.isBlank()
                else -> true
            }

            matchSearch && matchFilter
        }
    }

    val totalCount = activeList.size
    val unreadCount = activeList.count { !readIds.contains(it.id) && !it.isRead }

    fun markAllRead() {
        val newSet = readIds.toMutableSet()
        activeList.forEach { newSet.add(it.id) }
        readIds = newSet
    }

    fun markItemRead(id: String) {
        val newSet = readIds.toMutableSet()
        newSet.add(id)
        readIds = newSet
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Notifikasi & Pengumuman",
                onNavigateBack = onNavigateBack
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        if (isLoading) {
            LoadingOverlay(modifier = Modifier.padding(paddingValues))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Tab Navigation (jika user punya capability notify.view.logs)
                if (canViewLogs) {
                    TabRow(
                        selectedTabIndex = viewTab,
                        containerColor = SurfaceDark,
                        contentColor = Primary,
                        indicator = { tabPositions ->
                            TabRowDefaults.Indicator(
                                Modifier.tabIndicatorOffset(tabPositions[viewTab]),
                                color = Primary
                            )
                        }
                    ) {
                        Tab(
                            selected = viewTab == 0,
                            onClick = { viewTab = 0 },
                            text = { Text("Pemberitahuan Saya", fontWeight = FontWeight.Bold) }
                        )
                        Tab(
                            selected = viewTab == 1,
                            onClick = { viewTab = 1 },
                            text = { Text("Log Gateway Sistem", fontWeight = FontWeight.Bold) }
                        )
                    }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 1. KPI Cards Row & Action Button
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (viewTab == 0) "Pusat Pemberitahuan Saya" else "Histori Log Pengiriman Gateway",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextSecondary
                            )

                            if (unreadCount > 0) {
                                TextButton(onClick = { markAllRead() }) {
                                    Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(16.dp), tint = Primary)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Tandai Semua Dibaca", fontSize = 11.sp, color = Primary, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            KpiCard(
                                title = "Total Pesan",
                                value = "$totalCount",
                                subtitle = "In-App / Broadcast",
                                icon = Icons.Default.Notifications,
                                modifier = Modifier.weight(1f)
                            )
                            KpiCard(
                                title = "Belum Dibaca",
                                value = "$unreadCount",
                                subtitle = "Pesan Baru",
                                icon = Icons.Default.Info,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // 2. Search Field
                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari Pengumuman / Isi Notifikasi...", color = TextSecondary) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Primary) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = SurfaceDark,
                                unfocusedContainerColor = SurfaceDark,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = Border,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // 3. Filter Chips
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item { FilterChipNotif("SEMUA", "ALL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipNotif("🔔 BELUM DIBACA ($unreadCount)", "UNREAD", selectedFilter) { selectedFilter = it } }
                            item { FilterChipNotif("💬 WHATSAPP", "WHATSAPP", selectedFilter) { selectedFilter = it } }
                            item { FilterChipNotif("📧 EMAIL", "EMAIL", selectedFilter) { selectedFilter = it } }
                            item { FilterChipNotif("📌 SISTEM", "SYSTEM", selectedFilter) { selectedFilter = it } }
                        }
                    }

                    // 4. List Items
                    if (filteredList.isEmpty()) {
                        item {
                            EmptyState(
                                message = "Belum ada pengumuman / notifikasi terdaftar pada filter ini.",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp)
                            )
                        }
                    } else {
                        items(filteredList) { item ->
                            val isRead = readIds.contains(item.id) || item.isRead
                            NotificationCardItem(
                                item = item,
                                isRead = isRead,
                                onClick = { markItemRead(item.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterChipNotif(
    label: String,
    value: String,
    currentSelected: String,
    onSelect: (String) -> Unit
) {
    val isSelected = currentSelected == value
    
    val baseModifier = Modifier
        .clip(RoundedCornerShape(20.dp))
        .background(if (isSelected) PrimaryContainer else SurfaceDark)
        .clickable { onSelect(value) }
        
    val finalModifier = if (!isSelected) {
        baseModifier.border(BorderStroke(1.dp, Border), RoundedCornerShape(20.dp))
    } else {
        baseModifier
    }

    Box(
        modifier = finalModifier
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) Primary else TextSecondary
        )
    }
}

@Composable
private fun NotificationCardItem(
    item: NotificationItem,
    isRead: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = if (isRead) SurfaceDark else SurfaceDark.copy(alpha = 0.95f)),
        border = if (!isRead) BorderStroke(1.dp, Primary.copy(alpha = 0.5f)) else BorderStroke(1.dp, Border),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (!isRead) Primary.copy(alpha = 0.12f) else SurfaceVariantDark)
                    .padding(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = null,
                    tint = if (!isRead) Primary else TextSecondary
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.displayJudul,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (!isRead) FontWeight.Bold else FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )

                    if (!isRead) {
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Primary)
                                .size(8.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = item.displayPesan,
                    fontSize = 12.sp,
                    color = if (!isRead) TextPrimary else TextSecondary
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "📅 ${item.createdAtFormatted}",
                    fontSize = 10.sp,
                    color = TextSecondary
                )
            }
        }
    }
}
