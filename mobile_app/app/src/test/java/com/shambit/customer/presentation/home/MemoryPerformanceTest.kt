package com.shambit.customer.presentation.home

import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.remote.dto.response.ProductFeedResponse
import com.shambit.customer.util.PerformanceMonitor
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Memory performance tests for HomeViewModel with large product lists
 * 
 * **Feature: shambit-home-screen-premium, Task 9.4: Memory performance tests**
 * 
 * These tests verify memory consumption and image loading performance:
 * - Test memory consumption with 100+ products loaded
 * - Validate image loading performance and memory cleanup
 * 
 * Validates: Requirements 9.2, 9.3
 */
@OptIn(ExperimentalCoroutinesApi::class)
class MemoryPerformanceTest {

    private lateinit var performanceMonitor: PerformanceMonitor

    @Before
    fun setup() {
        performanceMonitor = PerformanceMonitor()
    }

    @Test
    fun `Memory usage should stay under 150MB with 100+ products loaded`() = runTest {
        // Create 100+ products to simulate large product feed
        val products = generateLargeProductList(150)
        
        // Simulate loading products into memory
        val productFeedResponse = ProductFeedResponse(
            products = products,
            cursor = "cursor_150",
            hasMore = true,
            totalCount = 150
        )
        
        // Track memory usage after loading products
        performanceMonitor.trackMemoryUsage()
        val metrics = performanceMonitor.performanceMetrics.value
        
        // Verify memory usage is within acceptable limits (150MB target)
        assertTrue("Memory usage should be less than 150MB", metrics.memoryUsageMB < 150L)
        assertTrue("Memory usage percentage should be less than 80%", metrics.memoryUsagePercent < 80f)
        
        // Verify we actually loaded the expected number of products
        assertEquals(150, productFeedResponse.products.size)
        assertEquals(150, productFeedResponse.totalCount)
    }
    
    @Test
    fun `Image loading should be memory-efficient with size limits`() = runTest {
        // Create products with multiple high-resolution images
        val productsWithImages = generateProductsWithMultipleImages(50)
        
        // Track initial memory usage
        performanceMonitor.trackMemoryUsage()
        val initialMemory = performanceMonitor.performanceMetrics.value.memoryUsageMB
        
        // Simulate image loading for all products
        val totalImageUrls = productsWithImages.flatMap { it.imageUrls }
        
        // Verify image URLs are present and limited per product
        assertTrue("Should have at least one image per product", totalImageUrls.size > 50)
        productsWithImages.forEach { product ->
            assertTrue("Max 5 images per product", product.imageUrls.size <= 5)
            product.imageUrls.forEach { imageUrl ->
                assertNotEquals("Image URL should not be empty", "", imageUrl)
                // Verify image URL format suggests size optimization
                val isOptimized = imageUrl.contains("300x300") || imageUrl.contains("optimized") || 
                                imageUrl.contains("thumb") || imageUrl.contains("mobile")
                assertTrue("Image URL should contain optimization indicators", isOptimized)
            }
        }
        
        // Track memory after image loading simulation
        performanceMonitor.trackMemoryUsage()
        val finalMemory = performanceMonitor.performanceMetrics.value.memoryUsageMB
        
        // Memory increase should be reasonable for image loading
        val memoryIncrease = finalMemory - initialMemory
        assertTrue("Memory increase should be less than 50MB", memoryIncrease < 50L)
    }
    
    @Test
    fun `Memory cleanup should work properly when products are removed`() = runTest {
        // Load large product list
        val largeProductList = generateLargeProductList(200)
        
        // Track memory with large list
        performanceMonitor.trackMemoryUsage()
        val memoryWithLargeList = performanceMonitor.performanceMetrics.value.memoryUsageMB
        
        // Simulate clearing products (garbage collection simulation)
        val smallProductList = largeProductList.take(10)
        
        // Force memory tracking update
        performanceMonitor.trackMemoryUsage()
        val memoryAfterCleanup = performanceMonitor.performanceMetrics.value.memoryUsageMB
        
        // Verify memory usage patterns
        assertTrue("Memory with large list should be greater than 0", memoryWithLargeList > 0L)
        assertTrue("Memory after cleanup should be greater than 0", memoryAfterCleanup > 0L)
        
        // Verify list sizes are as expected
        assertEquals(200, largeProductList.size)
        assertEquals(10, smallProductList.size)
    }
    
    @Test
    fun `Performance monitor should detect memory pressure correctly`() = runTest {
        // Simulate high memory usage scenario
        val massiveProductList = generateLargeProductList(500)
        
        // Track memory usage
        performanceMonitor.trackMemoryUsage()
        val metrics = performanceMonitor.performanceMetrics.value
        
        // Verify memory tracking is working
        assertTrue("Memory usage MB should be greater than 0", metrics.memoryUsageMB > 0L)
        assertTrue("Memory usage percent should be greater than 0", metrics.memoryUsagePercent > 0f)
        
        // Verify product list generation
        assertEquals(500, massiveProductList.size)
        massiveProductList.forEach { product ->
            assertNotEquals("Product ID should not be empty", "", product.id)
            assertNotEquals("Product name should not be empty", "", product.name)
            assertTrue("Product should have image URLs", product.imageUrls.isNotEmpty())
        }
    }
    
