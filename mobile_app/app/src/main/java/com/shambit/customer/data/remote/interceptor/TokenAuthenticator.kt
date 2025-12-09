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
 * Note: The authenticate() method is called synchronously by OkHttp's interceptor chain,
 * so we must use runBlocking to bridge the async DataStore operations. This is acceptable
 * because:
 * 1. Token refresh is a rare operation (only when access token expires)
 * 2. The operation is already on a background thread (OkHttp's network thread)
 * 3. DataStore operations are fast (reading/writing small amounts of data)
 * 4. There's no alternative - the Authenticator interface requires a synchronous method
 */
class TokenAuthenticator @Inject constructor(
    private val userPreferences: UserPreferences,
    private val gson: Gson
) : Authenticator {
    
    private val client = OkHttpClient()
    
    companion object {
        private const val TAG = "TokenAuthenticator"
    }
    
    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite retry loop - if we already tried to refresh, don't try again
        if (response.request.header("Authorization")?.contains("Bearer") == true &&
            response.priorResponse?.code == 401) {
            Log.w(TAG, "Token refresh already attempted, logging out user")
            // Already tried to refresh, logout user
            // Safe to use runBlocking here - we're on OkHttp's background thread
            runBlocking {
                userPreferences.clearAll()
            }
            return null
        }
        
        // Get refresh token from DataStore
        // Safe to use runBlocking here - we're on OkHttp's background thread
        // and this is a synchronous read operation
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
        // Safe to use runBlocking here - we're on OkHttp's background thread
        return runBlocking {
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
                        // This is a write operation, but it's acceptable to use runBlocking here because:
                        // 1. We're already on a background thread (OkHttp's network thread)
                        // 2. DataStore writes are fast (small data)
                        // 3. We need the tokens saved before retrying the request
                        // 4. The alternative (fire-and-forget) could lead to race conditions
                        userPreferences.saveTokens(newAccessToken, newRefreshToken)
                        
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
    }
}
