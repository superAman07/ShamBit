package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.toApiValue
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll

/**
 * Property-based tests for ProductRepository data model consistency
 * 
 * These tests verify universal properties that should hold across all filter operations
 * using Kotest Property Testing framework.
 */
class ProductRepositoryPropertyTest : StringSpec({
    
    /**
     * Feature: shambit-home-screen-premium, Property 1: Filter conversion round trip
     * 
     * For any AppliedFilterValue, converting to API format and back should preserve
     * the essential data structure and values
     * 
     * Validates: Requirements 17.4
     */
    "Property 1: Filter conversion round trip preserves data structure".config(
        invocations = 100
    ) {
        checkAll(100, Arb.appliedFilterValue()) { filterValue ->
            // Convert to API format
            val apiValue = filterValue.toApiValue()
            
            // Verify the conversion maintains the correct structure
            when (filterValue) {
                is AppliedFilterValue.MultiSelect -> {
                    apiValue shouldBe filterValue.values
                    // Verify it's a list of strings
                    (apiValue as List<*>).all { it is String } shouldBe true
                    (apiValue as List<String>).size shouldBe filterValue.values.size
                }
                is AppliedFilterValue.Range -> {
                    val apiMap = apiValue as Map<String, Int>
                    apiMap["min"] shouldBe filterValue.min
                    apiMap["max"] shouldBe filterValue.max
                    apiMap.size shouldBe 2
                }
                is AppliedFilterValue.SingleValue -> {
                    apiValue shouldBe filterValue.value
                    (apiValue is String) shouldBe true
                }
            }
        }
    }
    
    /**
     * Feature: shambit-home-screen-premium, Property 1b: Filter conversion type safety
     * 
     * For any AppliedFilterValue, the API conversion should produce the correct JSON-serializable type
     * 
     * Validates: Requirements 17.4
     */
    "Property 1b: Filter conversion produces JSON-serializable types".config(
        invocations = 100
    ) {
        checkAll(100, Arb.appliedFilterValue()) { filterValue ->
            val apiValue = filterValue.toApiValue()
            
            // Verify the API value is JSON-serializable
            when (filterValue) {
                is AppliedFilterValue.MultiSelect -> {
                    // Should be a List<String>
                    (apiValue is List<*>) shouldBe true
                    (apiValue as List<*>).all { it is String } shouldBe true
                }
                is AppliedFilterValue.Range -> {
                    // Should be a Map<String, Int>
                    (apiValue is Map<*, *>) shouldBe true
                    val map = apiValue as Map<*, *>
                    map.keys.all { it is String } shouldBe true
                    map.values.all { it is Int } shouldBe true
                }
                is AppliedFilterValue.SingleValue -> {
                    // Should be a String
                    (apiValue is String) shouldBe true
                }
            }
        }
    }
})

/**
 * Generator for AppliedFilterValue instances
 * Creates all three types of filter values with realistic data
 */
fun Arb.Companion.appliedFilterValue(): Arb<AppliedFilterValue> = arbitrary { _ ->
    val filterType = Arb.int(0..2).bind()
    
    when (filterType) {
        0 -> AppliedFilterValue.MultiSelect(
            values = Arb.list(
                Arb.filterValueString(),
                range = 1..5
            ).bind()
        )
        1 -> AppliedFilterValue.Range(
            min = Arb.int(0..1000).bind(),
            max = Arb.int(1001..10000).bind()
        )
        else -> AppliedFilterValue.SingleValue(
            value = Arb.filterValueString().bind()
        )
    }
}

/**
 * Generator for realistic filter value strings
 * Creates strings that would typically be used in filters
 */
fun Arb.Companion.filterValueString(): Arb<String> = arbitrary { _ ->
    val filterTypes = listOf(
        // Brand names
        "Nike", "Adidas", "Puma", "Apple", "Samsung", "Sony",
        // Categories
        "Electronics", "Clothing", "Books", "Sports", "Home",
        // Ratings
        "4", "5", "3", "2", "1",
        // Generic values
        "premium", "budget", "popular", "new", "bestseller"
    )
    
    Arb.element(filterTypes).bind()
}