# Requirements Document

## Introduction

This document specifies the requirements for a manual address management system and checkout address flow for the ShamBit Android application. The system enables users to manage delivery addresses without GPS, maps, or external APIs, ensuring a reliable checkout-to-payment flow with proper address validation and default address handling.

## Glossary

- **Address System**: The complete address management functionality including creation, editing, deletion, and selection of delivery addresses
- **Default Address**: The primary address automatically selected for checkout and delivery
- **Address Selection Bottom Sheet**: A modal dialog displaying all saved addresses for user selection
- **Manage Address Page**: A full-screen interface for comprehensive address management operations
- **Checkout Flow**: The sequence from cart review through address confirmation to payment initiation
- **Address Lock**: The state where an address becomes immutable after proceeding to payment
- **No Address State**: The system state when zero addresses exist, blocking checkout progression

## Requirements

### Requirement 1

**User Story:** As a user, I want to add delivery addresses manually, so that I can receive orders at my preferred locations without needing GPS or location permissions.

#### Acceptance Criteria

1. WHEN a user submits a new address with all required fields (Name, Phone, House/Street/Area, City, Pincode, Address Type), THEN the Address System SHALL create and save the address
2. WHEN a user saves their first address, THEN the Address System SHALL automatically mark it as the Default Address
3. WHEN a user marks an address as Default during creation, THEN the Address System SHALL remove the Default status from any previously Default Address
4. WHEN a user saves an address, THEN the Address System SHALL display a success confirmation message
5. WHEN a user attempts to save an address with missing required fields, THEN the Address System SHALL prevent submission and display field-level validation errors
6. WHEN a user enters a phone number, THEN the Address System SHALL validate that it contains exactly 10 digits
7. WHEN a user enters a pincode, THEN the Address System SHALL validate that it contains exactly 6 digits

### Requirement 2

**User Story:** As a user, I want to edit my saved addresses, so that I can update delivery information when it changes.

#### Acceptance Criteria

1. WHEN a user modifies an existing address and saves changes, THEN the Address System SHALL update the address with the new information
2. WHEN a user marks a non-Default Address as Default during editing, THEN the Address System SHALL remove the Default status from the previously Default Address
3. WHEN a user edits the Default Address without changing its Default status, THEN the Address System SHALL preserve its Default status
4. WHEN a user saves address edits, THEN the Address System SHALL display a success confirmation message
5. WHEN a user edits an address that is currently selected in Checkout, THEN the Checkout Flow SHALL reflect the updated address information immediately

### Requirement 3

**User Story:** As a user, I want to delete addresses I no longer use, so that I can keep my address list clean and manageable.

#### Acceptance Criteria

1. WHEN a user initiates address deletion, THEN the Address System SHALL display a confirmation dialog with "Cancel" and "Delete" options
2. WHEN a user deletes a non-Default Address, THEN the Address System SHALL remove the address and preserve the current Default Address
3. WHEN a user deletes the Default Address and other addresses exist, THEN the Address System SHALL automatically select another address and mark it as the new Default Address
4. WHEN a user deletes the last remaining address, THEN the Address System SHALL enter the No Address State
5. WHEN the delete operation fails, THEN the Address System SHALL restore the address in the interface and display an error message

### Requirement 4

**User Story:** As a user, I want one of my addresses to be marked as default, so that checkout automatically uses my preferred delivery location.

#### Acceptance Criteria

1. WHEN multiple addresses exist, THEN the Address System SHALL ensure exactly one address has Default status at all times
2. WHEN a user sets an address as Default, THEN the Address System SHALL remove Default status from the previously Default Address
3. WHEN a user views the home screen, THEN the Address System SHALL display the Default Address at the top
4. WHEN the Default Address changes, THEN the Address System SHALL update the home screen and Checkout Flow immediately without page reload
5. WHEN a user deletes the Default Address and other addresses exist, THEN the Address System SHALL automatically assign Default status to another address

### Requirement 5

**User Story:** As a user, I want to select a delivery address from my saved addresses, so that I can choose where my order should be delivered.

#### Acceptance Criteria

1. WHEN a user taps the address display on the home screen, THEN the Address System SHALL open the Address Selection Bottom Sheet
2. WHEN the Address Selection Bottom Sheet opens, THEN the Address System SHALL display all saved addresses with a tick mark on the currently selected address
3. WHEN a user selects an address from the bottom sheet, THEN the Address System SHALL apply the selection immediately and close the bottom sheet
4. WHEN a user selects a different address, THEN the Address System SHALL update the home screen and Checkout Flow without page reload or cart reset
5. WHEN a user taps "Add New Address" in the bottom sheet, THEN the Address System SHALL navigate to the Add Address form

### Requirement 6

**User Story:** As a user, I want to access a dedicated page to manage all my addresses, so that I can perform comprehensive address operations in one place.

