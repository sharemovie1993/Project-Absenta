package com.absenta.app.ui.dashboard.widgets

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun BpbkSidebarPanel(
    newCases: Int,
    handledCases: Int,
    criticalStudents: Int,
    onOpenData: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false
) {
    val stats = listOf(
        SidebarStatItem(
            label = "Kasus Baru",
            value = "$newCases",
            sub = "perlu tindakan",
            highlight = newCases > 0
        ),
        SidebarStatItem(
            label = "Ditangani",
            value = "$handledCases",
            sub = "kasus berjalan"
        )
    )

    val alertText = if (criticalStudents > 0) {
        "$criticalStudents siswa dengan poin pelanggaran kritis (>50)"
    } else {
        null
    }

    BaseSidebarPanel(
        accentColor = "pink",
        icon = Icons.Default.Favorite,
        roleLabel = "Staf BK",
        panelTitle = "Bimbingan & Konseling",
        statusLabel = if (criticalStudents > 0) "$criticalStudents Kritis" else "Terkendali",
        statusOk = criticalStudents == 0,
        stats = stats,
        alertText = alertText,
        actions = listOf(
            SidebarActionItem(
                label = "Data Konseling Siswa",
                onClick = onOpenData
            )
        ),
        isLoading = isLoading,
        modifier = modifier
    )
}
