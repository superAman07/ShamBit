# ShamBit Modern Header Design

## Overview
A modern, clean app header inspired by Blinkit's layout but with unique ShamBit branding and identity.

## Design Specifications

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] ShamBit                    [Search] [Cart] [Profile] │
│         A Bit of Goodness in Every Deal                      │
│                                                               │
│  [📍] Deliver to                                         [▼]  │
│      Home - 123 Main Street, Near Central Park               │
└─────────────────────────────────────────────────────────────┘
```

### Brand Name Styling

#### "ShamBit" Text
- **"Sham"**: Nokia-style blue gradient (similar to Google Gemini)
  - Start Color: `#0066CC` (Nokia Blue Start)
  - End Color: `#0099FF` (Nokia Blue End)
  - Font Weight: Bold
  - Font Size: 20sp

- **"Bit"**: Vibrant orange
  - Color: `#FF6B35` (Vibrant Orange)
  - Font Weight: Bold
  - Font Size: 20sp

#### Tagline
- Text: "A Bit of Goodness in Every Deal"
- Font Size: 10sp
- Color: OnSurfaceVariant (subtle gray)
- Style: Label Small

### Address Section

#### With Address
```
[📍] Deliver to                                              [▼]
     Home - 123 Main Street, Near Central Park
```
- Location icon in primary color
- Two-line layout:
  - Line 1: "Deliver to" (11sp, subtle)
  - Line 2: Address text (14sp, bold, truncated with ellipsis)
- Dropdown arrow on the right
- Background: SurfaceVariant with 50% alpha
- Rounded corners: 10dp
- Clickable to navigate to address selection

#### Without Address
```
[📍] Add Address                                             [▼]
     Select your delivery location
```
- Location icon in OnSurfaceVariant
- Two-line layout:
  - Line 1: "Add Address" (14sp, bold, primary color)
  - Line 2: "Select your delivery location" (11sp, subtle)
- Dropdown arrow on the right
- Same styling as with address
- Clickable to navigate to address selection

### Utility Icons

#### Search Icon
- Material Icon: `Icons.Default.Search`
- Size: 24dp
- Color: OnSurface
- Action: Navigate to search screen

#### Cart Icon
- Material Icon: `Icons.Default.ShoppingCart`
- Size: 24dp
- Color: OnSurface
- Badge: Shows item count (red background)
  - Displays "99+" for counts over 99
  - Font Size: 10sp, Bold
- Action: Navigate to cart screen

#### Profile Icon
- Material Icon: `Icons.Default.AccountCircle`
- Size: 24dp
- Color: OnSurface
- Action: Navigate to profile screen

## Features

### User Experience
1. **Clean & Modern**: Minimalist design with clear hierarchy
2. **Trustworthy**: Professional appearance suitable for e-commerce
3. **Friendly**: Warm colors and approachable typography
4. **Functional**: All essential actions accessible from header

### Interactions
1. **Haptic Feedback**: Light/medium impact on all interactions
2. **Address Click**: Opens address selection screen
3. **Search Click**: Opens search screen
4. **Cart Click**: Opens cart with item count badge
5. **Profile Click**: Opens user profile

### Responsive Design
- Adapts to light and dark themes
- Text truncation for long addresses
- Badge overflow handling (99+)
- Proper spacing and alignment

## Implementation

### Component Location
```
mobile_app/app/src/main/java/com/shambit/customer/ui/components/ShamBitHeader.kt
```

### Usage Example
```kotlin
ShamBitHeader(
    address = "Home - 123 Main Street, Near Central Park",
    cartItemCount = 3,
    onAddressClick = { /* Navigate to address selection */ },
    onSearchClick = { /* Navigate to search */ },
    onCartClick = { /* Navigate to cart */ },
    onProfileClick = { /* Navigate to profile */ },
    hapticFeedback = hapticFeedback
)
```

### Integration
The header is integrated into the HomeScreen and automatically:
- Loads the default delivery address from AddressRepository
- Updates cart item count from CartRepository
- Provides navigation callbacks for all actions

## Color Palette

### Nokia Blue Gradient (for "Sham")
- Inspired by Google Gemini's smooth gradient effect
- Creates a modern, tech-forward appearance
- Start: `#0066CC` → End: `#0099FF`

### Vibrant Orange (for "Bit")
- Energetic and friendly
- Creates visual contrast with blue
- Color: `#FF6B35`

### Supporting Colors
- Primary: Mint Green (`#10B981`) - for location icon when address is set
- Error: Red (`#EF4444`) - for cart badge
- Surface Variant: Light Gray - for address section background

## Comparison with Blinkit

### Similarities
- Clean, horizontal layout
- Address section prominently displayed
- Utility icons on the right
- Minimalist design approach

### Unique ShamBit Identity
- Custom gradient text effect for brand name
- Unique color scheme (blue + orange)
- Tagline integration
- Custom logo placement
- ShamBit-specific iconography

## Preview Variants

Three preview composables are available:
1. **With Address**: Shows full address display
2. **No Address**: Shows "Add Address" prompt
3. **Dark Theme**: Demonstrates dark mode compatibility

## Future Enhancements

Potential improvements:
1. Delivery time estimation display
2. Location permission prompt integration
3. Quick address switcher dropdown
4. Notification bell icon
5. Animated gradient effect on brand name
6. Search suggestions on header
7. Mini cart preview on hover/long-press

## Accessibility

- All icons have content descriptions
- Sufficient touch target sizes (40dp minimum)
- High contrast text and icons
- Semantic structure for screen readers
- Haptic feedback for tactile confirmation

## Performance

- Lightweight composable with minimal recomposition
- Efficient state management
- Optimized gradient rendering
- Lazy address loading
