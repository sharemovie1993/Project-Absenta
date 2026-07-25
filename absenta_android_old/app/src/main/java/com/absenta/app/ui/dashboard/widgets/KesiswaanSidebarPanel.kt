package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun KesiswaanSidebarPanel(
    isPiketHariIni: Boolean,
    activeIzinCount: Int,
    pointsToday: Int,
    onOpenPiket: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    onOpenMonitoring: (() -> Unit)? = null
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Izin Keluar",
            value = "$activeIzinCount",
            sub = "siswa aktif",
            highlight = activeIzinCount > 0
        ),
        SidebarStatItem(
            label = "Pelanggaran",
            value = "$pointsToday",
            sub = "poin hari ini",
            highlight = pointsToday > 0
        )
    )

    val alertText = if (activeIzinCount > 0) {
        "$activeIzinCount siswa menunggu konfirmasi"
    } else if (pointsToday > 0) {
        "Ada catatan pelanggaran hari ini"
    } else {
        null
    }

    val actions = mutableListOf(
        SidebarActionItem(
            label = "Menu Piket & Izin",
            onClick = onOpenPiket
        )
    )

    if (onOpenMonitoring != null) {
        actions.add(
            SidebarActionItem(
                label = "Monitoring Kesiswaan",
                onClick = onOpenMonitoring
            )
        )
    }

    BaseSidebarPanel(
        accentColor = "amber",
        icon = Icons.Default.CheckCircle,
        roleLabel = "Tim Kesiswaan",
        panelTitle = "Piket & Ketertiban",
        statusLabel = if (isPiketHariIni) "● Piket Aktif" else "Tidak Piket",
        statusOk = isPiketHariIni,
        stats = stats,
        alertText = alertText,
        actions = actions,
        isLoading = isLoading,
        modifier = modifier
    )
}
