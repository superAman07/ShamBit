package com.shambit.customer.data.local.cache

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.google.gson.Gson
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import org.junit.rules.TemporaryFolder

/**
 * Unit tests for AddressCacheImpl
 * 
 * Tests the core functionality of address caching including:
 * - Caching and retrieving addresses
 * - Default address handling
 * - Cache validation
 * - Update and removal operations
 */
class AddressCacheImplTest {
    
    @get:Rule
    val tmpFolder: TemporaryFolder = TemporaryFolder.builder().assureDeletion().build()
    
    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var addressCache: AddressCacheImpl
    private lateinit var gson: Gson
    
    @Before
    fun setup() {
        gson = Gson()
        dataStore = PreferenceDataStoreFactory.create {
            tmpFolder.newFile("test_prefs.preferences_pb")
        }
        addressCache = AddressCacheImpl(dataStore, gson)
    }
    
    @Test
    fun `cacheAddresses should store addresses and default address`() = runTest {
        // Given
        val addresses = listOf(
            createTestAddress("1", "Home Address", isDefault = true),
            createTestAddress("2", "Work Address", isDefault = false)
        )
        
        // When
        addressCache.cacheAddresses(addresses)
        
        // Then
        val cachedAddresses = addressCache.getCachedAddresses()
        val defaultAddress = addressCache.getDefaultAddress()
        
        assertNotNull(cachedAddresses)
        assertEquals(2, cachedAddresses!!.size)
        assertEquals("1", cachedAddresses.first { it.isDefault }.id)
        
        assertNotNull(defaultAddress)
        assertEquals("1", defaultAddress!!.id)
        assertTrue(defaultAddress.isDefault)
    }
    
    @Test
    fun `getCachedAddresses should return null when no cache exists`() = runTest {
        // When
        val result = addressCache.getCachedAddresses()
        
        // Then
        assertNull(result)
    }
    
    @Test
    fun `getDefaultAddress should return null when no default address exists`() = runTest {
        // Given - addresses without default
        val addresses = listOf(
            createTestAddress("1", "Address 1", isDefault = false),
            createTestAddress("2", "Address 2", isDefault = false)
        )
        
        // When
        addressCache.cacheAddresses(addresses)
        val defaultAddress = addressCache.getDefaultAddress()
        
        // Then
        assertNull(defaultAddress)
    }
    
    @Test
    fun `updateCachedAddress should update existing address`() = runTest {
        // Given
        val originalAddresses = listOf(
            createTestAddress("1", "Original Name", isDefault = true),
            createTestAddress("2", "Work Address", isDefault = false)
        )
        addressCache.cacheAddresses(originalAddresses)
        
        // When
        val updatedAddress = createTestAddress("1", "Updated Name", isDefault = true)
        addressCache.updateCachedAddress(updatedAddress)
        
        // Then
        val cachedAddresses = addressCache.getCachedAddresses()
        assertNotNull(cachedAddresses)
        val updatedCachedAddress = cachedAddresses!!.first { it.id == "1" }
        assertEquals("Updated Name", updatedCachedAddress.name)
    }
    
    @Test
    fun `removeCachedAddress should remove address from cache`() = runTest {
        // Given
        val addresses = listOf(
            createTestAddress("1", "Home Address", isDefault = true),
            createTestAddress("2", "Work Address", isDefault = false)
        )
        addressCache.cacheAddresses(addresses)
        
        // When
        addressCache.removeCachedAddress("2")
        
        // Then
        val cachedAddresses = addressCache.getCachedAddresses()
        assertNotNull(cachedAddresses)
        assertEquals(1, cachedAddresses!!.size)
        assertEquals("1", cachedAddresses.first().id)
    }
    
    @Test
    fun `clear should remove all cached data`() = runTest {
        // Given
        val addresses = listOf(createTestAddress("1", "Home Address", isDefault = true))
        addressCache.cacheAddresses(addresses)
        
        // When
        addressCache.clear()
        
        // Then
        val cachedAddresses = addressCache.getCachedAddresses()
        val defaultAddress = addressCache.getDefaultAddress()
        
        assertNull(cachedAddresses)
        assertNull(defaultAddress)
    }
    
    @Test
    fun `isCacheValid should return true for fresh cache`() = runTest {
        // Given
        val addresses = listOf(createTestAddress("1", "Home Address", isDefault = true))
        
        // When
        addressCache.cacheAddresses(addresses)
        
        // Then
        assertTrue(addressCache.isCacheValid())
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