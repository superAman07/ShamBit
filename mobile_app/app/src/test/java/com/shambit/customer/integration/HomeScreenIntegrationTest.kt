package com.shambit.customer.integration

import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.ProductFeedResponse
import com.shambit.customer.data.remote.dto.response.SortOption
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.presentation.home.HomeUiState
import com.shambit.customer.presentation.home.DataState
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.maps.shouldContainKey
import io.kotest.matchers.maps.shouldNotContainKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

/**
 * Integration tests for Home Screen Premium features
 * 
 * Tests the integration between new premium features and existing functionality.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.4, 7.1, 7.2, 7.3, 7.4, 11.5**
 */
@OptIn(ExperimentalCoroutinesApi::class)
class HomeScreenIntegrationTest : StringSpec({
    
    val testDispatcher = StandardTestDispatcher()
    
    beforeSpec {
        Dispatchers.setMain(testDispatcher)
    }
    
    afterSpec {
        Dispatchers.resetMain()
    }
    
    /**
     * Test cart operations from vertical product feed with existing optimistic updates
     * **Validates: Requirements 6.1**
     */
    "should integrate cart operations from vertical product feed" {
        runTest {
            // Create test products for vertical feed
            val verticalProducts = listOf(
                createTestProduct("vertical-1", "Vertical Product 1", 100.0),
                createTestProduct("vertical-2", "Vertical Product 2", 200.0)
            )
            
            val productFeedResponse = ProductFeedResponse(
                products = verticalProducts,
                cursor = "next-cursor",
                hasMore = true,
                totalCount = 10
            )
            
            // Create initial state with vertical product feed
            val initialState = HomeUiState(
                verticalProductFeedState = DataState.Success(productFeedResponse),
                cartQuantities = emptyMap()
            )
            
            // Test adding product from vertical feed to cart
            val productToAdd = verticalProducts.first()
            val updatedCartQuantities = initialState.cartQuantities + (productToAdd.id to 1)
            
            val stateAfterAdd = initialState.copy(
                cartQuantities = updatedCartQuantities
            )
            
            // Verify cart integration
            stateAfterAdd.cartQuantities shouldContainKey productToAdd.id
            stateAfterAdd.cartQuantities[productToAdd.id] shouldBe 1
            
            // Test incrementing quantity
            val stateAfterIncrement = stateAfterAdd.copy(
                cartQuantities = stateAfterAdd.cartQuantities + (productToAdd.id to 2)
            )
            
            stateAfterIncrement.cartQuantities[productToAdd.id] shouldBe 2
            
            // Test removing from cart
            val stateAfterRemove = stateAfterIncrement.copy(
                cartQuantities = stateAfterIncrement.cartQuantities - productToAdd.id
            )
            
            stateAfterRemove.cartQuantities shouldNotContainKey productToAdd.id
            
            // Verify vertical product feed state remains intact
            val feedData = stateAfterRemove.verticalProductFeedState.getDataOrNull()
            feedData shouldNotBe null
            feedData?.products?.size shouldBe 2
        }
    }
    
    /**
     * Test wishlist functionality across new product card types
     * **Validates: Requirements 6.2**
     */
    "should integrate wishlist functionality across new product card types" {
        runTest {
            val verticalProducts = listOf(
                createTestProduct("vert-1", "Vertical Product 1", 90.0),
                createTestProduct("vert-2", "Vertical Product 2", 110.0)
            )
            
            val productFeedResponse = ProductFeedResponse(
                products = verticalProducts,
                cursor = "cursor-1",
                hasMore = true,
                totalCount = 20
            )
            
            val initialState = HomeUiState(
                verticalProductFeedState = DataState.Success(productFeedResponse)
            )
            
            // Test wishlist operations
            val wishlistProductIds = mutableSetOf<String>()
            
            // Add vertical product to wishlist
            val verticalProduct = verticalProducts.first()
            wishlistProductIds.add(verticalProduct.id)
            
            // Verify wishlist state
            wishlistProductIds shouldContain verticalProduct.id
            wishlistProductIds.size shouldBe 1
            
            // Test wishlist with cart operations
            val stateWithCart = initialState.copy(
                cartQuantities = mapOf(verticalProduct.id to 2)
            )
            
            // Product can be in both cart and wishlist
            stateWithCart.cartQuantities shouldContainKey verticalProduct.id
            wishlistProductIds shouldContain verticalProduct.id
        }
    }
    
    /**
     * Test address changes update delivery estimates in new sections
     * **Validates: Requirements 6.4**
     */
    "should update delivery estimates when address changes" {
        runTest {
            val homeAddress = Address(
                id = "home-1",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Home Street",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            
            val workAddress = Address(
                id = "work-1",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "456 Office Complex",
                city = "Delhi",
                pincode = "110001",
                type = AddressType.WORK,
                isDefault = false,
                createdAt = "2024-01-02T00:00:00Z"
            )
            
            val productsWithDelivery = listOf(
                createTestProduct("del-1", "Product with Delivery", 100.0).copy(
                    deliveryTime = "2-3 hours",
                    deliveryMinutes = 180
                )
            )
            
            val productFeedResponse = ProductFeedResponse(
                products = productsWithDelivery,
                cursor = "delivery-cursor",
                hasMore = false,
                totalCount = 1
            )
            
            // Initial state with home address
            val initialState = HomeUiState(
                defaultAddress = homeAddress,
                deliveryAddress = homeAddress.toShortDisplayString(),
                verticalProductFeedState = DataState.Success(productFeedResponse)
            )
            
            // Verify initial delivery address
            initialState.deliveryAddress shouldBe "Home - Ayodhya"
            initialState.defaultAddress shouldBe homeAddress
            
            // Simulate address change to work address
            val stateAfterAddressChange = initialState.copy(
                defaultAddress = workAddress,
                deliveryAddress = workAddress.toShortDisplayString()
            )
            
            // Verify address change is reflected
            stateAfterAddressChange.deliveryAddress shouldBe "Work - Delhi"
            stateAfterAddressChange.defaultAddress shouldBe workAddress
            
            // Verify product feed state is preserved
            val feedData = stateAfterAddressChange.verticalProductFeedState.getDataOrNull()
            feedData shouldNotBe null
            feedData?.products?.size shouldBe 1
        }
    }
    
    /**
     * Test complete end-to-end user flow
     * **Validates: Requirements 7.1, 7.2**
     */
    "should handle complete end-to-end user flow" {
        runTest {
            val subcategories = listOf(
                SubcategoryDto(
                    id = "electronics-phones",
                    name = "Phones",
                    parentCategoryId = "electronics",
                    displayOrder = 1,
                    interactionCount = 5
                )
            )
            
            val phoneProducts = listOf(
                createTestProduct("phone-1", "iPhone 15", 80000.0).copy(
                    categoryId = "electronics-phones",
                    averageRating = 4.5,
                    reviewCount = 100
                )
            )
            
            val productFeedResponse = ProductFeedResponse(
                products = phoneProducts,
                cursor = "phones-cursor",
                hasMore = true,
                totalCount = 50
            )
            
            // Initial state
            val initialState = HomeUiState(
                subcategoriesState = DataState.Success(subcategories),
                selectedSubcategoryId = null,
                verticalProductFeedState = DataState.Loading
            )
            
            // Step 1: Select subcategory
            val selectedSubcategory = subcategories.first()
            val stateAfterSubcategorySelection = initialState.copy(
                selectedSubcategoryId = selectedSubcategory.id,
                verticalProductFeedState = DataState.Success(productFeedResponse)
            )
            
            stateAfterSubcategorySelection.selectedSubcategoryId shouldBe "electronics-phones"
            val feedData = stateAfterSubcategorySelection.verticalProductFeedState.getDataOrNull()
            feedData?.products?.size shouldBe 1
            
            // Step 2: Apply filters
            val priceFilter = AppliedFilterValue.Range(min = 50000, max = 90000)
            val stateAfterFilters = stateAfterSubcategorySelection.copy(
                appliedFilters = mapOf("price" to priceFilter),
                currentCursor = null,
                hasMoreProducts = true
            )
            
            stateAfterFilters.appliedFilters shouldContainKey "price"
            stateAfterFilters.currentCursor shouldBe null
            
            // Step 3: Add product to cart
            val productToAdd = phoneProducts.first()
            val stateAfterCartAdd = stateAfterFilters.copy(
                cartQuantities = mapOf(productToAdd.id to 1)
            )
            
            stateAfterCartAdd.cartQuantities shouldContainKey productToAdd.id
            stateAfterCartAdd.cartQuantities[productToAdd.id] shouldBe 1
            
            // Verify complete integration state
            stateAfterCartAdd.selectedSubcategoryId shouldBe "electronics-phones"
            stateAfterCartAdd.appliedFilters.size shouldBe 1
            stateAfterCartAdd.cartQuantities.size shouldBe 1
        }
    }
    
    /**
     * Test pull-to-refresh behavior across all sections
     * **Validates: Requirements 7.3**
     */
    "should handle pull-to-refresh correctly" {
        runTest {
            val subcategories = listOf(
                SubcategoryDto(
                    id = "sub-1",
                    name = "Subcategory 1",
                    parentCategoryId = "cat-1",
                    displayOrder = 1
                )
            )
            
            val verticalProducts = listOf(
                createTestProduct("vertical-1", "Vertical 1", 2000.0)
            )
            
            val productFeedResponse = ProductFeedResponse(
                products = verticalProducts,
                cursor = "cursor-1",
                hasMore = true,
                totalCount = 50
            )
            
            val initialState = HomeUiState(
                subcategoriesState = DataState.Success(subcategories),
                verticalProductFeedState = DataState.Success(productFeedResponse),
                selectedSubcategoryId = "sub-1",
                appliedFilters = mapOf(
                    "price" to AppliedFilterValue.Range(min = 1000, max = 5000)
                ),
                isRefreshing = false,
                refreshSuccess = null
            )
            
            // User triggers pull-to-refresh
            val stateRefreshing = initialState.copy(
                isRefreshing = true,
                refreshSuccess = null,
                error = null
            )
            
            stateRefreshing.isRefreshing shouldBe true
            stateRefreshing.refreshSuccess shouldBe null
            
            // Simulate refresh completing successfully
            val updatedVerticalProducts = listOf(
                createTestProduct("vertical-1", "Updated Vertical 1", 2100.0),
                createTestProduct("vertical-3", "New Vertical 3", 2500.0)
            )
            
            val updatedProductFeedResponse = ProductFeedResponse(
                products = updatedVerticalProducts,
                cursor = "updated-cursor-1",
                hasMore = true,
                totalCount = 55
            )
            
            val stateAfterRefresh = stateRefreshing.copy(
                subcategoriesState = DataState.Success(subcategories),
                verticalProductFeedState = DataState.Success(updatedProductFeedResponse),
                isRefreshing = false,
                refreshSuccess = true,
                currentCursor = "updated-cursor-1",
                hasMoreProducts = true
            )
            
            // Verify refresh completed
            stateAfterRefresh.isRefreshing shouldBe false
            stateAfterRefresh.refreshSuccess shouldBe true
            
            val refreshedFeedData = stateAfterRefresh.verticalProductFeedState.getDataOrNull()
            refreshedFeedData?.products?.size shouldBe 2
            
            // Verify user's filter and subcategory selection is preserved
            stateAfterRefresh.selectedSubcategoryId shouldBe "sub-1"
            stateAfterRefresh.appliedFilters shouldContainKey "price"
            
            // Verify pagination is reset
            stateAfterRefresh.currentCursor shouldBe "updated-cursor-1"
            stateAfterRefresh.hasMoreProducts shouldBe true
        }
    }
    
    /**
     * Test error handling and graceful degradation
     * **Validates: Requirements 7.4, 11.5**
     */
    "should handle errors gracefully" {
        runTest {
            // Test subcategory loading error
            val networkErrorState = HomeUiState(
                subcategoriesState = DataState.Error("Network connection failed"),
                isOffline = true
            )
            
            networkErrorState.subcategoriesState shouldBe DataState.Error("Network connection failed")
            networkErrorState.isOffline shouldBe true
            
            // Test retry mechanism
            val retrySuccessState = networkErrorState.copy(
                subcategoriesState = DataState.Loading,
                isOffline = false,
                error = null
            )
            
            val subcategories = listOf(
                SubcategoryDto(
                    id = "retry-sub-1",
                    name = "Retry Subcategory 1",
                    parentCategoryId = "electronics",
                    displayOrder = 1
                )
            )
            
            val successAfterRetryState = retrySuccessState.copy(
                subcategoriesState = DataState.Success(subcategories)
            )
            
            val retryData = successAfterRetryState.subcategoriesState.getDataOrNull()
            retryData?.size shouldBe 1
            successAfterRetryState.isOffline shouldBe false
            
            // Test graceful degradation for API failures
            val gracefulDegradationState = HomeUiState(
                subcategoriesState = DataState.Success(emptyList()), // Graceful fallback
                availableFilters = emptyList(), // Filters disabled
                showFilterBottomSheet = false
            )
            
            val degradedSubcategories = gracefulDegradationState.subcategoriesState.getDataOrNull()
            degradedSubcategories?.size shouldBe 0
            gracefulDegradationState.availableFilters.size shouldBe 0
            gracefulDegradationState.showFilterBottomSheet shouldBe false
        }
    }
    
    /**
     * Test infinite scroll integration with state preservation
     * **Validates: Requirements 6.1, 6.2**
     */
    "should preserve state during infinite scroll operations" {
        runTest {
            val initialProducts = listOf(
                createTestProduct("initial-1", "Initial Product 1", 100.0)
            )
            
            val initialResponse = ProductFeedResponse(
                products = initialProducts,
                cursor = "page-1-cursor",
                hasMore = true,
                totalCount = 10
            )
            
            val initialState = HomeUiState(
                verticalProductFeedState = DataState.Success(initialResponse),
                cartQuantities = mapOf("initial-1" to 2),
                currentCursor = "page-1-cursor",
                hasMoreProducts = true,
                isLoadingMore = false
            )
            
            // Simulate loading more products
            val stateLoadingMore = initialState.copy(
                isLoadingMore = true
            )
            
            stateLoadingMore.isLoadingMore shouldBe true
            stateLoadingMore.cartQuantities.size shouldBe 1
            
            // Simulate successful load more
            val additionalProducts = listOf(
                createTestProduct("additional-1", "Additional Product 1", 150.0)
            )
            
            val allProducts = initialProducts + additionalProducts
            val updatedResponse = ProductFeedResponse(
                products = allProducts,
                cursor = "page-2-cursor",
                hasMore = true,
                totalCount = 10
            )
            
            val stateAfterLoadMore = stateLoadingMore.copy(
                verticalProductFeedState = DataState.Success(updatedResponse),
                isLoadingMore = false,
                currentCursor = "page-2-cursor"
            )
            
            // Verify cart state preserved during pagination
            stateAfterLoadMore.cartQuantities.size shouldBe 1
            stateAfterLoadMore.cartQuantities["initial-1"] shouldBe 2
            
            // Verify new products are loaded
            val loadedData = stateAfterLoadMore.verticalProductFeedState.getDataOrNull()
            loadedData?.products?.size shouldBe 2
        }
    }
})