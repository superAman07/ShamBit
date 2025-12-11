package com.shambit.customer.di

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.domain.usecase.AddAddressUseCase
import com.shambit.customer.domain.usecase.DeleteAddressUseCase
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.GetCheckoutAddressUseCase
import com.shambit.customer.domain.usecase.LockCheckoutAddressUseCase
import com.shambit.customer.domain.usecase.SelectCheckoutAddressUseCase
import com.shambit.customer.domain.usecase.SetDefaultAddressUseCase
import com.shambit.customer.domain.usecase.UpdateAddressUseCase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for providing address-related use cases
 * 
 * This module provides all address use cases with their required dependencies.
 * All use cases are provided as singletons to ensure consistent state management
 * and optimal performance.
 * 
 * Requirements: All address management requirements
 */
@Module
@InstallIn(SingletonComponent::class)
object AddressModule {
    
    /**
     * Provide GetAddressesUseCase
     * 
     * Handles address retrieval with cache-first strategy.
     * 
     * Requirements: 4.1
     */
    @Provides
    @Singleton
    fun provideGetAddressesUseCase(
        addressRepository: AddressRepository,
        addressCache: AddressCache
    ): GetAddressesUseCase {
        return GetAddressesUseCase(addressRepository, addressCache)
    }
    
    /**
     * Provide AddAddressUseCase
     * 
     * Handles address creation with validation and default logic.
     * 
     * Requirements: 1.1, 1.2, 1.3
     */
    @Provides
    @Singleton
    fun provideAddAddressUseCase(
        addressRepository: AddressRepository,
        addressCache: AddressCache
    ): AddAddressUseCase {
        return AddAddressUseCase(addressRepository, addressCache)
    }
    
    /**
     * Provide UpdateAddressUseCase
     * 
     * Handles address updates with validation and default preservation.
     * 
     * Requirements: 2.1, 2.2, 2.3
     */
    @Provides
    @Singleton
    fun provideUpdateAddressUseCase(
        addressRepository: AddressRepository,
        addressCache: AddressCache
    ): UpdateAddressUseCase {
        return UpdateAddressUseCase(addressRepository, addressCache)
    }
    
    /**
     * Provide DeleteAddressUseCase
     * 
     * Handles address deletion with default address management.
     * 
     * Requirements: 3.2, 3.3, 11.5
     */
    @Provides
    @Singleton
    fun provideDeleteAddressUseCase(
        addressRepository: AddressRepository,
        addressCache: AddressCache
    ): DeleteAddressUseCase {
        return DeleteAddressUseCase(addressRepository, addressCache)
    }
    
    /**
     * Provide SetDefaultAddressUseCase
     * 
     * Handles setting default address with single default invariant.
     * 
     * Requirements: 4.1, 4.2
     */
    @Provides
    @Singleton
    fun provideSetDefaultAddressUseCase(
        addressRepository: AddressRepository,
        addressCache: AddressCache
    ): SetDefaultAddressUseCase {
        return SetDefaultAddressUseCase(addressRepository, addressCache)
    }
    
    /**
     * Provide GetCheckoutAddressUseCase
     * 
     * Handles checkout address retrieval and validation.
     * 
     * Requirements: 7.1, 8.1
     */
    @Provides
    @Singleton
    fun provideGetCheckoutAddressUseCase(
        addressCache: AddressCache
    ): GetCheckoutAddressUseCase {
        return GetCheckoutAddressUseCase(addressCache)
    }
    
    /**
     * Provide SelectCheckoutAddressUseCase
     * 
     * Handles address selection during checkout flow.
     * 
     * Requirements: 5.3, 7.3
     */
    @Provides
    @Singleton
    fun provideSelectCheckoutAddressUseCase(
        addressCache: AddressCache
    ): SelectCheckoutAddressUseCase {
        return SelectCheckoutAddressUseCase(addressCache)
    }
    
    /**
     * Provide LockCheckoutAddressUseCase
     * 
     * Handles address locking before payment to prevent changes.
     * 
     * Requirements: 7.4, 7.6
     */
    @Provides
    @Singleton
    fun provideLockCheckoutAddressUseCase(): LockCheckoutAddressUseCase {
        return LockCheckoutAddressUseCase()
    }
}