package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.SheetState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.FilterOption
import com.shambit.customer.data.remote.dto.response.FilterValue
import kotlinx.coroutines.delay

/**
 * FilterBottomSheet composable for product filtering
 * 
 * This bottom sheet displays API-driven filter options with support for:
 * - Multi-select filters (brands, categories, etc.)
 * - Range filters (price, rating)
 * - Single-value filters (availability, etc.)
 * - Type-safe filter application and validation
 * - Smooth animations and haptic feedback
 * 
 * Features:
 * - Dynamic filter UI based on API-provided FilterOption list
 * - Multi-select, range, and single-value filter types
 * - Filter validation and type-safe application
 * - Existing bottom sheet slide animations and background dimming
 * - "Apply Filters" and "Clear All" functionality
 * - Proper accessibility support
 * 
 * Requirements: 2.4, 5.4
 * 
 * @param filterOptions List of available filter options from API
 * @param appliedFilters Currently applied filters
 * @param onFiltersApplied Callback when filters are applied
 * @param onClearAllFilters Callback to clear all filters
 * @param onDismiss Callback when bottom sheet is dismissed
 * @param modifier Modifier for customization
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterBottomSheet(
    filterOptions: List<FilterOption>,
    appliedFilters: Map<String, AppliedFilterValue>,
    onFiltersApplied: (Map<String, AppliedFilterValue>) -> Unit,
    onClearAllFilters: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
) {
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    // Local state for temporary filter changes before applying
    var tempFilters by remember { mutableStateOf(appliedFilters) }
    
    // Animate content visibility with delay for smooth entrance
    LaunchedEffect(Unit) {
        delay(100) // Small delay for smooth entrance
        isVisible = true
    }
    
    ModalBottomSheet(
        onDismissRequest = {
            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
            onDismiss()
        },
        sheetState = sheetState,
        modifier = modifier,
        dragHandle = {
            // Custom drag handle with close button and smooth animations
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { -it },
                    animationSpec = spring(dampingRatio = 0.8f)
                ) + fadeIn(animationSpec = tween(300)),
                exit = slideOutVertically(
                    targetOffsetY = { -it },
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        // Centered drag handle with subtle animation
                        val dragHandleAlpha by animateFloatAsState(
                            targetValue = if (isVisible) 0.4f else 0f,
                            animationSpec = tween(durationMillis = 300),
                            label = "drag_handle_alpha"
                        )
                        
                        Box(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .width(32.dp)
                                .height(4.dp)
                                .background(
                                    MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dragHandleAlpha),
                                    RoundedCornerShape(2.dp)
                                )
                        )
                        
                        // Close button with haptic feedback
                        IconButton(
                            onClick = {
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                onDismiss()
                            },
                            modifier = Modifier
                                .align(Alignment.CenterEnd)
                                .semantics {
                                    contentDescription = "Close filter bottom sheet"
                                }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    )
                }
            }
        },
        windowInsets = BottomSheetDefaults.windowInsets
    ) {
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 2 },
                animationSpec = spring(dampingRatio = 0.8f)
            ) + fadeIn(animationSpec = tween(400)),
            exit = slideOutVertically(
                targetOffsetY = { it / 2 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            FilterBottomSheetContent(
                filterOptions = filterOptions,
                tempFilters = tempFilters,
                onTempFiltersChanged = { newFilters ->
                    tempFilters = newFilters
                },
                onApplyFilters = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onFiltersApplied(tempFilters)
                    onDismiss()
                },
                onClearAllFilters = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                    tempFilters = emptyMap()
                    onClearAllFilters()
                }
            )
        }
    }
}

/**
 * Content of the filter bottom sheet
 */
@Composable
private fun FilterBottomSheetContent(
    filterOptions: List<FilterOption>,
    tempFilters: Map<String, AppliedFilterValue>,
    onTempFiltersChanged: (Map<String, AppliedFilterValue>) -> Unit,
    onApplyFilters: () -> Unit,
    onClearAllFilters: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 16.dp)
    ) {
        // Header with Clear All button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Filters",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .semantics {
                        contentDescription = "Filter options screen. Use the controls below to filter products."
                    }
            )
            
            TextButton(
                onClick = onClearAllFilters,
                enabled = tempFilters.isNotEmpty()
            ) {
                Text("Clear All")
            }
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        if (filterOptions.isEmpty()) {
            // Empty state
            EmptyFilterState(
                modifier = Modifier.padding(vertical = 32.dp)
            )
        } else {
            // Filter options list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                items(
                    items = filterOptions,
                    key = { filterOption -> filterOption.type }
                ) { filterOption ->
                    FilterOptionSection(
                        filterOption = filterOption,
                        appliedValue = tempFilters[filterOption.type],
                        onFilterChanged = { newValue ->
                            val updatedFilters = if (newValue != null) {
                                tempFilters + (filterOption.type to newValue)
                            } else {
                                tempFilters - filterOption.type
                            }
                            onTempFiltersChanged(updatedFilters)
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Apply Filters button
            ApplyFiltersButton(
                hasFilters = tempFilters.isNotEmpty(),
                onApplyFilters = onApplyFilters
            )
        }
    }
}

