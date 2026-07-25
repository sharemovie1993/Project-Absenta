package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun ToolmanSidebarPanel(
    toolsBorrowed: Int,
    toolsAvailable: Int,
    damagedReports: Int,
    onManage: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Alat Dipinjam",
            value = "$toolsBorrowed",
            sub = "unit keluar",
            highlight = toolsBorrowed > 0
        ),
        SidebarStatItem(
            label = "Stok Tersedia",
            value = "$toolsAvailable",
            sub = "unit di lab"
        )
    )

    val alertText = if (damagedReports > 0) {
        "$damagedReports kerusakan alat dilaporkan"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "orange",
        icon = Icons.Default.Settings,
        roleLabel = "Toolman",
        panelTitle = "Alat & Lab",
        statusLabel = if (damagedReports > 0) "$damagedReports Rusak" else "Normal",
        statusOk = damagedReports == 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Kelola Inventaris Lab",
                onClick = onManage
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
