package com.shambit.customer.presentation.checkout

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for CheckoutViewModel state classes and data models
 * 
 * Tests the sealed classes and basic functionality without requiring
 * dependency injection or mocking.
 */
class CheckoutViewModelTest {
    
    @Test
    fun `CheckoutState should initialize with correct defaults`() {
        // When
        val state = CheckoutState()
        
        // Then
        assertFalse(state.hasAddress)
        assertFalse(state.isAddressLocked)
        assertFalse(state.canProceedToPayment)
        assertEquals(0.0, state.totalAmount, 0.01)
    }
    
    @Test
    fun `CheckoutState should allow custom values`() {
        // When
        val state = CheckoutState(
            hasAddress = true,
            isAddressLocked = true,
            canProceedToPayment = true,
            totalAmount = 150.0
        )
        
        // Then
        assertTrue(state.hasAddress)
        assertTrue(state.isAddressLocked)
        assertTrue(state.canProceedToPayment)
        assertEquals(150.0, state.totalAmount, 0.01)
    }
    
    @Test
    fun `AddressLockState Unlocked should be singleton`() {
        // When
        val state1 = AddressLockState.Unlocked
        val state2 = AddressLockState.Unlocked
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `AddressLockState Locking should be singleton`() {
        // When
        val state1 = AddressLockState.Locking
        val state2 = AddressLockState.Locking
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `AddressLockState Locked should contain address`() {
        // Given
        val address = createTestAddress("1", "Test Address")
        
        // When
        val state = AddressLockState.Locked(address)
        
        // Then
        assertEquals(address, state.address)
        assertEquals("1", state.address.id)
        assertEquals("Test Address", state.address.name)
    }
    
    @Test
    fun `AddressLockState LockFailed should contain error message`() {
        // Given
        val errorMessage = "Network connection failed"
        
        // When
        val state = AddressLockState.LockFailed(errorMessage)
        
        // Then
        assertEquals(errorMessage, state.error)
    }
    
    @Test
    fun `CheckoutState copy should preserve unchanged values`() {
        // Given
        val originalState = CheckoutState(
            hasAddress = true,
            isAddressLocked = false,
            canProceedToPayment = true,
            totalAmount = 100.0
        )
        
        // When
        val newState = originalState.copy(isAddressLocked = true)
        
        // Then
        assertTrue(newState.hasAddress) // preserved
        assertTrue(newState.isAddressLocked) // changed
        assertTrue(newState.canProceedToPayment) // preserved
        assertEquals(100.0, newState.totalAmount, 0.01) // preserved
    }
    
    @Test
    fun `CheckoutState should handle no address scenario`() {
        // When
        val state = CheckoutState(
            hasAddress = false,
            isAddressLocked = false,
            canProceedToPayment = false,
            totalAmount = 50.0
        )
        
        // Then
        assertFalse(state.hasAddress)
        assertFalse(state.isAddressLocked)
        assertFalse(state.canProceedToPayment)
        assertEquals(50.0, state.totalAmount, 0.01)
    }
    
    @Test
    fun `CheckoutState should handle locked address scenario`() {
        // When
        val state = CheckoutState(
            hasAddress = true,
            isAddressLocked = true,
            canProceedToPayment = true,
            totalAmount = 200.0
        )
        
        // Then
        assertTrue(state.hasAddress)
        assertTrue(state.isAddressLocked)
        assertTrue(state.canProceedToPayment)
        assertEquals(200.0, state.totalAmount, 0.01)
    }
    
    @Test
    fun `AddressLockState sealed class hierarchy should work correctly`() {
        // Given
        val unlockedState: AddressLockState = AddressLockState.Unlocked
        val lockingState: AddressLockState = AddressLockState.Locking
        val lockedState: AddressLockState = AddressLockState.Locked(createTestAddress("1", "Test"))
        val failedState: AddressLockState = AddressLockState.LockFailed("Error")
        
        // When & Then
        assertTrue(unlockedState is AddressLockState.Unlocked)
        assertTrue(lockingState is AddressLockState.Locking)
        assertTrue(lockedState is AddressLockState.Locked)
        assertTrue(failedState is AddressLockState.LockFailed)
        
        // Verify they are different instances
        assertFalse(unlockedState == lockingState)
        assertFalse(lockedState == failedState)
    }
    
    @Test
    fun `AddressLockState Locked with different addresses should not be equal`() {
        // Given
        val address1 = createTestAddress("1", "Address 1")
        val address2 = createTestAddress("2", "Address 2")
        
        // When
        val state1 = AddressLockState.Locked(address1)
        val state2 = AddressLockState.Locked(address2)
        
        // Then
        assertFalse(state1 == state2)
        assertEquals("1", state1.address.id)
        assertEquals("2", state2.address.id)
    }
    
    @Test
    fun `AddressLockState LockFailed with different errors should not be equal`() {
        // Given
        val error1 = "Network error"
        val error2 = "Timeout error"
        
        // When
        val state1 = AddressLockState.LockFailed(error1)
        val state2 = AddressLockState.LockFailed(error2)
        
        // Then
        assertFalse(state1 == state2)
        assertEquals(error1, state1.error)
        assertEquals(error2, state2.error)
    }
    
    private fun createTestAddress(
        id: String,
        name: String,
        isDefault: Boolean = false,
        type: AddressType = AddressType.HOME
    ): Address {
        return Address(
            id = id,
            name = name,
            phoneNumber = "9876543210",
            houseStreetArea = "123 Test Street",
            city = "Test City",
            pincode = "123456",
            type = type,
            isDefault = isDefault,
            createdAt = "2024-01-01T00:00:00Z"
        )
    }
}