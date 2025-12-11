package com.shambit.customer.util

import com.shambit.customer.domain.model.Address
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

/**
 * Optimistic update manager for address operations
 * 
 * Provides optimistic UI updates with rollback capability
 * for better user experience during network operations.
 * 
 * Requirements: 3.5, 7.6, 11.3
 */

/**
 * Represents an optimistic operation that can be rolled back
 */
sealed class OptimisticOperation {
    abstract val id: String
    abstract val timestamp: Long
    
    data class AddAddress(
        override val id: String = UUID.randomUUID().toString(),
        override val timestamp: Long = System.currentTimeMillis(),
        val address: Address
    ) : OptimisticOperation()
    
    data class UpdateAddress(
        override val id: String = UUID.randomUUID().toString(),
        override val timestamp: Long = System.currentTimeMillis(),
        val addressId: String,
        val updatedAddress: Address,
        val originalAddress: Address
    ) : OptimisticOperation()
    
    data class DeleteAddress(
        override val id: String = UUID.randomUUID().toString(),
        override val timestamp: Long = System.currentTimeMillis(),
        val addressId: String,
        val deletedAddress: Address,
        val wasSelected: Boolean,
        val wasDefault: Boolean
    ) : OptimisticOperation()
    
    data class SetDefaultAddress(
        override val id: String = UUID.randomUUID().toString(),
        override val timestamp: Long = System.currentTimeMillis(),
        val newDefaultId: String,
        val previousDefaultId: String?
    ) : OptimisticOperation()
}

/**
 * State of an optimistic operation
 */
sealed class OperationStatus {
    object Pending : OperationStatus()
    object Confirmed : OperationStatus()
    data class Failed(val error: String) : OperationStatus()
}

/**
 * Optimistic operation with its current status
 */
data class TrackedOperation(
    val operation: OptimisticOperation,
    val status: OperationStatus = OperationStatus.Pending
)

/**
 * Manager for optimistic updates with rollback capability
 */
class OptimisticUpdateManager {
    
    private val _pendingOperations = MutableStateFlow<Map<String, TrackedOperation>>(emptyMap())
    val pendingOperations: StateFlow<Map<String, TrackedOperation>> = _pendingOperations.asStateFlow()
    
    private val _addresses = MutableStateFlow<List<Address>>(emptyList())
    val addresses: StateFlow<List<Address>> = _addresses.asStateFlow()
    
    /**
     * Initialize with current addresses
     */
    fun initialize(initialAddresses: List<Address>) {
        _addresses.value = initialAddresses
    }
    
    /**
     * Apply optimistic add address operation
     */
    fun optimisticallyAddAddress(address: Address): String {
        val operation = OptimisticOperation.AddAddress(address = address)
        
        // Add to pending operations
        _pendingOperations.value = _pendingOperations.value + (operation.id to TrackedOperation(operation))
        
        // Apply optimistic update
        val currentAddresses = _addresses.value.toMutableList()
        currentAddresses.add(address)
        _addresses.value = currentAddresses
        
        return operation.id
    }
    
    /**
     * Apply optimistic update address operation
     */
    fun optimisticallyUpdateAddress(addressId: String, updatedAddress: Address): String? {
        val currentAddresses = _addresses.value
        val originalAddress = currentAddresses.find { it.id == addressId } ?: return null
        
        val operation = OptimisticOperation.UpdateAddress(
            addressId = addressId,
            updatedAddress = updatedAddress,
            originalAddress = originalAddress
        )
        
        // Add to pending operations
        _pendingOperations.value = _pendingOperations.value + (operation.id to TrackedOperation(operation))
        
        // Apply optimistic update
        val updatedAddresses = currentAddresses.map { address ->
            if (address.id == addressId) updatedAddress else address
        }
        _addresses.value = updatedAddresses
        
        return operation.id
    }
    
    /**
     * Apply optimistic delete address operation
     */
    fun optimisticallyDeleteAddress(
        addressId: String, 
        wasSelected: Boolean = false,
        wasDefault: Boolean = false
    ): String? {
        val currentAddresses = _addresses.value
        val addressToDelete = currentAddresses.find { it.id == addressId } ?: return null
        
        val operation = OptimisticOperation.DeleteAddress(
            addressId = addressId,
            deletedAddress = addressToDelete,
            wasSelected = wasSelected,
            wasDefault = wasDefault
        )
        
        // Add to pending operations
        _pendingOperations.value = _pendingOperations.value + (operation.id to TrackedOperation(operation))
        
        // Apply optimistic update
        val updatedAddresses = currentAddresses.filter { it.id != addressId }
        _addresses.value = updatedAddresses
        
        return operation.id
    }
    
