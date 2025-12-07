package com.shambit.customer.data.remote.interceptor

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
 */
class TokenAuthenticator @Inject constructor(
    private val userPreferences: UserPreferences,
    private val gson: Gson
) : Authenticator {
    
    private val client = OkHttpClient()
    
    override fun authenticate(route: Route?, response: Response): Request? {
        // If we already tried to refresh, don't try again
        if (response.request.header("Authorization")?.contains("Bearer") == true &&
            response.priorResponse?.code == 401) {
            // Already tried to refresh, logout user
            runBlocking {
                userPreferences.clearAll()
            }
            return null
        }
        
        // Get refresh token
        val refreshToken = runBlocking {
            userPreferences.getRefreshToken().first()
        } ?: return null
        
        // Try to refresh the token
        return runBlocking {
            try {
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
                    val apiResponse = gson.fromJson(responseBody, object : com.google.gson.reflect.TypeToken<ApiResponse<RefreshTokenResponse>>() {}.type) as ApiResponse<RefreshTokenResponse>
                    
                    if (apiResponse.success && apiResponse.data != null) {
                        val newAccessToken = apiResponse.data.tokens.accessToken
                        val newRefreshToken = apiResponse.data.tokens.refreshToken
                        
                        // Save new tokens
                        userPreferences.saveTokens(newAccessToken, newRefreshToken)
                        
                        // Retry the request with new token
                        response.request.newBuilder()
                            .header("Authorization", "Bearer $newAccessToken")
                            .build()
                    } else {
                        // Failed to get new tokens, logout
                        userPreferences.clearAll()
                        null
                    }
                } else {
                    // Refresh failed, logout user
                    userPreferences.clearAll()
                    null
                }
            } catch (e: Exception) {
                // Error refreshing token, logout user
                userPreferences.clearAll()
                null
            }
        }
    }
}
