package com.shambit.customer.data.repository

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.property.Arb
import io.kotest.property.arbitrary.*
import io.kotest.property.checkAll
import kotlinx.coroutines.runBlocking
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import retrofit2.Response

/**
 * Property-based tests for AddressRepository
 * 
 * These tests verify universal properties that should hold across all inputs
 * using Kotest Property Testing framework.
 */
class AddressRepositoryPropertyTest : StringSpec({
    
    /**
     * Feature: address-management-checkout, Property 2: Address Creation Success
     * 
     * For any valid address data (all required fields present, phone is 10 digits, 
     * pincode is 6 digits), creating an address should succeed and return the saved address
     * 
     * Validates: Requirements 1.1
     */
    "Property 2: Address creation succeeds for valid address data and returns saved address".config(
        invocations = 100
    ) {
        checkAll(100, Arb.validAddress()) { address ->
            runBlocking {
                // Mock ProfileApi and AddressCache
                val mockProfileApi = mock<ProfileApi>()
                val mockAddressCache = mock<AddressCache>()
                val repository: AddressRepository = AddressRepositoryImpl(mockProfileApi, mockAddressCache)
                
                // Create expected response DTO
                val responseDto = AddressDto(
                    id = address.id,
                    userId = "user123",
                    name = address.name,
                    phoneNumber = address.phoneNumber,
                    type = address.type.apiValue,
                    addressLine1 = address.houseStreetArea,
                    addressLine2 = null,
                    city = address.city,
                    state = "TestState",
                    pincode = address.pincode,
                    landmark = null,
                    latitude = null,
                    longitude = null,
                    isDefault = address.isDefault,
                    createdAt = address.createdAt,
                    updatedAt = address.createdAt
                )
                
                // Mock successful API response
                val apiResponse = ApiResponse(
                    success = true,
                    data = responseDto,
                    error = null
                )
                val response = Response.success(apiResponse)
                
                whenever(mockProfileApi.addAddress(any())).thenReturn(response)
                
                // Test address creation
                val result = repository.addAddress(address)
                
                // Should be successful
                result.shouldBeInstanceOf<NetworkResult.Success<Address>>()
                
                // Should return the same address data
                val returnedAddress = (result as NetworkResult.Success).data
                returnedAddress.id shouldBe address.id
                returnedAddress.name shouldBe address.name
                returnedAddress.phoneNumber shouldBe address.phoneNumber
                returnedAddress.houseStreetArea shouldBe address.houseStreetArea
                returnedAddress.city shouldBe address.city
                returnedAddress.pincode shouldBe address.pincode
                returnedAddress.type shouldBe address.type
                returnedAddress.isDefault shouldBe address.isDefault
                returnedAddress.createdAt shouldBe address.createdAt
            }
        }
    }
})

/**
 * Generator for valid Address domain models
 * Generates addresses with all required fields present and valid
 */
fun Arb.Companion.validAddress(): Arb<Address> = arbitrary { _ ->
    Address(
        id = Arb.uuid().bind().toString(),
        name = Arb.string(minSize = 2, maxSize = 50, codepoints = Codepoint.az()).bind(),
        phoneNumber = Arb.validPhoneNumberDigits().bind(),
        houseStreetArea = Arb.string(minSize = 5, maxSize = 100, codepoints = Codepoint.az()).bind(),
        city = Arb.string(minSize = 3, maxSize = 30, codepoints = Codepoint.az()).bind(),
        pincode = Arb.validPincodeDigits().bind(),
        type = Arb.enum<AddressType>().bind(),
        isDefault = Arb.boolean().bind(),
        createdAt = "2024-01-01T00:00:00Z"
    )
}

/**
 * Generator for valid phone numbers (exactly 10 digits, no formatting)
 */
fun Arb.Companion.validPhoneNumberDigits(): Arb<String> = arbitrary { _ ->
    List(10) { Arb.int(0..9).bind() }.joinToString("")
}

/**
 * Generator for valid pincodes (exactly 6 digits, no formatting)
 */
fun Arb.Companion.validPincodeDigits(): Arb<String> = arbitrary { _ ->
    List(6) { Arb.int(0..9).bind() }.joinToString("")
}