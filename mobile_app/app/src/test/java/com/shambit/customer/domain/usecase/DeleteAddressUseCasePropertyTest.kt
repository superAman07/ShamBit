package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll
import kotlinx.coroutines.test.runTest
import org.mockito.kotlin.*

/**
 * Property-based tests for DeleteAddressUseCase
 * 
 * These tests verify universal properties that should hold across all address
 * deletion operations using Kotest Property Testing framework.
 */
class DeleteAddressUseCasePropertyTest : StringSpec({
    
    /**
     * Feature: address-management-checkout, Property 30: Selected Address Deletion Handling
     * 
     * For any deletion of the currently selected address in checkout when other addresses exist,
     * the system should automatically switch to the default address
     * 
     * Validates: Requirements 11.1
     */
    "Property 30: Selected Address Deletion Handling".config(
        invocations = 100
    ) {
        checkAll(100, Arb.addressListWithSelected()) { scenario ->
            runTest {
                // Setup mocks
                val addressRepository = mock<AddressRepository>()
                val addressCache = mock<AddressCache>()
                val deleteAddressUseCase = DeleteAddressUseCase(addressRepository, addressCache)
                
                // Setup: Cache contains the address list
                whenever(addressCache.getCachedAddresses()).thenReturn(scenario.addresses)
                
                // Setup: Repository delete succeeds
                whenever(addressRepository.deleteAddress(scenario.selectedAddressId))
                    .thenReturn(NetworkResult.Success(Unit))
                
                // If the selected address is default and there are other addresses,
                // we need to set a new default
                val selectedAddress = scenario.addresses.find { it.id == scenario.selectedAddressId }
                val remainingAddresses = scenario.addresses.filter { it.id != scenario.selectedAddressId }
                
                if (selectedAddress?.isDefault == true && remainingAddresses.isNotEmpty()) {
                    val newDefaultAddress = remainingAddresses.maxByOrNull { it.createdAt }!!
                    whenever(addressRepository.setDefaultAddress(newDefaultAddress.id))
                        .thenReturn(NetworkResult.Success(newDefaultAddress.copy(isDefault = true)))
                }
                
                // Test: Delete the selected address
                val result = deleteAddressUseCase(scenario.selectedAddressId)
                
                // Verify: Operation succeeds
                result shouldBe NetworkResult.Success(Unit)
                
                // Verify: Repository delete was called
                verify(addressRepository).deleteAddress(scenario.selectedAddressId)
                
                // Verify: Cache was updated with remaining addresses
                verify(addressCache).cacheAddresses(any())
                
                // Property: If selected address was default and other addresses exist,
                // a new default should be set
                if (selectedAddress?.isDefault == true && remainingAddresses.isNotEmpty()) {
                    val newDefaultAddress = remainingAddresses.maxByOrNull { it.createdAt }!!
                    verify(addressRepository).setDefaultAddress(newDefaultAddress.id)
                }
            }
        }
    }
    
    /**
     * Feature: address-management-checkout, Property 13: Delete Operation Error Recovery
     * 
     * For any failed delete operation, the system should restore the address in the UI
     * and display an error message
     * 
     * Validates: Requirements 3.5
     */
    "Property 13: Delete Operation Error Recovery".config(
        invocations = 100
    ) {
        checkAll(100, Arb.addressListWithSelected(), Arb.networkError()) { scenario, errorMessage ->
            runTest {
                // Setup mocks
                val addressRepository = mock<AddressRepository>()
                val addressCache = mock<AddressCache>()
                val deleteAddressUseCase = DeleteAddressUseCase(addressRepository, addressCache)
                
                // Setup: Cache contains the address list
                whenever(addressCache.getCachedAddresses()).thenReturn(scenario.addresses)
                
                // Setup: Repository delete fails
                whenever(addressRepository.deleteAddress(scenario.selectedAddressId))
                    .thenReturn(NetworkResult.Error(errorMessage))
                
                // Test: Delete the selected address
                val result = deleteAddressUseCase(scenario.selectedAddressId)
                
                // Verify: Operation fails with error
                result shouldBe NetworkResult.Error(errorMessage)
                
                // Verify: Repository delete was called
                verify(addressRepository).deleteAddress(scenario.selectedAddressId)
                
                // Property: Cache should NOT be updated when delete fails
                verify(addressCache, never()).cacheAddresses(any())
                verify(addressCache, never()).removeCachedAddress(any())
                
                // Property: No default address operations should occur on failure
                verify(addressRepository, never()).setDefaultAddress(any())
            }
        }
    }
})

/**
 * Data class representing an address deletion scenario
 */
data class AddressDeletionScenario(
    val addresses: List<Address>,
    val selectedAddressId: String
)

/**
 * Generator for address lists with a selected address to delete
 */
fun Arb.Companion.addressListWithSelected(): Arb<AddressDeletionScenario> = arbitrary { _ ->
    val size = Arb.int(min = 2, max = 5).bind() // At least 2 addresses for meaningful test
    val addresses = (1..size).map { index ->
        Arb.address().bind().copy(
            id = "address_$index",
            isDefault = index == 1, // First address is default
            createdAt = "2024-01-0${index}T00:00:00Z" // Different timestamps for ordering
        )
    }
    
    // Select a random address to delete
    val selectedIndex = Arb.int(min = 0, max = addresses.size - 1).bind()
    val selectedAddressId = addresses[selectedIndex].id
    
    AddressDeletionScenario(addresses, selectedAddressId)
}

/**
 * Generator for network error messages
 */
fun Arb.Companion.networkError(): Arb<String> = Arb.element(
    listOf(
        "Network connection failed",
        "Server error occurred",
        "Request timeout",
        "Address not found",
        "Unauthorized access",
        "Internal server error"
    )
)

/**
 * Generator for individual addresses
 */
fun Arb.Companion.address(): Arb<Address> = arbitrary { _ ->
    Address(
        id = "addr_" + Arb.string(minSize = 10, maxSize = 15).bind(),
        name = Arb.string(minSize = 5, maxSize = 20).bind(),
        phoneNumber = Arb.validPhoneNumber().bind(),
        houseStreetArea = Arb.string(minSize = 10, maxSize = 50).bind(),
        city = Arb.string(minSize = 5, maxSize = 20).bind(),
        pincode = Arb.validPincode().bind(),
        type = Arb.element(AddressType.entries).bind(),
        isDefault = false, // Will be set appropriately by scenario generator
        createdAt = "2024-01-01T00:00:00Z"
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