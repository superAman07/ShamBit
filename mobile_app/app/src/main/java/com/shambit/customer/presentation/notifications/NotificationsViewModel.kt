package com.shambit.customer.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.response.NotificationDto
import com.shambit.customer.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Notification(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val data: Map<String, Any>?,
    val isRead: Boolean,
    val createdAt: String
)

data class NotificationsState(
    val notifications: List<Notification> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val hasMore: Boolean = true
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val profileApi: ProfileApi
) : ViewModel() {
    
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()
    
    private var currentPage = 0
    private val pageSize = 20
    
    fun loadNotifications(refresh: Boolean = false) {
        if (refresh) {
            currentPage = 0
            _state.update { it.copy(notifications = emptyList(), hasMore = true) }
        }
        
        if (_state.value.isLoading || !_state.value.hasMore) return
        
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            
            try {
                val response = profileApi.getNotificationHistory(
                    limit = pageSize,
                    offset = currentPage * pageSize
                )
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val notificationDtos = response.body()?.data?.notifications ?: emptyList()
                    val notifications = notificationDtos.map { it.toNotification() }
                    
                    _state.update { currentState ->
                        currentState.copy(
                            notifications = if (refresh) notifications else currentState.notifications + notifications,
                            isLoading = false,
                            hasMore = notifications.size >= pageSize
                        )
                    }
                    
                    currentPage++
                } else {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = response.body()?.message ?: "Failed to load notifications"
                        )
                    }
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                // JSON parsing error - likely backend not implemented or wrong format
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Backend API not ready. Please contact support."
                    )
                }
            } catch (e: java.net.UnknownHostException) {
                // Network error
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "No internet connection. Please check your network."
                    )
                }
            } catch (e: java.net.SocketTimeoutException) {
                // Timeout error
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Request timeout. Please try again."
                    )
                }
            } catch (e: Exception) {
                // Generic error
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = "Unable to load notifications. Backend API may not be ready yet."
                    )
                }
            }
        }
    }
    
    fun markAsRead(notificationId: String) {
        viewModelScope.launch {
            _state.update { currentState ->
                currentState.copy(
                    notifications = currentState.notifications.map { notification ->
                        if (notification.id == notificationId) {
                            notification.copy(isRead = true)
                        } else {
                            notification
                        }
                    }
                )
            }
            
            // TODO: Call API to mark as read on backend
            // profileApi.markNotificationAsRead(notificationId)
        }
    }
    
    fun markAllAsRead() {
        viewModelScope.launch {
            _state.update { currentState ->
                currentState.copy(
                    notifications = currentState.notifications.map { it.copy(isRead = true) }
                )
            }
            
            // TODO: Call API to mark all as read on backend
            // profileApi.markAllNotificationsAsRead()
        }
    }
    
    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            _state.update { currentState ->
                currentState.copy(
                    notifications = currentState.notifications.filter { it.id != notificationId }
                )
            }
            
            // TODO: Call API to delete notification on backend
            // profileApi.deleteNotification(notificationId)
        }
    }
    
    private fun NotificationDto.toNotification(): Notification {
        return Notification(
            id = id,
            type = type,
            title = title,
            body = body,
            data = data,
            isRead = status == "read", // Assuming status field indicates read/unread
            createdAt = createdAt
        )
    }
}
