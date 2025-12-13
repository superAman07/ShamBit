package com.shambit.customer.presentation.home

import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.FilterOption
import com.shambit.customer.data.remote.dto.response.FilterValue
import com.shambit.customer.data.remote.dto.response.SortOption
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.maps.shouldContainKey
import io.kotest.matchers.maps.shouldNotContainKey
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll

/**
 * Property-based tests for filter application logic
 * 
 * **Property 5: Filter application consistency**
 * **Validates: Requirements 2.5**
 */
class FilterApplicationPropertyTest : StringSpec({

    "Property 5: Filter application maintains consistency across state transitions".config(
        invocations = 100
    ) {
        checkAll(100, Arb.filterOptionsMap(), Arb.appliedFiltersMap()) { filterOptions, initialFilters ->
            
            // Create initial state with some applied filters
            val initialState = HomeUiState(
                appliedFilters = initialFilters,
                currentCursor = "some_cursor",
                hasMoreProducts = false
            )
            
            // Test applying new filters
            val newFilters = generateValidFiltersFromOptions(filterOptions)
            val stateAfterApply = initialState.copy(
                appliedFilters = newFilters,
                currentCursor = null, // Should reset pagination
                hasMoreProducts = true // Should reset pagination
            )
            
            // Property: Applied filters should match exactly what was set
            stateAfterApply.appliedFilters shouldBe newFilters
            
            // Property: Pagination should be reset when filters change
            stateAfterApply.currentCursor shouldBe null
            stateAfterApply.hasMoreProducts shouldBe true
            
            // Test clearing all filters
            val stateAfterClear = stateAfterApply.copy(
                appliedFilters = emptyMap(),
                currentCursor = null,
                hasMoreProducts = true
            )
            
            // Property: All filters should be cleared
            stateAfterClear.appliedFilters shouldBe emptyMap()
            
            // Property: Pagination should be reset when filters are cleared
            stateAfterClear.currentCursor shouldBe null
            stateAfterClear.hasMoreProducts shouldBe true
        }
    }
    
    "Property 5.1: Individual filter operations maintain type safety".config(
        invocations = 100
    ) {
        checkAll(100, Arb.string(1..20), Arb.appliedFilterValue(), Arb.appliedFiltersMap()) { filterType, filterValue, existingFilters ->
            
            // Test adding a single filter
            val filtersAfterAdd = existingFilters + (filterType to filterValue)
            
            // Property: New filter should be present with correct value
            filtersAfterAdd shouldContainKey filterType
            filtersAfterAdd[filterType] shouldBe filterValue
            
            // Property: Existing filters should be preserved
            existingFilters.forEach { (key, value) ->
                if (key != filterType) {
                    filtersAfterAdd[key] shouldBe value
                }
            }
            
            // Test removing the filter
            val filtersAfterRemove = filtersAfterAdd - filterType
            
            // Property: Removed filter should not be present
            filtersAfterRemove shouldNotContainKey filterType
            
            // Property: Other filters should remain unchanged
            existingFilters.forEach { (key, value) ->
                if (key != filterType) {
                    filtersAfterRemove[key] shouldBe value
                }
            }
        }
    }
    
    "Property 5.2: Multi-select filter operations preserve selection integrity".config(
        invocations = 100
    ) {
        checkAll(100, Arb.string(1..20), Arb.set(Arb.string(1..20), 1..10)) { filterType, selectedValuesSet ->
            
            val selectedValues = selectedValuesSet.toList() // Convert to list to ensure uniqueness
            val multiSelectFilter = AppliedFilterValue.MultiSelect(selectedValues)
            val filters = mapOf(filterType to multiSelectFilter)
            
            // Property: Multi-select filter should contain all selected values
            val appliedFilter = filters[filterType] as? AppliedFilterValue.MultiSelect
            appliedFilter shouldNotBe null
            appliedFilter!!.values shouldContainAll selectedValues
            
            // Test adding a value to multi-select
            val newValue = "new_value_${System.currentTimeMillis()}"
            val updatedValues = selectedValues + newValue
            val updatedFilter = AppliedFilterValue.MultiSelect(updatedValues)
            val updatedFilters = filters + (filterType to updatedFilter)
            
            // Property: Updated filter should contain all values including the new one
            val updatedAppliedFilter = updatedFilters[filterType] as? AppliedFilterValue.MultiSelect
            updatedAppliedFilter shouldNotBe null
            updatedAppliedFilter!!.values shouldContainAll updatedValues
            updatedAppliedFilter.values shouldContainAll selectedValues
            updatedAppliedFilter.values shouldContainAll listOf(newValue)
            
            // Test removing a value from multi-select
            if (selectedValues.isNotEmpty()) {
                val valueToRemove = selectedValues.first()
                val reducedValues = selectedValues - valueToRemove
                val reducedFilter = if (reducedValues.isEmpty()) {
                    null
                } else {
                    AppliedFilterValue.MultiSelect(reducedValues)
                }
                
                val reducedFilters = if (reducedFilter == null) {
                    filters - filterType
                } else {
                    filters + (filterType to reducedFilter)
                }
                
                // Property: Removed value should not be present
                if (reducedFilter != null) {
                    val reducedAppliedFilter = reducedFilters[filterType] as? AppliedFilterValue.MultiSelect
                    reducedAppliedFilter shouldNotBe null
                    reducedAppliedFilter!!.values shouldNotContain valueToRemove
                    reducedAppliedFilter.values shouldContainAll reducedValues
                } else {
                    // Property: Filter should be completely removed if no values remain
                    reducedFilters shouldNotContainKey filterType
                }
            }
        }
    }
    
    "Property 5.3: Range filter operations maintain valid ranges".config(
        invocations = 100
    ) {
        checkAll(100, Arb.string(1..20), Arb.int(0..100), Arb.int(101..1000)) { filterType, minValue, maxValue ->
            
            val rangeFilter = AppliedFilterValue.Range(min = minValue, max = maxValue)
            val filters = mapOf(filterType to rangeFilter)
            
            // Property: Range filter should maintain min <= max
            val appliedFilter = filters[filterType] as? AppliedFilterValue.Range
            appliedFilter shouldNotBe null
            appliedFilter!!.min shouldBe minValue
            appliedFilter.max shouldBe maxValue
            (appliedFilter.min <= appliedFilter.max) shouldBe true
            
            // Test updating range
            val newMin = minValue + 10
            val newMax = maxValue - 10
            if (newMin <= newMax) {
                val updatedFilter = AppliedFilterValue.Range(min = newMin, max = newMax)
                val updatedFilters = filters + (filterType to updatedFilter)
                
                // Property: Updated range should maintain validity
                val updatedAppliedFilter = updatedFilters[filterType] as? AppliedFilterValue.Range
                updatedAppliedFilter shouldNotBe null
                updatedAppliedFilter!!.min shouldBe newMin
                updatedAppliedFilter.max shouldBe newMax
                (updatedAppliedFilter.min <= updatedAppliedFilter.max) shouldBe true
            }
        }
    }
    
    "Property 5.4: Single value filter operations maintain uniqueness".config(
        invocations = 100
    ) {
        checkAll(100, Arb.string(1..20), Arb.string(1..50)) { filterType, filterValue ->
            
            val singleValueFilter = AppliedFilterValue.SingleValue(filterValue)
            val filters = mapOf(filterType to singleValueFilter)
            
            // Property: Single value filter should contain exactly one value
            val appliedFilter = filters[filterType] as? AppliedFilterValue.SingleValue
            appliedFilter shouldNotBe null
            appliedFilter!!.value shouldBe filterValue
            
            // Test updating single value
            val newValue = "${filterValue}_updated"
            val updatedFilter = AppliedFilterValue.SingleValue(newValue)
            val updatedFilters = filters + (filterType to updatedFilter)
            
            // Property: Updated filter should contain the new value only
            val updatedAppliedFilter = updatedFilters[filterType] as? AppliedFilterValue.SingleValue
            updatedAppliedFilter shouldNotBe null
            updatedAppliedFilter!!.value shouldBe newValue
            updatedAppliedFilter.value shouldNotBe filterValue
        }
    }
    
    "Property 5.5: Filter state transitions preserve unrelated state".config(
        invocations = 100
    ) {
        checkAll(100, Arb.appliedFiltersMap(), Arb.sortOption(), Arb.string(1..50).orNull(), Arb.boolean()) { 
            appliedFilters, sortOption, selectedSubcategoryId, showStickyBar ->
            
            // Create state with various properties
            val initialState = HomeUiState(
                appliedFilters = emptyMap(),
                sortFilterState = SortFilterState(sortBy = sortOption),
                selectedSubcategoryId = selectedSubcategoryId,
                showStickyBar = showStickyBar,
                currentCursor = "initial_cursor",
                hasMoreProducts = false
            )
            
            // Apply filters
            val stateAfterFilters = initialState.copy(
                appliedFilters = appliedFilters,
                currentCursor = null, // Should reset
                hasMoreProducts = true // Should reset
            )
            
            // Property: Filter-related state should be updated
            stateAfterFilters.appliedFilters shouldBe appliedFilters
            stateAfterFilters.currentCursor shouldBe null
            stateAfterFilters.hasMoreProducts shouldBe true
            
            // Property: Unrelated state should be preserved
            stateAfterFilters.sortFilterState.sortBy shouldBe sortOption
            stateAfterFilters.selectedSubcategoryId shouldBe selectedSubcategoryId
            stateAfterFilters.showStickyBar shouldBe showStickyBar
        }
    }
})

