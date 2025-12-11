package com.shambit.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarData
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.shambit.customer.util.ToastDuration
import com.shambit.customer.util.ToastMessage
import com.shambit.customer.util.ToastType
import kotlinx.coroutines.flow.StateFlow

/**
 * Enhanced toast notification system for address management
 * 
 * Provides contextual toast messages with different types,
 * durations, and action buttons for better user feedback.
 * 
 * Requirements: 3.5, 7.6, 11.3
 */

/**
 * Enhanced snackbar host that handles ToastMessage objects
 */
@Composable
fun EnhancedSnackbarHost(
    toastMessageFlow: StateFlow<ToastMessage?>,
    onToastShown: () -> Unit,
    modifier: Modifier = Modifier
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val toastMessage by toastMessageFlow.collectAsState()
    
    // Handle toast message display
    LaunchedEffect(toastMessage) {
        toastMessage?.let { message ->
            val duration = when (message.duration) {
                ToastDuration.SHORT -> SnackbarDuration.Short
                ToastDuration.LONG -> SnackbarDuration.Long
                ToastDuration.INDEFINITE -> SnackbarDuration.Indefinite
            }
            
            val result = snackbarHostState.showSnackbar(
                message = message.message,
                actionLabel = message.actionLabel,
                duration = duration
            )
            
            // Handle action button click
            if (result == SnackbarResult.ActionPerformed) {
                message.onAction?.invoke()
            }
            
            // Clear the toast message
            onToastShown()
        }
    }
    
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = modifier
    ) { snackbarData ->
        EnhancedSnackbar(
            snackbarData = snackbarData,
            toastType = toastMessage?.type ?: ToastType.INFO
        )
    }
}

/**
 * Custom snackbar with type-based styling
 */
@Composable
fun EnhancedSnackbar(
    snackbarData: SnackbarData,
    toastType: ToastType,
    modifier: Modifier = Modifier
) {
    val (backgroundColor, contentColor, icon) = getSnackbarColors(toastType)
    
    Snackbar(
        modifier = modifier,
        containerColor = backgroundColor,
        contentColor = contentColor,
        action = {
            snackbarData.visuals.actionLabel?.let { actionLabel ->
                TextButton(
                    onClick = { snackbarData.performAction() }
                ) {
                    Text(
                        text = actionLabel,
                        color = contentColor
                    )
                }
            }
        }
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = contentColor
            )
            
            Text(
                text = snackbarData.visuals.message,
                color = contentColor
            )
        }
    }
}

/**
 * Floating toast notification for non-blocking messages
 */
@Composable
fun FloatingToast(
    message: String,
    toastType: ToastType,
    isVisible: Boolean,
    modifier: Modifier = Modifier
) {
    if (isVisible) {
        val (backgroundColor, contentColor, icon) = getToastColors(toastType)
        
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .background(
                        color = backgroundColor,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = contentColor
                    )
                    
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = contentColor
                    )
                }
            }
        }
    }
}

/**
 * Success toast for completed operations
 */
@Composable
fun SuccessToast(
    message: String,
    isVisible: Boolean,
    modifier: Modifier = Modifier
) {
    FloatingToast(
        message = message,
        toastType = ToastType.SUCCESS,
        isVisible = isVisible,
        modifier = modifier
    )
}

/**
 * Error toast for failed operations
 */
@Composable
fun ErrorToast(
    message: String,
    isVisible: Boolean,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    if (isVisible) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .background(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onErrorContainer
                    )
                    
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.weight(1f)
                    )
                    
                    onRetry?.let { retry ->
                        TextButton(
                            onClick = retry
                        ) {
                            Text(
                                text = "Retry",
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Warning toast for important notifications
 */
@Composable
fun WarningToast(
    message: String,
    isVisible: Boolean,
    modifier: Modifier = Modifier
) {
    FloatingToast(
        message = message,
        toastType = ToastType.WARNING,
        isVisible = isVisible,
        modifier = modifier
    )
}

/**
 * Helper functions for toast styling
 */
@Composable
private fun getSnackbarColors(toastType: ToastType): Triple<Color, Color, ImageVector> {
    return when (toastType) {
        ToastType.SUCCESS -> Triple(
            Color(0xFF4CAF50),
            Color.White,
            Icons.Default.CheckCircle
        )
        ToastType.ERROR -> Triple(
            MaterialTheme.colorScheme.errorContainer,
            MaterialTheme.colorScheme.onErrorContainer,
            Icons.Default.Close
        )
        ToastType.WARNING -> Triple(
            Color(0xFFFF9800),
            Color.White,
            Icons.Default.Warning
        )
        ToastType.INFO -> Triple(
            MaterialTheme.colorScheme.primaryContainer,
            MaterialTheme.colorScheme.onPrimaryContainer,
            Icons.Default.Info
        )
    }
}

@Composable
private fun getToastColors(toastType: ToastType): Triple<Color, Color, ImageVector> {
    return when (toastType) {
        ToastType.SUCCESS -> Triple(
            Color(0xFF4CAF50).copy(alpha = 0.9f),
            Color.White,
            Icons.Default.CheckCircle
        )
        ToastType.ERROR -> Triple(
            Color(0xFFFF5252).copy(alpha = 0.9f),
            Color.White,
            Icons.Default.Close
        )
        ToastType.WARNING -> Triple(
            Color(0xFFFF9800).copy(alpha = 0.9f),
            Color.White,
            Icons.Default.Warning
        )
        ToastType.INFO -> Triple(
            Color(0xFF2196F3).copy(alpha = 0.9f),
            Color.White,
            Icons.Default.Info
        )
    }
}

/**
 * Predefined toast messages for address operations
 */
object AddressToastMessages {
    const val ADDRESS_SAVED = "Address saved successfully"
    const val ADDRESS_UPDATED = "Address updated successfully"
    const val ADDRESS_DELETED = "Address deleted successfully"
    const val DEFAULT_SET = "Default address updated"
    const val ADDRESS_SELECTED = "Address selected for delivery"
    const val PAYMENT_READY = "Ready to proceed to payment"
    
    const val SAVE_FAILED = "Failed to save address"
    const val UPDATE_FAILED = "Failed to update address"
    const val DELETE_FAILED = "Failed to delete address"
    const val NETWORK_ERROR = "Network connection error"
    const val VALIDATION_ERROR = "Please check your input"
    const val LOCK_FAILED = "Unable to proceed to payment"
    
    const val FIRST_ADDRESS_INFO = "This will be your default address"
    const val DEFAULT_CHANGED_INFO = "Default address changed"
    const val LAST_ADDRESS_WARNING = "This is your only address"
}