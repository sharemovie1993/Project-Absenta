package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun KaprogSidebarPanel(
    totalTeachers: Int,
    activeClasses: Int,
    supervisionCount: Int,
    programName: String,
    onMonitor: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Guru Jurusan",
            value = "$totalTeachers",
            sub = "tenaga pengajar"
        ),
        SidebarStatItem(
            label = "Kelas Aktif",
            value = "$activeClasses",
            sub = "berjalan hari ini"
        )
    )

    val alertText = if (supervisionCount > 0) {
        "$supervisionCount supervisi praktikum dijadwalkan"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "violet",
        icon = Icons.Default.Star,
        roleLabel = "Kepala Program",
        panelTitle = "Kaprog $programName",
        statusLabel = if (supervisionCount > 0) "$supervisionCount Supervisi" else "Aktif",
        statusOk = true,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Monitoring Jurusan",
                onClick = onMonitor
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
