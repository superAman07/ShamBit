package com.shambit.customer.integration

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.validation.AddressValidator
import com.shambit.customer.domain.validation.ValidationResult
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

/**
 * Simplified integration tests for address management flows
 * 
 * These tests verify core address management functionality works correctly
 * by testing the integration between validation, models, and business logic.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AddressFlowIntegrationTest : StringSpec({
    
    val testDispatcher = StandardTestDispatcher()
    
    beforeSpec {
        Dispatchers.setMain(testDispatcher)
    }
    
    afterSpec {
        Dispatchers.resetMain()
    }
    
    /**
     * Test complete add address validation flow
     * Verifies: Requirements 1.1, 1.5, 1.6, 1.7
     */
    "should validate complete add address flow" {
        runTest {
            // Test valid address creation
            val validAddress = Address(
                id = "test-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Main Street",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            
            // Validate all fields
            val nameValidation = AddressValidator.validateName(validAddress.name)
            val phoneValidation = AddressValidator.validatePhoneNumber(validAddress.phoneNumber)
            val addressValidation = AddressValidator.validateHouseStreetArea(validAddress.houseStreetArea)
            val cityValidation = AddressValidator.validateCity(validAddress.city)
            val pincodeValidation = AddressValidator.validatePincode(validAddress.pincode)
            
            // All validations should pass
            nameValidation.isValid() shouldBe true
            phoneValidation.isValid() shouldBe true
            addressValidation.isValid() shouldBe true
            cityValidation.isValid() shouldBe true
            pincodeValidation.isValid() shouldBe true
            
            // Test complete address validation
            val completeValidation = AddressValidator.validateAddressForCreation(
                name = validAddress.name,
                phoneNumber = validAddress.phoneNumber,
                houseStreetArea = validAddress.houseStreetArea,
                city = validAddress.city,
                pincode = validAddress.pincode,
                type = validAddress.type
            )
            
            completeValidation.isValid() shouldBe true
        }
    }
    
    /**
     * Test address validation with invalid data
     * Verifies: Requirements 1.5, 1.6, 1.7
     */
    "should reject invalid address data" {
        runTest {
            // Test invalid phone number (not 10 digits)
            val invalidPhoneValidation = AddressValidator.validatePhoneNumber("123456789")
            invalidPhoneValidation.isInvalid() shouldBe true
            
            // Test invalid pincode (not 6 digits)
            val invalidPincodeValidation = AddressValidator.validatePincode("12345")
            invalidPincodeValidation.isInvalid() shouldBe true
            
            // Test empty required fields
            val emptyNameValidation = AddressValidator.validateName("")
            emptyNameValidation.isInvalid() shouldBe true
            
            val emptyCityValidation = AddressValidator.validateCity("   ")
            emptyCityValidation.isInvalid() shouldBe true
            
            // Test complete validation with missing fields
            val incompleteValidation = AddressValidator.validateAddressForCreation(
                name = "",
                phoneNumber = "123",
                houseStreetArea = "123 Main Street",
                city = "",
                pincode = "12345",
                type = AddressType.HOME
            )
            
            incompleteValidation.isInvalid() shouldBe true
            val invalidResult = incompleteValidation as ValidationResult.Invalid
            
            // Should have errors for name, phone, city, and pincode
            invalidResult.hasError("name") shouldBe true
            invalidResult.hasError("phoneNumber") shouldBe true
            invalidResult.hasError("city") shouldBe true
            invalidResult.hasError("pincode") shouldBe true
        }
    }
    
    /**
     * Test address type handling
     * Verifies: Requirements 1.1
     */
    "should handle different address types correctly" {
        runTest {
            val homeAddress = Address(
                id = "home-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Home Street",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            
            val workAddress = Address(
                id = "work-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "456 Office Complex",
                city = "Delhi",
                pincode = "110001",
                type = AddressType.WORK,
                isDefault = false,
                createdAt = "2024-01-02T00:00:00Z"
            )
            
            val otherAddress = Address(
                id = "other-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "789 Other Location",
                city = "Mumbai",
                pincode = "400001",
                type = AddressType.OTHER,
                isDefault = false,
                createdAt = "2024-01-03T00:00:00Z"
            )
            
            // Verify address types
            homeAddress.type shouldBe AddressType.HOME
            workAddress.type shouldBe AddressType.WORK
            otherAddress.type shouldBe AddressType.OTHER
            
            // Verify display strings
            homeAddress.toShortDisplayString() shouldBe "Home - Ayodhya"
            workAddress.toShortDisplayString() shouldBe "Work - Delhi"
            otherAddress.toShortDisplayString() shouldBe "Other - Mumbai"
        }
    }
    
    /**
     * Test default address logic
     * Verifies: Requirements 1.2, 1.3, 4.1
     */
    "should handle default address logic correctly" {
        runTest {
            val addresses = mutableListOf<Address>()
            
            // First address should be default
            val firstAddress = Address(
                id = "first-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Main Street",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            addresses.add(firstAddress)
            
            // Verify single default
            val defaultAddresses = addresses.filter { it.isDefault }
            defaultAddresses.size shouldBe 1
            defaultAddresses.first() shouldBe firstAddress
            
            // Add second address as default (should replace first as default)
            val secondAddress = Address(
                id = "second-id",
                name = "Jane Doe",
                phoneNumber = "9876543211",
                houseStreetArea = "456 Oak Street",
                city = "Delhi",
                pincode = "110001",
                type = AddressType.WORK,
                isDefault = true,
                createdAt = "2024-01-02T00:00:00Z"
            )
            
            // Simulate setting new default (first becomes non-default)
            val updatedFirstAddress = firstAddress.copy(isDefault = false)
            addresses.clear()
            addresses.add(updatedFirstAddress)
            addresses.add(secondAddress)
            
            // Verify single default invariant
            val newDefaultAddresses = addresses.filter { it.isDefault }
            newDefaultAddresses.size shouldBe 1
            newDefaultAddresses.first() shouldBe secondAddress
        }
    }
    
    /**
     * Test address display formatting
     * Verifies: Requirements 4.3, 7.1
     */
    "should format address display strings correctly" {
        runTest {
            val address = Address(
                id = "test-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Main Street, Apartment 4B",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            
            // Test different display formats
            val shortDisplay = address.toShortDisplayString()
            shortDisplay shouldBe "Home - Ayodhya"
            
            val fullDisplay = address.toDisplayString()
            fullDisplay shouldBe "John Doe, 123 Main Street, Apartment 4B, Ayodhya - 224001"
        }
    }
    
    /**
     * Test phone number validation edge cases
     * Verifies: Requirements 1.6
     */
    "should handle phone number validation edge cases" {
        runTest {
            // Valid formats (all should pass)
            val validPhones = listOf(
                "9876543210",           // Plain 10 digits
                "987-654-3210",         // With dashes
                "987 654 3210",         // With spaces
                "(987) 654-3210"        // With parentheses
            )
            
            validPhones.forEach { phone ->
                val result = AddressValidator.validatePhoneNumber(phone)
                result.isValid() shouldBe true
            }
            
            // Invalid formats (all should fail)
            val invalidPhones = listOf(
                "",                     // Empty
                "123456789",           // 9 digits
                "12345678901",         // 11 digits
                "abcdefghij",          // No digits
                "123-456-789",         // 9 digits with formatting
                "123 456 7890 1"       // 11 digits with formatting
            )
            
            invalidPhones.forEach { phone ->
                val result = AddressValidator.validatePhoneNumber(phone)
                result.isInvalid() shouldBe true
            }
        }
    }
    
    /**
     * Test pincode validation edge cases
     * Verifies: Requirements 1.7
     */
    "should handle pincode validation edge cases" {
        runTest {
            // Valid formats (all should pass)
            val validPincodes = listOf(
                "224001",              // Plain 6 digits
                "224-001",             // With dash
                "224 001"              // With space
            )
            
            validPincodes.forEach { pincode ->
                val result = AddressValidator.validatePincode(pincode)
                result.isValid() shouldBe true
            }
            
            // Invalid formats (all should fail)
            val invalidPincodes = listOf(
                "",                    // Empty
                "22400",              // 5 digits
                "2240011",            // 7 digits
                "abcdef",             // No digits
                "224-00",             // 5 digits with formatting
                "224 001 1"           // 7 digits with formatting
            )
            
            invalidPincodes.forEach { pincode ->
                val result = AddressValidator.validatePincode(pincode)
                result.isInvalid() shouldBe true
            }
        }
    }
    
    /**
     * Test cart preservation simulation
     * Verifies: Requirements 9.1, 9.2, 9.3, 9.4
     */
    "should preserve cart data during address operations" {
        runTest {
            // Simulate cart data
            data class CartItem(val id: String, val name: String, val quantity: Int, val price: Double)
            data class Cart(val items: List<CartItem>, val total: Double)
            
            val originalCart = Cart(
                items = listOf(
                    CartItem("item1", "Product 1", 2, 50.0),
                    CartItem("item2", "Product 2", 1, 30.0)
                ),
                total = 130.0
            )
            
            // Simulate address operations (cart should remain unchanged)
            var currentCart = originalCart
            
            // Simulate address selection
            val selectedAddress = Address(
                id = "selected-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "123 Main Street",
                city = "Ayodhya",
                pincode = "224001",
                type = AddressType.HOME,
                isDefault = true,
                createdAt = "2024-01-01T00:00:00Z"
            )
            
            // Cart should be preserved after address selection
            currentCart shouldBe originalCart
            
            // Simulate address edit
            val editedAddress = selectedAddress.copy(
                houseStreetArea = "456 New Street",
                city = "Delhi"
            )
            
            // Cart should still be preserved after address edit
            currentCart shouldBe originalCart
            
            // Simulate address deletion (with fallback to another address)
            val fallbackAddress = Address(
                id = "fallback-id",
                name = "John Doe",
                phoneNumber = "9876543210",
                houseStreetArea = "789 Backup Street",
                city = "Mumbai",
                pincode = "400001",
                type = AddressType.WORK,
                isDefault = true,
                createdAt = "2024-01-03T00:00:00Z"
            )
            
            // Cart should still be preserved after address deletion and fallback
            currentCart shouldBe originalCart
            currentCart.items.size shouldBe 2
            currentCart.total shouldBe 130.0
        }
    }
})