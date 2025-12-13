# Implementation Plan

## Overview
This implementation plan converts the approved design into actionable coding tasks that extend the existing ShamBit home screen with premium features. Each task builds incrementally on the solid existing foundation while adding subcategory chips, vertical product feed, infinite scroll, and enhanced animations.

## Task List

- [x] 1. Extend data models and API integration





  - Create new data models for subcategories, product feed, and type-safe filters
  - Extend existing ProductRepository with new API methods
  - Add API conversion helpers for clean backend integration
  - _Requirements: 15.1, 15.2, 15.3, 17.1, 17.2_

- [x] 1.1 Create enhanced data models


  - Write SubcategoryDto, ProductFeedResponse, and AppliedFilterValue sealed interface
  - Create SortOption enum with predefined sort types
  - Add FilterOption data class for API-driven filter configuration
  - _Requirements: 15.1, 17.1_



- [x] 1.2 Extend ProductRepository with new methods

  - Add getSubcategories() method for category-based subcategory loading
  - Implement getProductFeed() with cursor pagination and filtering support
  - Create getFilterOptions() method for dynamic filter configuration


  - _Requirements: 15.2, 15.4_

- [x] 1.3 Implement API conversion helpers

  - Create AppliedFilterValue.toApiValue() extension function

  - Add convertFiltersForApi() helper in repository layer
  - Ensure clean JSON format for backend consumption
  - _Requirements: 17.4_

- [x] 1.4 Write property tests for data model consistency

  - **Property 1: Filter conversion round trip**
  - **Validates: Requirements 17.4**

- [x] 2. Extend HomeViewModel state management
  - Add new state fields to existing HomeUiState
  - Implement subcategory selection and tracking logic
  - Create filter and sort state management
  - Extend existing scroll tracking for sticky bar behavior
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2.1 Extend HomeUiState with new fields
  - Add subcategoriesState, selectedSubcategoryId, and verticalProductFeedState
  - Include sortFilterState, showStickyBar, and infinite scroll state
  - Add filter-related state fields maintaining existing patterns
  - _Requirements: 1.1, 2.1_

- [x] 2.2 Implement subcategory selection logic
  - Create subcategory loading and selection methods
  - Extend existing category tap tracking to include subcategories
  - Add haptic feedback integration using existing HapticFeedbackManager
  - _Requirements: 1.2, 1.5_

- [x] 2.3 Add filter and sort state management
  - Implement filter application and clearing logic
  - Create sort option selection and state updates
  - Add bottom sheet visibility management for filters
  - _Requirements: 2.4, 2.5_

- [x] 2.4 Extend scroll tracking for sticky bar
  - Add sticky bar visibility logic based on scroll position
  - Implement scroll-to-top button visibility (index >= 10 threshold)
  - Integrate with existing scroll direction tracking
  - _Requirements: 2.1, 2.2, 12.1_

- [x] 2.5 Write property tests for state management
  - **Property 2: Subcategory selection consistency**
  - **Validates: Requirements 1.2**

- [x] 3. Create new UI components




  - Build SubcategoryChipsSection with animations and haptic feedback
  - Implement StickyFilterBar with scroll-aware behavior
  - Create VerticalProductCard extending existing product card patterns
  - Add ScrollToTopButton with smooth animations
  - _Requirements: 1.1, 2.1, 3.1, 12.1_

- [x] 3.1 Build SubcategoryChipsSection component


  - Create horizontally scrollable chip layout
  - Implement chip selection animations (scale + elevation)
  - Add haptic feedback using existing HapticFeedbackManager
  - Include skeleton loading states using existing shimmer patterns
  - _Requirements: 1.1, 1.4, 5.3_

- [x] 3.2 Implement StickyFilterBar component


  - Create scroll-aware filter bar with smooth show/hide animations
  - Add filter count calculation logic (total selected filter values)
  - Implement sort and filter button interactions
  - Extend existing scroll animation patterns (160-200ms duration)
  - _Requirements: 2.1, 2.2, 2.3, 5.1_

- [x] 3.3 Create VerticalProductCard component


  - Design premium vertical product card layout
  - Add returnability status, delivery estimate, and trust badges
  - Integrate existing cart controls and wishlist functionality
  - Include fade-in animations for new product appearances
  - _Requirements: 3.1, 3.2, 5.2, 8.1, 8.2, 13.1_

- [x] 3.4 Add ScrollToTopButton component


  - Create floating scroll-to-top button with accessibility support
  - Implement smooth scroll-to-top animation using existing patterns
  - Add fade show/hide animations based on scroll position
  - Ensure 48dp minimum touch target for accessibility
  - _Requirements: 12.1, 12.2, 12.3, 14.1_

- [x] 3.5 Write property tests for UI component behavior




  - **Property 3: Chip selection visual feedback**
  - **Validates: Requirements 1.4**

