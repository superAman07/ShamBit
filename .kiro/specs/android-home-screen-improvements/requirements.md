# Requirements Document

## Introduction

This document outlines the requirements for critical improvements to the ShamBit Android app home screen. The improvements focus on performance optimization, user experience enhancements, visual polish, and architectural robustness. These changes address identified issues in scroll performance, data loading, error handling, visual feedback, and production readiness. The scope is limited to high-impact, low-cost fixes that can be implemented without over-engineering or increasing hosting costs.

## Glossary

- **HomeScreen**: The main Jetpack Compose screen displaying banners, categories, and products
- **HomeViewModel**: The ViewModel managing home screen state and business logic
- **LazyColumn**: Jetpack Compose's lazy-loading vertical list component
- **Recomposition**: Jetpack Compose's process of re-rendering UI when state changes
- **Proguard/R8**: Android code obfuscation and optimization tools
- **Skeleton Screen**: Loading placeholder that mimics the final UI structure
- **Haptic Feedback**: Vibration feedback for user interactions
- **AsyncImage**: Coil library component for asynchronous image loading
- **ContentScale**: Image scaling strategy (Crop, Fit, FillWidth, etc.)
- **DTO**: Data Transfer Object - classes for API response/request data
- **Snackbar**: Material Design component for brief messages at bottom of screen
- **ANR**: Application Not Responding - Android system dialog shown when app freezes
- **Category**: Top-level product grouping (e.g., "Dry Fruits")
- **Subcategory**: Second-level product grouping under a category (e.g., "Almonds", "Figs")
- **Default Address**: The primary delivery address selected by the user for orders
- **Wishlist**: User's saved list of favorite products for future purchase

## Requirements

### Requirement 1: Performance Optimization

**User Story:** As a user, I want the home screen to scroll smoothly without lag, so that I can browse products efficiently.

#### Acceptance Criteria

1. WHEN the user scrolls the home screen THEN the system SHALL update scroll offset using local state without triggering ViewModel recomposition
2. WHEN loading home data THEN the system SHALL fetch banners, categories, and products in parallel using async coroutines
3. WHEN one data source fails THEN the system SHALL continue loading other data sources independently
4. WHEN the user opens the home screen THEN the system SHALL display cached data within 100 milliseconds if available

### Requirement 2: Code Quality and Maintainability

**User Story:** As a developer, I want clean and maintainable code, so that I can easily understand and modify the home screen.

#### Acceptance Criteria

1. WHEN the codebase contains duplicate HomeScreen implementations THEN the system SHALL remove the legacy Activity-based HomeScreen.kt file
2. WHEN displaying text to users THEN the system SHALL use string resources from strings.xml instead of hardcoded strings
3. WHEN the app is built for release THEN the system SHALL include Proguard rules to prevent DTO obfuscation
4. WHEN handling errors THEN the system SHALL use distinct error states for each data section rather than all-or-nothing loading

### Requirement 3: Visual User Experience

**User Story:** As a user, I want polished visual feedback and loading states, so that the app feels premium and responsive.

#### Acceptance Criteria

1. WHEN the home screen is loading THEN the system SHALL display skeleton screens matching the final layout structure
2. WHEN the user adds a product to cart THEN the system SHALL update the UI counter immediately before server confirmation
3. WHEN no products are available THEN the system SHALL display an illustration with a "Try Again" button
4. WHEN the user taps "Add to Cart" or wishlist THEN the system SHALL provide haptic feedback
5. WHEN a network error occurs THEN the system SHALL display a non-blocking Snackbar while keeping existing content visible

### Requirement 4: Image and Content Display

**User Story:** As a user, I want images and content to display correctly across different screen sizes, so that I can see all promotional information clearly.

#### Acceptance Criteria

