package com.shambit.customer.presentation.address

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.domain.manager.AddressStateManager
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.usecase.AddAddressUseCase
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.UpdateAddressUseCase
import com.shambit.customer.domain.validation.AddressValidator
import com.shambit.customer.domain.validation.ValidationResult
import com.shambit.customer.ui.components.AddressToastMessages
import com.shambit.customer.ui.components.LoadingOperations
import com.shambit.customer.util.AppError
import com.shambit.customer.util.ErrorHandler
import com.shambit.customer.util.ErrorStateManager
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Form state for Add/Edit Address screen
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4
 */
data class AddressFormState(
    val id: String? = null,
    val name: String = "",
    val phoneNumber: String = "",
    val houseStreetArea: String = "",
    val city: String = "",
    val pincode: String = "",
    val type: AddressType = AddressType.HOME,
    val isDefault: Boolean = false,
    val isEditMode: Boolean = false
)

/**
 * Save state for address operations
 */
sealed class SaveState {
    object Idle : SaveState()
    object Loading : SaveState()
    data class Success(val message: String) : SaveState()
    data class Error(val message: String) : SaveState()
}

/**
 * ViewModel for Add/Edit Address form
 * 
 * Manages add/edit address form state and validation including:
 * - Form field updates with real-time validation
 * - Address creation and update operations
 * - First address auto-default logic
 * - Default address switching logic
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4
 */
