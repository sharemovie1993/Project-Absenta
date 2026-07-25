package com.absenta.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Color scheme Light-First untuk aplikasi Absenta.
 */
private val AbsentaLightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryContainer,
    onPrimaryContainer = PrimaryDark,

    secondary = Info,
    onSecondary = OnPrimary,

    tertiary = Warning,
    onTertiary = OnPrimary,

    background = BackgroundDark,
    onBackground = TextPrimary,

    surface = SurfaceDark,
    onSurface = TextPrimary,

    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = TextSecondary,

    error = Danger,
    onError = OnPrimary,
    errorContainer = DangerContainer,
    onErrorContainer = Danger,

    outline = Border,
    outlineVariant = Divider,

    scrim = Color(0x33000000),
    inverseSurface = TextPrimary,
    inverseOnSurface = SurfaceDark,
    inversePrimary = PrimaryLight
)

/**
 * Tema utama aplikasi Absenta (Clean Light Theme).
 */
@Composable
fun AbsentaTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = AbsentaLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = BackgroundDark.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AbsentaTypography,
        content = content
    )
}
