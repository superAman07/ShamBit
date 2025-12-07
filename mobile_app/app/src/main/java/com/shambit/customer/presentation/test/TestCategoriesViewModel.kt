package com.shambit.customer.presentation.test

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for testing category API
 * Demonstrates how to use ProductRepository to fetch categories
 */
@HiltViewModel
class TestCategoriesViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()
    
    init {
        Log.d(TAG, "ViewModel initialized - Starting to load categories")
        loadCategories()
    }
    
    fun loadCategories() {
        viewModelScope.launch {
            Log.d(TAG, "========================================")
            Log.d(TAG, "Starting API Call: GET /categories")
            Log.d(TAG, "========================================")
            
            _uiState.value = UiState.Loading
            Log.d(TAG, "State changed to: Loading")
            
            // Call the repository method
            val startTime = System.currentTimeMillis()
            val result = productRepository.getCategories()
            val endTime = System.currentTimeMillis()
            val duration = endTime - startTime
            
            Log.d(TAG, "API call completed in ${duration}ms")
            
            when (result) {
                is NetworkResult.Success -> {
                    Log.d(TAG, "✅ NetworkResult.Success received")
                    Log.d(TAG, "Categories count: ${result.data.size}")
                    _uiState.value = UiState.Success(result.data)
                    Log.d(TAG, "State changed to: Success")
                }
                is NetworkResult.Error -> {
                    Log.e(TAG, "❌ NetworkResult.Error received")
                    Log.e(TAG, "Error message: ${result.message}")
                    result.code?.let { Log.e(TAG, "Error code: $it") }
                    _uiState.value = UiState.Error(result.message)
                    Log.e(TAG, "State changed to: Error")
                }
                is NetworkResult.Loading -> {
                    Log.d(TAG, "NetworkResult.Loading received (should not happen)")
                }
            }
            
            Log.d(TAG, "========================================")
        }
    }
    
    sealed class UiState {
        object Idle : UiState()
        object Loading : UiState()
        data class Success(val categories: List<CategoryDto>) : UiState()
        data class Error(val message: String) : UiState()
    }
    
    companion object {
        private const val TAG = "TestCategoriesVM"
    }
}
