package com.shambit.customer.di

import com.shambit.customer.data.local.preferences.UserPreferences
import com.shambit.customer.data.remote.api.AuthApi
import com.shambit.customer.data.remote.api.BannerApi
import com.shambit.customer.data.remote.api.OrderApi
import com.shambit.customer.data.remote.api.ProductApi
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.api.PromotionApi
import com.shambit.customer.data.repository.AuthRepository
import com.shambit.customer.data.repository.BannerRepository
import com.shambit.customer.data.repository.OrderRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.data.repository.PromotionRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for providing repository dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {
    
    /**
     * Provide AuthRepository
     */
    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        userPreferences: UserPreferences
    ): AuthRepository {
        return AuthRepository(authApi, userPreferences)
    }
    
    /**
     * Provide ProductRepository
     */
    @Provides
    @Singleton
    fun provideProductRepository(
        productApi: ProductApi
    ): ProductRepository {
        return ProductRepository(productApi)
    }
    
    /**
     * Provide OrderRepository
     */
    @Provides
    @Singleton
    fun provideOrderRepository(
        orderApi: OrderApi
    ): OrderRepository {
        return OrderRepository(orderApi)
    }
    
    /**
     * Provide BannerRepository
     */
    @Provides
    @Singleton
    fun provideBannerRepository(
        bannerApi: BannerApi
    ): BannerRepository {
        return BannerRepository(bannerApi)
    }
    
    /**
     * Provide PromotionRepository
     */
    @Provides
    @Singleton
    fun providePromotionRepository(
        promotionApi: PromotionApi
    ): PromotionRepository {
        return PromotionRepository(promotionApi)
    }
}
