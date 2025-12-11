package com.shambit.customer.data.local.cache

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.shambit.customer.domain.model.Address
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DataStore implementation of AddressCache
 * 
 * Uses DataStore preferences to cache addresses locally with JSON serialization.
 * Provides efficient access to default address and cache validation.
 * 
 * Requirements: 4.1, 4.3
 */
@Singleton
class AddressCacheImpl @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val gson: Gson
) : AddressCache {
    
    companion object {
        private val ADDRESSES_CACHE_KEY = stringPreferencesKey("addresses_cache")
        private val ADDRESSES_CACHE_TIME_KEY = longPreferencesKey("addresses_cache_time")
        private val DEFAULT_ADDRESS_CACHE_KEY = stringPreferencesKey("default_address_cache")
        
        // Cache duration: 30 minutes
        private const val CACHE_DURATION = 30 * 60 * 1000L // 30 minutes in milliseconds
    }
    
    override suspend fun cacheAddresses(addresses: List<Address>) {
        val addressesJson = gson.toJson(addresses)
        val defaultAddress = addresses.find { it.isDefault }
        val defaultAddressJson = defaultAddress?.let { gson.toJson(it) }
        
        dataStore.edit { preferences ->
            preferences[ADDRESSES_CACHE_KEY] = addressesJson
            preferences[ADDRESSES_CACHE_TIME_KEY] = System.currentTimeMillis()
            if (defaultAddressJson != null) {
                preferences[DEFAULT_ADDRESS_CACHE_KEY] = defaultAddressJson
            } else {
                preferences.remove(DEFAULT_ADDRESS_CACHE_KEY)
            }
        }
    }
    
    override suspend fun getCachedAddresses(): List<Address>? {
        return try {
            val addressesJson = dataStore.data.map { preferences ->
                preferences[ADDRESSES_CACHE_KEY]
            }.first()
            
            if (addressesJson != null) {
                val type = object : TypeToken<List<Address>>() {}.type
                gson.fromJson<List<Address>>(addressesJson, type)
            } else {
                null
            }
        } catch (e: Exception) {
            // If deserialization fails, return null to force refresh
            null
        }
    }
    
    override suspend fun getDefaultAddress(): Address? {
        return try {
            val defaultAddressJson = dataStore.data.map { preferences ->
                preferences[DEFAULT_ADDRESS_CACHE_KEY]
            }.first()
            
            if (defaultAddressJson != null) {
                gson.fromJson(defaultAddressJson, Address::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            // If deserialization fails, return null
            null
        }
    }
    
    override suspend fun updateCachedAddress(address: Address) {
        val currentAddresses = getCachedAddresses()?.toMutableList() ?: return
        
        // Find and update the address
        val index = currentAddresses.indexOfFirst { it.id == address.id }
        if (index != -1) {
            currentAddresses[index] = address
            cacheAddresses(currentAddresses)
        }
    }
    
    override suspend fun removeCachedAddress(id: String) {
        val currentAddresses = getCachedAddresses()?.toMutableList() ?: return
        
        // Remove the address
        val updatedAddresses = currentAddresses.filter { it.id != id }
        cacheAddresses(updatedAddresses)
    }
    
    override suspend fun clear() {
        dataStore.edit { preferences ->
            preferences.remove(ADDRESSES_CACHE_KEY)
            preferences.remove(ADDRESSES_CACHE_TIME_KEY)
            preferences.remove(DEFAULT_ADDRESS_CACHE_KEY)
        }
    }
    
    override suspend fun isCacheValid(): Boolean {
        return try {
            val cacheTime = dataStore.data.map { preferences ->
                preferences[ADDRESSES_CACHE_TIME_KEY] ?: 0L
            }.first()
            
            val now = System.currentTimeMillis()
            (now - cacheTime) < CACHE_DURATION
        } catch (e: Exception) {
            false
        }
    }
}