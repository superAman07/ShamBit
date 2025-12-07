package com.shambit.customer.presentation.orders.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.DeliveryDto
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.data.repository.OrderRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrderDetailState(
    val order: OrderDto? = null,
    val deliveryTracking: DeliveryDto? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class OrderDetailViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val cartRepository: CartRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(OrderDetailState())
    val state: StateFlow<OrderDetailState> = _state.asStateFlow()
    
    fun loadOrderDetail(orderId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            when (val result = orderRepository.getOrderById(orderId)) {
                is NetworkResult.Success -> {
                    _state.update {
                        it.copy(
                            order = result.data,
                            isLoading = false,
                            error = null
                        )
                    }
                    
                    // Load delivery tracking if order is in delivery
                    if (result.data.status in listOf("out_for_delivery", "preparing")) {
                        loadDeliveryTracking(orderId)
                    }
                }
                is NetworkResult.Error -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled above
                }
            }
        }
    }
    
    private fun loadDeliveryTracking(orderId: String) {
        viewModelScope.launch {
            when (val result = orderRepository.getDeliveryTracking(orderId)) {
                is NetworkResult.Success -> {
                    _state.update {
                        it.copy(deliveryTracking = result.data)
                    }
                }
                is NetworkResult.Error -> {
                    // Silently fail - delivery tracking is optional
                }
                is NetworkResult.Loading -> {
                    // No action needed
                }
            }
        }
    }
    
    fun cancelOrder(reason: String) {
        val orderId = _state.value.order?.id ?: return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = orderRepository.cancelOrder(orderId, reason)) {
                is NetworkResult.Success -> {
                    _state.update {
                        it.copy(
                            order = result.data,
                            isLoading = false
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled above
                }
            }
        }
    }
    
    fun reorder() {
        val order = _state.value.order ?: return
        
        viewModelScope.launch {
            order.items?.forEach { item ->
                cartRepository.addToCart(
                    productId = item.productId,
                    quantity = item.quantity
                )
            }
        }
    }
    
    fun canCancelOrder(): Boolean {
        val status = _state.value.order?.status?.lowercase() ?: return false
        return status in listOf("pending", "confirmed", "preparing")
    }
}
