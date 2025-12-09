# Implementation Plan

## Phase 1: Code Cleanup and Foundation (Critical)

- [x] 1. Delete legacy code and setup foundation





- [x] 1.1 Delete legacy HomeScreen.kt Activity file


  - Remove `mobile_app/app/src/main/java/com/shambit/customer/HomeScreen.kt`
  - Remove associated layout file `activity_home.xml` if exists
  - _Requirements: 2.1_

- [x] 1.2 Create DataState sealed class for composite UI state


  - Create `DataState.kt` with Loading, Success<T>, and Error states
  - Add helper methods: getDataOrNull(), isSuccess(), isError(), isLoading()
  - _Requirements: 2.4, 9.2_

- [x] 1.3 Create SubcategoryDto data model


  - Add id, name, parentCategoryId, imageUrl, displayOrder fields
  - _Requirements: 5.2, 5.4_

- [x] 1.4 Update CategoryDto with subcategory support


  - Add hasSubcategories: Boolean field
  - Add subcategories: List<SubcategoryDto>? field
  - _Requirements: 5.1, 5.3_

## Phase 2: Performance Optimization (Critical)

- [x] 2. Refactor scroll state management





- [x] 2.1 Move scroll offset to local Composable state

  - Remove updateScrollOffset() from HomeViewModel
  - Use rememberLazyListState() and derivedStateOf in HomeScreen
  - Only pass scrollDirection to ViewModel for bottom nav
  - _Requirements: 1.1_

- [x] 2.2 Implement parallel data loading in HomeViewModel


  - Refactor loadHomeData() to use coroutineScope with parallel launch blocks
  - Update loadHeroBanners(), loadFeaturedCategories(), loadPromotionalBanners(), loadFeaturedProducts()
  - _Requirements: 1.2_

- [x] 2.3 Implement composite UI state in HomeViewModel


  - Replace single error state with per-section DataState<T>
  - Update HomeUiState with heroBannersState, categoriesState, promotionalBannersState, featuredProductsState
  - Update all data loading methods to set per-section states
  - _Requirements: 1.3, 2.4, 9.2_

## Phase 3: Visual Polish and UX (High Priority)

- [x] 3. Implement skeleton screens





- [x] 3.1 Create skeleton components


  - Create `HomeScreenSkeleton.kt` with BannerSkeleton, CategorySkeleton, ProductGridSkeleton
  - Add shimmer animation effect
  - Use MaterialTheme.colorScheme.surfaceVariant for skeleton colors
  - _Requirements: 3.1, 9.3_

- [x] 3.2 Integrate skeleton screens into HomeScreen


  - Show skeletons when DataState is Loading
  - Replace generic LoadingState with section-specific skeletons
  - _Requirements: 3.1_

- [x] 3.3 Create professional empty state component


  - Create `EmptyProductsState.kt` with illustration, message, and "Try Again" button
  - Use Material Icons for illustration
  - _Requirements: 3.3_

- [x] 3.4 Implement optimistic cart updates


  - Add _optimisticCartQuantities StateFlow to HomeViewModel
  - Create addToCartOptimistic() method with immediate UI update
  - Merge optimistic and server state in displayCartQuantities
  - Add rollback logic on API failure
  - _Requirements: 3.2_

- [x] 3.5 Implement non-blocking error Snackbar


  - Add SnackbarHostState to HomeScreen
  - Show transient errors in Snackbar instead of blocking ErrorState
  - Add "Retry" action when applicable
  - _Requirements: 3.5_

## Phase 4: Image Handling Improvements (High Priority)

- [x] 4. Fix image display issues





- [x] 4.1 Fix banner aspect ratio in HeroBannerCarousel


  - Replace fixed height(200.dp) with aspectRatio(16f / 9f)
  - Change ContentScale.Crop to ContentScale.FillWidth
  - _Requirements: 4.1_

- [x] 4.2 Add image placeholders for banners


  - Create placeholder_banner.xml drawable
  - Add placeholder and error parameters to AsyncImage in BannerCard
  - _Requirements: 4.2_

- [x] 4.3 Fix category icon ContentScale


  - Change ContentScale.Crop to ContentScale.Fit in CategoryCard
  - Create ic_category_placeholder.xml drawable
  - Add placeholder and error parameters to AsyncImage
  - _Requirements: 4.3_

- [x] 4.4 Create product image placeholder


  - Create placeholder_product.xml drawable
  - _Requirements: 4.2, 8.2_

## Phase 5: Unified Product Display System (High Priority)

- [x] 5. Create reusable product components




- [x] 5.1 Create CartQuantityControl component


  - Create `CartQuantityControl.kt` with increment/decrement buttons
  - Add haptic feedback on button taps
  - Display quantity in center
  - _Requirements: 3.4, 8.2_

- [x] 5.2 Create unified ProductCard component

  - Create `ProductCard.kt` with image, name, price, discount, wishlist, cart controls
  - Add wishlist icon (filled/outline heart) in top-right corner
  - Show discount percentage prominently with bold styling
  - Use CartQuantityControl when cartQuantity > 0
  - Add haptic feedback for all interactions
  - _Requirements: 4.2, 4.5, 7.1, 7.2, 8.1, 8.2, 8.6_

- [x] 5.3 Create ProductCardSkeleton component

  - Create `ProductCardSkeleton.kt` matching ProductCard layout
  - Add shimmer animation
  - _Requirements: 8.3_

- [x] 5.4 Create ProductGrid component


  - Create `ProductGrid.kt` with LazyVerticalGrid using GridCells.Adaptive(160.dp)
  - Handle loading, empty, and success states
  - Use ProductCard for items
  - Use ProductGridSkeleton for loading
  - Use DefaultEmptyState for empty
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

