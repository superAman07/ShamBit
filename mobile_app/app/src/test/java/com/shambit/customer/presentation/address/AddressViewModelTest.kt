package com.shambit.customer.presentation.address

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for AddressViewModel state classes and utility methods
 * 
 * Tests the sealed classes and basic functionality without requiring
 * dependency injection or mocking.
 */
class AddressViewModelTest {
    
    @Test
    fun `AddressListState Success should contain addresses`() {
        // Given
        val addresses = listOf(
            createTestAddress("1", "Home Address", isDefault = true),
            createTestAddress("2", "Work Address", isDefault = false)
        )
        
        // When
        val state = AddressListState.Success(addresses)
        
        // Then
        assertEquals(2, state.addresses.size)
        assertTrue(state.addresses.any { it.isDefault })
    }
    
    @Test
    fun `AddressListState Error should contain error message`() {
        // Given
        val errorMessage = "Network error occurred"
        
        // When
        val state = AddressListState.Error(errorMessage)
        
        // Then
        assertEquals(errorMessage, state.message)
    }
    
    @Test
    fun `OperationState Success should contain success message`() {
        // Given
        val successMessage = "Address updated successfully"
        
        // When
        val state = OperationState.Success(successMessage)
        
        // Then
        assertEquals(successMessage, state.message)
    }
    
    @Test
    fun `OperationState Error should contain error message`() {
        // Given
        val errorMessage = "Failed to update address"
        
        // When
        val state = OperationState.Error(errorMessage)
        
        // Then
        assertEquals(errorMessage, state.message)
    }
    
    @Test
    fun `AddressListState Loading should be singleton`() {
        // When
        val state1 = AddressListState.Loading
        val state2 = AddressListState.Loading
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `AddressListState Empty should be singleton`() {
        // When
        val state1 = AddressListState.Empty
        val state2 = AddressListState.Empty
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `OperationState Idle should be singleton`() {
        // When
        val state1 = OperationState.Idle
        val state2 = OperationState.Idle
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `OperationState Loading should be singleton`() {
        // When
        val state1 = OperationState.Loading
        val state2 = OperationState.Loading
        
        // Then
        assertEquals(state1, state2)
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