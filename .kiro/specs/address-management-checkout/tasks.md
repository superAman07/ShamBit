# Implementation Plan: Address Management & Checkout Address Flow

## Overview

This implementation plan breaks down the address management and checkout address flow feature into discrete, manageable coding tasks. Each task builds incrementally on previous steps, with property-based tests placed close to implementation to catch errors early.

---

## Tasks

- [x] 1. Set up domain models and validation





  - Create Address domain model with all required fields
  - Create AddressType enum with HOME, WORK, OTHER values
  - Implement AddressValidator with validation methods for all fields
  - Create ValidationResult sealed class
  - _Requirements: 1.1, 1.5, 1.6, 1.7_

- [x] 1.1 Write property test for phone validation






  - **Property 3: Phone Number Validation**
  - **Validates: Requirements 1.6**

- [x] 1.2 Write property test for pincode validation






  - **Property 4: Pincode Validation**
  - **Validates: Requirements 1.7**

- [x] 1.3 Write property test for required field validation






  - **Property 5: Required Field Validation**
  - **Validates: Requirements 1.5**

- [x] 2. Implement data layer - Repository and API integration





  - Create AddressRepository interface with all CRUD operations
  - Implement AddressRepositoryImpl using ProfileApi
  - Add mapper functions to convert between AddressDto and Address domain model
  - Implement error handling with NetworkResult wrapper
  - _Requirements: 1.1, 2.1, 3.2, 3.3, 4.2_

- [x] 2.1 Write property test for address creation



  - **Property 2: Address Creation Success**
  - **Validates: Requirements 1.1**



- [ ]* 2.2 Write property test for address update preservation
  - **Property 7: Address Update Preservation**
  - **Validates: Requirements 2.1**

- [x] 3. Implement address caching layer





  - Create AddressCache interface for local caching
  - Implement AddressCacheImpl using DataStore or Room
  - Add methods to cache, retrieve, update, and clear addresses
  - Implement getDefaultAddress() method
  - _Requirements: 4.1, 4.3_

- [x] 4. Create domain use cases





  - Implement GetAddressesUseCase with cache-first strategy
  - Implement AddAddressUseCase with validation
  - Implement UpdateAddressUseCase with validation
  - Implement DeleteAddressUseCase with default handling logic
  - Implement SetDefaultAddressUseCase
  - Implement GetCheckoutAddressUseCase
  - Implement SelectCheckoutAddressUseCase
  - Implement LockCheckoutAddressUseCase
  - _Requirements: 1.1, 2.1, 3.2, 3.3, 4.1, 7.4_

- [ ]* 4.1 Write property test for single default address invariant
  - **Property 1: Single Default Address Invariant**
  - **Validates: Requirements 1.3, 2.2, 4.1, 4.2, 4.5**

- [ ]* 4.2 Write property test for default address deletion
  - **Property 12: Default Address Deletion with Alternatives**
  - **Validates: Requirements 3.3, 11.5**

- [ ]* 4.3 Write property test for non-default address deletion
  - **Property 11: Non-Default Address Deletion**
  - **Validates: Requirements 3.2**

- [x] 5. Implement AddressViewModel for Manage Address screen





  - Create AddressViewModel with StateFlow for address list
  - Implement loadAddresses() method
  - Implement setDefaultAddress() method with single default invariant
  - Implement deleteAddress() method with confirmation state
  - Implement refreshAddresses() method
  - Create AddressListState sealed class (Loading, Success, Error, Empty)
  - Create OperationState sealed class for operation feedback
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 6.1, 6.3, 6.5_

- [ ]* 5.1 Write property test for delete confirmation display
  - **Property 10: Delete Confirmation Display**
  - **Validates: Requirements 3.1**

- [ ]* 5.2 Write property test for operation toast notification
  - **Property 20: Address Operation Toast Notification**
  - **Validates: Requirements 6.3**

- [x] 6. Implement AddAddressViewModel for Add/Edit form





  - Create AddAddressViewModel with AddressFormState
  - Implement form field update methods (name, phone, address, city, pincode, type, isDefault)
  - Implement real-time validation with validationErrors StateFlow
  - Implement saveAddress() method with validation
  - Implement loadAddress() for edit mode
  - Handle first address auto-default logic
  - Handle default address switching logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4_

- [ ]* 6.1 Write property test for save operation feedback
  - **Property 6: Save Operation Feedback**
  - **Validates: Requirements 1.4, 2.4**

