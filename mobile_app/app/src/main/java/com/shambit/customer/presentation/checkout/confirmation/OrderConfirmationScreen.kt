package com.shambit.customer.presentation.checkout.confirmation

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
// Theme colors
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun OrderConfirmationScreen(
    orderId: String,
    onNavigateToHome: () -> Unit,
    onNavigateToOrderTracking: (orderId: String) -> Unit,
    viewModel: OrderConfirmationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(orderId) {
        viewModel.loadOrderDetails(orderId)
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            
            uiState.error != null -> {
                ErrorContent(
                    error = uiState.error!!,
                    onRetry = { viewModel.loadOrderDetails(orderId) },
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            
            uiState.order != null -> {
                OrderConfirmationContent(
                    uiState = uiState,
                    onNavigateToHome = onNavigateToHome,
                    onNavigateToOrderTracking = { onNavigateToOrderTracking(orderId) }
                )
            }
        }
    }
}

@Composable
private fun OrderConfirmationContent(
    uiState: OrderConfirmationUiState,
    onNavigateToHome: () -> Unit,
    onNavigateToOrderTracking: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Spacer(modifier = Modifier.height(32.dp))
        
        // Success Animation
        SuccessAnimation()
        
        // Success Message
        Text(
            text = "Order Placed Successfully!",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF4CAF50),
            textAlign = TextAlign.Center
        )
        
        Text(
            text = "Thank you for your order",
            style = MaterialTheme.typography.bodyLarge,
            color = Color.Gray,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Order Details Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OrderDetailRow(
                    label = "Order Number",
                    value = uiState.order!!.orderNumber
                )
                
                HorizontalDivider()
                
                OrderDetailRow(
                    label = "Order ID",
                    value = uiState.order.id
                )
                
                HorizontalDivider()
                
                OrderDetailRow(
                    label = "Total Amount",
                    value = "₹${uiState.order.totalAmount}",
                    valueColor = Color(0xFF10B981)
                )
                
                if (uiState.order.estimatedDeliveryTime != null) {
                    HorizontalDivider()
                    
                    OrderDetailRow(
                        label = "Estimated Delivery",
                        value = formatDeliveryTime(uiState.order.estimatedDeliveryTime)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Action Buttons
        Button(
            onClick = onNavigateToOrderTracking,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF10B981)
            )
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Track Order",
                style = MaterialTheme.typography.titleMedium
            )
        }
        
        OutlinedButton(
            onClick = onNavigateToHome,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Home,
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Continue Shopping",
                style = MaterialTheme.typography.titleMedium
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun SuccessAnimation() {
    val infiniteTransition = rememberInfiniteTransition(label = "success")
    
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    Box(
        modifier = Modifier
            .size(120.dp)
            .scale(scale)
            .background(
                color = Color(0xFF4CAF50).copy(alpha = 0.1f),
                shape = CircleShape
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = Color(0xFF4CAF50),
            modifier = Modifier.size(80.dp)
        )
    }
}

@Composable
private fun OrderDetailRow(
    label: String,
    value: String,
    valueColor: Color = Color.Black
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold,
            color = valueColor
        )
    }
}

@Composable
private fun ErrorContent(
    error: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = Color.Red,
            modifier = Modifier.size(48.dp)
        )
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = Color.Gray,
            textAlign = TextAlign.Center
        )
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

private fun formatDeliveryTime(isoString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(isoString)
        
        val outputFormat = SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", Locale.getDefault())
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        isoString
    }
}
