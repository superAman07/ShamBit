package com.shambit.customer.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Theme mode options for ShamBit app
 */
enum class ThemeMode {
    LIGHT,      // Light theme with mint green primary
    DARK,       // Dark theme with soft teal primary
    AMOLED,     // Pure black background for OLED displays
    SYSTEM      // Follow system theme preference
}

/**
 * ShamBit theme composable with support for light, dark, and AMOLED themes
 * 
 * Features:
 * - Light theme with mint green primary color
 * - Dark theme with soft teal primary color
 * - AMOLED theme with pure black background
 * - System theme following device preference
 * - Dynamic color support for Android 12+ (optional)
 * - Proper status bar and navigation bar styling
 * 
 * @param themeMode The theme mode to apply (LIGHT, DARK, AMOLED, or SYSTEM)
 * @param dynamicColor Enable dynamic color on Android 12+ (default: false)
 * @param content The composable content to theme
 */
@Composable
fun ShamBitTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val systemInDarkTheme = isSystemInDarkTheme()
    
    // Determine if we should use dark theme
    val useDarkTheme = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.AMOLED -> true
        ThemeMode.SYSTEM -> systemInDarkTheme
    }
    
    // Determine if we should use AMOLED theme
    val useAmoledTheme = themeMode == ThemeMode.AMOLED
    
    // Select color scheme based on theme mode and dynamic color support
    val colorScheme = when {
        // Dynamic color is available on Android 12+
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (useDarkTheme) {
                dynamicDarkColorScheme(context)
            } else {
                dynamicLightColorScheme(context)
            }
        }
        // AMOLED theme with pure black background
        useAmoledTheme -> AmoledColorScheme
        // Standard dark theme
        useDarkTheme -> DarkColorScheme
        // Standard light theme
        else -> LightColorScheme
    }
    
    // Update system bars (status bar and navigation bar)
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !useDarkTheme
        }
    }
    
    // Apply Material 3 theme with custom color scheme, typography, and shapes
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
