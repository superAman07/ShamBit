package com.shambit.customer.util

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
 * Extension function to handle API responses
 */
suspend fun <T> safeApiCall(
    apiCall: suspend () -> retrofit2.Response<com.shambit.customer.data.remote.dto.ApiResponse<T>>
): NetworkResult<T> {
    return try {
        val response = apiCall()
        
        if (response.isSuccessful) {
            val body = response.body()
            if (body != null && body.success && body.data != null) {
                NetworkResult.Success(body.data)
            } else {
                NetworkResult.Error(
                    message = body?.error?.message ?: "Unknown error occurred",
                    code = body?.error?.code
                )
            }
        } else {
            NetworkResult.Error(
                message = response.message() ?: "An error occurred",
                code = response.code().toString()
            )
        }
    } catch (e: Exception) {
        NetworkResult.Error(
            message = e.message ?: "Network error occurred"
        )
    }
}
