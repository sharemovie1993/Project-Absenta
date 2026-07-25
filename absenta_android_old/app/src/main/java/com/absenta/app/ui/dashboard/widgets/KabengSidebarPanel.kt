package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun KabengSidebarPanel(
    activeBengkel: Int,
    availableTools: Int,
    practiceSchedules: Int,
    bengkelName: String,
    onManage: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Bengkel Aktif",
            value = "$activeBengkel",
            sub = "ruang praktik",
            highlight = activeBengkel > 0
        ),
        SidebarStatItem(
            label = "Alat Tersedia",
            value = "$availableTools",
            sub = "unit siap pakai"
        )
    )

    val alertText = if (practiceSchedules > 0) {
        "$practiceSchedules jadwal praktik hari ini"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "stone",
        icon = Icons.Default.Settings,
        roleLabel = "Kepala Bengkel",
        panelTitle = "Kabeng $bengkelName",
        statusLabel = if (activeBengkel > 0) "● Bengkel Aktif" else "Tidak Aktif",
        statusOk = activeBengkel > 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Jadwal Bengkel",
                onClick = onManage
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