1. WHEN displaying hero banners THEN the system SHALL use dynamic aspect-ratio sizing or ContentScale.FillWidth to prevent text cropping
2. WHEN an image fails to load THEN the system SHALL display a placeholder icon for banners and products
3. WHEN displaying category icons THEN the system SHALL use ContentScale.Fit to prevent logo clipping
4. WHEN viewing featured products horizontally THEN the system SHALL provide a "View All" button that opens a vertical grid layout
5. WHEN displaying product discounts THEN the system SHALL show discount percentage prominently with bold styling

### Requirement 5: Category and Subcategory Display

**User Story:** As a user, I want to see categories and subcategories displayed separately, so that I can easily navigate the product hierarchy.

#### Acceptance Criteria

1. WHEN displaying categories on the home screen THEN the system SHALL show only top-level categories without mixing subcategories
2. WHEN a user taps a category THEN the system SHALL navigate to a category detail screen showing subcategories separately
3. WHEN a category has subcategories THEN the system SHALL display a visual indicator (e.g., arrow icon) on the category card
4. WHEN displaying subcategories THEN the system SHALL show them in a separate section below the category header
5. WHEN a category has no subcategories THEN the system SHALL navigate directly to the product listing for that category

### Requirement 6: Address Selection and Management

**User Story:** As a user, I want to select and manage my delivery addresses from the home screen, so that I can easily change my delivery location without navigating to cart.

#### Acceptance Criteria

1. WHEN a user taps the address on the home screen header THEN the system SHALL navigate to the address selection screen
2. WHEN viewing the address selection screen THEN the system SHALL display all saved addresses with the default address highlighted
3. WHEN a user selects an address THEN the system SHALL set it as the active delivery address and navigate back to the home screen
4. WHEN a user taps "Set as Default" on an address THEN the system SHALL mark that address as default and update the server
5. WHEN a user taps "Manage Addresses" THEN the system SHALL navigate to the address management screen with options to add, edit, or delete addresses
6. WHEN returning from address selection THEN the system SHALL navigate back to the home screen and not to the cart screen

### Requirement 7: Wishlist Functionality

**User Story:** As a user, I want to add any product to my wishlist from anywhere in the app, so that I can save items for later purchase.

#### Acceptance Criteria

1. WHEN a user taps the wishlist icon on any product card THEN the system SHALL add the product to the wishlist and provide visual feedback
2. WHEN a product is already in the wishlist THEN the system SHALL display a filled heart icon instead of an outline
3. WHEN a user taps the wishlist icon on a wishlisted product THEN the system SHALL remove it from the wishlist
4. WHEN adding to wishlist THEN the system SHALL work on featured products, category products, search results, and product detail screens
5. WHEN wishlist operations fail THEN the system SHALL display an error message and revert the UI state

### Requirement 8: Professional Product Display

**User Story:** As a user, I want to see products displayed professionally throughout the app, so that I have a consistent and high-quality shopping experience.

#### Acceptance Criteria

1. WHEN displaying products THEN the system SHALL use a consistent product card design across home screen, categories, search, and wishlist
2. WHEN showing product information THEN the system SHALL display product image, name, price, discount, and wishlist/cart actions
3. WHEN products are loading THEN the system SHALL display skeleton screens instead of spinners or blank spaces
4. WHEN no products are found THEN the system SHALL display a professional empty state with illustration and helpful message
5. WHEN displaying product grids THEN the system SHALL use responsive layouts that adapt to different screen sizes
6. WHEN showing product prices THEN the system SHALL clearly display original price, discounted price, and savings percentage

### Requirement 9: Architecture and Security

**User Story:** As a system architect, I want robust error handling and safe async operations, so that the app remains stable in production.

#### Acceptance Criteria

1. WHEN refreshing auth tokens THEN the system SHALL avoid using runBlocking on Flow operations to prevent ANR
2. WHEN multiple data sources fail THEN the system SHALL use composite UI state where each section has independent Result<T> status
3. WHEN the app is in dark mode THEN the system SHALL use MaterialTheme.colorScheme tokens exclusively without hardcoded colors
4. WHEN building for release THEN the system SHALL include @Keep annotations or Proguard rules for all DTO classes