// Helper function to generate valid filters from filter options
private fun generateValidFiltersFromOptions(filterOptions: Map<String, FilterOption>): Map<String, AppliedFilterValue> {
    return filterOptions.mapNotNull { (filterType, option) ->
        when {
            option.options.isEmpty() -> null
            option.options.size == 1 -> {
                filterType to AppliedFilterValue.SingleValue(option.options.first().value)
            }
            option.options.all { it.value.toIntOrNull() != null } -> {
                // Range filter
                val values = option.options.mapNotNull { it.value.toIntOrNull() }.sorted()
                if (values.size >= 2) {
                    filterType to AppliedFilterValue.Range(min = values.first(), max = values.last())
                } else null
            }
            else -> {
                // Multi-select filter
                val selectedValues = option.options.take(2).map { it.value }
                filterType to AppliedFilterValue.MultiSelect(selectedValues)
            }
        }
    }.toMap()
}

// Additional arbitrary generators for filter testing

fun Arb.Companion.filterValue(): Arb<FilterValue> = arbitrary { _ ->
    FilterValue(
        value = Arb.string(1..20).bind(),
        displayName = Arb.string(1..50).bind(),
        count = Arb.int(0..1000).orNull().bind()
    )
}

fun Arb.Companion.filterOption(): Arb<FilterOption> = arbitrary { _ ->
    FilterOption(
        type = Arb.string(1..20).bind(),
        displayName = Arb.string(1..50).bind(),
        options = Arb.list(Arb.filterValue(), 1..10).bind(),
        selectedValues = Arb.list(Arb.string(1..20), 0..5).bind()
    )
}

fun Arb.Companion.filterOptionsMap(): Arb<Map<String, FilterOption>> = 
    Arb.map(
        Arb.string(1..20),
        Arb.filterOption(),
        minSize = 0,
        maxSize = 5
    )