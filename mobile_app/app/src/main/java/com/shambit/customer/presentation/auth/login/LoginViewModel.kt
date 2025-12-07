package com.shambit.customer.presentation.auth.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.repository.AuthRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for Login Screen
 */
data class LoginUiState(
    val phone: String = "",
    val phoneError: String? = null,
    val termsAccepted: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val navigateToOtp: Boolean = false
)

/**
 * ViewModel for Login Screen
 */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()
    
    /**
     * Update phone number
     */
    fun updatePhone(phone: String) {
        // Only allow digits and limit to 10
        val filtered = phone.filter { it.isDigit() }.take(10)
        _uiState.update { 
            it.copy(
                phone = filtered,
                phoneError = null,
                error = null
            ) 
        }
    }
    
    /**
     * Update terms accepted
     */
    fun updateTermsAccepted(accepted: Boolean) {
        _uiState.update { it.copy(termsAccepted = accepted) }
    }
    
    /**
     * Validate phone number
     */
    private fun validatePhone(): Boolean {
        val phone = _uiState.value.phone
        
        return when {
            phone.isEmpty() -> {
                _uiState.update { it.copy(phoneError = "Phone number is required") }
                false
            }
            phone.length != 10 -> {
                _uiState.update { it.copy(phoneError = "Phone number must be 10 digits") }
                false
            }
            !phone.startsWith("6") && !phone.startsWith("7") && 
            !phone.startsWith("8") && !phone.startsWith("9") -> {
                _uiState.update { it.copy(phoneError = "Invalid phone number") }
                false
            }
            else -> true
        }
    }
    
    /**
     * Send OTP
     */
    fun sendOtp() {
        if (!validatePhone()) return
        if (!_uiState.value.termsAccepted) return
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = authRepository.sendOtp(mobileNumber = _uiState.value.phone)) {
                is NetworkResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            navigateToOtp = true
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
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Reset navigation flag
     */
    fun resetNavigation() {
        _uiState.update { it.copy(navigateToOtp = false) }
    }
}
