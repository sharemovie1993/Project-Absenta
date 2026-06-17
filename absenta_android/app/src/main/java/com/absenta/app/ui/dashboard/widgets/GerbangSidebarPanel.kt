package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun GerbangSidebarPanel(
    totalScansToday: Int,
    lateStudents: Int,
    gateStatus: String,
    onOpenGerbang: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Scan Hari Ini",
            value = "$totalScansToday",
            sub = "total scan masuk"
        ),
        SidebarStatItem(
            label = "Terlambat",
            value = "$lateStudents",
            sub = "siswa terlambat",
            highlight = lateStudents > 0
        )
    )

    val alertText = if (gateStatus == "GANGGUAN") {
        "Perangkat gerbang mengalami gangguan!"
    } else {
        null
    }

    val statusLabel = when (gateStatus) {
        "AKTIF" -> "● Gate Aktif"
        "GANGGUAN" -> "⚠ Gangguan"
        else -> "○ Non-aktif"
    }

    BaseSidebarPanel(
        accentColor = "teal",
        icon = Icons.Default.LocationOn,
        roleLabel = "Op. Gerbang",
        panelTitle = "Scan Kehadiran",
        statusLabel = statusLabel,
        statusOk = gateStatus == "AKTIF",
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Modul Gerbang",
                onClick = onOpenGerbang
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