#### Acceptance Criteria

1. WHEN a user navigates to Manage Address Page from Profile or Address Selection Bottom Sheet, THEN the Address System SHALL display all saved addresses with their full details and Address Type
2. WHEN viewing an address in Manage Address Page, THEN the Address System SHALL provide Edit, Delete, and Set as Default action buttons
3. WHEN a user performs an action (save, delete, set default), THEN the Address System SHALL display a single toast notification confirming the action
4. WHEN a user adds a new address from Manage Address Page, THEN the Address System SHALL navigate to the Add Address form
5. WHEN a user completes an action in Manage Address Page, THEN the Address System SHALL update the address list immediately without requiring manual refresh

### Requirement 7

**User Story:** As a user, I want to review and confirm my delivery address during checkout, so that I can ensure my order goes to the correct location.

#### Acceptance Criteria

1. WHEN a user views the Checkout Flow, THEN the Checkout Flow SHALL display the Default Address with a "Change" button
2. WHEN a user taps "Change" in checkout, THEN the Checkout Flow SHALL open the Address Selection Bottom Sheet
3. WHEN a user selects a different address during checkout, THEN the Checkout Flow SHALL update the displayed address immediately without page reload or cart reset
4. WHEN a user taps "Proceed to Pay" in checkout, THEN the Checkout Flow SHALL lock the selected address and navigate directly to the Payment Page
5. WHEN the Payment Page displays, THEN the Checkout Flow SHALL not allow address changes and SHALL not display address selection interfaces
6. WHEN the address lock operation fails due to network or system errors, THEN the Checkout Flow SHALL prevent navigation to the Payment Page and display an error message

### Requirement 8

**User Story:** As a user, I want to be prevented from proceeding to payment without a valid address, so that I don't accidentally place orders without delivery information.

#### Acceptance Criteria

1. WHEN a user has zero saved addresses and views checkout, THEN the Checkout Flow SHALL display "Please add delivery address to continue" and disable the "Proceed to Pay" button
2. WHEN the No Address State is active, THEN the Checkout Flow SHALL display only an "Add Address" button
3. WHEN a user adds their first address from the No Address State, THEN the Address System SHALL automatically mark it as Default and enable the "Proceed to Pay" button
4. WHEN a user deletes their last remaining address during checkout, THEN the Checkout Flow SHALL enter the No Address State and disable payment progression
5. WHEN a user adds an address after entering No Address State, THEN the Checkout Flow SHALL restore normal checkout functionality immediately

### Requirement 9

**User Story:** As a user, I want my shopping cart to remain intact when I manage addresses, so that I don't lose my selected items.

#### Acceptance Criteria

1. WHEN a user changes the selected address, THEN the Address System SHALL preserve all cart items and quantities
2. WHEN a user navigates to Manage Address Page from checkout, THEN the Address System SHALL preserve all cart items and quantities
3. WHEN a user adds or edits an address during checkout, THEN the Address System SHALL preserve all cart items and quantities
4. WHEN a user returns to checkout after address operations, THEN the Checkout Flow SHALL display the same cart contents without reset
5. WHEN address operations complete, THEN the Address System SHALL update address information without triggering cart data reload

### Requirement 10

**User Story:** As a user, I want smooth transitions between address operations and checkout, so that I have a seamless shopping experience.

#### Acceptance Criteria

1. WHEN a user changes addresses, THEN the Address System SHALL update the interface without screen flicker or visible reload
2. WHEN the Address Selection Bottom Sheet opens or closes, THEN the Address System SHALL animate smoothly without disrupting the underlying screen
3. WHEN a user navigates between checkout and address management, THEN the Address System SHALL maintain navigation state without unexpected screen transitions
4. WHEN address data updates, THEN the Address System SHALL reflect changes immediately in all relevant screens (home, checkout, manage addresses)
5. WHEN a user completes the checkout-to-payment flow, THEN the Checkout Flow SHALL transition directly without intermediate address screens

### Requirement 11

**User Story:** As a system administrator, I want the address system to handle all edge cases gracefully, so that users never encounter broken states or payment failures.

#### Acceptance Criteria

1. WHEN a user deletes an address that is currently selected in checkout and other addresses exist, THEN the Address System SHALL automatically switch to the Default Address
2. WHEN a user deletes an address that is currently selected in checkout and no other addresses exist, THEN the Address System SHALL enter the No Address State and block checkout
3. WHEN API operations fail (save, edit, delete), THEN the Address System SHALL display appropriate error messages and maintain UI consistency
4. WHEN a user has exactly one address and attempts to delete it, THEN the Address System SHALL allow deletion and enter the No Address State
5. WHEN the Default Address is deleted and multiple other addresses exist, THEN the Address System SHALL select the most recently added address as the new Default Address
