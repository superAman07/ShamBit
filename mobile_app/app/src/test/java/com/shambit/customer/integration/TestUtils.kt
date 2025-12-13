package com.shambit.customer.integration

import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.presentation.home.DataState

/**
 * Shared test utilities for integration tests
 */

/**
 * Extension function to safely get data from DataState
 */
fun <T> DataState<T>.getDataOrNull(): T? {
    return when (this) {
        is DataState.Success -> data
        else -> null
    }
}

/**
 * Helper function to create test products
 */
fun createTestProduct(
    id: String,
    name: String,
    price: Double,
    categoryId: String = "test-category"
): ProductDto {
    return ProductDto(
        id = id,
        categoryId = categoryId,
        name = name,
        slug = name.lowercase().replace(" ", "-"),
        mrp = price,
        sellingPrice = price * 0.9, // 10% discount
        isFeatured = false,
        isReturnable = true,
        isSellable = true,
        imageUrls = listOf("$id-image.jpg"),
        stockQuantity = 10,
        isAvailable = true,
        createdAt = "2024-01-01T00:00:00Z",
        updatedAt = "2024-01-01T00:00:00Z"
    )
}