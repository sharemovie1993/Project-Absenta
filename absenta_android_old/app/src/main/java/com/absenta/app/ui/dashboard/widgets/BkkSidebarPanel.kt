package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun BkkSidebarPanel(
    alumniPlaced: Int,
    activeJobs: Int,
    pendingApplications: Int,
    onOpenPortal: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Alumni Tersalur",
            value = "$alumniPlaced",
            sub = "orang bekerja"
        ),
        SidebarStatItem(
            label = "Lowongan Aktif",
            value = "$activeJobs",
            sub = "posisi tersedia"
        )
    )

    val alertText = if (pendingApplications > 0) {
        "$pendingApplications lamaran menunggu proses verifikasi"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "sky",
        icon = Icons.Default.Share,
        roleLabel = "Staf BKK",
        panelTitle = "Bursa Kerja Khusus",
        statusLabel = if (pendingApplications > 0) "$pendingApplications Lamaran" else "Aktif",
        statusOk = pendingApplications == 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Portal Karir BKK",
                onClick = onOpenPortal
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
