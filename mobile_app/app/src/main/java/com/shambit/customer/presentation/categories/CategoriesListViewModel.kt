package com.shambit.customer.presentation.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.presentation.home.DataState
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for Categories List Screen
 */
data class CategoriesListUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val categoriesState: DataState<List<CategoryDto>> = DataState.Loading,
    val error: String? = null
)

/**
 * ViewModel for Categories List Screen - Shop by Category
 * 
 * Manages:
 * - Loading all parent categories from API
 * - Category interaction tracking
 * - Pull-to-refresh functionality
 * - Error handling and retry logic
 * - Professional animations and transitions
 */
@HiltViewModel
class CategoriesListViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val categoryPreferencesManager: com.shambit.customer.data.local.preferences.CategoryPreferencesManager,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(CategoriesListUiState())
    val uiState: StateFlow<CategoriesListUiState> = _uiState.asStateFlow()

    init {
        loadCategories()
    }

    /**
     * Load all parent categories from API
     */
    fun loadCategories() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                when (val result = productRepository.getCategories()) {
                    is NetworkResult.Success -> {
                        android.util.Log.d("CategoriesListViewModel", "Categories loaded: ${result.data.size} items")
                        
                        // Filter to only parent categories (those with parentId == null)
                        val parentCategories = result.data.filter { it.parentId == null }
                        android.util.Log.d("CategoriesListViewModel", "Parent categories: ${parentCategories.size} items")
                        
                        // Reorder categories based on user interaction frequency
                        val reorderedCategories = reorderCategoriesIfNeeded(parentCategories)
                        
                        _uiState.update { 
                            it.copy(
                                isLoading = false,
                                categoriesState = DataState.Success(reorderedCategories)
                            ) 
                        }
                    }
                    is NetworkResult.Error -> {
                        android.util.Log.e("CategoriesListViewModel", "Failed to load categories: ${result.message}")
                        _uiState.update { 
                            it.copy(
                                isLoading = false,
                                categoriesState = DataState.Error(
                                    result.message ?: context.getString(com.shambit.customer.R.string.error_load_categories)
                                )
                            ) 
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("CategoriesListViewModel", "Exception loading categories", e)
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        categoriesState = DataState.Error(
                            e.message ?: context.getString(com.shambit.customer.R.string.error_load_categories)
                        )
                    ) 
                }
            }
        }
    }

    /**
     * Refresh categories (pull-to-refresh)
     */
    fun refreshCategories() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }
            
            try {
                when (val result = productRepository.getCategories()) {
                    is NetworkResult.Success -> {
                        // Filter to only parent categories
                        val parentCategories = result.data.filter { it.parentId == null }
                        
                        // Reorder categories based on user interaction frequency
                        val reorderedCategories = reorderCategoriesIfNeeded(parentCategories)
                        
                        _uiState.update { 
                            it.copy(
                                isRefreshing = false,
                                categoriesState = DataState.Success(reorderedCategories)
                            ) 
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.update { 
                            it.copy(
                                isRefreshing = false,
                                error = result.message ?: context.getString(com.shambit.customer.R.string.error_refresh_categories)
                            ) 
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Loading state
                    }
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isRefreshing = false,
                        error = e.message ?: context.getString(com.shambit.customer.R.string.error_refresh_categories)
                    ) 
                }
            }
        }
    }

    /**
     * Track category tap for analytics and frequency-based ordering
     */
    fun onCategoryTap(categoryId: String) {
        viewModelScope.launch {
            try {
                categoryPreferencesManager.trackCategoryTap(categoryId)
                android.util.Log.d("CategoriesListViewModel", "Category tap tracked: $categoryId")
            } catch (e: Exception) {
                android.util.Log.e("CategoriesListViewModel", "Failed to track category tap", e)
                // Don't fail the UI for analytics errors
            }
        }
    }

    /**
     * Reorder categories based on tap frequency
     */
    private suspend fun reorderCategoriesIfNeeded(categories: List<CategoryDto>): List<CategoryDto> {
        return try {
            // Check if reordering is needed (24 hours since last reorder)
            if (!categoryPreferencesManager.shouldReorder()) {
                return categories
            }
            
            // Get tap data
            val tapData = categoryPreferencesManager.getCategoryTapData()
            
            // If no tap data, return original order
            if (tapData.isEmpty()) {
                return categories
            }
            
            // Sort categories by tap count (descending), then by original display order
            val reordered = categories.sortedWith(
                compareByDescending<CategoryDto> { category ->
                    tapData[category.id]?.tapCount ?: 0
                }.thenBy { it.displayOrder }
            )
            
            // Update last reorder time
            categoryPreferencesManager.updateLastReorderTime()
            
            android.util.Log.d("CategoriesListViewModel", "Categories reordered based on user preferences")
            reordered
        } catch (e: Exception) {
            android.util.Log.e("CategoriesListViewModel", "Failed to reorder categories", e)
            // Return original order on error
            categories
        }
    }

    /**
     * Clear error state
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}