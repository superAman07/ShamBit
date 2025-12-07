package com.shambit.customer.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.repository.ProfileRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditProfileState(
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(EditProfileState())
    val state: StateFlow<EditProfileState> = _state.asStateFlow()
    
    fun loadProfile() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = profileRepository.getProfile()) {
                is NetworkResult.Success -> {
                    _state.update {
                        it.copy(
                            name = result.data.name ?: "",
                            email = result.data.email ?: "",
                            phone = result.data.mobileNumber,
                            isLoading = false
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
    
    fun updateName(name: String) {
        _state.update { it.copy(name = name) }
    }
    
    fun updateEmail(email: String) {
        _state.update { it.copy(email = email) }
    }
    
    fun saveProfile() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            val name = _state.value.name.takeIf { it.isNotBlank() }
            val email = _state.value.email.takeIf { it.isNotBlank() }
            
            when (val result = profileRepository.updateProfile(name, email)) {
                is NetworkResult.Success -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = null,
                            isSuccess = true
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
}
