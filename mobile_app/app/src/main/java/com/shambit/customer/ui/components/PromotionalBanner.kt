package com.shambit.customer.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ripple.rememberRipple
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.BannerDto
import com.shambit.customer.util.rememberHapticFeedback
import kotlinx.coroutines.delay
import kotlin.math.absoluteValue

/**
 * Promotional Banner Carousel Component
 * 
 * Displays promotional banners in a horizontal carousel with:
 * - Full-width layout
 * - 120dp height
 * - Mobile-optimized images using Coil
 * - 12dp rounded corners
 * - Auto-scroll with 3000ms interval (Blinkit-style)
 * - Page indicator dots at bottom center
 * - Tap handler for banner action navigation
 * - Ripple effect on tap
 * - Haptic feedback (50ms medium impact)
 * 
 * Requirements: 6
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PromotionalBannerCarousel(
    banners: List<BannerDto>,
    onBannerClick: (BannerDto) -> Unit,
    modifier: Modifier = Modifier
) {
    if (banners.isEmpty()) {
        return
    }

    val pagerState = rememberPagerState(
        initialPage = 0,
        pageCount = { banners.size }
    )

    // Auto-scroll effect (Blinkit-style)
    LaunchedEffect(Unit) {
        while (true) {
            delay(3000) // 3 second interval
            val nextPage = (pagerState.currentPage + 1) % banners.size
            pagerState.animateScrollToPage(
                page = nextPage,
                animationSpec = tween(
                    durationMillis = 500,
                    easing = FastOutSlowInEasing
                )
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            beyondBoundsPageCount = 1
        ) { page ->
            // Calculate page offset for 3D parallax effect
            val pageOffset = (pagerState.currentPage - page) + pagerState.currentPageOffsetFraction
            
            PromotionalBannerCard(
                banner = banners[page],
                pageOffset = pageOffset,
                onClick = { onBannerClick(banners[page]) }
            )
        }

        // Page Indicator (only show if more than 1 banner)
        if (banners.size > 1) {
            PromotionalBannerIndicator(
                pageCount = banners.size,
                currentPage = pagerState.currentPage,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 16.dp)
            )
        }
    }
}

/**
 * Individual Promotional Banner Card with 3D Effects
 */
@Composable
private fun PromotionalBannerCard(
    banner: BannerDto,
    pageOffset: Float,
    onClick: () -> Unit
) {
    val hapticFeedback = rememberHapticFeedback()
    val interactionSource = remember { MutableInteractionSource() }
    
    // Smooth scale animation for press effect
    val scale = remember { Animatable(1f) }
    
    // Calculate 3D transformation based on page offset
    val offsetAbs = pageOffset.absoluteValue
    val cardScale = 1f - (offsetAbs * 0.1f).coerceIn(0f, 0.15f)
    val cardAlpha = 1f - (offsetAbs * 0.3f).coerceIn(0f, 0.5f)
    val rotationY = pageOffset * 15f
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp)
            .padding(horizontal = 4.dp)
            .graphicsLayer {
                // 3D rotation effect
                this.rotationY = rotationY
                this.cameraDistance = 12f * density
                
                // Scale and alpha based on position
                scaleX = cardScale * scale.value
                scaleY = cardScale * scale.value
                alpha = cardAlpha
                
                // Enhanced shadow with elevation
                shadowElevation = (8f - (offsetAbs * 4f)).coerceAtLeast(2f)
                
                // Subtle tilt for depth
                this.rotationZ = pageOffset * -2f
            }
            .clip(RoundedCornerShape(12.dp))
            .clickable(
                interactionSource = interactionSource,
                indication = rememberRipple(),
                onClick = {
                    // Perform medium impact haptic feedback (50ms)
                    hapticFeedback.performMediumImpact()
                    onClick()
                }
            ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 8.dp,
            pressedElevation = 12.dp,
            hoveredElevation = 10.dp
        )
    ) {
        AsyncImage(
            model = banner.getMobileImage(),
            contentDescription = banner.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
        )
    }
    
    // Animate scale on press
    LaunchedEffect(interactionSource) {
        interactionSource.interactions.collect { interaction ->
            when (interaction) {
                is androidx.compose.foundation.interaction.PressInteraction.Press -> {
                    scale.animateTo(0.95f, tween(100))
                }
                is androidx.compose.foundation.interaction.PressInteraction.Release -> {
                    scale.animateTo(1f, tween(100))
                }
                is androidx.compose.foundation.interaction.PressInteraction.Cancel -> {
                    scale.animateTo(1f, tween(100))
                }
            }
        }
    }
}

/**
 * Page Indicator Dots for Promotional Banners with Smooth Animations
 */
@Composable
private fun PromotionalBannerIndicator(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .background(
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(pageCount) { index ->
            val isActive = index == currentPage
            
            // Animated width for active indicator (pill shape)
            val width by animateDpAsState(
                targetValue = if (isActive) 24.dp else 6.dp,
                animationSpec = tween(
                    durationMillis = 400,
                    easing = FastOutSlowInEasing
                ),
                label = "promotional_dot_width"
            )
            
            // Animated scale for smooth transition
            val scale by animateDpAsState(
                targetValue = if (isActive) 1.2f.dp else 1f.dp,
                animationSpec = tween(
                    durationMillis = 300,
                    easing = FastOutSlowInEasing
                ),
                label = "promotional_dot_scale"
            )

            Box(
                modifier = Modifier
                    .size(width = width, height = 6.dp)
                    .scale(scale.value / 1.dp.value)
                    .clip(RoundedCornerShape(3.dp))
                    .background(
                        color = if (isActive) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                        }
                    )
            )
        }
    }
}
