package com.shambit.customer.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Network Connectivity Manager
 * Provides real-time network connectivity status and enhanced error handling
 * Requirements: 11.4, 11.5
 */
@Singleton
class NetworkConnectivityManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val _isConnected = MutableStateFlow(isNetworkAvailable())
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    
    private val _connectionType = MutableStateFlow(getConnectionType())
    val connectionType: StateFlow<ConnectionType> = _connectionType.asStateFlow()
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            super.onAvailable(network)
            _isConnected.value = true
            _connectionType.value = getConnectionType()
        }
        
        override fun onLost(network: Network) {
            super.onLost(network)
            _isConnected.value = false
            _connectionType.value = ConnectionType.NONE
        }
        
        override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
            super.onCapabilitiesChanged(network, networkCapabilities)
            _isConnected.value = isNetworkAvailable()
            _connectionType.value = getConnectionType()
        }
    }
    
    init {
        registerNetworkCallback()
    }
    
    /**
     * Register network callback to monitor connectivity changes
     */
    private fun registerNetworkCallback() {
        try {
            val networkRequest = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            
            connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        } catch (e: Exception) {
            // Handle registration failure gracefully
        }
    }
    
    /**
     * Check if network is currently available
     */
    fun isNetworkAvailable(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Get current connection type
     */
    private fun getConnectionType(): ConnectionType {
        return try {
            val network = connectivityManager.activeNetwork ?: return ConnectionType.NONE
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return ConnectionType.NONE
            
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> ConnectionType.WIFI
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> ConnectionType.CELLULAR
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> ConnectionType.ETHERNET
                else -> ConnectionType.OTHER
            }
        } catch (e: Exception) {
            ConnectionType.NONE
        }
    }
    
    /**
     * Check if connection is metered (limited data)
     */
    fun isConnectionMetered(): Boolean {
        return try {
            connectivityManager.isActiveNetworkMetered
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Get network quality assessment
     */
    fun getNetworkQuality(): NetworkQuality {
        if (!isNetworkAvailable()) return NetworkQuality.NO_CONNECTION
        
        return when (getConnectionType()) {
            ConnectionType.WIFI -> NetworkQuality.GOOD
            ConnectionType.CELLULAR -> {
                // Could be enhanced with signal strength detection
                if (isConnectionMetered()) NetworkQuality.LIMITED else NetworkQuality.GOOD
            }
            ConnectionType.ETHERNET -> NetworkQuality.EXCELLENT
            ConnectionType.OTHER -> NetworkQuality.FAIR
            ConnectionType.NONE -> NetworkQuality.NO_CONNECTION
        }
    }
    
    /**
     * Enhanced error analysis for network-related errors
     */
    fun analyzeNetworkError(error: NetworkResult.Error): NetworkErrorAnalysis {
        val isConnected = isNetworkAvailable()
        val connectionType = getConnectionType()
        val isMetered = isConnectionMetered()
        
        return NetworkErrorAnalysis(
            isNetworkAvailable = isConnected,
            connectionType = connectionType,
            isMetered = isMetered,
            errorType = when {
                !isConnected -> NetworkErrorType.NO_CONNECTION
                NetworkConnectivityHelper.isNetworkError(error) -> NetworkErrorType.NETWORK_ISSUE
                NetworkConnectivityHelper.isMalformedResponseError(error) -> NetworkErrorType.MALFORMED_RESPONSE
                error.code in listOf("500", "502", "503", "504") -> NetworkErrorType.SERVER_ERROR
                error.code == "429" -> NetworkErrorType.RATE_LIMITED
                else -> NetworkErrorType.UNKNOWN
            },
            recommendedAction = getRecommendedAction(error, isConnected, connectionType),
            retryDelay = NetworkConnectivityHelper.getRetryDelay(error, 0)
        )
    }
    
    /**
     * Get recommended action for network error
     */
    private fun getRecommendedAction(
        error: NetworkResult.Error,
        isConnected: Boolean,
        connectionType: ConnectionType
    ): RecommendedAction {
        return when {
            !isConnected -> RecommendedAction.CHECK_CONNECTION
            NetworkConnectivityHelper.isMalformedResponseError(error) -> RecommendedAction.RETRY_IMMEDIATELY
            error.code == "429" -> RecommendedAction.WAIT_AND_RETRY
            error.code in listOf("500", "502", "503", "504") -> RecommendedAction.RETRY_WITH_BACKOFF
            connectionType == ConnectionType.CELLULAR && isConnectionMetered() -> RecommendedAction.SUGGEST_WIFI
            else -> RecommendedAction.RETRY_IMMEDIATELY
        }
    }
    
    /**
     * Cleanup network callback
     */
    fun cleanup() {
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            // Handle cleanup failure gracefully
        }
    }
}

/**
 * Connection type enumeration
 */
enum class ConnectionType {
    WIFI, CELLULAR, ETHERNET, OTHER, NONE
}

/**
 * Network quality assessment
 */
enum class NetworkQuality {
    EXCELLENT, GOOD, FAIR, LIMITED, NO_CONNECTION
}

/**
 * Network error type classification
 */
enum class NetworkErrorType {
    NO_CONNECTION, NETWORK_ISSUE, MALFORMED_RESPONSE, SERVER_ERROR, RATE_LIMITED, UNKNOWN
}

/**
 * Recommended action for network errors
 */
enum class RecommendedAction {
    CHECK_CONNECTION, RETRY_IMMEDIATELY, RETRY_WITH_BACKOFF, WAIT_AND_RETRY, SUGGEST_WIFI
}

/**
 * Network error analysis result
 */
data class NetworkErrorAnalysis(
    val isNetworkAvailable: Boolean,
    val connectionType: ConnectionType,
    val isMetered: Boolean,
    val errorType: NetworkErrorType,
    val recommendedAction: RecommendedAction,
    val retryDelay: Long
)