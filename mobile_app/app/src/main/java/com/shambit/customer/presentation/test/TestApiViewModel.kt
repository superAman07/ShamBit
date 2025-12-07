package com.shambit.customer.presentation.test

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.request.OrderItem
import com.shambit.customer.data.remote.dto.response.AuthResponse
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.repository.AuthRepository
import com.shambit.customer.data.repository.OrderRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Test ViewModel to demonstrate API integration
 * This shows how to use all the repositories
 */
@HiltViewModel
class TestApiViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val productRepository: ProductRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    // UI State
    private val _uiState = MutableStateFlow<TestUiState>(TestUiState.Idle)
    val uiState: StateFlow<TestUiState> = _uiState.asStateFlow()

    // Products
    private val _products = MutableStateFlow<List<ProductDto>>(emptyList())
    val products: StateFlow<List<ProductDto>> = _products.asStateFlow()

    // Categories
    private val _categories = MutableStateFlow<List<CategoryDto>>(emptyList())
    val categories: StateFlow<List<CategoryDto>> = _categories.asStateFlow()

    // Orders
    private val _orders = MutableStateFlow<List<OrderDto>>(emptyList())
    val orders: StateFlow<List<OrderDto>> = _orders.asStateFlow()

    // Loading state
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    // Error message
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    /**
     * Test 1: Send OTP
     */
    fun testSendOtp(mobileNumber: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = authRepository.sendOtp(mobileNumber)) {
                is NetworkResult.Success -> {
                    _uiState.value = TestUiState.OtpSent("OTP sent to $mobileNumber")
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 2: Verify OTP and Login
     */
    fun testVerifyOtp(mobileNumber: String, otp: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = authRepository.verifyOtp(mobileNumber, otp)) {
                is NetworkResult.Success -> {
                    _uiState.value = TestUiState.LoginSuccess(result.data)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 3: Fetch Products
     */
    fun testFetchProducts() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = productRepository.getProducts(page = 1, pageSize = 20)) {
                is NetworkResult.Success -> {
                    _products.value = result.data.products
                    _uiState.value = TestUiState.ProductsLoaded(result.data.products.size)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 4: Search Products
     */
    fun testSearchProducts(query: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = productRepository.searchProducts(query)) {
                is NetworkResult.Success -> {
                    _products.value = result.data.products
                    _uiState.value = TestUiState.SearchResults(result.data.products.size)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 5: Fetch Categories
     */
    fun testFetchCategories() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = productRepository.getCategories()) {
                is NetworkResult.Success -> {
                    _categories.value = result.data
                    _uiState.value = TestUiState.CategoriesLoaded(result.data.size)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 6: Get Product by ID
     */
    fun testGetProductById(productId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = productRepository.getProductById(productId)) {
                is NetworkResult.Success -> {
                    _uiState.value = TestUiState.ProductDetails(result.data)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 7: Fetch User Orders
     */
    fun testFetchOrders() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = orderRepository.getOrders()) {
                is NetworkResult.Success -> {
                    _orders.value = result.data.orders
                    _uiState.value = TestUiState.OrdersLoaded(result.data.orders.size)
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 8: Validate Promo Code
     */
    fun testValidatePromo(code: String, amount: Double) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            when (val result = orderRepository.validatePromotion(code, amount)) {
                is NetworkResult.Success -> {
                    val validation = result.data
                    if (validation.valid) {
                        _uiState.value = TestUiState.PromoValid(
                            "Promo valid! Discount: ₹${validation.discountAmount}"
                        )
                    } else {
                        _uiState.value = TestUiState.PromoInvalid(
                            validation.error ?: "Invalid promo code"
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                    _uiState.value = TestUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Test 9: Check if logged in
     */
    fun testCheckLoginStatus() {
        viewModelScope.launch {
            val isLoggedIn = authRepository.isLoggedIn()
            _uiState.value = TestUiState.LoginStatus(isLoggedIn)
        }
    }

    /**
     * Test 10: Logout
     */
    fun testLogout() {
        viewModelScope.launch {
            _isLoading.value = true

            when (val result = authRepository.logout()) {
                is NetworkResult.Success -> {
                    _uiState.value = TestUiState.LoggedOut
                    _products.value = emptyList()
                    _categories.value = emptyList()
                    _orders.value = emptyList()
                }
                is NetworkResult.Error -> {
                    _errorMessage.value = result.message
                }
                is NetworkResult.Loading -> {}
            }

            _isLoading.value = false
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _errorMessage.value = null
    }

    /**
     * Reset UI state
     */
    fun resetState() {
        _uiState.value = TestUiState.Idle
        _errorMessage.value = null
    }
}

/**
 * UI State for test screen
 */
sealed class TestUiState {
    object Idle : TestUiState()
    data class OtpSent(val message: String) : TestUiState()
    data class LoginSuccess(val authResponse: AuthResponse) : TestUiState()
    data class ProductsLoaded(val count: Int) : TestUiState()
    data class SearchResults(val count: Int) : TestUiState()
    data class CategoriesLoaded(val count: Int) : TestUiState()
    data class ProductDetails(val product: ProductDto) : TestUiState()
    data class OrdersLoaded(val count: Int) : TestUiState()
    data class PromoValid(val message: String) : TestUiState()
    data class PromoInvalid(val message: String) : TestUiState()
    data class LoginStatus(val isLoggedIn: Boolean) : TestUiState()
    object LoggedOut : TestUiState()
    data class Error(val message: String) : TestUiState()
}