- [x] 4. Implement infinite scroll and pagination





  - Add cursor-based pagination logic to existing LazyColumn
  - Create loading more indicators using existing skeleton system
  - Implement error handling and retry for pagination failures
  - Add polite branding footer when pagination completes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 11.2_

- [x] 4.1 Implement cursor-based pagination


  - Add load more trigger at 80% scroll position
  - Integrate cursor token management with API calls
  - Implement has_more flag handling to stop pagination
  - Extend existing error handling patterns for pagination failures
  - _Requirements: 4.1, 4.3, 11.2_


- [x] 4.2 Create loading more indicators

  - Add skeleton loading cards for pagination using existing shimmer system
  - Implement smooth loading state transitions
  - Create error state with retry button for pagination failures
  - _Requirements: 4.2, 11.2_

- [x] 4.3 Add polite branding footer


  - Create "Made with ❤️ by ShamBit" footer component
  - Display when has_more is false from API
  - Style with soft gray color and center alignment
  - _Requirements: 4.4_

- [x] 4.4 Write property tests for pagination consistency


  - **Property 4: Pagination order preservation**
  - **Validates: Requirements 4.1**

- [x] 5. Integrate new sections into existing HomeContent





  - Add subcategory chips section after existing promotional banners
  - Insert sticky filter bar with proper z-index and positioning
  - Include vertical product feed section with infinite scroll
  - Maintain existing pull-to-refresh functionality for all sections
  - _Requirements: 1.1, 2.1, 3.1, 7.3_

- [x] 5.1 Add subcategory chips to HomeContent LazyColumn


  - Insert SubcategoryChipsSection after promotional banners
  - Integrate with existing DataState loading patterns
  - Add proper spacing and visual hierarchy
  - _Requirements: 1.1_

- [x] 5.2 Integrate sticky filter bar


  - Add StickyFilterBar as overlay component in HomeScreen
  - Implement proper z-index positioning above content
  - Connect to existing scroll tracking system
  - _Requirements: 2.1, 2.2_

- [x] 5.3 Add vertical product feed section


  - Insert vertical product feed after existing featured products
  - Implement infinite scroll within existing LazyColumn structure
  - Integrate with existing cart and wishlist state management
  - _Requirements: 3.1, 4.1_

- [x] 5.4 Extend pull-to-refresh for new sections


  - Include subcategory and product feed refresh in existing refreshHomeData()
  - Maintain existing refresh success/error handling patterns
  - Add "Refreshing your feed ✨" message support
  - _Requirements: 7.3, 10.1_

- [x] 6. Implement filter bottom sheet





  - Create filter options bottom sheet with API-driven content
  - Add filter selection and application logic
  - Implement filter clearing and reset functionality
  - Integrate with existing bottom sheet animation patterns
  - _Requirements: 2.4, 2.5, 5.4_

- [x] 6.1 Create FilterBottomSheet component


  - Build dynamic filter UI based on API-provided FilterOption list
  - Implement multi-select, range, and single-value filter types
  - Add filter validation and type-safe application
  - Use existing bottom sheet slide animations and background dimming
  - _Requirements: 2.4, 5.4_

- [x] 6.2 Implement filter application logic


  - Create filter selection and deselection handling
  - Add "Apply Filters" and "Clear All" functionality
  - Integrate with existing product feed reload logic
  - _Requirements: 2.5_

- [x] 6.3 Write property tests for filter logic


  - **Property 5: Filter application consistency**
  - **Validates: Requirements 2.5**

- [x] 7. Add enhanced animations and micro-interactions





  - Implement premium animations for all new components
  - Extend existing scroll animations for sticky bar behavior
  - Add micro-interactions for chip selection and product card entry
  - Ensure smooth performance without visible frame drops
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 7.1 Implement chip selection animations


  - Add scale and elevation animations for chip interactions
  - Create smooth color transitions for active/inactive states
  - Integrate haptic feedback timing with visual animations
  - _Requirements: 5.3_

- [x] 7.2 Add product card entry animations


  - Implement fade-in + slide-up animations for new products
  - Create staggered animation timing for multiple cards
  - Ensure animations don't impact scroll performance
  - _Requirements: 5.2_

- [x] 7.3 Extend sticky bar animations


  - Enhance existing scroll-aware animations for sticky bar
  - Add smooth show/hide transitions (160-200ms duration)
  - Integrate with existing header/bottom navigation animation system
  - _Requirements: 5.1_

- [x] 7.4 Write performance tests for combined animations


  - Test simultaneous animations (sticky bar + chip selection + product fade-in)
  - Validate frame drop monitoring and performance thresholds
  - _Requirements: 5.5_

