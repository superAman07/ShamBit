package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.request.CancelOrderRequest
import com.shambit.customer.data.remote.dto.request.CreateOrderRequest
import com.shambit.customer.data.remote.dto.request.ValidatePromotionRequest
import com.shambit.customer.data.remote.dto.response.CreateOrderResponse
import com.shambit.customer.data.remote.dto.response.DeliveryDto
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.remote.dto.response.OrderListResponse
import com.shambit.customer.data.remote.dto.response.OrdersApiResponse
import com.shambit.customer.data.remote.dto.response.PromotionValidationResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Order API endpoints
 */
interface OrderApi {
    
    /**
     * Create new order
     * POST /orders
     */
    @POST("orders")
    suspend fun createOrder(
        @Body request: CreateOrderRequest
    ): Response<ApiResponse<CreateOrderResponse>>
    
    /**
     * Get user orders
     * GET /orders
     * Note: API returns data as array directly, not wrapped in OrderListResponse
     */
    @GET("orders")
    suspend fun getOrders(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): Response<OrdersApiResponse>
    
    /**
     * Get order by ID
     * GET /orders/:id
     */
    @GET("orders/{id}")
    suspend fun getOrderById(
        @Path("id") orderId: String
    ): Response<ApiResponse<OrderDto>>
    
    /**
     * Cancel order
     * POST /orders/:id/cancel
     */
    @POST("orders/{id}/cancel")
    suspend fun cancelOrder(
        @Path("id") orderId: String,
        @Body request: CancelOrderRequest
    ): Response<ApiResponse<OrderDto>>
    
    /**
     * Get delivery tracking for order
     * GET /delivery/order/:orderId
     */
    @GET("delivery/order/{orderId}")
    suspend fun getDeliveryTracking(
        @Path("orderId") orderId: String
    ): Response<ApiResponse<DeliveryDto>>
    
    /**
     * Validate promotion code
     * POST /promotions/validate
     */
    @POST("promotions/validate")
    suspend fun validatePromotion(
        @Body request: ValidatePromotionRequest
    ): Response<ApiResponse<PromotionValidationResponse>>
    
    /**
     * Request return for delivered order
     * POST /orders/:id/return-request
     */
    @POST("orders/{id}/return-request")
    suspend fun requestReturn(
        @Path("id") orderId: String,
        @Body request: com.shambit.customer.data.remote.dto.request.ReturnRequestRequest
    ): Response<ApiResponse<OrderDto>>
}
