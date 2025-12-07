package com.shambit.customer.presentation.checkout.payment

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.repository.OrderRepository
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.RazorpayManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentUiState(
    val isLoading: Boolean = false,
    val isProcessing: Boolean = false,
    val order: OrderDto? = null,
    val paymentSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val razorpayManager: RazorpayManager
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()
    
    fun loadOrderDetails(orderId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = orderRepository.getOrderById(orderId)) {
                is NetworkResult.Loading -> {
                    // Loading
                }
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = result.data,
                            error = null
                        )
                    }
                }
                
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
            }
        }
    }
    
    fun processPayment(
        activity: Activity,
        orderId: String,
        razorpayOrderId: String,
        amount: Double
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessing = true, error = null) }
            
            // Use default customer details for now
            razorpayManager.initializePayment(
                activity = activity,
                orderId = orderId,
                razorpayOrderId = razorpayOrderId,
                amount = amount,
                customerName = "Customer",
                customerEmail = "customer@shambit.com",
                customerPhone = "9999999999",
                onSuccess = { paymentId, _, _ ->
                    handlePaymentSuccess(orderId, paymentId)
                },
                onFailure = { _, message ->
                    handlePaymentFailure(message)
                }
            )
        }
    }
    
    fun confirmCODPayment(orderId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessing = true, error = null) }
            
            // For COD, just mark as success
            // Backend will handle the order confirmation
            _uiState.update {
                it.copy(
                    isProcessing = false,
                    paymentSuccess = true,
                    error = null
                )
            }
        }
    }
    
    private fun handlePaymentSuccess(orderId: String, paymentId: String) {
        viewModelScope.launch {
            // In production, verify payment on backend
            _uiState.update {
                it.copy(
                    isProcessing = false,
                    paymentSuccess = true,
                    error = null
                )
            }
        }
    }
    
    private fun handlePaymentFailure(message: String) {
        _uiState.update {
            it.copy(
                isProcessing = false,
                error = message
            )
        }
    }
}
