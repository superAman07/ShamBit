package com.shambit.customer.presentation.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Notification Preferences Screen
 * Allows users to manage their notification settings
 * 
 * Note: This is a UI-only implementation. Backend integration needed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationPreferencesScreen(
    onNavigateBack: () -> Unit
) {
    var orderUpdates by remember { mutableStateOf(true) }
    var promotions by remember { mutableStateOf(true) }
    var wishlistAlerts by remember { mutableStateOf(true) }
    var deliveryUpdates by remember { mutableStateOf(true) }
    var paymentAlerts by remember { mutableStateOf(true) }
    var pushNotifications by remember { mutableStateOf(true) }
    var emailNotifications by remember { mutableStateOf(false) }
    var smsNotifications by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notification Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Notification Types Section
            item {
                Text(
                    text = "Notification Types",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column {
                        PreferenceSwitch(
                            title = "Order Updates",
                            subtitle = "Get notified about your order status",
                            checked = orderUpdates,
                            onCheckedChange = { orderUpdates = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "Delivery Updates",
                            subtitle = "Track your delivery in real-time",
                            checked = deliveryUpdates,
                            onCheckedChange = { deliveryUpdates = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "Payment Alerts",
                            subtitle = "Payment confirmations and failures",
                            checked = paymentAlerts,
                            onCheckedChange = { paymentAlerts = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "Promotions & Offers",
                            subtitle = "Special deals and discounts",
                            checked = promotions,
                            onCheckedChange = { promotions = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "Wishlist Alerts",
                            subtitle = "Price drops and stock updates",
                            checked = wishlistAlerts,
                            onCheckedChange = { wishlistAlerts = it }
                        )
                    }
                }
            }
            
            // Notification Channels Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Notification Channels",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column {
                        PreferenceSwitch(
                            title = "Push Notifications",
                            subtitle = "Receive notifications on your device",
                            checked = pushNotifications,
                            onCheckedChange = { pushNotifications = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "Email Notifications",
                            subtitle = "Receive notifications via email",
                            checked = emailNotifications,
                            onCheckedChange = { emailNotifications = it }
                        )
                        
                        HorizontalDivider()
                        
                        PreferenceSwitch(
                            title = "SMS Notifications",
                            subtitle = "Receive notifications via SMS",
                            checked = smsNotifications,
                            onCheckedChange = { smsNotifications = it }
                        )
                    }
                }
            }
            
            // Info Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        
                        Text(
                            text = "You can change these settings anytime. Some notifications like order confirmations cannot be disabled.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }
            
            // Save Button
            item {
                Button(
                    onClick = {
                        // TODO: Save preferences to backend
                        onNavigateBack()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Save Preferences")
                }
            }
        }
    }
}

@Composable
private fun PreferenceSwitch(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}
