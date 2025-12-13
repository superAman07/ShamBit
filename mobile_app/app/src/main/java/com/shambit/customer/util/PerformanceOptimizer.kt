package com.shambit.customer.util

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

/**
 * PERFORMANCE FIX: Performance optimizer to prevent common performance issues
 * identified in the app analysis
 */
@Singleton
class PerformanceOptimizer @Inject constructor() {
    
    companion object {
        private const val TAG = "PerformanceOptimizer"
    }
    
    /**
     * Debounce function calls to prevent excessive API calls or state updates
     */
    suspend fun <T> debounce(
        waitMs: Long = 300L,
        action: suspend () -> T
    ): T? {
        delay(waitMs)
        return try {
            action()
        } catch (e: Exception) {
            Log.e(TAG, "Debounced action failed", e)
            null
        }
    }
    
    /**
     * Throttle function calls to limit frequency
     */
    class Throttler(private val intervalMs: Long = 100L) {
        private var lastExecutionTime = 0L
        
        suspend fun <T> execute(action: suspend () -> T): T? {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastExecutionTime >= intervalMs) {
                lastExecutionTime = currentTime
                return try {
                    action()
                } catch (e: Exception) {
                    Log.e(TAG, "Throttled action failed", e)
                    null
                }
            }
            return null
        }
    }
    
    /**
     * Batch state updates to prevent multiple recompositions
     */
    class StateBatcher<T> {
        private val pendingUpdates = mutableListOf<T>()
        private var isProcessing = false
        
        suspend fun addUpdate(update: T, processor: suspend (List<T>) -> Unit) {
            pendingUpdates.add(update)
            
            if (!isProcessing) {
                isProcessing = true
                // Small delay to batch multiple rapid updates
                delay(16L) // One frame delay
                
                val updates = pendingUpdates.toList()
                pendingUpdates.clear()
                
                try {
                    processor(updates)
                } catch (e: Exception) {
                    Log.e(TAG, "Batch processing failed", e)
                } finally {
                    isProcessing = false
                }
            }
        }
    }
}

/**
 * PERFORMANCE FIX: Composable helper to prevent excessive LaunchedEffect calls
 */
@Composable
fun <T> DebouncedEffect(
    key: T,
    delayMs: Long = 300L,
    effect: suspend () -> Unit
) {
    val throttler = remember { PerformanceOptimizer.Throttler(delayMs) }
    
    LaunchedEffect(key) {
        throttler.execute { effect() }
    }
}

/**
 * PERFORMANCE FIX: Stable wrapper for callback functions to prevent recompositions
 */
@androidx.compose.runtime.Stable
class StableCallback<T>(val callback: (T) -> Unit)

@Composable
fun <T> rememberStableCallback(callback: (T) -> Unit): StableCallback<T> {
    return remember { StableCallback(callback) }
}