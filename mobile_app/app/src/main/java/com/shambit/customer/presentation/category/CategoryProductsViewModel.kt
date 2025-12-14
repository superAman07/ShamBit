package com.shambit.customer.presentation.category

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.util.Constants
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SortOption(val displayName: String) {
    RELEVANCE("Relevance"),
    PRICE_LOW_TO_HIGH("Price: Low to High"),
    PRICE_HIGH_TO_LOW("Price: High to Low"),
    NEWEST("Newest First"),
    DISCOUNT("Discount")
}

data class CategoryProductsUiState(
    val isLoading: Boolean = false,
    val category: CategoryDto? = null,
    val subcategories: List<com.shambit.customer.data.remote.dto.response.SubcategoryDto> = emptyList(),
    val products: List<ProductDto> = emptyList(),
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMorePages: Boolean = true,
    val isLoadingMore: Boolean = false,
    val sortOption: SortOption = SortOption.RELEVANCE,
    val showSortDialog: Boolean = false,
    val isLoadingSubcategories: Boolean = false
)

@HiltViewModel
class CategoryProductsViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val categoryId: String = checkNotNull(savedStateHandle["categoryId"])
    
    private val _uiState = MutableStateFlow(CategoryProductsUiState())
    val uiState: StateFlow<CategoryProductsUiState> = _uiState.asStateFlow()
    
    init {
        android.util.Log.d("CategoryViewModel", "ViewModel init - categoryId from savedStateHandle: $categoryId")
        loadCategoryDetails()
        loadProducts()
    }
    
    /**
     * Load category details by ID
     * Public method for CategoryDetailScreen
     */
    fun loadCategory(categoryId: String) {
        android.util.Log.d("CategoryViewModel", "loadCategory called with categoryId: $categoryId")
        android.util.Log.d("CategoryViewModel", "ViewModel's categoryId from savedStateHandle: ${this.categoryId}")
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            // Load category details
            when (val result = productRepository.getCategoryById(categoryId)) {
                is NetworkResult.Success -> {
                    android.util.Log.d("CategoryViewModel", "Category loaded: ${result.data.name}")
                    _uiState.update { it.copy(
                        isLoading = false,
                        category = result.data
                    ) }
                    // Load subcategories after category is loaded
                    loadSubcategories(categoryId)
                }
                is NetworkResult.Error -> {
                    android.util.Log.e("CategoryViewModel", "Failed to load category: ${result.message}")
                    _uiState.update { it.copy(
                        isLoading = false,
                        error = result.message
                    ) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Load subcategories for the category
     */
    private fun loadSubcategories(categoryId: String) {
        viewModelScope.launch {
            android.util.Log.d("CategoryViewModel", "========================================")
            android.util.Log.d("CategoryViewModel", "Loading subcategories for categoryId: $categoryId")
            _uiState.update { it.copy(isLoadingSubcategories = true) }
            
            when (val result = productRepository.getSubcategories(categoryId)) {
                is NetworkResult.Success -> {
                    android.util.Log.d("CategoryViewModel", "✅ Subcategories loaded successfully: ${result.data.size} items")
                    result.data.forEach { subcategory ->
                        android.util.Log.d("CategoryViewModel", "  - ${subcategory.name} (${subcategory.productCount} products)")
                    }
                    _uiState.update { it.copy(
                        isLoadingSubcategories = false,
                        subcategories = result.data
                    ) }
                }
                is NetworkResult.Error -> {
                    android.util.Log.e("CategoryViewModel", "❌ Failed to load subcategories: ${result.message}")
                    _uiState.update { it.copy(
                        isLoadingSubcategories = false,
                        subcategories = emptyList()
                    ) }
                }
                is NetworkResult.Loading -> {
                    android.util.Log.d("CategoryViewModel", "Loading state received")
                }
            }
            android.util.Log.d("CategoryViewModel", "========================================")
        }
    }
    
    private fun loadCategoryDetails() {
        viewModelScope.launch {
            when (val result = productRepository.getCategoryById(categoryId)) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(category = result.data) }
                    // Load subcategories after category is loaded
                    loadSubcategories(categoryId)
                }
                else -> {}
            }
        }
    }
    
    private fun loadProducts(page: Int = 1) {
        viewModelScope.launch {
            if (page == 1) {
                _uiState.update { it.copy(isLoading = true, error = null) }
            } else {
                _uiState.update { it.copy(isLoadingMore = true) }
            }
            
            when (val result = productRepository.getProductsByCategory(
                categoryId = categoryId,
                page = page,
                pageSize = Constants.DEFAULT_PAGE_SIZE
            )) {
                is NetworkResult.Success -> {
                    val newProducts = if (page == 1) {
                        result.data.products
                    } else {
                        _uiState.value.products + result.data.products
                    }
                    
                    val sortedProducts = sortProducts(newProducts, _uiState.value.sortOption)
                    
                    _uiState.update { it.copy(
                        isLoading = false,
                        isLoadingMore = false,
                        products = sortedProducts,
                        currentPage = page,
                        hasMorePages = result.data.pagination.hasNextPage
                    ) }
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(
                        isLoading = false,
                        isLoadingMore = false,
                        error = result.message
                    ) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    fun loadMoreProducts() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMorePages) return
        loadProducts(_uiState.value.currentPage + 1)
    }
    
    fun showSortDialog() {
        _uiState.update { it.copy(showSortDialog = true) }
    }
    
    fun hideSortDialog() {
        _uiState.update { it.copy(showSortDialog = false) }
    }
    
    fun applySortOption(sortOption: SortOption) {
        _uiState.update { it.copy(
            sortOption = sortOption,
            showSortDialog = false,
            products = sortProducts(_uiState.value.products, sortOption)
        ) }
    }
    
    private fun sortProducts(products: List<ProductDto>, sortOption: SortOption): List<ProductDto> {
        return when (sortOption) {
            SortOption.RELEVANCE -> products
            SortOption.PRICE_LOW_TO_HIGH -> products.sortedBy { it.sellingPrice }
            SortOption.PRICE_HIGH_TO_LOW -> products.sortedByDescending { it.sellingPrice }
            SortOption.NEWEST -> products.sortedByDescending { it.createdAt }
            SortOption.DISCOUNT -> products.sortedByDescending { it.getDiscountPercentage() }
        }
    }
    
    fun retry() {
        loadProducts()
    }
    
    fun refresh() {
        loadProducts(page = 1)
    }
}
