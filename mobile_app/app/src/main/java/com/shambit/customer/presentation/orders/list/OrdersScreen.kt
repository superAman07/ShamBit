package com.shambit.customer.presentation.orders.list

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.ui.components.EmptyState
import com.shambit.customer.util.OrderStatusUtil
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    onNavigateBack: () -> Unit,
    onNavigateToOrderDetail: (String) -> Unit,
    viewModel: OrdersViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadOrders()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Orders") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        },
        bottomBar = {
            com.shambit.customer.ui.components.BottomNavigationBar(
                selectedRoute = com.shambit.customer.navigation.Screen.Orders.route,
                scrollOffset = 0f,
                onNavigate = { route ->
                    if (route != com.shambit.customer.navigation.Screen.Orders.route) {
                        onNavigateBack()
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading && state.orders.isEmpty() -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                
                state.error != null && state.orders.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Default.ShoppingCart,
                        title = "Error Loading Orders",
                        message = state.error ?: "Something went wrong",
                        actionText = "Retry",
                        onAction = { viewModel.loadOrders() }
                    )
                }
                
                state.orders.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Default.ShoppingCart,
                        title = "No Orders Yet",
                        message = "Your orders will appear here once you make a purchase"
                    )
                }
                
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.orders) { order ->
                            OrderItem(
                                order = order,
                                onClick = { onNavigateToOrderDetail(order.id) }
                            )
                        }
                        
                        if (state.isLoading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderItem(
    order: OrderDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Order number and status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Order #${order.orderNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                OrderStatusBadge(status = order.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Order date
            Text(
                text = formatDate(order.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Items count
            if (order.items != null) {
                Text(
                    text = "${order.items.size} item${if (order.items.size > 1) "s" else ""}",
                    style = MaterialTheme.typography.bodyMedium
                )
                
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            // Total amount
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Total",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Text(
                    text = formatCurrency(order.totalAmount),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun OrderStatusBadge(status: String) {
    val statusInfo = OrderStatusUtil.getStatusInfo(status)
    
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(statusInfo.color)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = statusInfo.displayName,
            style = MaterialTheme.typography.labelSmall,
            color = androidx.compose.ui.graphics.Color.White,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        date?.let { outputFormat.format(it) } ?: dateString
    } catch (e: Exception) {
        dateString
    }
}

private fun formatCurrency(amount: Double): String {
    return "₹${String.format("%.2f", amount)}"
}

private fun String.capitalize(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
}
