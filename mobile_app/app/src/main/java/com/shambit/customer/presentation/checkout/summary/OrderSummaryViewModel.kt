package com.shambit.customer.presentation.checkout.summary

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.request.CreateOrderRequest
import com.shambit.customer.data.remote.dto.request.OrderItem
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.remote.dto.response.CartDto
import com.shambit.customer.data.remote.dto.response.CreateOrderResponse
import com.shambit.customer.data.repository.AddressRepository
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

data class OrderSummaryUiState(
    val isLoading: Boolean = false,
    val isPlacingOrder: Boolean = false,
    val cart: CartDto? = null,
    val selectedAddress: AddressDto? = null,
    val selectedPaymentMethod: String = "upi",
    val error: String? = null,
    val orderCreated: Boolean = false,
    val createdOrder: CreateOrderResponse? = null
)

@HiltViewModel
class OrderSummaryViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val addressRepository: AddressRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(OrderSummaryUiState())
    val uiState: StateFlow<OrderSummaryUiState> = _uiState.asStateFlow()
    
    fun loadOrderSummary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            // Load cart
            when (val cartResult = cartRepository.getCart()) {
                is NetworkResult.Loading -> {
                    // Already loading
                }
                is NetworkResult.Success -> {
                    val cart = cartResult.data
                    
                    // Validate cart
                    if (cart.items.isEmpty()) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Your cart is empty"
                            )
                        }
                        return@launch
                    }
                    
                    // Load default address
                    when (val addressResult = addressRepository.getAddresses()) {
                        is NetworkResult.Loading -> {
                            // Already loading
                        }
                        is NetworkResult.Success -> {
                            val defaultAddress = addressResult.data.firstOrNull { it.isDefault }
                                ?: addressResult.data.firstOrNull()
                            
                            if (defaultAddress == null) {
                                _uiState.update {
                                    it.copy(
                                        isLoading = false,
                                        error = "Please add a delivery address"
                                    )
                                }
                            } else {
                                _uiState.update {
                                    it.copy(
                                        isLoading = false,
                                        cart = cart,
                                        selectedAddress = defaultAddress,
                                        error = null
                                    )
                                }
                            }
                        }
                        
                        is NetworkResult.Error -> {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    error = addressResult.message
                                )
                            }
                        }
                    }
                }
                
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = cartResult.message
                        )
                    }
                }
            }
        }
    }
    
    fun selectPaymentMethod(method: String) {
        _uiState.update { it.copy(selectedPaymentMethod = method) }
    }
    
    fun applyPromoCode(code: String) {
        viewModelScope.launch {
            val currentCart = _uiState.value.cart ?: return@launch
            
            when (val result = orderRepository.validatePromotion(code, currentCart.subtotal)) {
                is NetworkResult.Loading -> {
                    // Loading
                }
                is NetworkResult.Success -> {
                    if (result.data.valid) {
                        // Reload cart to get updated prices
                        loadOrderSummary()
                    } else {
                        _uiState.update {
                            it.copy(error = result.data.error ?: "Invalid promo code")
                        }
                    }
                }
                
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(error = result.message)
                    }
                }
            }
        }
    }
    
    fun removePromoCode() {
        // In a real app, you'd call an API to remove the promo code
        loadOrderSummary()
    }
    
    fun placeOrder() {
        viewModelScope.launch {
            val currentState = _uiState.value
            val cart = currentState.cart ?: return@launch
            val address = currentState.selectedAddress ?: return@launch
            
            _uiState.update { it.copy(isPlacingOrder = true, error = null) }
            
            val orderRequest = CreateOrderRequest(
                items = cart.items.map { item ->
                    OrderItem(
                        productId = item.productId,
                        quantity = item.quantity
                    )
                },
                deliveryAddressId = address.id,
                paymentMethod = currentState.selectedPaymentMethod,
                promoCode = cart.promoCode
            )
            
            when (val result = orderRepository.createOrder(orderRequest)) {
                is NetworkResult.Loading -> {
                    // Loading
                }
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isPlacingOrder = false,
                            orderCreated = true,
                            createdOrder = result.data,
                            error = null
                        )
                    }
                }
                
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isPlacingOrder = false,
                            error = result.message
                        )
                    }
                }
            }
        }
    }
}
