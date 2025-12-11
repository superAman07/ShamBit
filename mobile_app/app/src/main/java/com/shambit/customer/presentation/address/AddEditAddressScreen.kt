package com.shambit.customer.presentation.address

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.ui.components.AddressForm
import kotlinx.coroutines.delay

/**
 * Add/Edit Address Screen
 * 
 * Features:
 * - Integrates AddressForm component for consistent UI
 * - Form validation with error display
 * - "Set as Default" checkbox functionality
 * - Save button with loading state
 * - First address auto-default logic in UI
 * - Success toast on save
 * - Navigation back to Manage Address on success
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditAddressScreen(
    viewModel: AddAddressViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val hapticFeedback = LocalHapticFeedback.current
    val formState by viewModel.formState.collectAsState()
    val validationErrors by viewModel.validationErrors.collectAsState()
    val saveState by viewModel.saveState.collectAsState()
    val context = LocalContext.current
    var isVisible by remember { mutableStateOf(false) }
    
    // Animate screen entrance
    LaunchedEffect(Unit) {
        delay(100)
        isVisible = true
    }
    
    // Handle save state changes
    LaunchedEffect(saveState) {
        when (val currentSaveState = saveState) {
            is SaveState.Success -> {
                // Show success toast
                Toast.makeText(context, currentSaveState.message, Toast.LENGTH_SHORT).show()
                // Navigate back to Manage Address on success
                onNavigateBack()
                // Clear save state
                viewModel.clearSaveState()
            }
            is SaveState.Error -> {
                // Show error toast
                Toast.makeText(context, currentSaveState.message, Toast.LENGTH_LONG).show()
                // Clear save state after showing error
                viewModel.clearSaveState()
            }
            else -> {
                // No action needed for Idle or Loading states
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (formState.isEditMode) "Edit Address" else "Add New Address",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                            onNavigateBack()
                        },
                        modifier = Modifier.semantics {
                            contentDescription = "Navigate back to previous screen"
                        }
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            // Save button with smooth animations
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { it },
                    animationSpec = spring(dampingRatio = 0.8f)
                ) + fadeIn(animationSpec = tween(400, delayMillis = 200)),
                exit = slideOutVertically(
                    targetOffsetY = { it },
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                val buttonScale by animateFloatAsState(
                    targetValue = if (saveState is SaveState.Loading) 0.98f else 1f,
                    animationSpec = spring(dampingRatio = 0.7f),
                    label = "save_button_scale"
                )
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Button(
                        onClick = { 
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                            viewModel.saveAddress() 
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .graphicsLayer {
                                scaleX = buttonScale
                                scaleY = buttonScale
                            }
                            .semantics {
                                contentDescription = buildString {
                                    if (formState.isEditMode) {
                                        append("Update address")
                                    } else {
                                        append("Save new address")
                                    }
                                    if (saveState is SaveState.Loading) {
                                        append(", saving in progress")
                                    }
                                }
                            },
                        enabled = saveState !is SaveState.Loading,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (saveState is SaveState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .padding(end = 8.dp)
                                    .size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        }
                        Text(
                            text = if (formState.isEditMode) "Update Address" else "Save Address",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // First address auto-default logic with animation
            AnimatedVisibility(
                visible = !formState.isEditMode && formState.isDefault && isVisible,
                enter = slideInVertically(
                    initialOffsetY = { -it / 2 },
                    animationSpec = tween(300, delayMillis = 100)
                ) + fadeIn(animationSpec = tween(300, delayMillis = 100)),
                exit = slideOutVertically(
                    targetOffsetY = { -it / 2 },
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "This will be your first address and will be set as default automatically.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
            
            // Address Form Component
            AddressForm(
                name = formState.name,
                phoneNumber = formState.phoneNumber,
                houseStreetArea = formState.houseStreetArea,
                city = formState.city,
                pincode = formState.pincode,
                type = formState.type,
                isDefault = formState.isDefault,
                validationErrors = validationErrors,
                onNameChange = viewModel::updateName,
                onPhoneChange = viewModel::updatePhoneNumber,
                onHouseStreetAreaChange = viewModel::updateHouseStreetArea,
                onCityChange = viewModel::updateCity,
                onPincodeChange = viewModel::updatePincode,
                onTypeChange = viewModel::updateType,
                onIsDefaultChange = viewModel::updateIsDefault,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}