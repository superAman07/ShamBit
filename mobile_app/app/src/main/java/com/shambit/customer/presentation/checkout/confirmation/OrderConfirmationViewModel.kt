package com.shambit.customer.presentation.checkout.confirmation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.repository.OrderRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrderConfirmationUiState(
    val isLoading: Boolean = false,
    val order: OrderDto? = null,
    val error: String? = null
)

@HiltViewModel
class OrderConfirmationViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(OrderConfirmationUiState())
    val uiState: StateFlow<OrderConfirmationUiState> = _uiState.asStateFlow()
    
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
}
