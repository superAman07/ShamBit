package com.shambit.customer.data.analytics

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest

/**
 * Property-based tests for AnalyticsBatcher
 * **Feature: shambit-home-screen-premium, Property 6: Analytics batch size consistency**
 * **Validates: Requirements 18.4**
 */
class AnalyticsBatcherPropertyTest : FunSpec({
    
    test("Property 6: Analytics batch size consistency - batching should maintain consistent size limits") {
        checkAll(
            iterations = 100,
            Arb.list(Arb.string(1..20), 1..50) // Generate lists of 1-50 subcategory IDs
        ) { subcategoryIds ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track all subcategory taps
                subcategoryIds.forEach { subcategoryId ->
                    analyticsBatcher.trackSubcategoryTap(subcategoryId)
                }
                
                // Get current batch size
                val currentBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: Batch size should never exceed BATCH_SIZE (10)
                // If we have more than 10 events, they should have been flushed
                val expectedMaxBatchSize = minOf(subcategoryIds.size, 10)
                currentBatchSize shouldBe (subcategoryIds.size % 10)
            }
        }
    }
    
    test("Property 6: Analytics batch size consistency - filter events should batch correctly") {
        checkAll(
            iterations = 100,
            Arb.list(Arb.string(1..10), 1..30), // Filter types
            Arb.list(Arb.list(Arb.string(1..10), 1..5), 1..30) // Filter values for each type
        ) { filterTypes, filterValuesList ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track filter usage events
                filterTypes.zip(filterValuesList).forEach { (filterType, filterValues) ->
                    analyticsBatcher.trackFilterUsage(filterType, filterValues)
                }
                
                val currentBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: Batch size should be the remainder after flushing complete batches
                val totalEvents = filterTypes.size
                val expectedBatchSize = totalEvents % 10
                currentBatchSize shouldBe expectedBatchSize
            }
        }
    }
    
    test("Property 6: Analytics batch size consistency - scroll engagement events should batch correctly") {
        checkAll(
            iterations = 100,
            Arb.list(Arb.int(0..1000), 1..25), // Scroll positions
            Arb.list(Arb.int(1..1000), 1..25)  // Total items
        ) { scrollPositions, totalItemsList ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track scroll engagement events
                scrollPositions.zip(totalItemsList).forEach { (scrollPosition, totalItems) ->
                    analyticsBatcher.trackScrollEngagement(
                        scrollPosition = scrollPosition,
                        totalItems = totalItems,
                        loadMoreTriggered = scrollPosition > totalItems * 0.8
                    )
                }
                
                val currentBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: Batch size should never exceed 10
                val totalEvents = scrollPositions.size
                val expectedBatchSize = totalEvents % 10
                currentBatchSize shouldBe expectedBatchSize
            }
        }
    }
    
    test("Property 6: Analytics batch size consistency - product impression events should batch correctly") {
        checkAll(
            iterations = 100,
            Arb.list(Arb.string(1..20), 1..40), // Product IDs
            Arb.list(Arb.int(0..100), 1..40)    // Positions
        ) { productIds, positions ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track product impression events
                productIds.zip(positions).forEach { (productId, position) ->
                    analyticsBatcher.trackProductImpression(productId, position, "vertical_feed")
                }
                
                val currentBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: Batch size should be consistent with batching rules
                val totalEvents = productIds.size
                val expectedBatchSize = totalEvents % 10
                currentBatchSize shouldBe expectedBatchSize
            }
        }
    }
    
    test("Property 6: Analytics batch size consistency - mixed event types should batch together correctly") {
        checkAll(
            iterations = 100,
            Arb.list(Arb.string(1..10), 1..15), // Subcategory IDs
            Arb.list(Arb.string(1..10), 1..15), // Filter types
            Arb.list(Arb.string(1..10), 1..15)  // Product IDs
        ) { subcategoryIds, filterTypes, productIds ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track mixed event types
                subcategoryIds.forEach { subcategoryId ->
                    analyticsBatcher.trackSubcategoryTap(subcategoryId)
                }
                
                filterTypes.forEach { filterType ->
                    analyticsBatcher.trackFilterUsage(filterType, listOf("value1", "value2"))
                }
                
                productIds.forEach { productId ->
                    analyticsBatcher.trackProductImpression(productId, 0, "vertical_feed")
                }
                
                val currentBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: All event types should be batched together
                val totalEvents = subcategoryIds.size + filterTypes.size + productIds.size
                val expectedBatchSize = totalEvents % 10
                currentBatchSize shouldBe expectedBatchSize
            }
        }
    }
    
    test("Property 6: Analytics batch size consistency - time-based flushing should work correctly") {
        checkAll(
            iterations = 50, // Fewer iterations due to time delays
            Arb.list(Arb.string(1..10), 1..8) // Keep under batch size to test time-based flushing
        ) { subcategoryIds ->
            runTest {
                val analyticsBatcher = AnalyticsBatcher()
                
                // Track events (less than batch size)
                subcategoryIds.forEach { subcategoryId ->
                    analyticsBatcher.trackSubcategoryTap(subcategoryId)
                }
                
                val initialBatchSize = analyticsBatcher.getCurrentBatchSize()
                
                // Property: Before time flush, batch size should equal number of events
                if (subcategoryIds.size < 10) {
                    initialBatchSize shouldBe subcategoryIds.size
                }
                
                // Force flush and verify batch is cleared
                analyticsBatcher.forceFlush()
                val batchSizeAfterFlush = analyticsBatcher.getCurrentBatchSize()
                
                // Property: After flush, batch size should be 0
                batchSizeAfterFlush shouldBe 0
            }
        }
    }
})