package com.shambit.customer.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView

/**
 * Haptic feedback manager for providing tactile feedback
 * Supports different impact levels: light, medium, heavy
 */
class HapticFeedbackManager(private val context: Context) {

    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    /**
     * Perform light impact haptic feedback (20-30ms)
     * Used for minor actions like icon taps, swipes
     */
    fun performLightImpact() {
        performHapticFeedback(HapticImpact.LIGHT)
    }

    /**
     * Perform medium impact haptic feedback (50-80ms)
     * Used for major actions like button taps, banner clicks
     */
    fun performMediumImpact() {
        performHapticFeedback(HapticImpact.MEDIUM)
    }

    /**
     * Perform heavy impact haptic feedback (100ms)
     * Used for important events like level ups, achievements
     */
    fun performHeavyImpact() {
        performHapticFeedback(HapticImpact.HEAVY)
    }

    /**
     * Perform haptic feedback with specified impact level
     */
    private fun performHapticFeedback(impact: HapticImpact) {
        try {
            vibrator?.let { vib ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = when (impact) {
                        HapticImpact.LIGHT -> VibrationEffect.createOneShot(
                            30,
                            VibrationEffect.DEFAULT_AMPLITUDE
                        )
                        HapticImpact.MEDIUM -> VibrationEffect.createOneShot(
                            50,
                            VibrationEffect.DEFAULT_AMPLITUDE
                        )
                        HapticImpact.HEAVY -> VibrationEffect.createOneShot(
                            100,
                            VibrationEffect.DEFAULT_AMPLITUDE
                        )
                    }
                    vib.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vib.vibrate(impact.duration)
                }
            }
        } catch (e: Exception) {
            // Silently fail if haptic feedback is not available
            android.util.Log.e("HapticFeedback", "Error performing haptic feedback", e)
        }
    }

    /**
     * Perform haptic feedback using View's built-in constants
     * This respects system haptic settings
     */
    fun performViewHapticFeedback(view: View, feedbackConstant: Int = HapticFeedbackConstants.VIRTUAL_KEY) {
        view.performHapticFeedback(
            feedbackConstant,
            HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
        )
    }

    /**
     * Check if haptic feedback is available
     */
    fun isHapticFeedbackAvailable(): Boolean {
        return vibrator?.hasVibrator() == true
    }

    /**
     * Haptic impact levels
     */
    private enum class HapticImpact(val duration: Long) {
        LIGHT(30),
        MEDIUM(50),
        HEAVY(100)
    }
}

/**
 * Composable function to remember HapticFeedbackManager
 */
@Composable
fun rememberHapticFeedback(): HapticFeedbackManager {
    val context = LocalContext.current
    return remember { HapticFeedbackManager(context) }
}

/**
 * Extension function for View to perform haptic feedback easily
 */
fun View.performLightHaptic() {
    performHapticFeedback(
        HapticFeedbackConstants.VIRTUAL_KEY,
        HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
    )
}

fun View.performMediumHaptic() {
    performHapticFeedback(
        HapticFeedbackConstants.KEYBOARD_TAP,
        HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
    )
}

fun View.performHeavyHaptic() {
    performHapticFeedback(
        HapticFeedbackConstants.LONG_PRESS,
        HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
    )
}
