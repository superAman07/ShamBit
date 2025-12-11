package com.shambit.customer.domain.validation

import com.shambit.customer.domain.model.AddressType
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll
import io.kotest.property.Exhaustive
import io.kotest.property.exhaustive.azstring

/**
 * Property-based tests for AddressValidator
 * 
 * These tests verify universal properties that should hold across all inputs
 * using Kotest Property Testing framework.
 */
class AddressValidatorPropertyTest : StringSpec({
    
    /**
     * Feature: address-management-checkout, Property 3: Phone Number Validation
     * 
     * For any phone number string, validation should pass if and only if 
     * it contains exactly 10 digits
     * 
     * Validates: Requirements 1.6
     */
    "Property 3: Phone number validation passes if and only if it contains exactly 10 digits".config(
        invocations = 100
    ) {
        // Test valid phone numbers (exactly 10 digits)
        checkAll(100, Arb.validPhoneNumber()) { phoneNumber ->
            val result = AddressValidator.validatePhoneNumber(phoneNumber)
            result.isValid() shouldBe true
        }
        
        // Test invalid phone numbers (not exactly 10 digits)
        checkAll(100, Arb.invalidPhoneNumber()) { phoneNumber ->
            val result = AddressValidator.validatePhoneNumber(phoneNumber)
            result.isInvalid() shouldBe true
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 4: Pincode Validation
     * 
     * For any pincode string, validation should pass if and only if 
     * it contains exactly 6 digits
     * 
     * Validates: Requirements 1.7
     */
    "Property 4: Pincode validation passes if and only if it contains exactly 6 digits".config(
        invocations = 100
    ) {
        // Test valid pincodes (exactly 6 digits)
        checkAll(100, Arb.validPincode()) { pincode ->
            val result = AddressValidator.validatePincode(pincode)
            result.isValid() shouldBe true
        }
        
        // Test invalid pincodes (not exactly 6 digits)
        checkAll(100, Arb.invalidPincode()) { pincode ->
            val result = AddressValidator.validatePincode(pincode)
            result.isInvalid() shouldBe true
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 5: Required Field Validation
     * 
     * For any address submission with one or more missing required fields,
     * the system should prevent submission and return field-level validation 
     * errors for each missing field
     * 
     * Validates: Requirements 1.5
     */
    "Property 5: Address with missing required fields returns field-level validation errors".config(
        invocations = 100
    ) {
        // Test addresses with at least one missing required field
        checkAll(100, Arb.addressWithMissingFields()) { addressData ->
            val result = AddressValidator.validateAddressForCreation(
                name = addressData.name,
                phoneNumber = addressData.phoneNumber,
                houseStreetArea = addressData.houseStreetArea,
                city = addressData.city,
                pincode = addressData.pincode,
                type = addressData.type
            )
            
            // Should be invalid
            result.isInvalid() shouldBe true
            
            // Should have errors for each missing field
            val invalidResult = result as ValidationResult.Invalid
            
            // Check that each missing field has an error
            if (addressData.name.isBlank()) {
                invalidResult.hasError("name") shouldBe true
            }
            if (addressData.phoneNumber.isBlank()) {
                invalidResult.hasError("phoneNumber") shouldBe true
            }
            if (addressData.houseStreetArea.isBlank()) {
                invalidResult.hasError("houseStreetArea") shouldBe true
            }
            if (addressData.city.isBlank()) {
                invalidResult.hasError("city") shouldBe true
            }
            if (addressData.pincode.isBlank()) {
                invalidResult.hasError("pincode") shouldBe true
            }
        }
        
        // Test that a complete valid address passes validation
        checkAll(100, Arb.completeValidAddress()) { addressData ->
            val result = AddressValidator.validateAddressForCreation(
                name = addressData.name,
                phoneNumber = addressData.phoneNumber,
                houseStreetArea = addressData.houseStreetArea,
                city = addressData.city,
                pincode = addressData.pincode,
                type = addressData.type
            )
            
            // Should be valid
            result.isValid() shouldBe true
        }
    }
})

/**
 * Generator for valid phone numbers (exactly 10 digits)
 * Can include formatting characters like spaces, dashes, parentheses
 * The validator filters out non-digit characters and checks for exactly 10 digits
 */
fun Arb.Companion.validPhoneNumber(): Arb<String> = arbitrary { _ ->
    val digits = List(10) { Arb.int(0..9).bind() }.joinToString("")
    
    // Randomly choose a format
    when (Arb.int(0..3).bind()) {
        0 -> digits // Plain 10 digits: 1234567890
        1 -> "${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}" // 123-456-7890
        2 -> "${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}" // 123 456 7890
        else -> "(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}" // (123) 456-7890
    }
}

/**
 * Generator for invalid phone numbers (not exactly 10 digits)
 * Includes:
 * - Empty strings
 * - Strings with fewer than 10 digits
 * - Strings with more than 10 digits
 * - Strings with no digits
 * - Strings with letters and special characters
 */
fun Arb.Companion.invalidPhoneNumber(): Arb<String> = arbitrary { _ ->
    when (Arb.int(0..5).bind()) {
        0 -> "" // Empty string
        1 -> "   " // Whitespace only
        2 -> {
            // Fewer than 10 digits (1-9 digits)
            val digitCount = Arb.int(1..9).bind()
            List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
        }
        3 -> {
            // More than 10 digits (11-20 digits)
            val digitCount = Arb.int(11..20).bind()
            List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
        }
        4 -> {
            // String with no digits (letters and special characters)
            Arb.string(minSize = 1, maxSize = 15, codepoints = Codepoint.az()).bind()
        }
        else -> {
            // Mixed alphanumeric with wrong digit count
            val digitCount = Arb.int(0..9).bind() // Not 10
            val digits = List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
            val letters = Arb.string(minSize = 1, maxSize = 5, codepoints = Codepoint.az()).bind()
            digits + letters
        }
    }
}

/**
 * Generator for valid pincodes (exactly 6 digits)
 * Can include formatting characters like spaces, dashes
 * The validator filters out non-digit characters and checks for exactly 6 digits
 */
fun Arb.Companion.validPincode(): Arb<String> = arbitrary { _ ->
    val digits = List(6) { Arb.int(0..9).bind() }.joinToString("")
    
    // Randomly choose a format
    when (Arb.int(0..2).bind()) {
        0 -> digits // Plain 6 digits: 123456
        1 -> "${digits.substring(0, 3)}-${digits.substring(3)}" // 123-456
        else -> "${digits.substring(0, 3)} ${digits.substring(3)}" // 123 456
    }
}

/**
 * Generator for invalid pincodes (not exactly 6 digits)
 * Includes:
 * - Empty strings
 * - Strings with fewer than 6 digits
 * - Strings with more than 6 digits
 * - Strings with no digits
 * - Strings with letters and special characters
 */
fun Arb.Companion.invalidPincode(): Arb<String> = arbitrary { _ ->
    when (Arb.int(0..5).bind()) {
        0 -> "" // Empty string
        1 -> "   " // Whitespace only
        2 -> {
            // Fewer than 6 digits (1-5 digits)
            val digitCount = Arb.int(1..5).bind()
            List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
        }
        3 -> {
            // More than 6 digits (7-12 digits)
            val digitCount = Arb.int(7..12).bind()
            List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
        }
        4 -> {
            // String with no digits (letters and special characters)
            Arb.string(minSize = 1, maxSize = 10, codepoints = Codepoint.az()).bind()
        }
        else -> {
            // Mixed alphanumeric with wrong digit count
            val digitCount = Arb.int(0..5).bind() // Not 6
            val digits = List(digitCount) { Arb.int(0..9).bind() }.joinToString("")
            val letters = Arb.string(minSize = 1, maxSize = 5, codepoints = Codepoint.az()).bind()
            digits + letters
        }
    }
}

/**
 * Data class to hold address field data for testing
 */
data class AddressTestData(
    val name: String,
    val phoneNumber: String,
    val houseStreetArea: String,
    val city: String,
    val pincode: String,
    val type: com.shambit.customer.domain.model.AddressType
)

/**
 * Generator for addresses with at least one missing required field
 * Generates addresses where one or more fields are blank/empty
 */
fun Arb.Companion.addressWithMissingFields(): Arb<AddressTestData> = arbitrary { _ ->
    // Decide which fields to make blank (at least one must be blank)
    val makeNameBlank = Arb.boolean().bind()
    val makePhoneBlank = Arb.boolean().bind()
    val makeHouseStreetAreaBlank = Arb.boolean().bind()
    val makeCityBlank = Arb.boolean().bind()
    val makePincodeBlank = Arb.boolean().bind()
    
    // Ensure at least one field is blank
    val atLeastOneBlank = makeNameBlank || makePhoneBlank || makeHouseStreetAreaBlank || 
                          makeCityBlank || makePincodeBlank
    
    if (!atLeastOneBlank) {
        // Force at least one field to be blank
        val fieldToBlank = Arb.int(0..4).bind()
        return@arbitrary when (fieldToBlank) {
            0 -> AddressTestData(
                name = "",
                phoneNumber = Arb.validPhoneNumber().bind(),
                houseStreetArea = Arb.string(minSize = 5, maxSize = 50).bind(),
                city = Arb.string(minSize = 3, maxSize = 30).bind(),
                pincode = Arb.validPincode().bind(),
                type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
            )
            1 -> AddressTestData(
                name = Arb.string(minSize = 2, maxSize = 50).bind(),
                phoneNumber = "",
                houseStreetArea = Arb.string(minSize = 5, maxSize = 50).bind(),
                city = Arb.string(minSize = 3, maxSize = 30).bind(),
                pincode = Arb.validPincode().bind(),
                type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
            )
            2 -> AddressTestData(
                name = Arb.string(minSize = 2, maxSize = 50).bind(),
                phoneNumber = Arb.validPhoneNumber().bind(),
                houseStreetArea = "",
                city = Arb.string(minSize = 3, maxSize = 30).bind(),
                pincode = Arb.validPincode().bind(),
                type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
            )
            3 -> AddressTestData(
                name = Arb.string(minSize = 2, maxSize = 50).bind(),
                phoneNumber = Arb.validPhoneNumber().bind(),
                houseStreetArea = Arb.string(minSize = 5, maxSize = 50).bind(),
                city = "",
                pincode = Arb.validPincode().bind(),
                type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
            )
            else -> AddressTestData(
                name = Arb.string(minSize = 2, maxSize = 50).bind(),
                phoneNumber = Arb.validPhoneNumber().bind(),
                houseStreetArea = Arb.string(minSize = 5, maxSize = 50).bind(),
                city = Arb.string(minSize = 3, maxSize = 30).bind(),
                pincode = "",
                type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
            )
        }
    }
    
    AddressTestData(
        name = if (makeNameBlank) "" else Arb.string(minSize = 2, maxSize = 50).bind(),
        phoneNumber = if (makePhoneBlank) "" else Arb.validPhoneNumber().bind(),
        houseStreetArea = if (makeHouseStreetAreaBlank) "" else Arb.string(minSize = 5, maxSize = 50).bind(),
        city = if (makeCityBlank) "" else Arb.string(minSize = 3, maxSize = 30).bind(),
        pincode = if (makePincodeBlank) "" else Arb.validPincode().bind(),
        type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
    )
}

/**
 * Generator for complete valid addresses with all required fields
 * All fields are non-blank and valid
 */
fun Arb.Companion.completeValidAddress(): Arb<AddressTestData> = arbitrary { _ ->
    AddressTestData(
        name = Arb.string(minSize = 2, maxSize = 50, codepoints = Codepoint.az()).bind(),
        phoneNumber = Arb.validPhoneNumber().bind(),
        houseStreetArea = Arb.string(minSize = 5, maxSize = 100, codepoints = Codepoint.az()).bind(),
        city = Arb.string(minSize = 3, maxSize = 30, codepoints = Codepoint.az()).bind(),
        pincode = Arb.validPincode().bind(),
        type = Arb.enum<com.shambit.customer.domain.model.AddressType>().bind()
    )
}