- [x] 8. Implement comprehensive error handling








  - Add error states for subcategory loading failures
  - Create retry mechanisms for product feed and filter failures
  - Implement empty states for subcategories and filtered results
  - Extend existing error handling patterns with new messaging
  - _Requirements: 10.2, 10.5, 11.1, 11.3, 11.4_


- [x] 8.1 Add subcategory error handling


  - Create fallback chips with retry option for subcategory loading failures
  - Add empty state for categories with no subcategories
  - Implement "No products here yet — explore other categories" messaging
  - _Requirements: 10.5, 11.3_



- [x] 8.2 Implement product feed error handling





  - Add full-width retry button for initial product feed failures
  - Create error messaging for filter application failures
  - Add "Nothing matched — try adjusting filters" empty state


  - _Requirements: 10.2, 11.1_

- [x] 8.3 Add network connectivity handling
  - Implement offline messaging using existing patterns
  - Add graceful degradation for malformed API responses
  - Extend existing retry mechanisms for new API endpoints
  - _Requirements: 11.4, 11.5_

- [x] 9. Enhance accessibility and performance
  - Ensure all new components meet accessibility requirements
  - Implement memory-safe image loading for vertical product cards
  - Add performance monitoring for long product lists
  - Optimize scroll position restoration for tab switches
  - _Requirements: 9.1, 9.2, 9.3, 9.5, 14.1, 14.2, 14.3_

- [x] 9.1 Implement accessibility enhancements
  - Add descriptive labels for screen readers on SubcategoryChip components (ScrollToTopButton already has proper semantics)
  - Ensure sufficient color contrast ratios for new UI elements
  - Implement proper focus management for filter bottom sheet
  - Verify 48dp minimum touch targets are met (ScrollToTopButton: 56dp ✓, others need verification)
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 9.2 Add memory-safe image loading
  - Implement image size limits (300x300dp max) for vertical product cards with ImageRequest.Builder
  - Add memoryCachePolicy and diskCachePolicy to AsyncImage in VerticalProductCard
  - Add memory-efficient caching using existing image loading patterns
  - Create bitmap memory monitoring and cleanup logic
  - _Requirements: 9.2, 9.3_

- [x] 9.3 Implement performance optimizations





  - Add prefetching for next cursor batch when beneficial
  - Optimize LazyColumn recycling for long product lists
  - Implement scroll position restoration for tab switches
  - _Requirements: 9.4, 9.5_

- [x] 9.4 Write performance tests for memory usage





  - Test memory consumption with 100+ products loaded
  - Validate image loading performance and memory cleanup
  - _Requirements: 9.2, 9.3_

- [x] 10. Add analytics and user interaction tracking





  - Extend existing analytics to track new feature usage
  - Implement subcategory interaction frequency tracking (basic tracking exists, needs batching)
  - Add filter usage and infinite scroll engagement metrics
  - Create batched analytics with proper sampling
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 10.1 Complete subcategory interaction tracking


  - Implement AnalyticsBatcher class with BATCH_SIZE=10 and FLUSH_INTERVAL=30s
  - Enhance existing trackSubcategoryTap method to use batched analytics
  - Add interaction frequency data for adaptive chip ordering
  - _Requirements: 18.1_


- [x] 10.2 Add filter and scroll analytics

  - Track filter usage patterns and popular combinations using AnalyticsBatcher
  - Monitor infinite scroll engagement and pagination performance
  - Implement product impression tracking with batching
  - _Requirements: 18.2, 18.3_


- [x] 10.3 Write property tests for analytics batching

  - **Property 6: Analytics batch size consistency**
  - **Validates: Requirements 18.4**

- [ ] 11. Final integration and testing





  - Ensure all new features integrate seamlessly with existing functionality
  - Test complete user flows from subcategory selection to purchase
  - Validate scroll position restoration and state management
  - Perform comprehensive error scenario testing
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2_

- [x] 11.1 Integration testing with existing features


  - Test cart operations from vertical product feed with existing optimistic updates
  - Validate wishlist functionality across all new product card types
  - Ensure address changes update delivery estimates in new sections
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 11.2 Complete user flow testing


  - Test end-to-end flow: load home → select subcategory → apply filters → scroll → add to cart
  - Validate navigation preservation and scroll position restoration
  - Test pull-to-refresh behavior across all sections
  - _Requirements: 7.1, 7.2, 7.3_


- [x] 11.3 Error scenario comprehensive testing

  - Test all error states with retry mechanisms
  - Validate graceful degradation for API failures
  - Ensure no crashes with malformed responses
  - _Requirements: 7.4, 11.5_

- [ ] 12. Checkpoint - Ensure all tests pass, ask the user if questions arise
  - Verify all property-based tests pass with sufficient iterations
  - Confirm performance benchmarks meet target metrics
  - Validate accessibility compliance across all new features
  - Test on low-end devices for animation and memory performance