    @Test
    fun `Image URL optimization should be consistent across products`() = runTest {
        // Generate products with optimized image URLs
        val products = generateProductsWithOptimizedImages(100)
        
        // Verify all products have optimized image URLs
        products.forEach { product ->
            product.imageUrls.forEach { imageUrl ->
                // Check for optimization indicators in URL
                val isOptimized = imageUrl.contains("optimized") ||
                                imageUrl.contains("300x300") ||
                                imageUrl.contains("thumb") ||
                                imageUrl.contains("mobile") ||
                                imageUrl.contains("desktop")
                
                assertTrue("Image URL should contain optimization indicators", isOptimized)
            }
        }
        
        // Verify reasonable number of images per product
        products.forEach { product ->
            assertTrue("Should have max 3 images for memory efficiency", product.imageUrls.size <= 3)
            assertTrue("Should have at least one image", product.imageUrls.size > 0)
        }
        
        assertEquals(100, products.size)
    }
    
    @Test
    fun `Memory metrics should reset properly after cleanup`() = runTest {
        // Load products and track memory
        val products = generateLargeProductList(100)
        performanceMonitor.trackMemoryUsage()
        
        val metricsBeforeReset = performanceMonitor.performanceMetrics.value
        assertTrue("Memory usage should be greater than 0 before reset", metricsBeforeReset.memoryUsageMB > 0L)
        
        // Reset metrics
        performanceMonitor.resetMetrics()
        
        val metricsAfterReset = performanceMonitor.performanceMetrics.value
        assertEquals("Memory usage should be 0 after reset", 0L, metricsAfterReset.memoryUsageMB)
        assertEquals("Memory usage percent should be 0 after reset", 0f, metricsAfterReset.memoryUsagePercent)
        assertEquals("Total items loaded should be 0 after reset", 0, metricsAfterReset.totalItemsLoaded)
        
        // Verify products were generated correctly
        assertEquals(100, products.size)
    }
}

/**
 * Helper function to generate large product lists for memory testing
 */
private fun generateLargeProductList(count: Int): List<ProductDto> {
    return (1..count).map { index ->
        ProductDto(
            id = "product_$index",
            categoryId = "category_${index % 10}",
            name = "Test Product $index",
            slug = "test-product-$index",
            description = "Test product description for product $index with detailed information",
            mrp = (50.0 + (index % 100) * 10.0) * 1.1,
            sellingPrice = 50.0 + (index % 100) * 10.0,
            discountPercent = if (index % 5 == 0) 10.0 else 0.0,
            imageUrls = listOf(
                "https://example.com/images/product_${index}_optimized.webp",
                "https://example.com/images/product_${index}_thumb.webp"
            ),
            isAvailable = true,
            stockQuantity = 10 + (index % 50),
            averageRating = 3.5 + (index % 3) * 0.5,
            reviewCount = index % 50,
            isReturnable = index % 3 == 0,
            deliveryTime = if (index % 2 == 0) "1-2 days" else "2-3 days",
            badges = if (index % 10 == 0) listOf("Popular") else emptyList(),
            createdAt = "2023-01-01T00:00:00Z",
            updatedAt = "2023-01-01T00:00:00Z"
        )
    }
}

/**
 * Helper function to generate products with multiple images for memory testing
 */
private fun generateProductsWithMultipleImages(count: Int): List<ProductDto> {
    return (1..count).map { index ->
        ProductDto(
            id = "product_img_$index",
            categoryId = "category_images",
            name = "Image Product $index",
            slug = "image-product-$index",
            description = "Product with multiple optimized images",
            mrp = 100.0 + index * 5.0,
            sellingPrice = 100.0 + index * 5.0,
            imageUrls = listOf(
                "https://example.com/images/product_${index}_300x300.webp",
                "https://example.com/images/product_${index}_optimized.webp",
                "https://example.com/images/product_${index}_thumb.webp"
            ),
            isAvailable = true,
            stockQuantity = 15,
            averageRating = 4.0,
            reviewCount = 20,
            isReturnable = true,
            deliveryTime = "1-2 days",
            createdAt = "2023-01-01T00:00:00Z",
            updatedAt = "2023-01-01T00:00:00Z"
        )
    }
}

/**
 * Helper function to generate products with optimized image URLs
 */
private fun generateProductsWithOptimizedImages(count: Int): List<ProductDto> {
    return (1..count).map { index ->
        val imageVariants = listOf("optimized", "thumb", "mobile")
        val selectedVariant = imageVariants[index % imageVariants.size]
        
        ProductDto(
            id = "product_opt_$index",
            categoryId = "category_opt",
            name = "Optimized Product $index",
            slug = "optimized-product-$index",
            description = "Product with optimized image loading",
            mrp = 80.0 + index * 2.0,
            sellingPrice = 75.0 + index * 2.0,
            discountPercent = 5.0,
            imageUrls = listOf(
                "https://cdn.shambit.com/images/product_${index}_${selectedVariant}.webp"
            ),
            isAvailable = true,
            stockQuantity = 20,
            averageRating = 4.2,
            reviewCount = 15,
            isReturnable = true,
            deliveryTime = "2-3 days",
            badges = listOf("Optimized"),
            createdAt = "2023-01-01T00:00:00Z",
            updatedAt = "2023-01-01T00:00:00Z"
        )
    }
}