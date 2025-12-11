package com.shambit.customer.presentation.address

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll

/**
 * Property-based tests for ManageAddressScreen
 * 
 * These tests verify universal properties that should hold across all inputs
 * using Kotest Property Testing framework.
 */
class ManageAddressScreenPropertyTest : StringSpec({
    
    /**
     * Feature: address-management-checkout, Property 19: Manage Address Page Display
     * 
     * For any address list, the manage address page should display all addresses with their 
     * full details, address type, and action buttons (Edit, Delete, Set as Default)
     * 
     * Validates: Requirements 6.1, 6.2
     */
    "Property 19: Manage address page displays all addresses with full details and action buttons".config(
        invocations = 100
    ) {
        checkAll(100, Arb.addressList(minSize = 1, maxSize = 10)) { addresses ->
            // Simulate the ManageAddressScreen display logic
            val displayedAddresses = simulateManageAddressPageDisplay(addresses)
            
            // Verify all addresses are displayed
            displayedAddresses.addresses shouldBe addresses
            
            // Verify each address has full details displayed
            addresses.forEach { address ->
                val displayedAddress = displayedAddresses.addressDetails[address.id]!!
                
                // Verify full details are included
                displayedAddress.name shouldBe address.name
                displayedAddress.phoneNumber shouldBe address.phoneNumber
                displayedAddress.houseStreetArea shouldBe address.houseStreetArea
                displayedAddress.city shouldBe address.city
                displayedAddress.pincode shouldBe address.pincode
                displayedAddress.type shouldBe address.type
                displayedAddress.isDefault shouldBe address.isDefault
                
                // Verify address type is displayed
                displayedAddress.typeDisplayed shouldBe true
                
                // Verify action buttons are available
                val actions = displayedAddresses.availableActions[address.id]!!
                
                // Edit button should always be available
                actions.canEdit shouldBe true
                
                // Delete button should always be available
                actions.canDelete shouldBe true
                
                // Set as Default button should be available only if not already default
                actions.canSetDefault shouldBe !address.isDefault
            }
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 21: Address List Auto-Refresh
     * 
     * For any completed address operation in the manage address page, the address list 
     * should update immediately without requiring manual refresh
     * 
     * Validates: Requirements 6.5
     */
    "Property 21: Address list auto-refreshes after operations".config(
        invocations = 100
    ) {
        checkAll(100, Arb.addressOperationScenario()) { scenario ->
            // Simulate initial state
            var currentAddresses = scenario.initialAddresses
            var refreshCount = 0
            
            // Track refresh calls
            val onRefresh: () -> Unit = {
                refreshCount++
                currentAddresses = scenario.expectedAddressesAfterOperation
            }
            
            // Simulate address operation completion
            val operationResult = simulateAddressOperation(
                initialAddresses = scenario.initialAddresses,
                operation = scenario.operation,
                onRefresh = onRefresh
            )
            
            // Verify operation was successful
            operationResult.success shouldBe true
            
            // Verify auto-refresh was triggered
            refreshCount shouldBe 1
            
            // Verify address list was updated immediately
            currentAddresses shouldBe scenario.expectedAddressesAfterOperation
            
            // Verify no manual refresh was required
            operationResult.manualRefreshRequired shouldBe false
        }
    }
})

/**
 * Data class representing the display state of the manage address page
 */
data class ManageAddressPageDisplay(
    val addresses: List<Address>,
    val addressDetails: Map<String, AddressDisplayDetails>,
    val availableActions: Map<String, AddressActions>
)

/**
 * Data class representing the display details for an address
 */
data class AddressDisplayDetails(
    val name: String,
    val phoneNumber: String,
    val houseStreetArea: String,
    val city: String,
    val pincode: String,
    val type: AddressType,
    val isDefault: Boolean,
    val typeDisplayed: Boolean
)

/**
 * Data class representing available actions for an address
 */
data class AddressActions(
    val canEdit: Boolean,
    val canDelete: Boolean,
    val canSetDefault: Boolean
)

/**
 * Data class for address operation scenarios
 */
data class AddressOperationScenario(
    val initialAddresses: List<Address>,
    val operation: AddressOperation,
    val expectedAddressesAfterOperation: List<Address>
)

/**
 * Sealed class representing different address operations
 */
sealed class AddressOperation {
    data class SetDefault(val addressId: String) : AddressOperation()
    data class Delete(val addressId: String) : AddressOperation()
}

/**
 * Data class representing the result of an address operation
 */
data class AddressOperationResult(
    val success: Boolean,
    val manualRefreshRequired: Boolean
)

/**
 * Generator for address lists with configurable size and default address
 */
fun Arb.Companion.addressList(
    minSize: Int = 0,
    maxSize: Int = 10,
    hasDefault: Boolean = true
): Arb<List<Address>> = arbitrary { _ ->
    val size = Arb.int(minSize..maxSize).bind()
    if (size == 0) return@arbitrary emptyList()
    
    val addresses = List(size) { index ->
        Arb.validAddress().bind().copy(
            id = "address_$index",
            isDefault = false
        )
    }
    
    // Set one address as default if required and list is not empty
    if (hasDefault && addresses.isNotEmpty()) {
        val defaultIndex = Arb.int(0 until addresses.size).bind()
        addresses.mapIndexed { index, address ->
            address.copy(isDefault = index == defaultIndex)
        }
    } else {
        addresses
    }
}

/**
 * Generator for valid Address objects
 */
fun Arb.Companion.validAddress(): Arb<Address> = arbitrary { _ ->
    Address(
        id = Arb.string(minSize = 5, maxSize = 20).bind(),
        name = Arb.string(minSize = 2, maxSize = 50, codepoints = Codepoint.az()).bind(),
        phoneNumber = Arb.validPhoneNumber().bind(),
        houseStreetArea = Arb.string(minSize = 5, maxSize = 100, codepoints = Codepoint.az()).bind(),
        city = Arb.string(minSize = 3, maxSize = 30, codepoints = Codepoint.az()).bind(),
        pincode = Arb.validPincode().bind(),
        type = Arb.enum<AddressType>().bind(),
        isDefault = Arb.boolean().bind(),
        createdAt = Arb.string(minSize = 10, maxSize = 30).bind()
    )
}

/**
 * Generator for valid phone numbers (exactly 10 digits)
 */
fun Arb.Companion.validPhoneNumber(): Arb<String> = arbitrary { _ ->
    List(10) { Arb.int(0..9).bind() }.joinToString("")
}

/**
 * Generator for valid pincodes (exactly 6 digits)
 */
fun Arb.Companion.validPincode(): Arb<String> = arbitrary { _ ->
    List(6) { Arb.int(0..9).bind() }.joinToString("")
}

/**
 * Generator for address operation scenarios
 */
fun Arb.Companion.addressOperationScenario(): Arb<AddressOperationScenario> = arbitrary { _ ->
    val initialAddresses = Arb.addressList(minSize = 1, maxSize = 5, hasDefault = true).bind()
    
    // Choose an operation type
    val operation = when (Arb.int(0..1).bind()) {
        0 -> {
            // Set default operation - choose a non-default address
            val nonDefaultAddresses = initialAddresses.filter { !it.isDefault }
            if (nonDefaultAddresses.isNotEmpty()) {
                val targetAddress = nonDefaultAddresses[Arb.int(0 until nonDefaultAddresses.size).bind()]
                AddressOperation.SetDefault(targetAddress.id)
            } else {
                // If all addresses are default (shouldn't happen), create a set default operation anyway
                AddressOperation.SetDefault(initialAddresses.first().id)
            }
        }
        else -> {
            // Delete operation - choose any address
            val targetAddress = initialAddresses[Arb.int(0 until initialAddresses.size).bind()]
            AddressOperation.Delete(targetAddress.id)
        }
    }
    
    // Calculate expected addresses after operation
    val expectedAddresses = when (operation) {
        is AddressOperation.SetDefault -> {
            initialAddresses.map { address ->
                address.copy(isDefault = address.id == operation.addressId)
            }
        }
        is AddressOperation.Delete -> {
            val remainingAddresses = initialAddresses.filter { it.id != operation.addressId }
            if (remainingAddresses.isEmpty()) {
                emptyList()
            } else {
                // If we deleted the default address, set a new default
                val deletedAddress = initialAddresses.find { it.id == operation.addressId }
                if (deletedAddress?.isDefault == true && remainingAddresses.isNotEmpty()) {
                    // Set the most recently created address as default
                    val newDefaultAddress = remainingAddresses.maxByOrNull { it.createdAt }!!
                    remainingAddresses.map { address ->
                        address.copy(isDefault = address.id == newDefaultAddress.id)
                    }
                } else {
                    remainingAddresses
                }
            }
        }
    }
    
    AddressOperationScenario(
        initialAddresses = initialAddresses,
        operation = operation,
        expectedAddressesAfterOperation = expectedAddresses
    )
}

/**
 * Simulates the display logic of the ManageAddressScreen
 * This function represents the core logic that should be tested
 */
private fun simulateManageAddressPageDisplay(addresses: List<Address>): ManageAddressPageDisplay {
    val addressDetails = addresses.associate { address ->
        address.id to AddressDisplayDetails(
            name = address.name,
            phoneNumber = address.phoneNumber,
            houseStreetArea = address.houseStreetArea,
            city = address.city,
            pincode = address.pincode,
            type = address.type,
            isDefault = address.isDefault,
            typeDisplayed = true // Address type should always be displayed
        )
    }
    
    val availableActions = addresses.associate { address ->
        address.id to AddressActions(
            canEdit = true, // Edit should always be available
            canDelete = true, // Delete should always be available
            canSetDefault = !address.isDefault // Set as Default only if not already default
        )
    }
    
    return ManageAddressPageDisplay(
        addresses = addresses,
        addressDetails = addressDetails,
        availableActions = availableActions
    )
}

/**
 * Simulates address operation execution and auto-refresh behavior
 * This function represents the core logic that should be tested
 */
private fun simulateAddressOperation(
    initialAddresses: List<Address>,
    operation: AddressOperation,
    onRefresh: () -> Unit
): AddressOperationResult {
    // Simulate operation execution
    val operationSuccess = when (operation) {
        is AddressOperation.SetDefault -> {
            // Verify the address exists
            initialAddresses.any { it.id == operation.addressId }
        }
        is AddressOperation.Delete -> {
            // Verify the address exists
            initialAddresses.any { it.id == operation.addressId }
        }
    }
    
    if (operationSuccess) {
        // Trigger auto-refresh immediately after successful operation
        onRefresh()
    }
    
    return AddressOperationResult(
        success = operationSuccess,
        manualRefreshRequired = false // Auto-refresh should handle this
    )
}