- [ ]* 6.2 Write property test for default status preservation during edit
  - **Property 8: Default Status Preservation During Edit**
  - **Validates: Requirements 2.3**

- [x] 7. Implement CheckoutViewModel with address management





  - Create CheckoutViewModel with checkout state management
  - Add selectedAddress StateFlow
  - Add cartItems StateFlow
  - Add addressLockState StateFlow
  - Implement loadCheckoutData() to load default address and cart
  - Implement selectAddress() method
  - Implement proceedToPayment() with address locking
  - Implement lockAddress() with error handling
  - Create CheckoutState data class
  - Create AddressLockState sealed class
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 9.1_

- [ ]* 7.1 Write property test for cart preservation
  - **Property 18: Cart Preservation During Address Operations**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 5.4, 7.3**

- [ ]* 7.2 Write property test for address lock and payment navigation
  - **Property 23: Address Lock and Payment Navigation**
  - **Validates: Requirements 7.4**

- [ ]* 7.3 Write property test for address lock failure handling
  - **Property 25: Address Lock Failure Handling**
  - **Validates: Requirements 7.6**

- [x] 8. Implement HomeViewModel with address display





  - Create HomeViewModel with defaultAddress StateFlow
  - Add showAddressBottomSheet MutableStateFlow
  - Implement loadDefaultAddress() method
  - Implement openAddressSelection() method
  - Implement selectAddress() method with state propagation
  - _Requirements: 4.3, 4.4, 5.1_

- [ ]* 8.1 Write property test for home screen default display
  - **Property 14: Home Screen Default Display**
  - **Validates: Requirements 4.3**

- [ ]* 8.2 Write property test for default address change propagation
  - **Property 15: Default Address Change Propagation**
  - **Validates: Requirements 4.4**

- [x] 9. Create reusable UI components





  - Create AddressCard composable with selection state and action buttons
  - Create AddressForm composable with all input fields and validation
  - Create AddressTypeSelector composable (Home/Work/Other)
  - Create DeleteConfirmationDialog composable
  - Create EmptyAddressState composable for no address state
  - _Requirements: 6.1, 6.2, 8.1, 8.2_

- [x] 10. Implement AddressSelectionBottomSheet





  - Create AddressSelectionBottomSheet composable
  - Display list of all addresses with tick mark on selected
  - Implement address selection with immediate application
  - Add "Add New Address" button with navigation
  - Add "Manage Addresses" button with navigation
  - Implement smooth open/close animations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.1 Write property test for bottom sheet address display






  - **Property 16: Address Selection Bottom Sheet Display**
  - **Validates: Requirements 5.2**

- [x] 10.2 Write property test for address selection application



  - **Property 17: Address Selection Application**
  - **Validates: Requirements 5.3**

- [x] 11. Implement Manage Address screen




  - Create ManageAddressScreen composable
  - Display all addresses with full details and type badges
  - Add Edit, Delete, and Set as Default buttons for each address
  - Implement delete confirmation dialog
  - Add "Add New Address" FAB
  - Handle empty state display
  - Implement toast notifications for operations
  - Handle loading and error states
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11.1 Write property test for manage address page display


  - **Property 19: Manage Address Page Display**
  - **Validates: Requirements 6.1, 6.2**

- [x] 11.2 Write property test for address list auto-refresh


  - **Property 21: Address List Auto-Refresh**
  - **Validates: Requirements 6.5**

- [x] 12. Implement Add/Edit Address screen





  - Create AddEditAddressScreen composable
  - Integrate AddressForm component
  - Implement form validation with error display
  - Add "Set as Default" checkbox
  - Implement save button with loading state
  - Handle first address auto-default logic in UI
  - Show success toast on save
  - Navigate back to Manage Address on success
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4_

- [x] 13. Update Home screen with address display





  - Add default address display at top of Home screen
  - Format address as "Type - City" (e.g., "Home - Ayodhya")
  - Make address clickable to open AddressSelectionBottomSheet
  - Implement address change without page reload
  - Handle no address state
  - _Requirements: 4.3, 4.4, 5.1_

- [x] 14. Update Checkout screen with address integration




  - Display default address in checkout with "Change" button
  - Implement "Change" button to open AddressSelectionBottomSheet
  - Update displayed address immediately on selection without reload
  - Implement "Proceed to Pay" button with address locking
  - Handle no address state with disabled pay button and "Add Address" CTA
  - Show address lock loading state
  - Handle address lock failure with error message
  - Ensure cart preservation during all address operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.1, 8.2, 8.3, 9.1_

