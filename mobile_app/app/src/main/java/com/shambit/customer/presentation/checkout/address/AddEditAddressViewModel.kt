package com.shambit.customer.presentation.checkout.address

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.request.AddAddressRequest
import com.shambit.customer.data.remote.dto.request.UpdateAddressRequest
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.repository.AddressRepository
import com.shambit.customer.data.repository.ProfileRepository
import com.shambit.customer.util.LocationHelper
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for Add/Edit Address
 */
data class AddEditAddressUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isLoadingLocation: Boolean = false,
    val name: String = "",
    val phoneNumber: String = "",
    val addressLine1: String = "",
    val addressLine2: String = "",
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val landmark: String = "",
    val addressType: String = "home",
    val isDefault: Boolean = false,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val error: String? = null,
    val successMessage: String? = null,
    val validationErrors: Map<String, String> = emptyMap(),
    val isEditMode: Boolean = false,
    val addressId: String? = null
)

/**
 * ViewModel for Add/Edit Address Screen
 */
@HiltViewModel
class AddEditAddressViewModel @Inject constructor(
    private val addressRepository: AddressRepository,
    private val profileRepository: ProfileRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val addressId: String? = savedStateHandle.get<String>("addressId")
    
    private val _uiState = MutableStateFlow(AddEditAddressUiState())
    val uiState: StateFlow<AddEditAddressUiState> = _uiState.asStateFlow()
    
    init {
        loadUserProfile()
        if (addressId != null) {
            loadAddress(addressId)
        }
    }
    
    /**
     * Load address for editing
     */
    private fun loadAddress(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, isEditMode = true, addressId = id) }
            
            when (val result = addressRepository.getAddresses()) {
                is NetworkResult.Success -> {
                    val address = result.data.find { it.id == id }
                    if (address != null) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                name = address.name ?: it.name, // Keep pre-populated name if address name is null
                                phoneNumber = address.phoneNumber ?: it.phoneNumber, // Keep pre-populated phone if address phone is null
                                addressLine1 = address.addressLine1 ?: "",
                                addressLine2 = address.addressLine2 ?: "",
                                city = address.city ?: "",
                                state = address.state,
                                pincode = address.pincode ?: "",
                                landmark = address.landmark ?: "",
                                addressType = address.type ?: "other",
                                isDefault = address.isDefault,
                                latitude = address.latitude,
                                longitude = address.longitude
                            )
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = "Address not found"
                            )
                        }
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
     * Update address line 1
     */
    fun updateAddressLine1(value: String) {
        _uiState.update { it.copy(addressLine1 = value) }
        clearValidationError("addressLine1")
    }
    
    /**
     * Update address line 2
     */
    fun updateAddressLine2(value: String) {
        _uiState.update { it.copy(addressLine2 = value) }
    }
    
    /**
     * Update city
     */
    fun updateCity(value: String) {
        _uiState.update { it.copy(city = value) }
        clearValidationError("city")
    }
    
    /**
     * Update state
     */
    fun updateState(value: String) {
        _uiState.update { it.copy(state = value) }
        clearValidationError("state")
    }
    
    /**
     * Update pincode
     */
    fun updatePincode(value: String) {
        if (value.length <= 6 && value.all { it.isDigit() }) {
            _uiState.update { it.copy(pincode = value) }
            clearValidationError("pincode")
        }
    }
    
    /**
     * Update landmark
     */
    fun updateLandmark(value: String) {
        _uiState.update { it.copy(landmark = value) }
    }
    
    /**
     * Update address type
     */
    fun updateAddressType(type: String) {
        _uiState.update { it.copy(addressType = type) }
    }
    
    /**
     * Update is default
     */
    fun updateIsDefault(value: Boolean) {
        _uiState.update { it.copy(isDefault = value) }
    }
    
    /**
     * Update name
     */
    fun updateName(value: String) {
        _uiState.update { it.copy(name = value) }
        clearValidationError("name")
    }
    
    /**
     * Update phone number
     */
    fun updatePhoneNumber(value: String) {
        _uiState.update { it.copy(phoneNumber = value) }
        clearValidationError("phoneNumber")
    }
    
    /**
     * Load user profile to pre-populate name and phone
     */
    private fun loadUserProfile() {
        viewModelScope.launch {
            when (val result = profileRepository.getProfile()) {
                is NetworkResult.Success -> {
                    val profile = result.data
                    _uiState.update { 
                        it.copy(
                            name = profile.name ?: "",
                            phoneNumber = profile.mobileNumber
                        ) 
                    }
                }
                is NetworkResult.Error -> {
                    // Silently fail - user can still enter manually
                }
                is NetworkResult.Loading -> {
                    // Loading state - do nothing
                }
            }
        }
    }
    
    /**
     * Get current location and reverse geocode
     */
    fun useCurrentLocation(context: Context) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingLocation = true, error = null) }
            
            try {
                // Check permission
                if (!LocationHelper.hasLocationPermission(context)) {
                    _uiState.update {
                        it.copy(
                            isLoadingLocation = false,
                            error = "Location permission not granted"
                        )
                    }
                    return@launch
                }
                
                // Get current location
                val location = LocationHelper.getCurrentLocation(context)
                
                // Reverse geocode
                when (val result = addressRepository.reverseGeocode(
                    latitude = location.latitude,
                    longitude = location.longitude
                )) {
                    is NetworkResult.Success -> {
                        val geocode = result.data
                        _uiState.update {
                            it.copy(
                                isLoadingLocation = false,
                                addressLine1 = geocode.address,
                                city = geocode.city,
                                state = geocode.state,
                                pincode = geocode.pincode,
                                latitude = location.latitude,
                                longitude = location.longitude
                            )
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoadingLocation = false,
                                latitude = location.latitude,
                                longitude = location.longitude,
                                error = result.message
                            )
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already handled by isLoadingLocation
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingLocation = false,
                        error = e.message ?: "Failed to get location"
                    )
                }
            }
        }
    }
    
    /**
     * Validate form
     */
    private fun validateForm(): Boolean {
        val errors = mutableMapOf<String, String>()
        val state = _uiState.value
        
        if (state.name.isBlank()) {
            errors["name"] = "Name is required"
        }
        
        if (state.phoneNumber.isBlank()) {
            errors["phoneNumber"] = "Phone number is required"
        } else if (state.phoneNumber.length != 10) {
            errors["phoneNumber"] = "Phone number must be 10 digits"
        }
        
        if (state.addressLine1.isBlank()) {
            errors["addressLine1"] = "Address is required"
        }
        
        if (state.city.isBlank()) {
            errors["city"] = "City is required"
        }
        
        if (state.state.isBlank()) {
            errors["state"] = "State is required"
        }
        
        if (state.pincode.isBlank()) {
            errors["pincode"] = "Pincode is required"
        } else if (state.pincode.length != 6) {
            errors["pincode"] = "Pincode must be 6 digits"
        }
        
        _uiState.update { it.copy(validationErrors = errors) }
        return errors.isEmpty()
    }
    
    /**
     * Clear validation error for a field
     */
    private fun clearValidationError(field: String) {
        _uiState.update {
            it.copy(
                validationErrors = it.validationErrors.filterKeys { key -> key != field }
            )
        }
    }
    
    /**
     * Save address
     */
    fun saveAddress(onSuccess: () -> Unit) {
        if (!validateForm()) {
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            val state = _uiState.value
            
            val result = if (state.isEditMode && state.addressId != null) {
                // Update existing address
                addressRepository.updateAddress(
                    addressId = state.addressId,
                    request = UpdateAddressRequest(
                        name = state.name,
                        phoneNumber = state.phoneNumber,
                        type = state.addressType,
                        addressLine1 = state.addressLine1,
                        addressLine2 = state.addressLine2.ifBlank { null },
                        city = state.city,
                        state = state.state,
                        pincode = state.pincode,
                        landmark = state.landmark.ifBlank { null },
                        latitude = state.latitude,
                        longitude = state.longitude,
                        isDefault = state.isDefault
                    )
                )
            } else {
                // Add new address
                addressRepository.addAddress(
                    request = AddAddressRequest(
                        name = state.name,
                        phoneNumber = state.phoneNumber,
                        type = state.addressType,
                        addressLine1 = state.addressLine1,
                        addressLine2 = state.addressLine2.ifBlank { null },
                        city = state.city,
                        state = state.state,
                        pincode = state.pincode,
                        landmark = state.landmark.ifBlank { null },
                        latitude = state.latitude,
                        longitude = state.longitude,
                        isDefault = state.isDefault
                    )
                )
            }
            
            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            isSaving = false,
                            successMessage = if (state.isEditMode) "Address updated successfully" else "Address added successfully"
                        ) 
                    }
                    // Navigate back immediately after successful save
                    onSuccess()
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled by isSaving flag
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
}
