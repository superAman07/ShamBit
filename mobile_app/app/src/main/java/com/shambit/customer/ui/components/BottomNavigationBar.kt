package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.shambit.customer.util.HapticFeedbackManager

/**
 * Navigation routes for bottom navigation
 */
object NavigationRoutes {
    const val HOME = "home"
    const val SEARCH = "search"
    const val WISHLIST = "wishlist"
    const val PROFILE = "profile"
}

/**
 * Navigation item data class
 */
data class NavItem(
    val route: String,
    val icon: ImageVector,
    val label: String,
    val contentDescription: String,
    val isCenter: Boolean = false
)

/**
 * Bottom Navigation Bar Component
 * 
 * Features:
 * - 4 navigation items (Home, Search, Wishlist, Profile)
 * - Wishlist uses heart icon
 * - Auto-hide on scroll down (150px threshold)
 * - Auto-show on scroll up
 * - Haptic feedback on tap
 * - Rounded top corners (16dp)
 * - 8dp elevation with soft shadow
 * 
 * @param selectedRoute Current selected route
 * @param scrollOffset Current scroll offset for auto-hide behavior
 * @param scrollDirection Current scroll direction (Up, Down, None)
 * @param onNavigate Callback when navigation item is tapped
 * @param hapticFeedback Haptic feedback manager for tactile responses
 * @param modifier Modifier for customization
 */
@Composable
fun BottomNavigationBar(
    selectedRoute: String,
    scrollOffset: Float,
    scrollDirection: ScrollDirection = ScrollDirection.None,
    onNavigate: (String) -> Unit,
    hapticFeedback: HapticFeedbackManager? = null,
    modifier: Modifier = Modifier
) {
    // Define navigation items
    val navItems = remember {
        listOf(
            NavItem(
                route = NavigationRoutes.HOME,
                icon = Icons.Default.Home,
                label = "Home",
                contentDescription = "Navigate to Home screen"
            ),
            NavItem(
                route = NavigationRoutes.SEARCH,
                icon = Icons.Default.Search,
                label = "Search",
                contentDescription = "Navigate to Search screen"
            ),
            NavItem(
                route = NavigationRoutes.WISHLIST,
                icon = Icons.Default.Favorite, // Heart icon for wishlist/favorites
                label = "Wishlist",
                contentDescription = "Navigate to Wishlist screen"
            ),
            NavItem(
                route = NavigationRoutes.PROFILE,
                icon = Icons.Default.Person,
                label = "Profile",
                contentDescription = "Navigate to Profile screen"
            )
        )
    }
    
    // Determine visibility based on scroll behavior
    // Hide when scrolling down past 150px threshold
    // Show when scrolling up
    val isVisible = remember(scrollOffset, scrollDirection) {
        when {
            scrollOffset < 150f -> true // Always show when near top
            scrollDirection == ScrollDirection.Up -> true // Show when scrolling up
            scrollDirection == ScrollDirection.Down -> false // Hide when scrolling down
            else -> true // Default to visible
        }
    }
    
    // Animated visibility with slide transition
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(
            initialOffsetY = { it },
            animationSpec = tween(
                durationMillis = 300,
                easing = FastOutSlowInEasing
            )
        ),
        exit = slideOutVertically(
            targetOffsetY = { it },
            animationSpec = tween(
                durationMillis = 300,
                easing = FastOutSlowInEasing
            )
        ),
        modifier = modifier
    ) {
        Surface(
            shadowElevation = 8.dp,
            tonalElevation = 0.dp,
            shape = MaterialTheme.shapes.large, // Rounded top corners (16dp)
            modifier = Modifier.shadow(
                elevation = 8.dp,
                shape = MaterialTheme.shapes.large,
                clip = false
            )
        ) {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface,
                tonalElevation = 0.dp,
                modifier = Modifier.semantics {
                    contentDescription = "Bottom navigation bar with 4 items"
                }
            ) {
                navItems.forEach { item ->
                    NavigationBarItem(
                        selected = selectedRoute == item.route,
                        onClick = {
                            // Trigger haptic feedback (50ms light impact)
                            hapticFeedback?.performLightImpact()
                            
                            // Navigate to selected route
                            onNavigate(item.route)
                        },
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = null, // Content description on item level
                                modifier = Modifier.size(24.dp)
                            )
                        },
                        label = if (item.label.isNotEmpty()) {
                            {
                                Text(
                                    text = item.label,
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        } else {
                            null // No label for Goodness icon
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer
                        ),
                        modifier = Modifier.semantics {
                            contentDescription = item.contentDescription
                        }
                    )
                }
            }
        }
    }
}

/**
 * Scroll direction enum for tracking scroll behavior
 */
enum class ScrollDirection {
    Up,
    Down,
    None
}
