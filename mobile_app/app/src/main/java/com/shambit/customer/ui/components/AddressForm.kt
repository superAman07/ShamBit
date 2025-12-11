package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.shambit.customer.domain.model.AddressType
import kotlinx.coroutines.delay

/**
 * AddressForm composable for add/edit address functionality
 * 
 * Features:
 * - All required address input fields with proper validation
 * - Real-time validation error display
 * - Proper keyboard types and IME actions
 * - Address type selector integration
 * - Default address checkbox
 * - Focus management between fields
 * - Material 3 design with consistent styling
 * 
 * @param name Current name value
 * @param phoneNumber Current phone number value
 * @param houseStreetArea Current house/street/area value
 * @param city Current city value
 * @param pincode Current pincode value
 * @param type Current address type
 * @param isDefault Whether this address should be set as default
 * @param validationErrors Map of field names to error messages
 * @param onNameChange Callback for name field changes
 * @param onPhoneChange Callback for phone number field changes
 * @param onHouseStreetAreaChange Callback for house/street/area field changes
 * @param onCityChange Callback for city field changes
 * @param onPincodeChange Callback for pincode field changes
 * @param onTypeChange Callback for address type changes
 * @param onIsDefaultChange Callback for default checkbox changes
 * @param modifier Modifier for customization
 */
