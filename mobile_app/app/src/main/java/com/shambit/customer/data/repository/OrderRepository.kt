package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.OrderApi
import com.shambit.customer.data.remote.dto.request.CancelOrderRequest
import com.shambit.customer.data.remote.dto.request.CreateOrderRequest
import com.shambit.customer.data.remote.dto.request.ValidatePromotionRequest
import com.shambit.customer.data.remote.dto.response.CreateOrderResponse
import com.shambit.customer.data.remote.dto.response.DeliveryDto
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.remote.dto.response.OrderListResponse
import com.shambit.customer.data.remote.dto.response.PromotionValidationResponse
import com.shambit.customer.util.Constants
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for order operations
 */
@Singleton
class OrderRepository @Inject constructor(
    private val orderApi: OrderApi
) {
    
    /**
     * Create new order
     */
    suspend fun createOrder(request: CreateOrderRequest): NetworkResult<CreateOrderResponse> {
        return safeApiCall {
            orderApi.createOrder(request)
        }
    }
    
    /**
     * Get user orders
     */
    suspend fun getOrders(
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE
    ): NetworkResult<OrderListResponse> {
        return try {
            val response = orderApi.getOrders(page, pageSize)
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.success) {
                    // Convert the custom response to OrderListResponse
                    val orderListResponse = OrderListResponse(
                        orders = body.data,
                        pagination = body.pagination
                    )
                    NetworkResult.Success(orderListResponse)
                } else {
                    NetworkResult.Error(
                        message = body?.error?.message ?: "Unknown error occurred",
                        code = body?.error?.code
                    )
                }
            } else {
                NetworkResult.Error(
                    message = response.message() ?: "An error occurred",
                    code = response.code().toString()
                )
            }
        } catch (e: Exception) {
            NetworkResult.Error(
                message = e.message ?: "Network error occurred"
            )
        }
    }
    
    /**
     * Get order by ID
     */
    suspend fun getOrderById(orderId: String): NetworkResult<OrderDto> {
        return safeApiCall {
            orderApi.getOrderById(orderId)
        }
    }
    
    /**
     * Cancel order
     */
    suspend fun cancelOrder(
        orderId: String,
        reason: String
    ): NetworkResult<OrderDto> {
        return safeApiCall {
            orderApi.cancelOrder(
                orderId = orderId,
                request = CancelOrderRequest(reason = reason)
            )
        }
    }
    
    /**
     * Get delivery tracking
     */
    suspend fun getDeliveryTracking(orderId: String): NetworkResult<DeliveryDto> {
        return safeApiCall {
            orderApi.getDeliveryTracking(orderId)
        }
    }
    
    /**
     * Validate promotion code
     */
    suspend fun validatePromotion(
        code: String,
        orderAmount: Double
    ): NetworkResult<PromotionValidationResponse> {
        return safeApiCall {
            orderApi.validatePromotion(
                ValidatePromotionRequest(
                    code = code,
                    orderAmount = orderAmount
                )
            )
        }
    }
}
