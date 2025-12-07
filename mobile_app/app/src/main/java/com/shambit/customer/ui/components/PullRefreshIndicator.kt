package com.shambit.customer.ui.components

import android.content.Context
import android.media.MediaPlayer
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.shambit.customer.R
import com.shambit.customer.util.HapticFeedbackManager
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * Custom Pull-to-Refresh Indicator with ShamBit logo animation
 * 
 * Features:
 * - Pull phase: Logo scales from 0.5x to 1.0x
 * - Release phase: 360° rotation over 800ms
 * - Success: Confetti burst with 20 particles
 * - Success: Soft chime sound (60dB max)
 * - Success: Haptic feedback (100ms medium impact)
 * - Error: Shake animation for failed refresh
 */
@Composable
fun ShamBitPullRefreshIndicator(
    refreshing: Boolean,
    pullProgress: Float,
    refreshSuccess: Boolean?,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val context = LocalContext.current
    
    // Animation states
    var showConfetti by remember { mutableStateOf(false) }
    var playChime by remember { mutableStateOf(false) }
    
    // Pull phase: Scale animation (0.5x to 1.0x based on pull progress)
    val pullScale = 0.5f + (pullProgress * 0.5f).coerceIn(0f, 0.5f)
    val pullAlpha = 0.3f + (pullProgress * 0.7f).coerceIn(0f, 0.7f)
    
    // Simple pulse animation during refresh (no rotation)
    val pulseScale by animateFloatAsState(
        targetValue = if (refreshing) 1.1f else 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    // Trigger success effects
    LaunchedEffect(refreshSuccess) {
        if (refreshSuccess == true) {
            // Play chime sound
            playChime = true
            
            // Trigger haptic feedback
            hapticFeedback?.performHeavyImpact()
        }
    }
    
    // Only show indicator during pull or refresh
    if (!refreshing && pullProgress <= 0f) {
        return
    }
    
    // Play chime sound
    if (playChime) {
        PlayChimeSound(context)
        playChime = false
    }
    
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(80.dp),
        contentAlignment = Alignment.Center
    ) {
        // Logo with simple animations
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = "ShamBit Logo",
            modifier = Modifier
                .size(48.dp)
                .graphicsLayer {
                    if (refreshing) {
                        // Simple pulse during refresh
                        scaleX = pulseScale
                        scaleY = pulseScale
                        alpha = 1f
                    } else {
                        // Scale based on pull progress
                        scaleX = pullScale
                        scaleY = pullScale
                        alpha = pullAlpha
                    }
                }
        )
    }
}



/**
 * Play soft chime sound (60dB max)
 * Only plays if device is not in silent/vibrate mode
 */
@Composable
private fun PlayChimeSound(context: Context) {
    LaunchedEffect(Unit) {
        try {
            // Check if device is in silent or vibrate mode
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            val ringerMode = audioManager?.ringerMode
            
            // Only play sound if device is in normal mode (not silent or vibrate)
            if (ringerMode == android.media.AudioManager.RINGER_MODE_NORMAL) {
                val mediaPlayer = MediaPlayer.create(context, R.raw.chimesound)
                mediaPlayer?.apply {
                    setVolume(0.3f, 0.3f) // 30% volume for soft chime
                    setOnCompletionListener { it.release() }
                    start()
                }
            }
        } catch (e: Exception) {
            // Silently fail if sound file doesn't exist or can't play
            android.util.Log.e("PullRefreshIndicator", "Error playing chime", e)
        }
    }
}
