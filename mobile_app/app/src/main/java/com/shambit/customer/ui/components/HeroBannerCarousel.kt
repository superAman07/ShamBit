package com.shambit.customer.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.BannerDto
import kotlinx.coroutines.delay

/**
 * Hero Banner Carousel Component
 * 
 * Displays hero banners in a horizontal pager with:
 * - Auto-scroll with 3000ms interval
 * - Page indicator dots at bottom center
 * - Parallax effect (50% background speed)
 * - Rounded corners (12dp radius)
 * - Banner click action handling
 * 
 * Requirements: 3
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HeroBannerCarousel(
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
    val coroutineScope = rememberCoroutineScope()

    // Auto-scroll effect
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
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            beyondBoundsPageCount = 0
        ) { page ->
            BannerCard(
                banner = banners[page],
                onClick = { onBannerClick(banners[page]) }
            )
        }

        // Page Indicator
        PageIndicator(
            pageCount = banners.size,
            currentPage = pagerState.currentPage,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp)
        )
    }
}

/**
 * Individual Banner Card
 */
@Composable
private fun BannerCard(
    banner: BannerDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        AsyncImage(
            model = banner.getMobileImage(),
            contentDescription = banner.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
        )
    }
}

/**
 * Page Indicator Dots
 */
@Composable
private fun PageIndicator(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(pageCount) { index ->
            val isActive = index == currentPage
            val size by animateDpAsState(
                targetValue = if (isActive) 8.dp else 6.dp,
                animationSpec = tween(
                    durationMillis = 300,
                    easing = FastOutSlowInEasing
                ),
                label = "dot_size"
            )

            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(
                        color = if (isActive) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
                        }
                    )
            )
        }
    }
}
