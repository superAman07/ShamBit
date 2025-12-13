package com.shambit.customer.util

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Performance monitoring utility for tracking scroll performance and memory usage
 * Requirements: 9.2, 9.3 - Add performance monitoring for long product lists
 */
@Singleton
class PerformanceMonitor @Inject constructor() {
    
    private val _performanceMetrics = MutableStateFlow(PerformanceMetrics())
    val performanceMetrics: StateFlow<PerformanceMetrics> = _performanceMetrics.asStateFlow()
    
    private var scrollStartTime = 0L
    private var lastScrollPosition = 0
    private var frameDropCount = 0
    
    /**
     * Track scroll performance metrics
     */
    fun trackScrollPerformance(
        firstVisibleItemIndex: Int,
        firstVisibleItemScrollOffset: Int,
        totalItemCount: Int
    ) {
        val currentTime = System.currentTimeMillis()
        
        if (scrollStartTime == 0L) {
            scrollStartTime = currentTime
        }
        
        // Calculate scroll velocity
        val scrollDistance = kotlin.math.abs(firstVisibleItemIndex - lastScrollPosition)
        val scrollVelocity = if (scrollDistance > 0) {
            scrollDistance.toFloat() / (currentTime - scrollStartTime).coerceAtLeast(1L)
        } else {
            0f
        }
        
        lastScrollPosition = firstVisibleItemIndex
        
        // Update metrics
        _performanceMetrics.value = _performanceMetrics.value.copy(
            scrollVelocity = scrollVelocity,
            currentScrollPosition = firstVisibleItemIndex,
            totalItemsLoaded = totalItemCount,
            lastUpdateTime = currentTime
        )
        
        // Log performance warnings
        if (scrollVelocity > 10f) {
            Log.w("PerformanceMonitor", "High scroll velocity detected: $scrollVelocity items/ms")
        }
        
        if (totalItemCount > 100) {
            Log.i("PerformanceMonitor", "Large list detected: $totalItemCount items loaded")
        }
    }
    
    /**
     * Track memory usage for image loading
     */
    fun trackMemoryUsage() {
        val runtime = Runtime.getRuntime()
        val usedMemory = runtime.totalMemory() - runtime.freeMemory()
        val maxMemory = runtime.maxMemory()
        val memoryUsagePercent = (usedMemory.toFloat() / maxMemory.toFloat()) * 100
        
        _performanceMetrics.value = _performanceMetrics.value.copy(
            memoryUsageMB = usedMemory / (1024 * 1024),
            memoryUsagePercent = memoryUsagePercent
        )
        
        // Log memory warnings
        if (memoryUsagePercent > 80f) {
            Log.w("PerformanceMonitor", "High memory usage: ${memoryUsagePercent}%")
        }
    }
    
    /**
     * Track frame drops during animations
     */
    fun trackFrameDrop() {
        frameDropCount++
        _performanceMetrics.value = _performanceMetrics.value.copy(
            frameDropCount = frameDropCount
        )
        
        Log.w("PerformanceMonitor", "Frame drop detected. Total: $frameDropCount")
    }
    
    /**
     * Reset performance metrics
     */
    fun resetMetrics() {
        scrollStartTime = 0L
        lastScrollPosition = 0
        frameDropCount = 0
        _performanceMetrics.value = PerformanceMetrics()
    }
    
    /**
     * Get performance summary for debugging
     */
    fun getPerformanceSummary(): String {
        val metrics = _performanceMetrics.value
        return """
            Performance Summary:
            - Scroll Velocity: ${metrics.scrollVelocity} items/ms
            - Current Position: ${metrics.currentScrollPosition}
            - Total Items: ${metrics.totalItemsLoaded}
            - Memory Usage: ${metrics.memoryUsageMB}MB (${metrics.memoryUsagePercent}%)
            - Frame Drops: ${metrics.frameDropCount}
        """.trimIndent()
    }
}

/**
 * Performance metrics data class
 */
data class PerformanceMetrics(
    val scrollVelocity: Float = 0f,
    val currentScrollPosition: Int = 0,
    val totalItemsLoaded: Int = 0,
    val memoryUsageMB: Long = 0L,
    val memoryUsagePercent: Float = 0f,
    val frameDropCount: Int = 0,
    val lastUpdateTime: Long = 0L
)