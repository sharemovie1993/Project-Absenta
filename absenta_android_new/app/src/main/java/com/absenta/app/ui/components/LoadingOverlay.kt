package com.absenta.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.absenta.app.ui.theme.Primary

/**
 * LoadingOverlay — shared loading indicator yang ditampilkan di tengah layar.
 *
 * Gunakan saat data sedang dimuat dari API (state loading).
 * Menggunakan warna aksen Primary agar terlihat di atas background gelap.
 *
 * @param modifier Modifier opsional dari parent
 * @param color Warna progress indicator, default [Primary]
 */
@Composable
fun LoadingOverlay(
    modifier: Modifier = Modifier,
    color: Color = Primary
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = color)
    }
}
