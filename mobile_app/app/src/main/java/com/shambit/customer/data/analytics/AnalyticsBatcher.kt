package com.shambit.customer.data.analytics

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Analytics event data class
 */
data class AnalyticsEvent(
    val eventType: String,
    val eventData: Map<String, Any>,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Analytics batching service for efficient event tracking
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */
@Singleton
class AnalyticsBatcher @Inject constructor() {
    
    companion object {
        private const val BATCH_SIZE = 10 // Specific batch size as per requirements
        private const val FLUSH_INTERVAL_MS = 30_000L // 30 seconds as per requirements
    }
    
    private val events = mutableListOf<AnalyticsEvent>()
    private var lastFlushTime = System.currentTimeMillis()
    private val mutex = Mutex()
    private val coroutineScope = CoroutineScope(Dispatchers.IO)
    private var flushJob: Job? = null
    
    init {
        startPeriodicFlush()
    }
    
    /**
     * Track subcategory interaction with batching
     * Requirements: 18.1
     */
    suspend fun trackSubcategoryTap(subcategoryId: String) {
        val event = AnalyticsEvent(
            eventType = "subcategory_tap",
            eventData = mapOf(
                "subcategory_id" to subcategoryId,
                "session_id" to getCurrentSessionId()
            )
        )
        
        addEvent(event)
    }
    
    /**
     * Track filter usage patterns
     * Requirements: 18.2
     */
    suspend fun trackFilterUsage(filterType: String, filterValues: List<String>) {
        val event = AnalyticsEvent(
            eventType = "filter_applied",
            eventData = mapOf(
                "filter_type" to filterType,
                "filter_values" to filterValues,
                "filter_count" to filterValues.size,
                "session_id" to getCurrentSessionId()
            )
        )
        
        addEvent(event)
    }
    
    /**
     * Track infinite scroll engagement
     * Requirements: 18.3
     */
    suspend fun trackScrollEngagement(
        scrollPosition: Int,
        totalItems: Int,
        loadMoreTriggered: Boolean
    ) {
        val event = AnalyticsEvent(
            eventType = "scroll_engagement",
            eventData = mapOf(
                "scroll_position" to scrollPosition,
                "total_items" to totalItems,
                "load_more_triggered" to loadMoreTriggered,
                "engagement_percentage" to (scrollPosition.toFloat() / totalItems * 100).toInt(),
                "session_id" to getCurrentSessionId()
            )
        )
        
        addEvent(event)
    }
    
    /**
     * Track product impression with batching
     * Requirements: 18.3
     */
    suspend fun trackProductImpression(productId: String, position: Int, source: String) {
        val event = AnalyticsEvent(
            eventType = "product_impression",
            eventData = mapOf(
                "product_id" to productId,
                "position" to position,
                "source" to source, // "vertical_feed", "featured", etc.
                "session_id" to getCurrentSessionId()
            )
        )
        
        addEvent(event)
    }
    
    /**
     * Track pagination performance
     * Requirements: 18.3
     */
    suspend fun trackPaginationPerformance(
        loadTimeMs: Long,
        itemsLoaded: Int,
        cursor: String?
    ) {
        val event = AnalyticsEvent(
            eventType = "pagination_performance",
            eventData = mapOf(
                "load_time_ms" to loadTimeMs,
                "items_loaded" to itemsLoaded,
                "cursor" to (cursor ?: "initial"),
                "session_id" to getCurrentSessionId()
            )
        )
        
        addEvent(event)
    }
    
    /**
     * Add event to batch and flush if needed
     */
    private suspend fun addEvent(event: AnalyticsEvent) {
        mutex.withLock {
            events.add(event)
            
            if (events.size >= BATCH_SIZE || shouldFlushByTime()) {
                flushEvents()
            }
        }
    }
    
    /**
     * Check if flush is needed based on time interval
     */
    private fun shouldFlushByTime(): Boolean {
        return System.currentTimeMillis() - lastFlushTime >= FLUSH_INTERVAL_MS
    }
    
    /**
     * Flush events to analytics service
     */
    private suspend fun flushEvents() {
        if (events.isEmpty()) return
        
        val eventsToFlush = events.toList()
        events.clear()
        lastFlushTime = System.currentTimeMillis()
        
        try {
            // In a real implementation, this would send to analytics service
            // For now, we'll log the events (could be Firebase Analytics, Mixpanel, etc.)
            sendEventsToAnalyticsService(eventsToFlush)
        } catch (e: Exception) {
            // Silently handle analytics errors - don't affect user experience
            // In production, might want to retry or store for later
        }
    }
    
    /**
     * Start periodic flush job
     */
    private fun startPeriodicFlush() {
        flushJob?.cancel()
        flushJob = coroutineScope.launch {
            while (true) {
                delay(FLUSH_INTERVAL_MS)
                mutex.withLock {
                    if (events.isNotEmpty()) {
                        flushEvents()
                    }
                }
            }
        }
    }
    
    /**
     * Send events to analytics service
     * In production, this would integrate with Firebase Analytics, Mixpanel, etc.
     */
    private suspend fun sendEventsToAnalyticsService(events: List<AnalyticsEvent>) {
        // Mock implementation - in production would send to actual analytics service
        println("Analytics Batch: Sending ${events.size} events")
        events.forEach { event ->
            println("Event: ${event.eventType} - ${event.eventData}")
        }
    }
    
    /**
     * Get current session ID (simplified implementation)
     */
    private fun getCurrentSessionId(): String {
        // In production, this would be a proper session management
        return "session_${System.currentTimeMillis() / 1000 / 3600}" // Hour-based session
    }
    
    /**
     * Force flush all pending events
     */
    suspend fun forceFlush() {
        mutex.withLock {
            flushEvents()
        }
    }
    
    /**
     * Get current batch size for testing
     */
    suspend fun getCurrentBatchSize(): Int {
        return mutex.withLock { events.size }
    }
}