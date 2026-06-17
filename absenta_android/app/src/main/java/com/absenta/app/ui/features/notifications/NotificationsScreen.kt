package com.absenta.app.ui.features.notifications

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AppNotification
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var notifications by remember { mutableStateOf<List<AppNotification>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var unreadCount by remember { mutableStateOf(0) }
    var selectedFilter by remember { mutableStateOf(0) }
    val filters = listOf("SEMUA", "BELUM DIBACA")

    fun loadNotifications() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "NotificationsScreen loaded, filter=$selectedFilter")
            try {
                val service = ApiClient.getClient(context).create(ProfileService::class.java)
                val resp = service.getNotifications(
                    limit = 30,
                    unreadOnly = if (selectedFilter == 1) true else null
                )
                if (resp.isSuccessful) {
                    notifications = resp.body()?.data?.list ?: emptyList()
                    unreadCount = resp.body()?.data?.unread_count ?: 0
                    Log.d("AbsentaDebug", "Notifications loaded: ${notifications.size}, unread=$unreadCount")
                } else {
                    notifications = emptyList()
                    unreadCount = 0
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "NotificationsScreen error", e)
                notifications = emptyList()
                unreadCount = 0
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedFilter) { loadNotifications() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Notifikasi", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        if (unreadCount > 0) {
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFFEF4444), CircleShape)
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    if (unreadCount > 99) "99+" else unreadCount.toString(),
                                    fontSize = 10.sp,
                                    color = Color.White,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                actions = {
                    if (unreadCount > 0) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    Log.d("AbsentaDebug", "Marking all notifications as read")
                                    try {
                                        val service = ApiClient.getClient(context).create(ProfileService::class.java)
                                        service.markAllAsRead()
                                        notifications = notifications.map { it.copy(is_read = true) }
                                        unreadCount = 0
                                        Log.d("AbsentaDebug", "All notifications marked as read")
                                    } catch (e: Exception) {
                                        Log.e("AbsentaDebug", "Mark all read error", e)
                                        notifications = notifications.map { it.copy(is_read = true) }
                                        unreadCount = 0
                                    }
                                }
                            }
                        ) {
                            Text("Baca Semua", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
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
            // Filter Tabs
            TabRow(
                selectedTabIndex = selectedFilter,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                filters.forEachIndexed { index, label ->
                    Tab(
                        selected = selectedFilter == index,
                        onClick = { selectedFilter = index },
                        text = {
                            Text(
                                label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedFilter == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (notifications.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color(0xFFCBD5E1))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Tidak ada notifikasi", color = Color(0xFF94A3B8), fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        Text("Semua notifikasi akan muncul di sini", color = Color(0xFFCBD5E1), fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    items(notifications, key = { it.id }) { notif ->
                        NotificationItem(
                            notification = notif,
                            onMarkRead = {
                                scope.launch {
                                    Log.d("AbsentaDebug", "Marking notification ${notif.id} as read")
                                    try {
                                        val service = ApiClient.getClient(context).create(ProfileService::class.java)
                                        service.markAsRead(notif.id)
                                    } catch (e: Exception) {
                                        Log.e("AbsentaDebug", "Mark read error", e)
                                    }
                                    notifications = notifications.map {
                                        if (it.id == notif.id) it.copy(is_read = true) else it
                                    }
                                    if (!notif.is_read) unreadCount = maxOf(0, unreadCount - 1)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationItem(notification: AppNotification, onMarkRead: () -> Unit) {
    val (icon, iconColor, iconBg) = getNotificationStyle(notification.type)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (!notification.is_read) Color(0xFFF0F7FF) else Color.White)
            .clickable { if (!notification.is_read) onMarkRead() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Icon circle
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(iconBg, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(22.dp))
        }

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    notification.title,
                    fontWeight = if (!notification.is_read) FontWeight.Bold else FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A),
                    modifier = Modifier.weight(1f)
                )
                if (!notification.is_read) {
                    Box(modifier = Modifier.size(8.dp).background(Color(0xFF3B82F6), CircleShape))
                }
            }
            Text(
                notification.body,
                fontSize = 13.sp,
                color = Color(0xFF475569),
                modifier = Modifier.padding(top = 3.dp),
                maxLines = 2
            )
            Text(
                formatNotifTime(notification.created_at),
                fontSize = 11.sp,
                color = Color(0xFF94A3B8),
                modifier = Modifier.padding(top = 5.dp)
            )
        }
    }
    HorizontalDivider(color = Color(0xFFF1F5F9))
}

fun getNotificationStyle(type: String): Triple<ImageVector, Color, Color> {
    return when (type.lowercase()) {
        "attendance" -> Triple(Icons.Default.CheckCircle, Color(0xFF10B981), Color(0xFFD1FAE5))
        "violation" -> Triple(Icons.Default.Warning, Color(0xFFF59E0B), Color(0xFFFEF3C7))
        "billing" -> Triple(Icons.Default.CreditCard, Color(0xFF3B82F6), Color(0xFFDBEAFE))
        "counseling" -> Triple(Icons.Default.Favorite, Color(0xFFEC4899), Color(0xFFFCE7F3))
        "pkl" -> Triple(Icons.Default.Home, Color(0xFF8B5CF6), Color(0xFFEDE9FE))
        "announcement" -> Triple(Icons.Default.Notifications, Color(0xFF06B6D4), Color(0xFFCFFAFE))
        else -> Triple(Icons.Default.Notifications, Color(0xFF64748B), Color(0xFFF1F5F9))
    }
}

fun formatNotifTime(isoDate: String): String {
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
        val date = sdf.parse(isoDate.take(19)) ?: return isoDate
        val now = java.util.Date()
        val diffMs = now.time - date.time
        val diffMin = diffMs / 60000
        val diffHour = diffMin / 60
        val diffDay = diffHour / 24
        when {
            diffMin < 1 -> "Baru saja"
            diffMin < 60 -> "${diffMin} menit lalu"
            diffHour < 24 -> "${diffHour} jam lalu"
            diffDay < 7 -> "${diffDay} hari lalu"
            else -> java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("id", "ID")).format(date)
        }
    } catch (e: Exception) { isoDate.take(10) }
}