- [x] 14.1 Write property test for checkout default address display



  - **Property 22: Checkout Default Address Display**
  - **Validates: Requirements 7.1**

- [x] 14.2 Write property test for checkout address synchronization


  - **Property 9: Checkout Address Synchronization**
  - **Validates: Requirements 2.5**

- [x] 14.3 Write property test for no address state restoration



  - **Property 26: No Address State Checkout Restoration**
  - **Validates: Requirements 8.5**

- [x] 15. Update Payment screen to prevent address changes





  - Remove any address selection UI from payment screen
  - Display locked address in read-only format
  - Ensure address cannot be changed during payment
  - _Requirements: 7.5_

- [x] 15.1 Write property test for payment page address immutability



  - **Property 24: Payment Page Address Immutability**
  - **Validates: Requirements 7.5**




- [x] 16. Implement navigation updates


  - Update Screen.kt with new address routes
  - Remove old address selection route from checkout flow
  - Add ManageAddresses route under Profile
  - Add AddEditAddress route with optional addressId parameter
  - Update NavGraph with new address screens
  - Ensure direct checkout-to-payment navigation
  - _Requirements: 10.5_

- [x] 16.1 Write property test for navigation state preservation



  - **Property 27: Navigation State Preservation**
  - **Validates: Requirements 10.3**

- [x] 16.2 Write property test for direct checkout-to-payment transition



  - **Property 29: Direct Checkout-to-Payment Transition**
  - **Validates: Requirements 10.5**

- [x] 17. Implement cross-screen state synchronization





  - Set up shared address state flow across ViewModels
  - Implement observers in Home, Checkout, and Manage Address screens
  - Ensure immediate updates when address changes
  - Test state propagation without page reloads
  - _Requirements: 4.4, 10.4_

- [x] 17.1 Write property test for cross-screen state synchronization



  - **Property 28: Cross-Screen State Synchronization**
  - **Validates: Requirements 10.4**

- [x] 18. Implement edge case handling





  - Handle deletion of selected address in checkout (switch to default)
  - Handle deletion of last address (enter no address state)
  - Handle API failures with proper error messages and UI restoration
  - Implement delete operation rollback on failure
  - Handle concurrent address modifications
  - _Requirements: 3.4, 3.5, 11.1, 11.2, 11.3, 11.4_

- [x] 18.1 Write property test for selected address deletion handling



  - **Property 30: Selected Address Deletion Handling**
  - **Validates: Requirements 11.1**


- [x] 18.2 Write property test for delete operation error recovery


  - **Property 13: Delete Operation Error Recovery**
  - **Validates: Requirements 3.5**



- [x] 18.3 Write property test for API failure error handling






  - **Property 31: API Failure Error Handling**
  - **Validates: Requirements 11.3**

- [x] 19. Update Profile screen with Manage Addresses option





  - Add "Manage Addresses" menu item in Profile screen
  - Implement navigation to Manage Address screen
  - _Requirements: 6.1_

- [x] 20. Implement dependency injection




  - Create AddressModule for Hilt
  - Provide AddressRepository binding
  - Provide AddressCache binding
  - Provide all use cases
  - Inject dependencies into ViewModels
  - _Requirements: All_

- [x] 21. Add error handling and loading states





  - Implement loading indicators for all async operations
  - Add error state displays with retry options
  - Implement toast notifications for success/error
  - Add network error handling with user-friendly messages
  - Implement optimistic updates with rollback on failure
  - _Requirements: 3.5, 7.6, 11.3_

- [x] 22. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Polish UI and animations




  - Implement smooth bottom sheet animations
  - Add subtle transitions for address updates
  - Ensure no screen flicker during updates
  - Add haptic feedback for important actions
  - Implement proper focus management
  - _Requirements: 10.1, 10.2_

- [x] 24. Add accessibility support





  - Add content descriptions to all interactive elements
  - Ensure proper TalkBack navigation
  - Add semantic properties to composables
  - Test with accessibility scanner
  - _Requirements: All_

- [ ] 25. Final integration testing and bug fixes








  - Test complete add address flow
  - Test complete edit address flow
  - Test complete delete address flow (all scenarios)
  - Test checkout address selection flow
  - Test checkout-to-payment flow with address lock
  - Test no address state handling
  - Test cart preservation across all operations
  - Verify all edge cases work correctly
  - Fix any discovered bugs
  - _Requirements: All_

- [ ] 26. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
