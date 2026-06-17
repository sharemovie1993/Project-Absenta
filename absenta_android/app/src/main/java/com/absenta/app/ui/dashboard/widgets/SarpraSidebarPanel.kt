package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun SarpraSidebarPanel(
    activeBorrows: Int,
    availableAssets: Int,
    pendingMaintenance: Int,
    onManage: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Peminjaman Aktif",
            value = "$activeBorrows",
            sub = "unit dipinjam",
            highlight = activeBorrows > 0
        ),
        SidebarStatItem(
            label = "Aset Tersedia",
            value = "$availableAssets",
            sub = "unit siap pakai"
        )
    )

    val alertText = if (pendingMaintenance > 0) {
        "$pendingMaintenance aset menunggu perawatan"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "emerald",
        icon = Icons.Default.Home,
        roleLabel = "Staf Sarpras",
        panelTitle = "Inventaris & Sarana",
        statusLabel = if (pendingMaintenance > 0) "$pendingMaintenance Perawatan" else "Normal",
        statusOk = pendingMaintenance == 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Inventaris Sarpras",
                onClick = onManage
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
