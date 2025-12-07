package com.shambit.customer.presentation.checkout.address

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for Address Selection
 */
data class AddressSelectionUiState(
    val isLoading: Boolean = false,
    val addresses: List<AddressDto> = emptyList(),
    val selectedAddressId: String? = null,
    val error: String? = null,
    val successMessage: String? = null,
    val deletingAddressId: String? = null,
    val settingDefaultId: String? = null
)

/**
 * ViewModel for Address Selection Screen
 */
@HiltViewModel
class AddressSelectionViewModel @Inject constructor(
    private val addressRepository: AddressRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AddressSelectionUiState())
    val uiState: StateFlow<AddressSelectionUiState> = _uiState.asStateFlow()
    
    init {
        loadAddresses()
    }
    
    /**
     * Load user addresses
     */
    fun loadAddresses() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = addressRepository.getAddresses()) {
                is NetworkResult.Success -> {
                    val addresses = result.data
                    val defaultAddress = addresses.find { it.isDefault }
                    
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            addresses = addresses,
                            selectedAddressId = defaultAddress?.id ?: addresses.firstOrNull()?.id
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
                is NetworkResult.Loading -> {
                    // Already handled by isLoading flag
                }
            }
        }
    }
    
    /**
     * Select an address
     */
    fun selectAddress(addressId: String) {
        _uiState.update { it.copy(selectedAddressId = addressId) }
    }
    
    /**
     * Delete an address
     */
    fun deleteAddress(addressId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(deletingAddressId = addressId, error = null, successMessage = null) }
            
            when (val result = addressRepository.deleteAddress(addressId)) {
                is NetworkResult.Success -> {
                    // Reload addresses from server to ensure consistency
                    _uiState.update { 
                        it.copy(
                            deletingAddressId = null,
                            successMessage = "Address deleted successfully"
                        ) 
                    }
                    loadAddresses()
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            deletingAddressId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled by deletingAddressId
                }
            }
        }
    }
    
    /**
     * Set default address
     */
    fun setDefaultAddress(addressId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(settingDefaultId = addressId, error = null, successMessage = null) }
            
            when (val result = addressRepository.setDefaultAddress(addressId)) {
                is NetworkResult.Success -> {
                    // Reload addresses from server to ensure consistency
                    _uiState.update { 
                        it.copy(
                            settingDefaultId = null,
                            successMessage = "Default address updated"
                        ) 
                    }
                    loadAddresses()
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            settingDefaultId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled by settingDefaultId
                }
            }
        }
    }
    
    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    /**
     * Clear success message
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
