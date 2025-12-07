package com.shambit.customer.presentation.orders.list

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

data class OrdersState(
    val orders: List<OrderDto> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = true
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(OrdersState())
    val state: StateFlow<OrdersState> = _state.asStateFlow()
    
    fun loadOrders(refresh: Boolean = false) {
        if (_state.value.isLoading) return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            val page = if (refresh) 1 else _state.value.currentPage
            
            when (val result = orderRepository.getOrders(page = page)) {
                is NetworkResult.Success -> {
                    val newOrders = result.data.orders
                    _state.update {
                        it.copy(
                            orders = if (refresh) newOrders else it.orders + newOrders,
                            isLoading = false,
                            error = null,
                            currentPage = page + 1,
                            hasMore = newOrders.isNotEmpty()
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
    
    fun refresh() {
        loadOrders(refresh = true)
    }
}
