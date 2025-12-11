package com.shambit.customer.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.google.gson.Gson
import com.shambit.customer.data.local.cache.AddressCacheImpl
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.util.NetworkResult
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import org.junit.rules.TemporaryFolder
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import retrofit2.Response

/**
 * Integration tests for AddressRepository with AddressCache
 * 
 * Tests the integration between AddressRepository and AddressCache
 * to verify cache-first strategy and cache updates work correctly.
 */
class AddressRepositoryIntegrationTest {
    
    @get:Rule
    val tmpFolder: TemporaryFolder = TemporaryFolder.builder().assureDeletion().build()
    
    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var addressCache: AddressCacheImpl
    private lateinit var mockProfileApi: ProfileApi
    private lateinit var repository: AddressRepositoryImpl
    private lateinit var gson: Gson
    
    @Before
    fun setup() {
        gson = Gson()
        dataStore = PreferenceDataStoreFactory.create {
            tmpFolder.newFile("test_prefs.preferences_pb")
        }
        addressCache = AddressCacheImpl(dataStore, gson)
        mockProfileApi = mock<ProfileApi>()
        repository = AddressRepositoryImpl(mockProfileApi, addressCache)
    }
    
    @Test
    fun `getAddresses should return cached data when cache is valid`() = runTest {
        // Given - cache some addresses
        val cachedAddresses = listOf(
            createTestAddress("1", "Cached Address 1", isDefault = true),
            createTestAddress("2", "Cached Address 2", isDefault = false)
        )
        addressCache.cacheAddresses(cachedAddresses)
        
        // When - get addresses (should not call API)
        val result = repository.getAddresses()
        
        // Then - should return cached data
        assertTrue(result is NetworkResult.Success)
        val addresses = (result as NetworkResult.Success).data
        assertEquals(2, addresses.size)
        assertEquals("Cached Address 1", addresses.first { it.isDefault }.name)
    }
    
    @Test
    fun `getAddresses should fetch from API and cache when cache is empty`() = runTest {
        // Given - empty cache and mock API response
        val apiAddresses = listOf(
            createTestAddressDto("1", "API Address 1", isDefault = true),
            createTestAddressDto("2", "API Address 2", isDefault = false)
        )
        val apiResponse = ApiResponse(
            success = true,
            data = apiAddresses,
            error = null
        )
        whenever(mockProfileApi.getAddresses()).thenReturn(Response.success(apiResponse))
        
        // When - get addresses
        val result = repository.getAddresses()
        
        // Then - should return API data and cache it
        assertTrue(result is NetworkResult.Success)
        val addresses = (result as NetworkResult.Success).data
        assertEquals(2, addresses.size)
        assertEquals("API Address 1", addresses.first { it.isDefault }.name)
        
        // Verify data is cached
        val cachedAddresses = addressCache.getCachedAddresses()
        assertNotNull(cachedAddresses)
        assertEquals(2, cachedAddresses!!.size)
        
        // Verify default address is cached
        val defaultAddress = addressCache.getDefaultAddress()
        assertNotNull(defaultAddress)
        assertEquals("API Address 1", defaultAddress!!.name)
    }
    
    @Test
    fun `addAddress should update cache with new address`() = runTest {
        // Given - existing cached addresses
        val existingAddresses = listOf(
            createTestAddress("1", "Existing Address", isDefault = true)
        )
        addressCache.cacheAddresses(existingAddresses)
        
        // Mock API response for add
        val newAddress = createTestAddress("2", "New Address", isDefault = false)
        val responseDto = createTestAddressDto("2", "New Address", isDefault = false)
        val apiResponse = ApiResponse(
            success = true,
            data = responseDto,
            error = null
        )
        whenever(mockProfileApi.addAddress(any())).thenReturn(Response.success(apiResponse))
        
        // When - add new address
        val result = repository.addAddress(newAddress)
        
        // Then - should succeed and update cache
        assertTrue(result is NetworkResult.Success)
        
        // Verify cache is updated
        val cachedAddresses = addressCache.getCachedAddresses()
        assertNotNull(cachedAddresses)
        assertEquals(2, cachedAddresses!!.size)
        assertTrue(cachedAddresses.any { it.name == "New Address" })
    }
    
    @Test
    fun `deleteAddress should remove from cache`() = runTest {
        // Given - cached addresses
        val addresses = listOf(
            createTestAddress("1", "Address 1", isDefault = true),
            createTestAddress("2", "Address 2", isDefault = false)
        )
        addressCache.cacheAddresses(addresses)
        
        // Mock API response for delete
        val deleteResponse = ApiResponse(
            success = true,
            data = Unit,
            error = null
        )
        whenever(mockProfileApi.deleteAddress("2")).thenReturn(Response.success(deleteResponse))
        
        // When - delete address
        val result = repository.deleteAddress("2")
        
        // Then - should succeed and update cache
        assertTrue(result is NetworkResult.Success)
        
        // Verify cache is updated
        val cachedAddresses = addressCache.getCachedAddresses()
        assertNotNull(cachedAddresses)
        assertEquals(1, cachedAddresses!!.size)
        assertEquals("Address 1", cachedAddresses.first().name)
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
    
    private fun createTestAddressDto(
        id: String,
        name: String,
        isDefault: Boolean = false,
        type: String = "home"
    ): AddressDto {
        return AddressDto(
            id = id,
            userId = "user123",
            name = name,
            phoneNumber = "9876543210",
            type = type,
            addressLine1 = "123 Test Street",
            addressLine2 = null,
            city = "Test City",
            state = "Test State",
            pincode = "123456",
            landmark = null,
            latitude = null,
            longitude = null,
            isDefault = isDefault,
            createdAt = "2024-01-01T00:00:00Z",
            updatedAt = "2024-01-01T00:00:00Z"
        )
    }
}