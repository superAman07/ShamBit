package com.shambit.customer.util

import android.content.Context
import retrofit2.Response
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import kotlin.math.pow

/**
 * A generic class that holds a value with its loading status
 */
sealed class Resource<T>(
    val data: T? = null,
    val message: String? = null
) {
    class Success<T>(data: T) : Resource<T>(data)
    class Error<T>(message: String, data: T? = null) : Resource<T>(data, message)
    class Loading<T>(data: T? = null) : Resource<T>(data)
}

/**
 * Network result wrapper
 */
sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: String? = null) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()
}

/**
 * Extension function to handle API responses with enhanced error handling
 * Requirements: 11.4, 11.5
 */
suspend fun <T> safeApiCall(
    apiCall: suspend () -> Response<com.shambit.customer.data.remote.dto.ApiResponse<T>>
): NetworkResult<T> {
    return try {
        val response = apiCall()
        
        if (response.isSuccessful) {
            val body = response.body()
            
            // Enhanced malformed response detection (Requirements: 11.5)
            when {
                body == null -> {
                    NetworkResult.Error(
                        message = "Malformed response: empty body",
                        code = "MALFORMED_RESPONSE"
                    )
                }
                !body.success -> {
                    NetworkResult.Error(
                        message = body.error?.message ?: "API request failed",
                        code = body.error?.code ?: "API_ERROR"
                    )
                }
                body.data == null -> {
                    NetworkResult.Error(
                        message = "Malformed response: missing data",
                        code = "MISSING_DATA"
                    )
                }
                else -> {
                    NetworkResult.Success(body.data)
                }
            }
        } else {
            // Enhanced HTTP error handling (Requirements: 11.4)
            val errorMessage = when (response.code()) {
                408 -> "Request timeout - please check your connection"
                429 -> "Too many requests - please try again later"
                500, 502, 503, 504 -> "Server temporarily unavailable"
                else -> response.message() ?: "An error occurred"
            }
            
            NetworkResult.Error(
                message = errorMessage,
                code = response.code().toString()
            )
        }
    } catch (e: UnknownHostException) {
        // Network connectivity issue (Requirements: 11.4)
        NetworkResult.Error(
            message = "No internet connection available",
            code = "NO_INTERNET"
        )
    } catch (e: SocketTimeoutException) {
        // Timeout issue (Requirements: 11.4)
        NetworkResult.Error(
            message = "Connection timeout - please try again",
            code = "TIMEOUT"
        )
    } catch (e: IOException) {
        // General network issue (Requirements: 11.4)
        NetworkResult.Error(
            message = "Network error - please check your connection",
            code = "NETWORK_ERROR"
        )
    } catch (e: JsonSyntaxException) {
        // JSON parsing error - malformed response (Requirements: 11.5)
        NetworkResult.Error(
            message = "Malformed response from server",
            code = "MALFORMED_JSON"
        )
    } catch (e: Exception) {
        // Catch-all for unexpected errors (Requirements: 11.5)
        NetworkResult.Error(
            message = e.message ?: "Unexpected error occurred",
            code = "UNKNOWN_ERROR"
        )
    }
}