@HiltViewModel
class AddAddressViewModel @Inject constructor(
    private val addAddressUseCase: AddAddressUseCase,
    private val updateAddressUseCase: UpdateAddressUseCase,
    private val getAddressesUseCase: GetAddressesUseCase,
    private val addressStateManager: AddressStateManager,
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val addressId: String? = savedStateHandle.get<String>("addressId")
    
    private val _formState = MutableStateFlow(AddressFormState())
    val formState: StateFlow<AddressFormState> = _formState.asStateFlow()
    
    private val _validationErrors = MutableStateFlow<Map<String, String>>(emptyMap())
    val validationErrors: StateFlow<Map<String, String>> = _validationErrors.asStateFlow()
    
    private val _saveState = MutableStateFlow<SaveState>(SaveState.Idle)
    val saveState: StateFlow<SaveState> = _saveState.asStateFlow()
    
    // Enhanced error handling and loading states
    private val errorStateManager = ErrorStateManager()
    val errorState = errorStateManager.errorState
    val loadingState = errorStateManager.loadingState
    val toastMessage = errorStateManager.toastMessage
    
    init {
        if (addressId != null) {
            loadAddress(addressId)
        } else {
            // For new address, check if this will be the first address (auto-default)
            checkIfFirstAddress()
        }
    }
    
    /**
     * Update name field
     * 
     * Requirements: 1.5
     */
    fun updateName(name: String) {
        _formState.update { it.copy(name = name) }
        validateField("name", name)
    }
    
    /**
     * Update phone number field
     * 
     * Requirements: 1.6
     */
    fun updatePhoneNumber(phone: String) {
        // Only allow digits and limit to reasonable length
        val digitsOnly = phone.filter { it.isDigit() }
        if (digitsOnly.length <= 10) {
            _formState.update { it.copy(phoneNumber = digitsOnly) }
            validateField("phoneNumber", digitsOnly)
        }
    }
    
    /**
     * Update house/street/area field
     * 
     * Requirements: 1.5
     */
    fun updateHouseStreetArea(address: String) {
        _formState.update { it.copy(houseStreetArea = address) }
        validateField("houseStreetArea", address)
    }
    
    /**
     * Update city field
     * 
     * Requirements: 1.5
     */
    fun updateCity(city: String) {
        _formState.update { it.copy(city = city) }
        validateField("city", city)
    }
    
    /**
     * Update pincode field
     * 
     * Requirements: 1.7
     */
    fun updatePincode(pincode: String) {
        // Only allow digits and limit to 6 characters
        val digitsOnly = pincode.filter { it.isDigit() }
        if (digitsOnly.length <= 6) {
            _formState.update { it.copy(pincode = digitsOnly) }
            validateField("pincode", digitsOnly)
        }
    }
    
    /**
     * Update address type
     * 
     * Requirements: 1.1
     */
    fun updateType(type: AddressType) {
        _formState.update { it.copy(type = type) }
    }
    
    /**
     * Update default status
     * 
     * Requirements: 1.2, 1.3, 2.2
     */
    fun updateIsDefault(isDefault: Boolean) {
        _formState.update { it.copy(isDefault = isDefault) }
    }
    
    /**
     * Load address for editing
     * 
     * Requirements: 2.1, 2.3
     */
    fun loadAddress(id: String) {
        viewModelScope.launch {
            _saveState.update { SaveState.Loading }
            
            when (val result = getAddressesUseCase()) {
                is NetworkResult.Success -> {
                    val address = result.data.find { it.id == id }
                    if (address != null) {
                        _formState.update {
                            AddressFormState(
                                id = address.id,
                                name = address.name,
                                phoneNumber = address.phoneNumber,
                                houseStreetArea = address.houseStreetArea,
                                city = address.city,
                                pincode = address.pincode,
                                type = address.type,
                                isDefault = address.isDefault,
                                isEditMode = true
                            )
                        }
                        _saveState.update { SaveState.Idle }
                    } else {
                        _saveState.update { SaveState.Error("Address not found") }
                    }
                }
                is NetworkResult.Error -> {
                    _saveState.update { SaveState.Error(result.message) }
                }
                is NetworkResult.Loading -> {
                    // Already handled by SaveState.Loading
                }
            }
        }
    }
    
    /**
     * Save address (create or update) with enhanced error handling and toast notifications
     * 
     * Updates shared state for cross-screen synchronization.
     * Provides comprehensive error handling and user feedback.
     * 
     * Requirements: 1.1, 1.4, 2.1, 2.4, 4.4, 10.4, 3.5, 11.3
     */
    fun saveAddress() {
        val currentState = _formState.value
        
        // Validate all fields before saving
        if (!validateAllFields()) {
            // Show validation error toast
            errorStateManager.showToast(
                ErrorHandler.createErrorToast(AddressToastMessages.VALIDATION_ERROR)
            )
            return
        }
        
        viewModelScope.launch {
            val operation = if (currentState.isEditMode) {
                LoadingOperations.UPDATING_ADDRESS
            } else {
                LoadingOperations.SAVING_ADDRESS
            }
            
            errorStateManager.setLoading(true, operation)
            _saveState.update { SaveState.Loading }
            
            val result = if (currentState.isEditMode && currentState.id != null) {
                // Update existing address
                updateAddressUseCase(
                    id = currentState.id,
                    name = currentState.name,
                    phoneNumber = currentState.phoneNumber,
                    houseStreetArea = currentState.houseStreetArea,
                    city = currentState.city,
                    pincode = currentState.pincode,
                    type = currentState.type,
                    isDefault = currentState.isDefault
                )
            } else {
                // Add new address
                addAddressUseCase(
                    name = currentState.name,
                    phoneNumber = currentState.phoneNumber,
                    houseStreetArea = currentState.houseStreetArea,
                    city = currentState.city,
                    pincode = currentState.pincode,
                    type = currentState.type,
                    isDefault = currentState.isDefault
                )
            }
            
            when (result) {
                is NetworkResult.Success -> {
                    errorStateManager.setLoading(false)
                    errorStateManager.clearError()
                    
                    val message = if (currentState.isEditMode) {
                        AddressToastMessages.ADDRESS_UPDATED
                    } else {
                        AddressToastMessages.ADDRESS_SAVED
                    }
                    _saveState.update { SaveState.Success(message) }
                    
                    // Show success toast
                    errorStateManager.showToast(
                        ErrorHandler.createSuccessToast(message)
                    )
                    
                    // Update shared state for immediate cross-screen synchronization
                    if (currentState.isEditMode) {
                        addressStateManager.updateAddress(result.data)
                    } else {
                        addressStateManager.addAddress(result.data)
                    }
                }
                is NetworkResult.Error -> {
                    errorStateManager.setLoading(false)
                    val appError = ErrorHandler.handleNetworkError(result.message, context)
                    errorStateManager.setError(appError)
                    
                    val errorMessage = ErrorHandler.getErrorMessage(appError)
                    _saveState.update { SaveState.Error(errorMessage) }
                    
                    // Show error toast with retry option
                    errorStateManager.showToast(
                        ErrorHandler.createErrorToast(
                            message = errorMessage,
                            canRetry = appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            },
                            onRetry = if (appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            }) { { saveAddress() } } else null
                        )
                    )
                }
                is NetworkResult.Loading -> {
                    // Already handled by SaveState.Loading
                }
            }
        }
    }
    
    /**
     * Check if this will be the first address (auto-default logic)
     * 
     * Requirements: 1.2
     */
    private fun checkIfFirstAddress() {
        viewModelScope.launch {
            when (val result = getAddressesUseCase()) {
                is NetworkResult.Success -> {
                    if (result.data.isEmpty()) {
                        // This will be the first address, set as default automatically
                        _formState.update { it.copy(isDefault = true) }
                    }
                }
                is NetworkResult.Error -> {
                    // If we can't check, assume it might be the first address
                    // The use case will handle this logic properly
                }
                is NetworkResult.Loading -> {
                    // Loading state, will be handled by use case
                }
            }
        }
    }
    
    /**
     * Validate a single field in real-time
     */
    private fun validateField(fieldName: String, value: String) {
        val validationResult = when (fieldName) {
            "name" -> AddressValidator.validateName(value)
            "phoneNumber" -> AddressValidator.validatePhoneNumber(value)
            "houseStreetArea" -> AddressValidator.validateHouseStreetArea(value)
            "city" -> AddressValidator.validateCity(value)
            "pincode" -> AddressValidator.validatePincode(value)
            else -> ValidationResult.Valid
        }
        
        when (validationResult) {
            is ValidationResult.Valid -> {
                // Remove error for this field
                _validationErrors.update { errors ->
                    errors.filterKeys { it != fieldName }
                }
            }
            is ValidationResult.Invalid -> {
                // Add error for this field
                _validationErrors.update { errors ->
                    errors + validationResult.errors
                }
            }
        }
    }
    
    /**
     * Validate all fields before saving
     * 
     * Requirements: 1.5, 1.6, 1.7
     */
    private fun validateAllFields(): Boolean {
        val currentState = _formState.value
        
        val validationResult = AddressValidator.validateAddressForCreation(
            name = currentState.name,
            phoneNumber = currentState.phoneNumber,
            houseStreetArea = currentState.houseStreetArea,
            city = currentState.city,
            pincode = currentState.pincode,
            type = currentState.type
        )
        
        when (validationResult) {
            is ValidationResult.Valid -> {
                _validationErrors.update { emptyMap() }
                return true
            }
            is ValidationResult.Invalid -> {
                _validationErrors.update { validationResult.errors }
                return false
            }
        }
    }
    
    /**
     * Clear save state (for UI to reset after showing success/error)
     */
    fun clearSaveState() {
        _saveState.update { SaveState.Idle }
    }
    
    /**
     * Retry failed save operation
     * 
     * Retries the save operation with enhanced error handling.
     * 
     * Requirements: 3.5, 7.6, 11.3
     */
    fun retrySave() {
        if (errorStateManager.canRetry()) {
            errorStateManager.startRetry()
            
            viewModelScope.launch {
                try {
                    saveAddress()
                    errorStateManager.completeRetry()
                } catch (e: Exception) {
                    val appError = ErrorHandler.handleNetworkError(e.message ?: "Retry failed", context)
                    errorStateManager.failRetry(appError)
                }
            }
        }
    }
    
    /**
     * Clear all error states
     */
    fun clearAllErrors() {
        errorStateManager.clearError()
        errorStateManager.clearToast()
    }
    
    /**
     * Clear toast message
     */
    fun clearToast() {
        errorStateManager.clearToast()
    }
}