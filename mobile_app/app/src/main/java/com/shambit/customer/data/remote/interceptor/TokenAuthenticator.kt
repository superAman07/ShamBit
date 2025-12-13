package com.shambit.customer.data.remote.interceptor

import android.util.Log
import com.google.gson.Gson
import com.shambit.customer.BuildConfig
import com.shambit.customer.data.local.preferences.UserPreferences
import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.request.RefreshTokenRequest
import com.shambit.customer.data.remote.dto.response.RefreshTokenResponse
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject

/**
 * Authenticator to handle token refresh on 401 errors
 * 
 * PERFORMANCE FIX: Added synchronization to prevent race conditions
 * when multiple requests trigger token refresh simultaneously
 */
class TokenAuthenticator @Inject constructor(
    private val userPreferences: UserPreferences,
    private val gson: Gson
) : Authenticator {
    
    private val client = OkHttpClient()
    
    // CRITICAL FIX: Synchronize token refresh to prevent race conditions
    private val refreshLock = Any()
    @Volatile
    private var isRefreshing = false
    @Volatile
    private var lastRefreshTime = 0L
    
    companion object {
        private const val TAG = "TokenAuthenticator"
        private const val REFRESH_COOLDOWN_MS = 5000L // 5 seconds cooldown
    }
    
    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite retry loop - if we already tried to refresh, don't try again
        if (response.request.header("Authorization")?.contains("Bearer") == true &&
            response.priorResponse?.code == 401) {
            Log.w(TAG, "Token refresh already attempted, logging out user")
            runBlocking {
                userPreferences.clearAll()
            }
            return null
        }
        
        // CRITICAL FIX: Synchronize token refresh to prevent race conditions
        synchronized(refreshLock) {
            val currentTime = System.currentTimeMillis()
            
            // If we're already refreshing or recently refreshed, wait or skip
            if (isRefreshing) {
                Log.d(TAG, "Token refresh already in progress, skipping")
                return null
            }
            
            // If we recently refreshed (within cooldown), skip to prevent spam
            if (currentTime - lastRefreshTime < REFRESH_COOLDOWN_MS) {
                Log.d(TAG, "Token refresh recently completed, skipping")
                return null
            }
            
            isRefreshing = true
        }
        
        return try {
            // Get refresh token from DataStore
            val refreshToken = runBlocking {
                try {
                    userPreferences.getRefreshToken().first()
                } catch (e: Exception) {
                    Log.e(TAG, "Error reading refresh token", e)
                    null
                }
            }
            
            if (refreshToken == null) {
                Log.w(TAG, "No refresh token available, cannot refresh")
                return null
            }
            
            // Try to refresh the token
            runBlocking {
                try {
                    Log.d(TAG, "Attempting to refresh access token")
                    
                    val requestBody = RefreshTokenRequest(refreshToken = refreshToken)
                    val json = gson.toJson(requestBody)
                    val body = json.toRequestBody("application/json".toMediaType())
                    
                    val request = Request.Builder()
                        .url("${BuildConfig.API_BASE_URL}auth/refresh-token")
                        .post(body)
                        .build()
                    
                    val refreshResponse = client.newCall(request).execute()
                    
                    if (refreshResponse.isSuccessful) {
                        val responseBody = refreshResponse.body?.string()
                        val apiResponse = gson.fromJson(
                            responseBody, 
                            object : com.google.gson.reflect.TypeToken<ApiResponse<RefreshTokenResponse>>() {}.type
                        ) as ApiResponse<RefreshTokenResponse>
                        
                        if (apiResponse.success && apiResponse.data != null) {
                            val newAccessToken = apiResponse.data.tokens.accessToken
                            val newRefreshToken = apiResponse.data.tokens.refreshToken
                            
                            Log.d(TAG, "Token refresh successful")
                            
                            // Save new tokens to DataStore
                            userPreferences.saveTokens(newAccessToken, newRefreshToken)
                            
                            // Update refresh tracking
                            lastRefreshTime = System.currentTimeMillis()
                            
                            // Retry the original request with new access token
                            response.request.newBuilder()
                                .header("Authorization", "Bearer $newAccessToken")
                                .build()
                        } else {
                            Log.w(TAG, "Token refresh failed: invalid response")
                            // Failed to get new tokens, logout user
                            userPreferences.clearAll()
                            null
                        }
                    } else {
                        Log.w(TAG, "Token refresh failed: HTTP ${refreshResponse.code}")
                        // Refresh failed, logout user
                        userPreferences.clearAll()
                        null
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error refreshing token", e)
                    // Error refreshing token, logout user
                    userPreferences.clearAll()
                    null
                }
            }
        } finally {
            // CRITICAL FIX: Always reset refresh flag
            synchronized(refreshLock) {
                isRefreshing = false
            }
        }
    }
}
