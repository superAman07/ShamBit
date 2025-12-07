# Logout Testing Guide

## How to Test the Fix

### Test Case 1: Basic Logout
1. Open the app and login with your mobile number
2. Navigate to Profile screen
3. Click "Logout" button
4. Confirm logout in the dialog
5. **Expected**: App navigates to Login screen

### Test Case 2: App Restart After Logout (Main Issue)
1. Login to the app
2. Navigate to Profile and logout
3. **Close the app completely** (swipe away from recent apps)
4. Reopen the app
5. **Expected**: Login screen should appear (NOT auto-login to Home)

### Test Case 3: Back Button After Logout
1. Login to the app
2. Navigate to Profile and logout
3. Press the back button
4. **Expected**: App should exit or stay on Login screen (not go back to Home)

### Test Case 4: Session Persistence (Login Should Work)
1. Login to the app
2. Navigate around the app (Home, Search, Cart, etc.)
3. **Close the app** (don't logout)
4. Reopen the app
5. **Expected**: User should still be logged in and see Home screen

## What Was Fixed
- Logout now properly clears all authentication data from the correct DataStore
- App restart after logout will show Login screen
- Behavior matches standard e-commerce apps like Blinkit and Flipkart

## Technical Details
- Fixed `ProfileViewModel.logout()` to use `UserPreferences.clearAll()`
- Removed redundant `TokenManager` class
- All authentication checks now use the same `UserPreferences` DataStore
