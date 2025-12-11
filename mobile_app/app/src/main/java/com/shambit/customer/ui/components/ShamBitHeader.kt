package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shambit.customer.R
import com.shambit.customer.util.HapticFeedbackManager

/**
 * Modern ShamBit Header Component
 * Inspired by Blinkit's clean layout with unique ShamBit branding
 * 
 * Layout:
 * - Left: Logo + App Name with gradient text
 * - Center: Address section (or "Add Address" prompt)
 * - Right: Cart, Profile icons
 * 
 * Features:
 * - "Sham" in Nokia-style blue gradient (similar to Google Gemini)
 * - "Bit" in vibrant orange
 * - Tagline: "A Bit of Goodness in Every Deal"
 * - Address display with location icon
 * - Cart badge for item count
 * - Haptic feedback on interactions
 * 
 * @param address Current delivery address (null if not set)
 * @param cartItemCount Number of items in cart
 * @param onAddressClick Callback when address section is clicked
 * @param onSearchClick Callback when search icon is clicked
 * @param onCartClick Callback when cart icon is clicked
 * @param onProfileClick Callback when profile icon is clicked
 * @param hapticFeedback Haptic feedback manager
 * @param modifier Modifier for customization
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShamBitHeader(
    address: String? = null,
    cartItemCount: Int = 0,
    onAddressClick: () -> Unit,
    onSearchClick: () -> Unit,
    onCartClick: () -> Unit,
    onProfileClick: () -> Unit,
    hapticFeedback: HapticFeedbackManager,
    modifier: Modifier = Modifier
) {
    // Nokia blue gradient colors (similar to Google Gemini)
    val nokiaBlueStart = Color(0xFF0066CC)
    val nokiaBlueEnd = Color(0xFF0099FF)
    
    // Vibrant orange
    val vibrantOrange = Color(0xFFFF6B35)
    
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Top Row: Logo + Brand Name + Utility Icons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Logo + Brand Name
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    // Logo
                    Image(
                        painter = painterResource(id = R.drawable.logo),
                        contentDescription = "ShamBit Logo",
                        modifier = Modifier
                            .size(60.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                    
                    Spacer(modifier = Modifier.width(10.dp))
                    
                    // Brand Name with Gradient
                    Column(
                        verticalArrangement = Arrangement.Center
                    ) {
                        // "ShamBit" with gradient
                        Text(
                            text = buildAnnotatedString {
                                // "Sham" in Nokia blue gradient
                                withStyle(
                                    style = SpanStyle(
                                        brush = Brush.linearGradient(
                                            colors = listOf(nokiaBlueStart, nokiaBlueEnd)
                                        ),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 20.sp
                                    )
                                ) {
                                    append("Sham")
                                }
                                
                                // "Bit" in vibrant orange
                                withStyle(
                                    style = SpanStyle(
                                        color = vibrantOrange,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 20.sp
                                    )
                                ) {
                                    append("Bit")
                                }
                            }
                        )
                        
                        // Tagline
                        Text(
                            text = "A Bit of Goodness in Every Deal",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                
                // Right: Utility Icons
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Search Icon
                    IconButton(
                        onClick = {
                            hapticFeedback.performLightImpact()
                            onSearchClick()
                        },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    
                    // Cart Icon with Badge
                    Box(
                        modifier = Modifier.size(40.dp)
                    ) {
                        IconButton(
                            onClick = {
                                hapticFeedback.performMediumImpact()
                                onCartClick()
                            },
                            modifier = Modifier.size(40.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = "Shopping Cart",
                                tint = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        
                        // Circular Badge positioned at top-right
                        if (cartItemCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 2.dp, end = 2.dp)
                            ) {
                                CircularBadge(
                                    count = cartItemCount,
                                    size = 18.dp,
                                    fontSize = 9.sp
                                )
                            }
                        }
                    }
                    
                    // Profile Icon
                    IconButton(
                        onClick = {
                            hapticFeedback.performLightImpact()
                            onProfileClick()
                        },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccountCircle,
                            contentDescription = "Profile",
                            tint = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
            
            // Address Section
            AddressSection(
                address = address,
                onClick = {
                    hapticFeedback.performLightImpact()
                    onAddressClick()
                }
            )
        }
    }
}

/**
 * Address Section Component
 * Displays current address or "Add Address" prompt
 */
@Composable
private fun AddressSection(
    address: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start
        ) {
            // Location Icon
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = null,
                tint = if (address != null) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                modifier = Modifier.size(20.dp)
            )
            
            Spacer(modifier = Modifier.width(8.dp))
            
            // Address Text or Prompt
            Column(
                modifier = Modifier.weight(1f)
            ) {
                if (address != null) {
                    Text(
                        text = "Deliver to",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )
                    Text(
                        text = address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = 14.sp
                    )
                } else {
                    Text(
                        text = "Add Address",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    Text(
                        text = "Select your delivery location",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )
                }
            }
            
            // Dropdown Arrow
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}


/**
 * Preview Composables
 */
@androidx.compose.ui.tooling.preview.Preview(
    name = "ShamBit Header - With Address",
    showBackground = true
)
@Composable
private fun ShamBitHeaderWithAddressPreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        ShamBitHeader(
            address = "Home - 123 Main Street, Near Central Park",
            cartItemCount = 3,
            onAddressClick = {},
            onSearchClick = {},
            onCartClick = {},
            onProfileClick = {},
            hapticFeedback = HapticFeedbackManager(androidx.compose.ui.platform.LocalContext.current)
        )
    }
}

@androidx.compose.ui.tooling.preview.Preview(
    name = "ShamBit Header - No Address",
    showBackground = true
)
@Composable
private fun ShamBitHeaderNoAddressPreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        ShamBitHeader(
            address = null,
            cartItemCount = 0,
            onAddressClick = {},
            onSearchClick = {},
            onCartClick = {},
            onProfileClick = {},
            hapticFeedback = HapticFeedbackManager(androidx.compose.ui.platform.LocalContext.current)
        )
    }
}

@androidx.compose.ui.tooling.preview.Preview(
    name = "ShamBit Header - Dark Theme",
    showBackground = true,
    uiMode = android.content.res.Configuration.UI_MODE_NIGHT_YES
)
@Composable
private fun ShamBitHeaderDarkPreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        ShamBitHeader(
            address = "Office - 456 Business Ave, Tower B",
            cartItemCount = 12,
            onAddressClick = {},
            onSearchClick = {},
            onCartClick = {},
            onProfileClick = {},
            hapticFeedback = HapticFeedbackManager(androidx.compose.ui.platform.LocalContext.current)
        )
    }
}
