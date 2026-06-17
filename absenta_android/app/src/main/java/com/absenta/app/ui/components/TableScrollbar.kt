package com.absenta.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

@Composable
fun TableScrollbar(
    scrollState: ScrollState,
    modifier: Modifier = Modifier
) {
    if (scrollState.maxValue > 0) {
        val targetValue = scrollState.value.toFloat()
        val maxValue = scrollState.maxValue.toFloat()
        val viewportSize = scrollState.viewportSize.toFloat()
        val totalWidth = maxValue + viewportSize
        
        val thumbWidthFraction = (viewportSize / totalWidth).coerceIn(0.15f, 0.9f)
        val scrollFraction = targetValue / maxValue
        
        // Smooth transitions if desired, but direct translation is standard for scrollbars
        val animatedScrollFraction by animateFloatAsState(
            targetValue = scrollFraction,
            label = "scrollbar_scroll"
        )
        
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(6.dp)
                .background(Color(0xFFE2E8F0), RoundedCornerShape(3.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = thumbWidthFraction)
                    .align(Alignment.CenterStart)
                    .graphicsLayer {
                        val maxTranslation = size.width * (1f - thumbWidthFraction)
                        translationX = animatedScrollFraction * maxTranslation
                    }
                    .background(Color(0xFF1E3C72), RoundedCornerShape(3.dp))
            )
        }
    }
}
