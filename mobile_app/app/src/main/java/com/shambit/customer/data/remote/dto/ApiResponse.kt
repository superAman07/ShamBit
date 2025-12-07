package com.shambit.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

/**
 * Generic API Response wrapper
 */
data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("data")
    val data: T? = null,
    
    @SerializedName("error")
    val error: ApiError? = null,
    
    @SerializedName("message")
    val message: String? = null
)

data class ApiError(
    @SerializedName("code")
    val code: String,
    
    @SerializedName("message")
    val message: String,
    
    @SerializedName("details")
    val details: Map<String, Any>? = null
)

/**
 * Paginated response wrapper
 */
data class PaginatedResponse<T>(
    @SerializedName("items")
    val items: List<T>,
    
    @SerializedName("pagination")
    val pagination: Pagination
)

data class Pagination(
    @SerializedName("page")
    val page: Int,
    
    @SerializedName("pageSize")
    val pageSize: Int,
    
    @SerializedName("totalPages")
    val totalPages: Int,
    
    @SerializedName("totalItems")
    val totalItems: Int
) {
    val hasNextPage: Boolean
        get() = page < totalPages
}
