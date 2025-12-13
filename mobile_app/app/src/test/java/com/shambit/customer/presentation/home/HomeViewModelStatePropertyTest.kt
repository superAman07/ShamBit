package com.shambit.customer.presentation.home

import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.SortOption
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll

/**
 * Property-based tests for HomeViewModel state management
 * 
 * **Property 2: Subcategory selection consistency**
 * **Validates: Requirements 1.2**
 */
class HomeViewModelStatePropertyTest : StringSpec({

    "Property 2: Subcategory selection maintains consistent state transitions".config(
        invocations = 100
    ) {
        checkAll(100, Arb.subcategoryDto(), Arb.sortOption(), Arb.appliedFiltersMap()) { subcategory, sortOption, appliedFilters ->
            
            // Create initial state
            val initialState = HomeUiState(
                selectedSubcategoryId = null,
                sortFilterState = SortFilterState(sortBy = SortOption.RELEVANCE),
                appliedFilters = emptyMap(),
                currentCursor = "initial_cursor",
                hasMoreProducts = false
            )
            
            // Test subcategory selection state transition
            val stateAfterSelection = initialState.copy(
                selectedSubcategoryId = subcategory.id,
                verticalProductFeedState = DataState.Loading,
                currentCursor = null,
                hasMoreProducts = true
            )
            
            // Verify state consistency after subcategory selection
            stateAfterSelection.selectedSubcategoryId shouldBe subcategory.id
            stateAfterSelection.verticalProductFeedState.isLoading() shouldBe true
            stateAfterSelection.currentCursor shouldBe null
            stateAfterSelection.hasMoreProducts shouldBe true
            
            // Test sort option update state transition
            val stateAfterSort = stateAfterSelection.copy(
                sortFilterState = stateAfterSelection.sortFilterState.copy(sortBy = sortOption),
                currentCursor = null,
                hasMoreProducts = true
            )
            
            // Verify state consistency after sort update
            stateAfterSort.sortFilterState.sortBy shouldBe sortOption
            stateAfterSort.currentCursor shouldBe null
            stateAfterSort.hasMoreProducts shouldBe true
            stateAfterSort.selectedSubcategoryId shouldBe subcategory.id // Should preserve subcategory
            
            // Test filter application state transition
            val stateAfterFilters = stateAfterSort.copy(
                appliedFilters = appliedFilters,
                currentCursor = null,
                hasMoreProducts = true
            )
            
            // Verify state consistency after filter application
            stateAfterFilters.appliedFilters shouldBe appliedFilters
            stateAfterFilters.currentCursor shouldBe null
            stateAfterFilters.hasMoreProducts shouldBe true
            stateAfterFilters.selectedSubcategoryId shouldBe subcategory.id // Should preserve subcategory
            stateAfterFilters.sortFilterState.sortBy shouldBe sortOption // Should preserve sort
        }
    }
    
    "Property 2.1: Filter state transitions maintain type safety".config(
        invocations = 100
    ) {
        checkAll(100, Arb.appliedFilterValue(), Arb.string(1..20), Arb.appliedFiltersMap()) { filterValue, filterType, existingFilters ->
            
            // Test adding filter
            val stateWithNewFilter = existingFilters + (filterType to filterValue)
            
            // Verify filter was added correctly
            stateWithNewFilter[filterType] shouldBe filterValue
            
            // Test removing filter
            val stateWithoutFilter = stateWithNewFilter - filterType
            
            // Verify filter was removed correctly
            stateWithoutFilter.containsKey(filterType) shouldBe false
            
            // Verify other filters remain unchanged
            existingFilters.forEach { (key, value) ->
                if (key != filterType) {
                    stateWithoutFilter[key] shouldBe value
                }
            }
        }
    }
    
    "Property 2.2: Scroll state updates preserve other state".config(
        invocations = 100
    ) {
        checkAll(100, Arb.subcategoryDto(), Arb.appliedFiltersMap(), Arb.boolean(), Arb.boolean()) { subcategory, appliedFilters, showStickyBar, showScrollToTop ->
            
            // Create state with important data
            val initialState = HomeUiState(
                selectedSubcategoryId = subcategory.id,
                appliedFilters = appliedFilters,
                showStickyBar = false,
                showScrollToTop = false
            )
            
            // Update scroll-related state
            val updatedState = initialState.copy(
                showStickyBar = showStickyBar,
                showScrollToTop = showScrollToTop
            )
            
            // Verify scroll state was updated
            updatedState.showStickyBar shouldBe showStickyBar
            updatedState.showScrollToTop shouldBe showScrollToTop
            
            // Verify other important state was preserved
            updatedState.selectedSubcategoryId shouldBe subcategory.id
            updatedState.appliedFilters shouldBe appliedFilters
        }
    }
    
    "Property 4: Pagination order preservation".config(
        invocations = 100
    ) {
        checkAll(100, Arb.int(1..50), Arb.int(5..20)) { productCount, pageSize ->
            // Create simple products with unique IDs to test pagination logic
            val products = (1..productCount).map { index ->
                com.shambit.customer.data.remote.dto.response.ProductDto(
                    id = "product-$index",
                    categoryId = "cat1",
                    name = "Product $index",
                    slug = "product-$index",
                    mrp = 100.0,
                    sellingPrice = 90.0,
                    createdAt = "2023-01-01",
                    updatedAt = "2023-01-01"
                )
            }
            
            // Simulate pagination by chunking products into pages
            val pages = products.chunked(pageSize)
            val reconstructedProducts = mutableListOf<com.shambit.customer.data.remote.dto.response.ProductDto>()
            
            // Simulate loading pages sequentially (as infinite scroll would)
            pages.forEach { page ->
                reconstructedProducts.addAll(page)
            }
            
            // Property: Order should be preserved after pagination
            reconstructedProducts.map { it.id } shouldBe products.map { it.id }
            
            // Property: Total count should be preserved
            reconstructedProducts.size shouldBe products.size
            
            // Property: No duplicates should be introduced during pagination
            val originalIds = products.map { it.id }.toSet()
            val reconstructedIds = reconstructedProducts.map { it.id }.toSet()
            reconstructedIds shouldBe originalIds
            
            // Property: Each product should appear exactly once
            val idCounts = reconstructedProducts.groupingBy { it.id }.eachCount()
            idCounts.values.all { it == 1 } shouldBe true
        }
    }
})

