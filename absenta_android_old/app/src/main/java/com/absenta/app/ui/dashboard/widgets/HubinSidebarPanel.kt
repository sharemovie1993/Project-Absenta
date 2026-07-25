package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun HubinSidebarPanel(
    activePklStudents: Int,
    activePartners: Int,
    pendingReports: Int,
    onMonitor: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Siswa PKL Aktif",
            value = "$activePklStudents",
            sub = "sedang magang"
        ),
        SidebarStatItem(
            label = "Mitra Aktif",
            value = "$activePartners",
            sub = "industri mitra"
        )
    )

    val alertText = if (pendingReports > 0) {
        "$pendingReports laporan PKL menunggu verifikasi"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "indigo",
        icon = Icons.Default.List,
        roleLabel = "Staf Hubin",
        panelTitle = "Industri & PKL",
        statusLabel = if (pendingReports > 0) "$pendingReports Laporan" else "Update",
        statusOk = pendingReports == 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Monitoring PKL",
                onClick = onMonitor
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
