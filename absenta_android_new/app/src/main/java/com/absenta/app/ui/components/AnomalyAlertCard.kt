package com.absenta.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.absenta.app.data.model.AnomalyItem
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.DangerContainer
import com.absenta.app.ui.theme.Info
import com.absenta.app.ui.theme.InfoContainer
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import com.absenta.app.ui.theme.Warning
import com.absenta.app.ui.theme.WarningContainer

/**
 * AnomalyAlertCard — shared card komponen untuk menampilkan peringatan anomali sistem.
 *
 * Digunakan di [ExecutiveDashboardScreen] untuk menampilkan peringatan dini
 * (sesi kelas belum dibuka, lonjakan siswa alpa, dll.).
 *
 * Warna card menyesuaikan severity: warning (amber), error (merah), info (biru).
 *
 * @param anomaly [AnomalyItem] yang berisi type, message, dan severity
 * @param modifier Modifier opsional dari parent
 */
@Composable
fun AnomalyAlertCard(
    type: String,
    message: String,
    severity: String = "warning",
    modifier: Modifier = Modifier
) {
    AnomalyAlertCard(
        anomaly = AnomalyItem(type = type, message = message, severity = severity),
        modifier = modifier
    )
}

@Composable
fun AnomalyAlertCard(
    anomaly: AnomalyItem,
    modifier: Modifier = Modifier
) {
    // Tentukan warna berdasarkan severity
    val (containerColor, iconColor) = when (anomaly.severity.lowercase()) {
        "error" -> DangerContainer to Danger
        "info" -> InfoContainer to Info
        else -> WarningContainer to Warning // default: warning
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = "Peringatan",
                tint = iconColor,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = anomaly.type,
                    style = MaterialTheme.typography.labelMedium,
                    color = iconColor
                )
                Text(
                    text = anomaly.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
    }
}
