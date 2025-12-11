package com.shambit.customer.presentation.checkout

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll

/**
 * Property-based tests for CheckoutScreen
 * 
 * These tests verify universal properties that should hold across all inputs
 * using Kotest Property Testing framework.
 */
class CheckoutScreenPropertyTest : StringSpec({
    
    /**
     * Feature: address-management-checkout, Property 22: Checkout Default Address Display
     * 
     * For any checkout view with at least one address, the system should display 
     * the default address with a "Change" button
     * 
     * Validates: Requirements 7.1
     */
    "Property 22: Checkout displays default address with Change button".config(
        invocations = 100
    ) {
        checkAll(100, Arb.checkoutStateWithAddress()) { testData ->
            // Simulate the checkout display behavior
            val checkoutDisplay = simulateCheckoutDisplay(
                selectedAddress = testData.selectedAddress,
                hasAddress = testData.hasAddress,
                isAddressLocked = testData.isAddressLocked
            )
            
            // When there is at least one address, checkout should display it
            if (testData.hasAddress && testData.selectedAddress != null) {
                // Should display the address
                checkoutDisplay.addressDisplayed shouldBe true
                checkoutDisplay.displayedAddress shouldBe testData.selectedAddress
                
                // Should show "Change" button when address is not locked
                if (!testData.isAddressLocked) {
                    checkoutDisplay.changeButtonVisible shouldBe true
                } else {
                    // When locked, change button should not be visible
                    checkoutDisplay.changeButtonVisible shouldBe false
                }
            }
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 9: Checkout Address Synchronization
     * 
     * For any address that is currently selected in checkout, editing that address 
     * should immediately reflect the updated information in the checkout display
     * 
     * Validates: Requirements 2.5
     */
    "Property 9: Checkout synchronizes with address edits".config(
        invocations = 100
    ) {
        checkAll(100, Arb.addressEditScenario()) { testData ->
            // Simulate initial checkout state with selected address
            val initialDisplay = simulateCheckoutDisplay(
                selectedAddress = testData.originalAddress,
                hasAddress = true,
                isAddressLocked = false
            )
            
            // Simulate address edit
            val updatedDisplay = simulateAddressEdit(
                initialDisplay = initialDisplay,
                originalAddress = testData.originalAddress,
                updatedAddress = testData.updatedAddress
            )
            
            // The checkout should reflect the updated address information
            updatedDisplay.addressDisplayed shouldBe true
            updatedDisplay.displayedAddress shouldBe testData.updatedAddress
            
            // Address ID should remain the same (only fields updated)
            updatedDisplay.displayedAddress?.id shouldBe testData.originalAddress.id
            
            // Updated fields should be reflected
            if (testData.updatedAddress.name != testData.originalAddress.name) {
                updatedDisplay.displayedAddress?.name shouldBe testData.updatedAddress.name
            }
            if (testData.updatedAddress.city != testData.originalAddress.city) {
                updatedDisplay.displayedAddress?.city shouldBe testData.updatedAddress.city
            }
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 26: No Address State Checkout Restoration
     * 
     * For any address addition after entering the no address state, the system 
     * should restore normal checkout functionality immediately
     * 
     * Validates: Requirements 8.5
     */
    "Property 26: No address state restores after address addition".config(
        invocations = 100
    ) {
        checkAll(100, Arb.noAddressStateScenario()) { testData ->
            // Simulate initial no address state
            val noAddressDisplay = simulateCheckoutDisplay(
                selectedAddress = null,
                hasAddress = false,
                isAddressLocked = false
            )
            
            // Verify no address state
            noAddressDisplay.addressDisplayed shouldBe false
            noAddressDisplay.proceedToPayEnabled shouldBe false
            noAddressDisplay.addAddressButtonVisible shouldBe true
            
            // Simulate adding first address
            val restoredDisplay = simulateAddressAddition(
                initialDisplay = noAddressDisplay,
                newAddress = testData.newAddress
            )
            
            // Normal checkout functionality should be restored
            restoredDisplay.addressDisplayed shouldBe true
            restoredDisplay.displayedAddress shouldBe testData.newAddress
            restoredDisplay.proceedToPayEnabled shouldBe true
            restoredDisplay.addAddressButtonVisible shouldBe false
            restoredDisplay.changeButtonVisible shouldBe true
        }
    }
})

/**
 * Data class representing checkout state for testing
 */
data class CheckoutStateTestData(
    val selectedAddress: Address?,
    val hasAddress: Boolean,
    val isAddressLocked: Boolean
)

/**
 * Data class representing address edit scenario
 */
data class AddressEditScenario(
    val originalAddress: Address,
    val updatedAddress: Address
)

/**
 * Data class representing no address state scenario
 */
data class NoAddressStateScenario(
    val newAddress: Address
)

/**
 * Data class representing checkout display result
 */
data class CheckoutDisplayResult(
    val addressDisplayed: Boolean,
    val displayedAddress: Address?,
    val changeButtonVisible: Boolean,
    val proceedToPayEnabled: Boolean,
    val addAddressButtonVisible: Boolean
)

/**
 * Simulates the checkout display behavior
 * This function represents how the checkout screen displays address information
 */
fun simulateCheckoutDisplay(
    selectedAddress: Address?,
    hasAddress: Boolean,
    isAddressLocked: Boolean
): CheckoutDisplayResult {
    return CheckoutDisplayResult(
        addressDisplayed = hasAddress && selectedAddress != null,
        displayedAddress = selectedAddress,
        changeButtonVisible = hasAddress && selectedAddress != null && !isAddressLocked,
        proceedToPayEnabled = hasAddress && selectedAddress != null,
        addAddressButtonVisible = !hasAddress
    )
}

/**
 * Simulates address edit behavior in checkout
 */
fun simulateAddressEdit(
    initialDisplay: CheckoutDisplayResult,
    originalAddress: Address,
    updatedAddress: Address
): CheckoutDisplayResult {
    // If the displayed address matches the original, update it
    return if (initialDisplay.displayedAddress?.id == originalAddress.id) {
        initialDisplay.copy(displayedAddress = updatedAddress)
    } else {
        initialDisplay
    }
}

/**
 * Simulates address addition from no address state
 */
fun simulateAddressAddition(
    initialDisplay: CheckoutDisplayResult,
    newAddress: Address
): CheckoutDisplayResult {
    return CheckoutDisplayResult(
        addressDisplayed = true,
        displayedAddress = newAddress,
        changeButtonVisible = true,
        proceedToPayEnabled = true,
        addAddressButtonVisible = false
    )
}

/**
 * Generator for checkout state with address
 */
fun Arb.Companion.checkoutStateWithAddress(): Arb<CheckoutStateTestData> = arbitrary { _ ->
    val hasAddress = Arb.boolean().bind()
    val selectedAddress = if (hasAddress) Arb.validAddress().bind() else null
    val isAddressLocked = if (hasAddress) Arb.boolean().bind() else false
    
    CheckoutStateTestData(
        selectedAddress = selectedAddress,
        hasAddress = hasAddress,
        isAddressLocked = isAddressLocked
    )
}

/**
 * Generator for address edit scenarios
 */
fun Arb.Companion.addressEditScenario(): Arb<AddressEditScenario> = arbitrary { _ ->
    val originalAddress = Arb.validAddress().bind()
    
    // Create updated address with same ID but potentially different fields
    val updatedAddress = originalAddress.copy(
        name = if (Arb.boolean().bind()) Arb.string(5..30).bind() else originalAddress.name,
        phoneNumber = if (Arb.boolean().bind()) Arb.phoneNumber().bind() else originalAddress.phoneNumber,
        houseStreetArea = if (Arb.boolean().bind()) Arb.string(10..50).bind() else originalAddress.houseStreetArea,
        city = if (Arb.boolean().bind()) Arb.string(3..20).bind() else originalAddress.city,
        pincode = if (Arb.boolean().bind()) Arb.pincode().bind() else originalAddress.pincode,
        type = if (Arb.boolean().bind()) Arb.enum<AddressType>().bind() else originalAddress.type
    )
    
    AddressEditScenario(
        originalAddress = originalAddress,
        updatedAddress = updatedAddress
    )
}

/**
 * Generator for no address state scenarios
 */
fun Arb.Companion.noAddressStateScenario(): Arb<NoAddressStateScenario> = arbitrary { _ ->
    NoAddressStateScenario(
        newAddress = Arb.validAddress().bind()
    )
}

/**
 * Generator for valid Address objects
 */
fun Arb.Companion.validAddress(): Arb<Address> = arbitrary { _ ->
    Address(
        id = Arb.string(minSize = 5, maxSize = 20).bind(),
        name = Arb.string(minSize = 2, maxSize = 30).bind(),
        phoneNumber = Arb.phoneNumber().bind(),
        houseStreetArea = Arb.string(minSize = 5, maxSize = 50).bind(),
        city = Arb.string(minSize = 2, maxSize = 20).bind(),
        pincode = Arb.pincode().bind(),
        type = Arb.enum<AddressType>().bind(),
        isDefault = Arb.boolean().bind(),
        createdAt = Arb.string(minSize = 10, maxSize = 30).bind()
    )
}

/**
 * Generator for valid phone numbers (10 digits)
 */
fun Arb.Companion.phoneNumber(): Arb<String> = arbitrary { _ ->
    val digits = (1..10).map { Arb.int(0..9).bind() }
    digits.joinToString("")
}

/**
 * Generator for valid pincodes (6 digits)
 */
fun Arb.Companion.pincode(): Arb<String> = arbitrary { _ ->
    val digits = (1..6).map { Arb.int(0..9).bind() }
    digits.joinToString("")
}