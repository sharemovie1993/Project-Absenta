package com.absenta.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.DangerContainer
import com.absenta.app.ui.theme.StatusAlpa
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.StatusIzin
import com.absenta.app.ui.theme.StatusSakit
import com.absenta.app.ui.theme.StatusTerlambat
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.Warning
import com.absenta.app.ui.theme.WarningContainer

/**
 * StatusBadge — shared badge komponen untuk menampilkan status kehadiran.
 *
 * Menampilkan label status (HADIR, IZIN, SAKIT, ALPA, TERLAMBAT) dengan warna
 * latar yang sesuai. Digunakan di daftar absensi, rekap, dan sesi kelas.
 *
 * @param status String status (e.g. "HADIR", "IZIN", "SAKIT", "ALPA", "TERLAMBAT")
 * @param modifier Modifier opsional dari parent
 */
@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = getStatusColors(status)

    Text(
        text = status,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = textColor,
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

/**
 * Menentukan pasangan warna background & teks berdasarkan string status.
 *
 * @param status String status kehadiran
 * @return Pair(backgroundColor, textColor)
 */
private fun getStatusColors(status: String): Pair<Color, Color> {
    return when (status.uppercase()) {
        "HADIR" -> StatusHadir.copy(alpha = 0.2f) to StatusHadir
        "IZIN" -> StatusIzin.copy(alpha = 0.2f) to StatusIzin
        "SAKIT" -> StatusSakit.copy(alpha = 0.2f) to StatusSakit
        "ALPA" -> DangerContainer to Danger
        "TERLAMBAT" -> WarningContainer to Warning
        else -> SurfaceVariantDark to StatusAlpa
    }
}
