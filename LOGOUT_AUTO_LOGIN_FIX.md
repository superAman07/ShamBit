# Logout Auto-Login Fix

## Problem
When users logged out of the app and reopened it, they were automatically logged back in. This happened because the app was checking for authentication tokens in the wrong DataStore.

## Root Cause
The app had two separate DataStore instances for storing authentication data:

1. **TokenManager** - Used `auth_tokens` DataStore (not used for actual authentication)
2. **UserPreferences** - Used `shambit_preferences` DataStore (used by MainActivity and AuthRepository)

### The Bug Flow:
1. **Login**: `AuthRepository.verifyOtp()` saved tokens to `UserPreferences`
2. **Logout**: `ProfileViewModel.logout()` cleared tokens from `TokenManager` (wrong DataStore!)
3. **App Restart**: `MainActivity` checked `UserPreferences.getAccessToken()` and found the token still there
4. **Result**: User was automatically logged back in

## Solution
Fixed `ProfileViewModel.logout()` to use `UserPreferences.clearAll()` instead of `TokenManager.clearTokens()`.

### Changes Made:
1. **ProfileViewModel.kt**:
   - Changed dependency from `TokenManager` to `UserPreferences`
   - Updated `logout()` method to call `userPreferences.clearAll()`

2. **TokenManager.kt**:
   - Deleted the entire file as it was redundant and unused

## Verification
The logout flow now works correctly:
1. User clicks logout → Dialog confirms
2. `viewModel.logout()` clears all data from `UserPreferences`
3. Navigation goes to Login screen with back stack cleared
4. On app restart, `MainActivity` finds no token and shows Login screen

## Standard E-commerce Behavior
The app now behaves like standard e-commerce apps (Blinkit, Flipkart):
- Logout completely clears session
- App restart requires login again
- No automatic re-authentication after explicit logout