## Phase 6: Wishlist Integration (High Priority)

- [x] 6. Integrate wishlist functionality




- [x] 6.1 Add wishlist state to HomeViewModel


  - Inject WishlistRepository
  - Create wishlistProductIds StateFlow from repository
  - Add toggleWishlist(product) method
  - Add snackbar message for wishlist actions
  - _Requirements: 7.1, 7.3_

- [x] 6.2 Update HomeScreen to pass wishlist state


  - Collect wishlistProductIds from ViewModel
  - Pass to all product display components
  - _Requirements: 7.2, 7.4_

- [x] 6.3 Integrate wishlist into FeaturedProductsSection


  - Update to use new ProductCard component
  - Pass wishlist state and toggle handler
  - _Requirements: 7.4_

## Phase 7: Category and Subcategory Separation (Medium Priority)

- [x] 7. Implement category hierarchy




- [x] 7.1 Update CategoryCard to show subcategory indicator


  - Add showSubcategoryIndicator parameter
  - Display arrow icon when category has subcategories
  - _Requirements: 5.3_

- [x] 7.2 Filter categories in CategorySection


  - Show only top-level categories on home screen
  - Filter out subcategories from display
  - _Requirements: 5.1_

- [x] 7.3 Create CategoryDetailScreen


  - Create `CategoryDetailScreen.kt` with category header
  - Display subcategories in LazyVerticalGrid with 3 columns
  - Add SubcategoryCard component
  - Navigate to product listing on subcategory click
  - _Requirements: 5.2, 5.4_

- [x] 7.4 Update navigation for category hierarchy


  - Navigate to CategoryDetailScreen when category has subcategories
  - Navigate directly to product listing when no subcategories
  - _Requirements: 5.5_

## Phase 8: Address Selection Fix (Medium Priority)

- [x] 8. Fix address selection navigation





- [x] 8.1 Update AddressSelectionScreen with return destination


  - Add returnDestination parameter (default "home")
  - Update navigation logic to return to correct screen
  - _Requirements: 6.3, 6.6_

- [x] 8.2 Update HomeScreen header address click


  - Pass "return=home" parameter when navigating to address selection
  - _Requirements: 6.1, 6.6_

- [x] 8.3 Implement "Set as Default" functionality


  - Add setDefaultAddress() method to AddressViewModel
  - Update UI to highlight default address
  - Call API to update default on server
  - _Requirements: 6.4_


- [x] 8.4 Add "Manage Addresses" navigation

  - Add button/link to navigate to address management screen
  - _Requirements: 6.5_

## Phase 9: String Resources and Localization (Medium Priority)

- [x] 9. Extract hardcoded strings






- [x] 9.1 Audit HomeScreen for hardcoded strings

  - Find all hardcoded text in HomeScreen.kt
  - Find all hardcoded text in HomeViewModel.kt
  - _Requirements: 2.2_


- [x] 9.2 Add missing strings to strings.xml

  - Add "Featured Products", "Shop by Category", "View All", etc.
  - Add error messages
  - Add empty state messages
  - Add wishlist messages
  - _Requirements: 2.2_


- [x] 9.3 Replace hardcoded strings with string resources

  - Update all UI components to use stringResource()
  - Update ViewModel to use context.getString() where needed
  - _Requirements: 2.2_

## Phase 10: Production Readiness (Critical)

- [x] 10. Ensure production stability





- [x] 10.1 Create proguard-rules.pro file


  - Add @Keep annotations or rules for all DTO classes
  - Add rules for BannerDto, CategoryDto, ProductDto, AddressDto, CartDto, etc.
  - _Requirements: 2.3, 9.4_

- [x] 10.2 Fix TokenAuthenticator runBlocking usage


  - Review current runBlocking usage in TokenAuthenticator.kt
  - Ensure safe usage (only for synchronous reads)
  - Use GlobalScope.launch for async saves
  - _Requirements: 9.1_


- [x] 10.3 Audit for hardcoded colors

  - Find all Color.X usages in home screen components
  - Replace with MaterialTheme.colorScheme tokens
  - _Requirements: 9.3_


- [x] 10.4 Test dark mode compatibility

  - Verify all colors use theme tokens
  - Test home screen in dark mode
  - _Requirements: 9.3_

## Phase 11: Final Integration and Testing

- [x] 11. Integration and validation







- [x] 11.1 Test parallel loading




  - Verify all sections load simultaneously
  - Test with network throttling
  - _Requirements: 1.2_


- [ ] 11.2 Test error resilience
  - Mock individual API failures
  - Verify other sections still load
  - Verify appropriate error handling
  - _Requirements: 1.3, 2.4_


- [ ] 11.3 Test optimistic cart updates
  - Verify immediate UI response
  - Test rollback on API failure

  - _Requirements: 3.2_

- [ ] 11.4 Test wishlist across all screens
  - Verify consistent state on home, category, search, detail

  - Test add/remove operations
  - _Requirements: 7.2, 7.4_

- [x] 11.5 Test address selection flow

  - Verify navigation returns to home screen
  - Test set default functionality
  - _Requirements: 6.3, 6.4, 6.6_


- [ ] 11.6 Test category hierarchy
  - Verify only top-level categories on home
  - Test navigation to subcategories
  - _Requirements: 5.1, 5.2_


- [ ] 11.7 Perform scroll performance testing
  - Verify 60 FPS scrolling
  - Test with large product lists


  - _Requirements: 1.1_

- [ ] 11.8 Test release build with Proguard
  - Build release APK
  - Verify no crashes from obfuscation
  - Test all API calls work correctly
  - _Requirements: 2.3, 9.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