/**
 * Individual filter option section with type-safe handling
 */
@Composable
private fun FilterOptionSection(
    filterOption: FilterOption,
    appliedValue: AppliedFilterValue?,
    onFilterChanged: (AppliedFilterValue?) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = filterOption.displayName,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        // Determine filter type based on options and render appropriate UI
        when {
            // Range filter (price, rating) - detected by numeric values with min/max pattern
            isRangeFilter(filterOption) -> {
                RangeFilterSection(
                    filterOption = filterOption,
                    appliedValue = appliedValue as? AppliedFilterValue.Range,
                    onRangeChanged = onFilterChanged
                )
            }
            
            // Single value filter (boolean-like options) - detected by 2 or fewer options
            isSingleValueFilter(filterOption) -> {
                SingleValueFilterSection(
                    filterOption = filterOption,
                    appliedValue = appliedValue as? AppliedFilterValue.SingleValue,
                    onValueChanged = onFilterChanged
                )
            }
            
            // Multi-select filter (brands, categories, etc.) - default case
            else -> {
                MultiSelectFilterSection(
                    filterOption = filterOption,
                    appliedValue = appliedValue as? AppliedFilterValue.MultiSelect,
                    onSelectionChanged = onFilterChanged
                )
            }
        }
    }
}

/**
 * Multi-select filter section with chips
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MultiSelectFilterSection(
    filterOption: FilterOption,
    appliedValue: AppliedFilterValue.MultiSelect?,
    onSelectionChanged: (AppliedFilterValue?) -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedValues = appliedValue?.values?.toSet() ?: emptySet()
    val hapticFeedback = LocalHapticFeedback.current
    
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        filterOption.options.forEach { filterValue ->
            val isSelected = selectedValues.contains(filterValue.value)
            
            FilterChip(
                selected = isSelected,
                onClick = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    
                    val newSelection = if (isSelected) {
                        selectedValues - filterValue.value
                    } else {
                        selectedValues + filterValue.value
                    }
                    
                    val newValue = if (newSelection.isEmpty()) {
                        null
                    } else {
                        AppliedFilterValue.MultiSelect(newSelection.toList())
                    }
                    
                    onSelectionChanged(newValue)
                },
                label = {
                    Text(
                        text = buildString {
                            append(filterValue.displayName)
                            filterValue.count?.let { count ->
                                append(" ($count)")
                            }
                        }
                    )
                },
                leadingIcon = if (isSelected) {
                    {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                } else null,
                modifier = Modifier.semantics {
                    role = Role.Checkbox
                    contentDescription = buildString {
                        append(if (isSelected) "Selected" else "Not selected")
                        append(" ${filterValue.displayName}")
                        filterValue.count?.let { count ->
                            append(", $count items")
                        }
                    }
                }
            )
        }
    }
}

/**
 * Range filter section with slider
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RangeFilterSection(
    filterOption: FilterOption,
    appliedValue: AppliedFilterValue.Range?,
    onRangeChanged: (AppliedFilterValue?) -> Unit,
    modifier: Modifier = Modifier
) {
    // Extract min/max from filter options
    val minValue = filterOption.options.minOfOrNull { it.value.toIntOrNull() ?: 0 } ?: 0
    val maxValue = filterOption.options.maxOfOrNull { it.value.toIntOrNull() ?: 100 } ?: 100
    
    val currentMin = appliedValue?.min ?: minValue
    val currentMax = appliedValue?.max ?: maxValue
    
    var sliderPosition by remember { 
        mutableStateOf(currentMin.toFloat()..currentMax.toFloat()) 
    }
    
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Current range display
        Text(
            text = when (filterOption.type.lowercase()) {
                "price" -> "₹${sliderPosition.start.toInt()} - ₹${sliderPosition.endInclusive.toInt()}"
                "rating" -> "${sliderPosition.start} - ${sliderPosition.endInclusive} stars"
                else -> "${sliderPosition.start.toInt()} - ${sliderPosition.endInclusive.toInt()}"
            },
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        
        // Range Slider
        RangeSlider(
            value = sliderPosition,
            onValueChange = { range ->
                sliderPosition = range
                val newValue = AppliedFilterValue.Range(
                    min = range.start.toInt(),
                    max = range.endInclusive.toInt()
                )
                onRangeChanged(newValue)
            },
            valueRange = minValue.toFloat()..maxValue.toFloat(),
            steps = ((maxValue - minValue) / 10).coerceAtLeast(0),
            modifier = Modifier.fillMaxWidth()
        )
        
        // Min and Max labels
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = when (filterOption.type.lowercase()) {
                    "price" -> "₹$minValue"
                    "rating" -> "$minValue stars"
                    else -> "$minValue"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = when (filterOption.type.lowercase()) {
                    "price" -> "₹$maxValue"
                    "rating" -> "$maxValue stars"
                    else -> "$maxValue"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Single value filter section with switch or radio buttons
 */