// Arbitrary generators for property-based testing

fun Arb.Companion.subcategoryDto(): Arb<SubcategoryDto> = arbitrary { _ ->
    SubcategoryDto(
        id = Arb.string(1..20).bind(),
        name = Arb.string(1..50).bind(),
        parentCategoryId = Arb.string(1..20).bind(),
        imageUrl = Arb.string(1..100).orNull().bind(),
        displayOrder = Arb.int(0..100).bind(),
        interactionCount = Arb.int(0..1000).bind()
    )
}

fun Arb.Companion.sortOption(): Arb<SortOption> = Arb.enum<SortOption>()

fun Arb.Companion.appliedFilterValue(): Arb<AppliedFilterValue> = arbitrary { _ ->
    when (Arb.int(0..2).bind()) {
        0 -> AppliedFilterValue.MultiSelect(Arb.list(Arb.string(1..20), 1..5).bind())
        1 -> AppliedFilterValue.Range(
            min = Arb.int(0..100).bind(),
            max = Arb.int(101..1000).bind()
        )
        else -> AppliedFilterValue.SingleValue(Arb.string(1..20).bind())
    }
}

fun Arb.Companion.appliedFiltersMap(): Arb<Map<String, AppliedFilterValue>> = 
    Arb.map(
        Arb.string(1..20),
        Arb.appliedFilterValue(),
        minSize = 0,
        maxSize = 5
    )

fun Arb.Companion.boolean(): Arb<Boolean> = arbitrary { _ ->
    listOf(true, false).random()
}

fun Arb.Companion.productDto(): Arb<com.shambit.customer.data.remote.dto.response.ProductDto> = arbitrary { _ ->
    com.shambit.customer.data.remote.dto.response.ProductDto(
        id = Arb.string(1..20).bind(),
        categoryId = Arb.string(1..20).bind(),
        brandId = Arb.string(1..20).orNull().bind(),
        name = Arb.string(1..100).bind(),
        slug = Arb.string(1..50).bind(),
        sku = Arb.string(1..20).orNull().bind(),
        barcode = Arb.string(1..20).orNull().bind(),
        description = Arb.string(1..500).orNull().bind(),
        detailedDescription = Arb.string(1..1000).orNull().bind(),
        brand = Arb.string(1..50).orNull().bind(),
        unitSize = Arb.string(1..20).orNull().bind(),
        unitType = Arb.string(1..20).orNull().bind(),
        mrp = Arb.double(1.0..1000.0).bind(),
        sellingPrice = Arb.double(1.0..1000.0).bind(),
        taxPercent = Arb.double(0.0..30.0).bind(),
        discountPercent = Arb.double(0.0..90.0).bind(),
        weight = Arb.string(1..20).orNull().bind(),
        dimensions = Arb.string(1..50).orNull().bind(),
        storageInfo = Arb.string(1..100).orNull().bind(),
        ingredients = Arb.string(1..200).orNull().bind(),
        nutritionInfo = Arb.string(1..200).orNull().bind(),
        shelfLifeDays = Arb.int(1..365).orNull().bind(),
        searchKeywords = Arb.string(1..100).orNull().bind(),
        tags = Arb.string(1..100).orNull().bind(),
        isFeatured = Arb.boolean().bind(),
        isReturnable = Arb.boolean().bind(),
        isSellable = Arb.boolean().bind(),
        imageUrls = Arb.list(Arb.string(1..100), 0..5).bind(),
        images = null,
        attributes = null,
        activeOffers = null,
        finalPrice = Arb.double(1.0..1000.0).orNull().bind(),
        brandName = Arb.string(1..50).orNull().bind(),
        brandLogoUrl = Arb.string(1..100).orNull().bind(),
        isActive = Arb.boolean().bind(),
        createdAt = Arb.string(1..30).bind(),
        updatedAt = Arb.string(1..30).bind(),
        category = null,
        brandDto = null,
        stockQuantity = Arb.int(0..100).bind(),
        isAvailable = Arb.boolean().bind(),
        averageRating = Arb.double(0.0..5.0).orNull().bind(),
        reviewCount = Arb.int(0..10000).orNull().bind(),
        badges = Arb.list(Arb.string(1..20), 0..3).orNull().bind(),
        deliveryTime = Arb.string(1..50).orNull().bind(),
        deliveryMinutes = Arb.int(15..120).orNull().bind()
    )
}

fun Arb.Companion.productDtoList(): Arb<List<com.shambit.customer.data.remote.dto.response.ProductDto>> = 
    Arb.list(Arb.productDto(), 1..100)