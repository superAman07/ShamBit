package com.shambit.customer.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.shambit.customer.BuildConfig
import com.shambit.customer.data.remote.api.AuthApi
import com.shambit.customer.data.remote.api.BannerApi
import com.shambit.customer.data.remote.api.CartApi
import com.shambit.customer.data.remote.api.LocationApi
import com.shambit.customer.data.remote.api.OrderApi
import com.shambit.customer.data.remote.api.ProductApi
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.api.PromotionApi
import com.shambit.customer.data.remote.api.WishlistApi
import com.shambit.customer.data.remote.interceptor.AuthInterceptor
import com.shambit.customer.data.remote.interceptor.NetworkInterceptor
import com.shambit.customer.data.remote.interceptor.TokenAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module for providing network dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    /**
     * Provide Gson instance
     */
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }
    
    /**
     * Provide HTTP logging interceptor
     */
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                // Use BASIC to avoid logging sensitive headers like Authorization
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }
    
    /**
     * Provide OkHttpClient
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        networkInterceptor: NetworkInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
        tokenAuthenticator: TokenAuthenticator,
        @dagger.hilt.android.qualifiers.ApplicationContext context: android.content.Context
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(networkInterceptor)
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .authenticator(tokenAuthenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            // PERFORMANCE FIX: Enable HTTP caching to work with server cache headers
            .cache(okhttp3.Cache(
                directory = java.io.File(context.cacheDir, "http_cache"),
                maxSize = 50L * 1024L * 1024L // 50 MB cache
            ))
            .build()
    }
    
    /**
     * Provide Retrofit instance
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        gson: Gson
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }
    
    /**
     * Provide AuthApi
     */
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }
    
    /**
     * Provide ProductApi
     */
    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }
    
    /**
     * Provide OrderApi
     */
    @Provides
    @Singleton
    fun provideOrderApi(retrofit: Retrofit): OrderApi {
        return retrofit.create(OrderApi::class.java)
    }
    
    /**
     * Provide ProfileApi
     */
    @Provides
    @Singleton
    fun provideProfileApi(retrofit: Retrofit): ProfileApi {
        return retrofit.create(ProfileApi::class.java)
    }
    
    /**
     * Provide BannerApi
     */
    @Provides
    @Singleton
    fun provideBannerApi(retrofit: Retrofit): BannerApi {
        return retrofit.create(BannerApi::class.java)
    }
    
    /**
     * Provide PromotionApi
     */
    @Provides
    @Singleton
    fun providePromotionApi(retrofit: Retrofit): PromotionApi {
        return retrofit.create(PromotionApi::class.java)
    }
    
    /**
     * Provide CartApi
     */
    @Provides
    @Singleton
    fun provideCartApi(retrofit: Retrofit): CartApi {
        return retrofit.create(CartApi::class.java)
    }
    
    /**
     * Provide WishlistApi
     */
    @Provides
    @Singleton
    fun provideWishlistApi(retrofit: Retrofit): WishlistApi {
        return retrofit.create(WishlistApi::class.java)
    }
    
    /**
     * Provide LocationApi
     */
    @Provides
    @Singleton
    fun provideLocationApi(retrofit: Retrofit): LocationApi {
        return retrofit.create(LocationApi::class.java)
    }
    
    /**
     * PERFORMANCE FIX: Provide optimized ImageLoader
     */
    @Provides
    @Singleton
    fun provideImageLoader(
        @dagger.hilt.android.qualifiers.ApplicationContext context: android.content.Context,
        okHttpClient: OkHttpClient
    ): coil.ImageLoader {
        return com.shambit.customer.util.ImageOptimizer(context, okHttpClient)
            .createOptimizedImageLoader()
    }
}
