# ShamBit Header - Visual Design Guide

## Header Appearance

### Light Theme - With Address
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  [🌸]  Sham Bit                    🔍  🛒³  👤               ║
║        ▔▔▔▔ ▔▔▔                                              ║
║        A Bit of Goodness in Every Deal                       ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📍  Deliver to                                       ▼  │ ║
║  │     Home - 123 Main Street, Near Central Park          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Colors:
- "Sham": Blue gradient (#0066CC → #0099FF) ████████
- "Bit": Vibrant orange (#FF6B35) ████████
- Tagline: Gray (#6B7280) ████████
- Location icon: Mint green (#10B981) ████████
- Cart badge: Red (#EF4444) with white text ████████
```

### Light Theme - No Address
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  [🌸]  Sham Bit                    🔍  🛒  👤                ║
║        ▔▔▔▔ ▔▔▔                                              ║
║        A Bit of Goodness in Every Deal                       ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📍  Add Address                                      ▼  │ ║
║  │     Select your delivery location                       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Colors:
- "Add Address": Mint green (#10B981) - Primary color
- Location icon: Gray (#6B7280) - OnSurfaceVariant
```

### Dark Theme - With Address
```
╔═══════════════════════════════════════════════════════════════╗
║                        DARK MODE                              ║
║  [🌸]  Sham Bit                    🔍  🛒⁵  👤               ║
║        ▔▔▔▔ ▔▔▔                                              ║
║        A Bit of Goodness in Every Deal                       ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📍  Deliver to                                       ▼  │ ║
║  │     Office - 456 Business Ave, Tower B                 │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Colors:
- Background: Dark surface (#111827) ████████
- Text: Light gray (#F9FAFB) ████████
- "Sham": Blue gradient (same as light)
- "Bit": Vibrant orange (same as light)
```

## Typography Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Logo (40dp)   ShamBit (20sp, Bold)          Icons (24dp)  │
│                ▔▔▔▔▔▔▔                                     │
│                Tagline (10sp, Regular)                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Icon  Label (11sp, Regular)                    Arrow │ │
│  │ (20dp) Address (14sp, SemiBold)               (20dp) │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Spacing & Dimensions

```
Vertical Spacing:
├─ Status Bar Padding (system)
├─ 12dp padding top
├─ Logo Row (56dp height)
│  ├─ Logo: 40dp × 40dp
│  ├─ 10dp gap
│  ├─ Brand Name Column
│  │  ├─ ShamBit text (20sp)
│  │  └─ Tagline (10sp)
│  └─ Icons Row (right aligned)
│     ├─ Search icon (40dp touch target)
│     ├─ Cart icon (40dp touch target)
│     └─ Profile icon (40dp touch target)
├─ 12dp gap
├─ Address Section
│  ├─ 10dp padding vertical
│  ├─ 12dp padding horizontal
│  ├─ Location icon (20dp)
│  ├─ 8dp gap
│  ├─ Address text (flexible width)
│  └─ Arrow icon (20dp)
└─ 12dp padding bottom

Total Height: ~140dp (without status bar)
```

## Interactive States

### Address Section States

#### Default State
```
┌─────────────────────────────────────────────────────────┐
│ 📍  Deliver to                                       ▼ │
│     Home - 123 Main Street, Near Central Park          │
└─────────────────────────────────────────────────────────┘
Background: SurfaceVariant (50% alpha)
```

#### Pressed State
```
┌─────────────────────────────────────────────────────────┐
│ 📍  Deliver to                                       ▼ │
│     Home - 123 Main Street, Near Central Park          │
└─────────────────────────────────────────────────────────┘
Background: SurfaceVariant (70% alpha)
Haptic: Light impact
```

### Cart Badge States

#### Empty Cart
```
🛒
No badge shown
```

#### 1-99 Items
```
🛒³
Badge shows exact count
```

#### 100+ Items
```
🛒⁹⁹⁺
Badge shows "99+"
```

## Gradient Effect Details

### "Sham" Text Gradient
```
S h a m
█ █ █ █
│ │ │ └─ #0099FF (Light blue)
│ │ └─── #0088EE
│ └───── #0077DD
└─────── #0066CC (Nokia blue)

Direction: Left to right
Type: Linear gradient
Smooth transition between colors
```

### Visual Comparison

#### Standard Text (No Gradient)
```
Sham
████ (Solid color)
```

#### With Gradient (ShamBit Style)
```
Sham
▓▓▒▒ (Gradient effect)
```

## Responsive Behavior

### Long Address Handling
```
Normal:
┌─────────────────────────────────────────────────────────┐
│ 📍  Deliver to                                       ▼ │
│     Home - 123 Main Street                             │
└─────────────────────────────────────────────────────────┘

Long Address:
┌─────────────────────────────────────────────────────────┐
│ 📍  Deliver to                                       ▼ │
│     Home - 123 Main Street, Near Central Park, Apt...  │
└─────────────────────────────────────────────────────────┘
Text truncated with ellipsis (...)
```

### Small Screen Adaptation
```
On smaller screens:
- Logo size: 36dp (reduced from 40dp)
- Brand name: 18sp (reduced from 20sp)
- Icons: 22dp (reduced from 24dp)
- Maintains proportions and readability
```

## Animation Opportunities

### Potential Animations (Future Enhancement)

1. **Gradient Shimmer**
```
Sham
▓▓▒▒ → ▒▓▓▒ → ▒▒▓▓ → ▒▒▒▓
Subtle shimmer effect on brand name
```

2. **Address Change**
```
Old Address → Fade Out → Fade In ← New Address
Smooth transition when address changes
```

3. **Cart Badge Pop**
```
🛒² → 🛒³
Scale animation when count increases
```

## Accessibility Features

### Screen Reader Announcements
```
Logo: "ShamBit Logo"
Brand Name: "ShamBit - A Bit of Goodness in Every Deal"
Address: "Deliver to Home - 123 Main Street, Near Central Park"
Search: "Search"
Cart: "Shopping Cart with 3 items"
Profile: "Profile"
```

### Touch Targets
```
All interactive elements: Minimum 40dp × 40dp
- Ensures easy tapping
- Meets accessibility guidelines
- Comfortable for all users
```

## Design Inspiration

### Blinkit Elements
- Clean horizontal layout ✓
- Address prominence ✓
- Utility icons on right ✓
- Minimalist approach ✓

### ShamBit Unique Identity
- Custom gradient brand name ✓
- Blue + Orange color scheme ✓
- Integrated tagline ✓
- Lotus logo integration ✓
- "Goodness" messaging ✓

## Implementation Notes

### Gradient Implementation
```kotlin
Text(
    text = buildAnnotatedString {
        withStyle(
            style = SpanStyle(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF0066CC), // Nokia blue start
                        Color(0xFF0099FF)  // Nokia blue end
                    )
                ),
                fontWeight = FontWeight.Bold
            )
        ) {
            append("Sham")
        }
        withStyle(
            style = SpanStyle(
                color = Color(0xFFFF6B35), // Vibrant orange
                fontWeight = FontWeight.Bold
            )
        ) {
            append("Bit")
        }
    }
)
```

### Address Formatting
```kotlin
fun formatAddressForHeader(address: AddressDto): String {
    return buildString {
        if (!address.label.isNullOrBlank()) {
            append(address.label)
            append(" - ")
        }
        append(address.street)
        if (!address.landmark.isNullOrBlank()) {
            append(", ")
            append(address.landmark)
        }
    }
}
```

## Testing Checklist

- [ ] Light theme rendering
- [ ] Dark theme rendering
- [ ] With address display
- [ ] Without address display
- [ ] Cart badge (0, 1-99, 100+ items)
- [ ] Long address truncation
- [ ] All icon interactions
- [ ] Haptic feedback
- [ ] Navigation callbacks
- [ ] Screen reader compatibility
- [ ] Touch target sizes
- [ ] Gradient rendering
- [ ] Responsive layout