    /**
     * Apply optimistic set default address operation
     */
    fun optimisticallySetDefaultAddress(newDefaultId: String): String? {
        val currentAddresses = _addresses.value
        val previousDefault = currentAddresses.find { it.isDefault }
        
        val operation = OptimisticOperation.SetDefaultAddress(
            newDefaultId = newDefaultId,
            previousDefaultId = previousDefault?.id
        )
        
        // Add to pending operations
        _pendingOperations.value = _pendingOperations.value + (operation.id to TrackedOperation(operation))
        
        // Apply optimistic update
        val updatedAddresses = currentAddresses.map { address ->
            address.copy(isDefault = address.id == newDefaultId)
        }
        _addresses.value = updatedAddresses
        
        return operation.id
    }
    
    /**
     * Confirm an optimistic operation (remove from pending)
     */
    fun confirmOperation(operationId: String, confirmedAddresses: List<Address>? = null) {
        val currentOperations = _pendingOperations.value.toMutableMap()
        val operation = currentOperations[operationId]
        
        if (operation != null) {
            // Update operation status to confirmed
            currentOperations[operationId] = operation.copy(status = OperationStatus.Confirmed)
            _pendingOperations.value = currentOperations
            
            // Update addresses with confirmed state if provided
            confirmedAddresses?.let { addresses ->
                _addresses.value = addresses
            }
            
            // Remove confirmed operation after a delay to allow UI to show confirmation
            removeOperationAfterDelay(operationId)
        }
    }
    
    /**
     * Rollback an optimistic operation
     */
    fun rollbackOperation(operationId: String, error: String) {
        val currentOperations = _pendingOperations.value.toMutableMap()
        val trackedOperation = currentOperations[operationId] ?: return
        
        // Update operation status to failed
        currentOperations[operationId] = trackedOperation.copy(
            status = OperationStatus.Failed(error)
        )
        _pendingOperations.value = currentOperations
        
        // Rollback the optimistic change
        when (val operation = trackedOperation.operation) {
            is OptimisticOperation.AddAddress -> {
                rollbackAddAddress(operation)
            }
            is OptimisticOperation.UpdateAddress -> {
                rollbackUpdateAddress(operation)
            }
            is OptimisticOperation.DeleteAddress -> {
                rollbackDeleteAddress(operation)
            }
            is OptimisticOperation.SetDefaultAddress -> {
                rollbackSetDefaultAddress(operation)
            }
        }
        
        // Remove failed operation after a delay
        removeOperationAfterDelay(operationId)
    }
    
    /**
     * Rollback add address operation
     */
    private fun rollbackAddAddress(operation: OptimisticOperation.AddAddress) {
        val currentAddresses = _addresses.value.toMutableList()
        currentAddresses.removeAll { it.id == operation.address.id }
        _addresses.value = currentAddresses
    }
    
    /**
     * Rollback update address operation
     */
    private fun rollbackUpdateAddress(operation: OptimisticOperation.UpdateAddress) {
        val currentAddresses = _addresses.value.map { address ->
            if (address.id == operation.addressId) {
                operation.originalAddress
            } else {
                address
            }
        }
        _addresses.value = currentAddresses
    }
    
    /**
     * Rollback delete address operation
     */
    private fun rollbackDeleteAddress(operation: OptimisticOperation.DeleteAddress) {
        val currentAddresses = _addresses.value.toMutableList()
        currentAddresses.add(operation.deletedAddress)
        _addresses.value = currentAddresses
    }
    
    /**
     * Rollback set default address operation
     */
    private fun rollbackSetDefaultAddress(operation: OptimisticOperation.SetDefaultAddress) {
        val currentAddresses = _addresses.value.map { address ->
            when {
                address.id == operation.newDefaultId -> address.copy(isDefault = false)
                address.id == operation.previousDefaultId -> address.copy(isDefault = true)
                else -> address
            }
        }
        _addresses.value = currentAddresses
    }
    
    /**
     * Remove operation from pending list after delay
     */
    private fun removeOperationAfterDelay(operationId: String) {
        // In a real implementation, this would use a coroutine with delay
        // For now, we'll remove immediately
        val currentOperations = _pendingOperations.value.toMutableMap()
        currentOperations.remove(operationId)
        _pendingOperations.value = currentOperations
    }
    
    /**
     * Get current addresses with optimistic updates applied
     */
    fun getCurrentAddresses(): List<Address> {
        return _addresses.value
    }
    
    /**
     * Check if there are pending operations
     */
    fun hasPendingOperations(): Boolean {
        return _pendingOperations.value.values.any { it.status is OperationStatus.Pending }
    }
    
    /**
     * Get pending operations count
     */
    fun getPendingOperationsCount(): Int {
        return _pendingOperations.value.values.count { it.status is OperationStatus.Pending }
    }
    
    /**
     * Clear all operations (use with caution)
     */
    fun clearAllOperations() {
        _pendingOperations.value = emptyMap()
    }
    
    /**
     * Sync with authoritative state (from server)
     */
    fun syncWithAuthoritativeState(authoritativeAddresses: List<Address>) {
        // Clear all pending operations and update with server state
        _pendingOperations.value = emptyMap()
        _addresses.value = authoritativeAddresses
    }
}