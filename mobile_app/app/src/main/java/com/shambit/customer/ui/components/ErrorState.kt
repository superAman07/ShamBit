package com.shambit.customer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Error state composable with retry button
 * Used to display error states with user-friendly messages and retry action
 * 
 * @param message Error message to display
 * @param onRetry Callback when retry button is clicked
 * @param errorTitle Optional error title (defaults to "Error")
 * @param modifier Modifier for customization
 */
@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    errorTitle: String = "⚠️",
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = errorTitle,
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.error
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onRetry,
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                Text(text = "Retry")
            }
        }
    }
}

/**
 * Generic error state for non-network errors
 */
@Composable
fun GenericErrorState(
    message: String = "Something went wrong",
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    ErrorState(
        message = message,
        onRetry = onRetry,
        errorTitle = "⚠️",
        modifier = modifier
    )
}

/**
 * Network error state specifically for network-related errors
 */
@Composable
fun NetworkErrorState(
    message: String = "Unable to connect. Please check your internet connection.",
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    ErrorState(
        message = message,
        onRetry = onRetry,
        errorTitle = "📡",
        modifier = modifier
    )
}
