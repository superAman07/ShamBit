package com.shambit.customer.domain.usecase

import com.shambit.customer.domain.model.Address
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for locking an address before proceeding to payment
 * 
 * This use case handles the address locking mechanism that prevents
 * address changes once the user proceeds to payment. This ensures
 * order integrity and prevents payment failures due to address changes.
 * 
 * Requirements: 7.4, 7.6
 */
class LockCheckoutAddressUseCase @Inject constructor() {
    
    // In-memory storage for locked address state
    // In a real implementation, this might be stored in a more persistent way
    private var lockedAddress: Address? = null
    private var lockTimestamp: Long? = null
    
    /**
     * Lock an address for checkout
     * 
     * @param address The address to lock for checkout
     * @return NetworkResult indicating success or failure of the lock operation
     */
    suspend operator fun invoke(address: Address): NetworkResult<Address> {
        return try {
            // Simulate potential network call for address validation/locking
            // In a real implementation, this might call an API to reserve the address
            
            // Lock the address
            lockedAddress = address
            lockTimestamp = System.currentTimeMillis()
            
            NetworkResult.Success(address)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to lock address for checkout: ${e.message}")
        }
    }
    
    /**
     * Get the currently locked address
     * 
     * @return NetworkResult containing the locked address or null if no address is locked
     */
    suspend fun getLockedAddress(): NetworkResult<Address?> {
        return try {
            NetworkResult.Success(lockedAddress)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to get locked address: ${e.message}")
        }
    }
    
    /**
     * Check if an address is currently locked
     * 
     * @return NetworkResult containing boolean indicating if address is locked
     */
    suspend fun isAddressLocked(): NetworkResult<Boolean> {
        return try {
            NetworkResult.Success(lockedAddress != null)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to check address lock status: ${e.message}")
        }
    }
    
    /**
     * Unlock the address (typically called after payment completion or cancellation)
     * 
     * @return NetworkResult indicating success or failure of the unlock operation
     */
    suspend fun unlockAddress(): NetworkResult<Unit> {
        return try {
            lockedAddress = null
            lockTimestamp = null
            NetworkResult.Success(Unit)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to unlock address: ${e.message}")
        }
    }
    
    /**
     * Get the timestamp when the address was locked
     * 
     * @return NetworkResult containing the lock timestamp or null if no address is locked
     */
    suspend fun getLockTimestamp(): NetworkResult<Long?> {
        return try {
            NetworkResult.Success(lockTimestamp)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to get lock timestamp: ${e.message}")
        }
    }
}