@Composable
private fun SingleValueFilterSection(
    filterOption: FilterOption,
    appliedValue: AppliedFilterValue.SingleValue?,
    onValueChanged: (AppliedFilterValue?) -> Unit,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    
    when (filterOption.options.size) {
        1 -> {
            // Single option - use switch (e.g., "In Stock Only")
            val option = filterOption.options.first()
            val isSelected = appliedValue?.value == option.value
            
            Row(
                modifier = modifier
                    .fillMaxWidth()
                    .clickable {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        val newValue = if (isSelected) null else AppliedFilterValue.SingleValue(option.value)
                        onValueChanged(newValue)
                    }
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = option.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Switch(
                    checked = isSelected,
                    onCheckedChange = { checked ->
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        val newValue = if (checked) AppliedFilterValue.SingleValue(option.value) else null
                        onValueChanged(newValue)
                    }
                )
            }
        }
        
        2 -> {
            // Two options - use radio buttons (e.g., "Available/Out of Stock")
            Column(
                modifier = modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filterOption.options.forEach { option ->
                    val isSelected = appliedValue?.value == option.value
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                val newValue = if (isSelected) null else AppliedFilterValue.SingleValue(option.value)
                                onValueChanged(newValue)
                            }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isSelected,
                            onCheckedChange = { checked ->
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                val newValue = if (checked) AppliedFilterValue.SingleValue(option.value) else null
                                onValueChanged(newValue)
                            }
                        )
                        
                        Spacer(modifier = Modifier.width(8.dp))
                        
                        Text(
                            text = buildString {
                                append(option.displayName)
                                option.count?.let { count ->
                                    append(" ($count)")
                                }
                            },
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
        
        else -> {
            // Fallback to multi-select for more than 2 options
            MultiSelectFilterSection(
                filterOption = filterOption,
                appliedValue = appliedValue?.let { AppliedFilterValue.MultiSelect(listOf(it.value)) },
                onSelectionChanged = { multiSelectValue ->
                    val newValue = when (multiSelectValue) {
                        is AppliedFilterValue.MultiSelect -> multiSelectValue.values.firstOrNull()?.let { 
                            AppliedFilterValue.SingleValue(it) 
                        }
                        else -> null
                    }
                    onValueChanged(newValue)
                }
            )
        }
    }
}

/**
 * Apply Filters button with enhanced styling
 */
@Composable
private fun ApplyFiltersButton(
    hasFilters: Boolean,
    onApplyFilters: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    
    Button(
        onClick = {
            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
            onApplyFilters()
        },
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = if (hasFilters) {
                    "Apply selected filters to product feed"
                } else {
                    "Apply filters, no filters currently selected"
                }
            },
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = if (hasFilters) "Apply Filters" else "Apply",
            style = MaterialTheme.typography.labelLarge
        )
    }
}

/**
 * Empty state for filters
 */
@Composable
private fun EmptyFilterState(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "No Filters Available",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        
        Text(
            text = "Filter options will appear here when available for the selected category",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Helper function to determine if a filter is a range filter
 */
private fun isRangeFilter(filterOption: FilterOption): Boolean {
    return when (filterOption.type.lowercase()) {
        "price", "rating", "discount" -> true
        else -> {
            // Check if all options are numeric
            filterOption.options.all { it.value.toIntOrNull() != null }
        }
    }
}

/**
 * Helper function to determine if a filter is a single value filter
 */
private fun isSingleValueFilter(filterOption: FilterOption): Boolean {
    return filterOption.options.size <= 2 && !isRangeFilter(filterOption)
}