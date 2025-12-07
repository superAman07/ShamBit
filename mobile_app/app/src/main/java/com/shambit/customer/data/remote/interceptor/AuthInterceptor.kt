package com.shambit.customer.data.remote.interceptor

import com.shambit.customer.data.local.preferences.UserPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/**
 * Interceptor to add authentication token to requests
 */
class AuthInterceptor @Inject constructor(
    private val userPreferences: UserPreferences
) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Skip auth for login/register endpoints
        val url = originalRequest.url.toString()
        if (url.contains("/auth/register") || 
            url.contains("/auth/send-otp") || 
            url.contains("/auth/verify-otp") ||
            url.contains("/auth/refresh-token")) {
            return chain.proceed(originalRequest)
        }
        
        // Get access token from preferences
        val accessToken = runBlocking {
            userPreferences.getAccessToken().first()
        }
        
        // Add Authorization header if token exists
        val newRequest = if (accessToken != null) {
            originalRequest.newBuilder()
                .addHeader("Authorization", "Bearer $accessToken")
                .build()
        } else {
            originalRequest
        }
        
        return chain.proceed(newRequest)
    }
}
