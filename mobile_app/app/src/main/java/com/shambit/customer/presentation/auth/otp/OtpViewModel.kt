package com.shambit.customer.presentation.auth.otp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.repository.AuthRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for OTP Screen
 */
data class OtpUiState(
    val phone: String = "",
    val otp: String = "",
    val otpError: String? = null,
    val isLoading: Boolean = false,
    val isResending: Boolean = false,
    val error: String? = null,
    val resendTimer: Int = 60,
    val navigateToHome: Boolean = false
)

/**
 * ViewModel for OTP Screen
 */
@HiltViewModel
class OtpViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(OtpUiState())
    val uiState: StateFlow<OtpUiState> = _uiState.asStateFlow()
    
    init {
        startResendTimer()
    }
    
    /**
     * Set phone number
     */
    fun setPhone(phone: String) {
        _uiState.update { it.copy(phone = phone) }
    }
    
    /**
     * Update OTP
     */
    fun updateOtp(otp: String) {
        // Only allow digits and limit to 6
        val filtered = otp.filter { it.isDigit() }.take(6)
        _uiState.update { 
            it.copy(
                otp = filtered,
                otpError = null,
                error = null
            ) 
        }
        
        // Auto-verify when 6 digits entered
        if (filtered.length == 6) {
            verifyOtp()
        }
    }
    
    /**
     * Validate OTP
     */
    private fun validateOtp(): Boolean {
        val otp = _uiState.value.otp
        
        return when {
            otp.isEmpty() -> {
                _uiState.update { it.copy(otpError = "OTP is required") }
                false
            }
            otp.length != 6 -> {
                _uiState.update { it.copy(otpError = "OTP must be 6 digits") }
                false
            }
            else -> true
        }
    }
    
    /**
     * Verify OTP
     */
    fun verifyOtp() {
        if (!validateOtp()) return
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = authRepository.verifyOtp(
                mobileNumber = _uiState.value.phone,
                otp = _uiState.value.otp
            )) {
                is NetworkResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            navigateToHome = true
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
     * Resend OTP
     */
    fun resendOtp() {
        viewModelScope.launch {
            _uiState.update { it.copy(isResending = true, error = null) }
            
            when (val result = authRepository.sendOtp(mobileNumber = _uiState.value.phone)) {
                is NetworkResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            isResending = false,
                            resendTimer = 60,
                            otp = "" // Clear OTP field
                        ) 
                    }
                    startResendTimer()
                }
                is NetworkResult.Error -> {
                    _uiState.update { 
                        it.copy(
                            isResending = false,
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
     * Start resend timer countdown
     */
    private fun startResendTimer() {
        viewModelScope.launch {
            while (_uiState.value.resendTimer > 0) {
                delay(1000)
                _uiState.update { it.copy(resendTimer = it.resendTimer - 1) }
            }
        }
    }
}