@Composable
fun AddressForm(
    name: String,
    phoneNumber: String,
    houseStreetArea: String,
    city: String,
    pincode: String,
    type: AddressType,
    isDefault: Boolean,
    validationErrors: Map<String, String> = emptyMap(),
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onHouseStreetAreaChange: (String) -> Unit,
    onCityChange: (String) -> Unit,
    onPincodeChange: (String) -> Unit,
    onTypeChange: (AddressType) -> Unit,
    onIsDefaultChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val focusManager = LocalFocusManager.current
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    // Focus requesters for better focus management
    val nameFocusRequester = remember { FocusRequester() }
    val phoneFocusRequester = remember { FocusRequester() }
    val addressFocusRequester = remember { FocusRequester() }
    val cityFocusRequester = remember { FocusRequester() }
    val pincodeFocusRequester = remember { FocusRequester() }
    
    // Animate form entrance
    LaunchedEffect(Unit) {
        delay(100)
        isVisible = true
    }
    
    // Auto-focus on name field when form appears
    LaunchedEffect(isVisible) {
        if (isVisible && name.isEmpty()) {
            delay(300) // Wait for animations to settle
            nameFocusRequester.requestFocus()
        }
    }
    
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Name field with enhanced animations and focus management
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300)
            ) + fadeIn(animationSpec = tween(300)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            var isFocused by remember { mutableStateOf(false) }
            val fieldScale by animateFloatAsState(
                targetValue = if (isFocused) 1.02f else 1f,
                animationSpec = spring(dampingRatio = 0.8f),
                label = "name_field_scale"
            )
            
            OutlinedTextField(
                value = name,
                onValueChange = { 
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onNameChange(it) 
                },
                label = { Text("Full Name") },
                placeholder = { Text("Enter your full name") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null
                    )
                },
                isError = validationErrors.containsKey("name"),
                supportingText = validationErrors["name"]?.let { error ->
                    { Text(text = error, color = MaterialTheme.colorScheme.error) }
                },
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Words,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { 
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        phoneFocusRequester.requestFocus()
                    }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(nameFocusRequester)
                    .onFocusChanged { isFocused = it.isFocused }
                    .graphicsLayer {
                        scaleX = fieldScale
                        scaleY = fieldScale
                    }
                    .semantics {
                        contentDescription = buildString {
                            append("Full name field")
                            if (validationErrors.containsKey("name")) {
                                append(", Error: ${validationErrors["name"]}")
                            }
                            if (name.isNotEmpty()) {
                                append(", Current value: $name")
                            }
                        }
                    }
            )
        }
        
        // Phone number field with enhanced focus management
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300, delayMillis = 50)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 50)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            var isFocused by remember { mutableStateOf(false) }
            val fieldScale by animateFloatAsState(
                targetValue = if (isFocused) 1.02f else 1f,
                animationSpec = spring(dampingRatio = 0.8f),
                label = "phone_field_scale"
            )
            
            OutlinedTextField(
                value = phoneNumber,
                onValueChange = { newValue ->
                    // Only allow digits and limit to 10 characters
                    if (newValue.all { it.isDigit() } && newValue.length <= 10) {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onPhoneChange(newValue)
                    }
                },
                label = { Text("Phone Number") },
                placeholder = { Text("Enter 10-digit phone number") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null
                    )
                },
                isError = validationErrors.containsKey("phoneNumber"),
                supportingText = validationErrors["phoneNumber"]?.let { error ->
                    { Text(text = error, color = MaterialTheme.colorScheme.error) }
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { 
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        addressFocusRequester.requestFocus()
                    }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(phoneFocusRequester)
                    .onFocusChanged { isFocused = it.isFocused }
                    .graphicsLayer {
                        scaleX = fieldScale
                        scaleY = fieldScale
                    }
                    .semantics {
                        contentDescription = buildString {
                            append("Phone number field, 10 digits required")
                            if (validationErrors.containsKey("phoneNumber")) {
                                append(", Error: ${validationErrors["phoneNumber"]}")
                            }
                            if (phoneNumber.isNotEmpty()) {
                                append(", Current value: $phoneNumber")
                            }
                        }
                    }
            )
        }
        
        // House/Street/Area field with enhanced focus management
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300, delayMillis = 100)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 100)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            var isFocused by remember { mutableStateOf(false) }
            val fieldScale by animateFloatAsState(
                targetValue = if (isFocused) 1.02f else 1f,
                animationSpec = spring(dampingRatio = 0.8f),
                label = "address_field_scale"
            )
            
            OutlinedTextField(
                value = houseStreetArea,
                onValueChange = { 
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onHouseStreetAreaChange(it) 
                },
                label = { Text("House No, Street, Area") },
                placeholder = { Text("Enter complete address") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Home,
                        contentDescription = null
                    )
                },
                isError = validationErrors.containsKey("houseStreetArea"),
                supportingText = validationErrors["houseStreetArea"]?.let { error ->
                    { Text(text = error, color = MaterialTheme.colorScheme.error) }
                },
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Words,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { 
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        cityFocusRequester.requestFocus()
                    }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(12.dp),
                minLines = 2,
                maxLines = 3,
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(addressFocusRequester)
                    .onFocusChanged { isFocused = it.isFocused }
                    .graphicsLayer {
                        scaleX = fieldScale
                        scaleY = fieldScale
                    }
                    .semantics {
                        contentDescription = buildString {
                            append("House number, street, and area field")
                            if (validationErrors.containsKey("houseStreetArea")) {
                                append(", Error: ${validationErrors["houseStreetArea"]}")
                            }
                            if (houseStreetArea.isNotEmpty()) {
                                append(", Current value: $houseStreetArea")
                            }
                        }
                    }
            )
        }
        
        // City and Pincode row with enhanced animations
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300, delayMillis = 150)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 150)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // City field with focus management
                var cityFocused by remember { mutableStateOf(false) }
                val cityScale by animateFloatAsState(
                    targetValue = if (cityFocused) 1.02f else 1f,
                    animationSpec = spring(dampingRatio = 0.8f),
                    label = "city_field_scale"
                )
                
                OutlinedTextField(
                    value = city,
                    onValueChange = { 
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onCityChange(it) 
                    },
                    label = { Text("City") },
                    placeholder = { Text("Enter city") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = null
                        )
                    },
                    isError = validationErrors.containsKey("city"),
                    supportingText = validationErrors["city"]?.let { error ->
                        { Text(text = error, color = MaterialTheme.colorScheme.error) }
                    },
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Words,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { 
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            pincodeFocusRequester.requestFocus()
                        }
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .focusRequester(cityFocusRequester)
                        .onFocusChanged { cityFocused = it.isFocused }
                        .graphicsLayer {
                            scaleX = cityScale
                            scaleY = cityScale
                        }
                        .semantics {
                            contentDescription = buildString {
                                append("City field")
                                if (validationErrors.containsKey("city")) {
                                    append(", Error: ${validationErrors["city"]}")
                                }
                                if (city.isNotEmpty()) {
                                    append(", Current value: $city")
                                }
                            }
                        }
                )
                
                // Pincode field with focus management
                var pincodeFocused by remember { mutableStateOf(false) }
                val pincodeScale by animateFloatAsState(
                    targetValue = if (pincodeFocused) 1.02f else 1f,
                    animationSpec = spring(dampingRatio = 0.8f),
                    label = "pincode_field_scale"
                )
                
                OutlinedTextField(
                    value = pincode,
                    onValueChange = { newValue ->
                        // Only allow digits and limit to 6 characters
                        if (newValue.all { it.isDigit() } && newValue.length <= 6) {
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onPincodeChange(newValue)
                        }
                    },
                    label = { Text("Pincode") },
                    placeholder = { Text("6-digit") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = null
                        )
                    },
                    isError = validationErrors.containsKey("pincode"),
                    supportingText = validationErrors["pincode"]?.let { error ->
                        { Text(text = error, color = MaterialTheme.colorScheme.error) }
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = { 
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                            focusManager.clearFocus() 
                        }
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(0.7f)
                        .focusRequester(pincodeFocusRequester)
                        .onFocusChanged { pincodeFocused = it.isFocused }
                        .graphicsLayer {
                            scaleX = pincodeScale
                            scaleY = pincodeScale
                        }
                        .semantics {
                            contentDescription = buildString {
                                append("Pincode field, 6 digits required")
                                if (validationErrors.containsKey("pincode")) {
                                    append(", Error: ${validationErrors["pincode"]}")
                                }
                                if (pincode.isNotEmpty()) {
                                    append(", Current value: $pincode")
                                }
                            }
                        }
                )
            }
        }
        
        // Address type selector with animation
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300, delayMillis = 200)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 200)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            Column {
                Text(
                    text = "Address Type",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                
                AddressTypeSelector(
                    selectedType = type,
                    onTypeSelected = { selectedType ->
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onTypeChange(selectedType)
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        
        // Default address checkbox with animation
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = tween(300, delayMillis = 250)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 250)),
            exit = slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Checkbox(
                    checked = isDefault,
                    onCheckedChange = { checked ->
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onIsDefaultChange(checked)
                    },
                    modifier = Modifier.semantics {
                        contentDescription = if (isDefault) {
                            "Set as default address, currently checked"
                        } else {
                            "Set as default address, currently unchecked"
                        }
                    }
                )
                
                Column {
                    Text(
                        text = "Set as default address",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Medium
                    )
                    
                    Text(
                        text = "This address will be used for checkout by default",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}