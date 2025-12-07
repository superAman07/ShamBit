# ShamBit Header - Quick Reference Card

## 🎯 At a Glance

**Component**: `ShamBitHeader`
**Location**: `ui/components/ShamBitHeader.kt`
**Status**: ✅ Production Ready
**Theme Support**: Light & Dark

## 📦 Usage

```kotlin
ShamBitHeader(
    address = "Home - 123 Main St",  // or null
    cartItemCount = 3,                // 0 to 999+
    onAddressClick = { /* navigate */ },
    onSearchClick = { /* navigate */ },
    onCartClick = { /* navigate */ },
    onProfileClick = { /* navigate */ },
    hapticFeedback = hapticFeedback
)
```

## 🎨 Brand Colors

```kotlin
// "Sham" gradient
val nokiaBlueStart = Color(0xFF0066CC)
val nokiaBlueEnd = Color(0xFF0099FF)

// "Bit" color
val vibrantOrange = Color(0xFFFF6B35)
```

## 📐 Key Dimensions

```
Total Height: ~140dp
Logo: 40dp × 40dp
Icons: 24dp (40dp touch target)
Brand Text: 20sp Bold
Tagline: 10sp Regular
Address Label: 11sp Regular
Address Text: 14sp SemiBold
```

## 🔗 Navigation Routes

```kotlin
onAddressClick → Screen.AddressSelection.route
onSearchClick → Screen.Search.route
onCartClick → Screen.Cart.route
onProfileClick → Screen.Profile.route
```

## 🎭 States

### Address States
```kotlin
address = null          // Shows "Add Address"
address = "Home - ..."  // Shows delivery address
```

### Cart Badge
```kotlin
cartItemCount = 0       // No badge
cartItemCount = 1-99    // Shows count
cartItemCount = 100+    // Shows "99+"
```

## 🎪 Preview Variants

```kotlin
@Preview ShamBitHeaderWithAddressPreview()
@Preview ShamBitHeaderNoAddressPreview()
@Preview ShamBitHeaderDarkPreview()
```

## 🔧 Integration Points

### HomeViewModel
```kotlin
// State
data class HomeUiState(
    val deliveryAddress: String? = null,
    val cartItemCount: Int = 0,
    // ...
)

// Loading
private fun loadDefaultAddress() { /* ... */ }
```

### HomeScreen
```kotlin
topBar = {
    ShamBitHeader(
        address = uiState.deliveryAddress,
        cartItemCount = uiState.cartItemCount,
        // ...
    )
}
```

## 🎯 Haptic Feedback

```kotlin
Light Impact:  Search, Profile, Address
Medium Impact: Cart (more important)
```

## 📱 Responsive Behavior

```
Long Address: Truncates with ellipsis
Small Screen: Maintains proportions
Dark Theme: Auto-adapts colors
```

## ✅ Testing Checklist

```
□ Light theme rendering
□ Dark theme rendering
□ With/without address
□ Cart badge (0, 1-99, 100+)
□ All icon clicks
□ Navigation callbacks
□ Haptic feedback
□ Long address truncation
```

## 🚀 Quick Commands

### Build & Preview
```bash
# Build the app
./gradlew assembleDebug

# Run on device
./gradlew installDebug
```

### Check Diagnostics
```kotlin
getDiagnostics(["ui/components/ShamBitHeader.kt"])
```

## 📚 Documentation

- `SHAMBIT_HEADER_DESIGN.md` - Full design specs
- `HEADER_VISUAL_GUIDE.md` - Visual mockups
- `HEADER_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `BLINKIT_VS_SHAMBIT_COMPARISON.md` - Design comparison

## 🎨 Design Tokens

```kotlin
// Spacing
val headerPaddingHorizontal = 16.dp
val headerPaddingVertical = 12.dp
val elementSpacing = 12.dp
val iconSpacing = 4.dp

// Sizes
val logoSize = 40.dp
val iconSize = 24.dp
val iconTouchTarget = 40.dp
val addressIconSize = 20.dp

// Typography
val brandNameSize = 20.sp
val taglineSize = 10.sp
val addressLabelSize = 11.sp
val addressTextSize = 14.sp
val badgeTextSize = 10.sp

// Shapes
val logoCornerRadius = 8.dp
val addressCornerRadius = 10.dp
```

## 🔍 Common Issues & Solutions

### Issue: Gradient not showing
```kotlin
// Solution: Ensure Brush.linearGradient is used
brush = Brush.linearGradient(
    colors = listOf(nokiaBlueStart, nokiaBlueEnd)
)
```

### Issue: Address not loading
```kotlin
// Solution: Check AddressRepository injection
@HiltViewModel
class HomeViewModel @Inject constructor(
    // ...
    private val addressRepository: AddressRepository
)
```

### Issue: Cart badge not updating
```kotlin
// Solution: Ensure cart state is observed
private fun observeCartCount() {
    viewModelScope.launch {
        cartRepository.cartItemCount.collect { count ->
            _uiState.update { it.copy(cartItemCount = count) }
        }
    }
}
```

## 💡 Pro Tips

1. **Gradient Performance**: The gradient is rendered efficiently using Compose's built-in Brush API
2. **Address Updates**: Address automatically updates when user changes default address
3. **Cart Badge**: Badge animates automatically when count changes
4. **Theme Switching**: Header adapts instantly to theme changes
5. **Haptic Feedback**: Provides tactile confirmation for all interactions

## 🎯 Key Features Summary

✅ Modern gradient brand text
✅ Blinkit-inspired clean layout
✅ Unique ShamBit identity
✅ Full utility access
✅ Address management
✅ Cart visibility
✅ Theme support
✅ Haptic feedback
✅ Accessibility compliant
✅ Production ready

## 📞 Need Help?

- Check documentation files in `mobile_app/`
- Review preview composables
- Test with different states
- Verify navigation routes

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready
