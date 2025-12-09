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
        
        // Add Authorization and Content-Type headers
        val requestBuilder = originalRequest.newBuilder()
        
        // Add Authorization header if token exists
        if (accessToken != null) {
            requestBuilder.addHeader("Authorization", "Bearer $accessToken")
        }
        
        // Add Content-Type header for all requests (required by API security middleware)
        // Only add if not already present and not a multipart request
        if (originalRequest.header("Content-Type") == null && 
            originalRequest.body?.contentType()?.type != "multipart") {
            requestBuilder.addHeader("Content-Type", "application/json")
        }
        
        return chain.proceed(requestBuilder.build())
    }
}
