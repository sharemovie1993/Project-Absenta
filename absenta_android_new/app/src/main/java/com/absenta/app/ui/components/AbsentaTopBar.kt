package com.absenta.app.ui.components

import androidx.compose.foundation.layout.RowScope
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.TextPrimary

/**
 * AbsentaTopBar — shared Top App Bar untuk semua layar di aplikasi Absenta.
 *
 * Selalu menggunakan warna Dark-First dan font bold pada judul agar
 * mudah dibaca oleh operator lapangan.
 *
 * @param title Judul yang ditampilkan di tengah/kiri top bar
 * @param onNavigateBack Callback saat tombol back ditekan. Jika null, tombol back tidak ditampilkan.
 * @param actions Slot untuk tombol aksi di sisi kanan (opsional)
 * @param containerColor Warna background top bar, default [BackgroundDark]
 * @param titleColor Warna teks judul, default [TextPrimary]
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsentaTopBar(
    title: String,
    onNavigateBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    containerColor: Color = BackgroundDark,
    titleColor: Color = TextPrimary
) {
    TopAppBar(
        title = {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = titleColor
            )
        },
        navigationIcon = {
            if (onNavigateBack != null) {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Kembali",
                        tint = Primary
                    )
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = containerColor,
            titleContentColor = titleColor,
            actionIconContentColor = Primary
        )
    )
}
