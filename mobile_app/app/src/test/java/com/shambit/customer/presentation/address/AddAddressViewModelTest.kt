package com.shambit.customer.presentation.address

import com.shambit.customer.domain.model.AddressType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for AddAddressViewModel state classes and data models
 * 
 * Tests the core data structures and utility methods without requiring
 * dependency injection or complex mocking.
 */
class AddAddressViewModelTest {
    
    @Test
    fun `AddressFormState should have correct default values`() {
        // When
        val formState = AddressFormState()
        
        // Then
        assertEquals("", formState.name)
        assertEquals("", formState.phoneNumber)
        assertEquals("", formState.houseStreetArea)
        assertEquals("", formState.city)
        assertEquals("", formState.pincode)
        assertEquals(AddressType.HOME, formState.type)
        assertFalse(formState.isDefault)
        assertFalse(formState.isEditMode)
        assertEquals(null, formState.id)
    }
    
    @Test
    fun `AddressFormState should support edit mode initialization`() {
        // When
        val formState = AddressFormState(
            id = "test-id",
            name = "John Doe",
            phoneNumber = "9876543210",
            houseStreetArea = "123 Main St",
            city = "Test City",
            pincode = "123456",
            type = AddressType.WORK,
            isDefault = true,
            isEditMode = true
        )
        
        // Then
        assertEquals("test-id", formState.id)
        assertEquals("John Doe", formState.name)
        assertEquals("9876543210", formState.phoneNumber)
        assertEquals("123 Main St", formState.houseStreetArea)
        assertEquals("Test City", formState.city)
        assertEquals("123456", formState.pincode)
        assertEquals(AddressType.WORK, formState.type)
        assertTrue(formState.isDefault)
        assertTrue(formState.isEditMode)
    }
    
    @Test
    fun `SaveState Idle should be singleton`() {
        // When
        val state1 = SaveState.Idle
        val state2 = SaveState.Idle
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `SaveState Loading should be singleton`() {
        // When
        val state1 = SaveState.Loading
        val state2 = SaveState.Loading
        
        // Then
        assertEquals(state1, state2)
    }
    
    @Test
    fun `SaveState Success should contain success message`() {
        // Given
        val successMessage = "Address saved successfully"
        
        // When
        val state = SaveState.Success(successMessage)
        
        // Then
        assertEquals(successMessage, state.message)
    }
    
    @Test
    fun `SaveState Error should contain error message`() {
        // Given
        val errorMessage = "Failed to save address"
        
        // When
        val state = SaveState.Error(errorMessage)
        
        // Then
        assertEquals(errorMessage, state.message)
    }
    
    @Test
    fun `AddressFormState copy should preserve unchanged fields`() {
        // Given
        val originalState = AddressFormState(
            id = "test-id",
            name = "John Doe",
            phoneNumber = "9876543210",
            houseStreetArea = "123 Main St",
            city = "Test City",
            pincode = "123456",
            type = AddressType.WORK,
            isDefault = true,
            isEditMode = true
        )
        
        // When
        val updatedState = originalState.copy(name = "Jane Doe")
        
        // Then
        assertEquals("Jane Doe", updatedState.name)
        assertEquals("test-id", updatedState.id)
        assertEquals("9876543210", updatedState.phoneNumber)
        assertEquals("123 Main St", updatedState.houseStreetArea)
        assertEquals("Test City", updatedState.city)
        assertEquals("123456", updatedState.pincode)
        assertEquals(AddressType.WORK, updatedState.type)
        assertTrue(updatedState.isDefault)
        assertTrue(updatedState.isEditMode)
    }
    
    @Test
    fun `AddressFormState should support all address types`() {
        // Test HOME type
        val homeState = AddressFormState(type = AddressType.HOME)
        assertEquals(AddressType.HOME, homeState.type)
        
        // Test WORK type
        val workState = AddressFormState(type = AddressType.WORK)
        assertEquals(AddressType.WORK, workState.type)
        
        // Test OTHER type
        val otherState = AddressFormState(type = AddressType.OTHER)
        assertEquals(AddressType.OTHER, otherState.type)
    }
}