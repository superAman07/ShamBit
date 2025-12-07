package com.shambit.customer

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.shambit.customer.data.local.preferences.UserPreferences
import com.shambit.customer.navigation.NavGraph
import com.shambit.customer.navigation.Screen
import com.shambit.customer.ui.theme.ShamBitTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Main Activity - Entry point of the app
 * Handles navigation and authentication state
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var userPreferences: UserPreferences
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        installSplashScreen()
        
        Log.d(TAG, "========================================")
        Log.d(TAG, "ShamBit App Started")
        Log.d(TAG, "========================================")
        
        setContent {
            ShamBitTheme {
                val navController = rememberNavController()
                var startDestination by remember { mutableStateOf<String?>(null) }
                
                // Determine start destination based on auth state
                LaunchedEffect(Unit) {
                    launch {
                        val accessToken = userPreferences.getAccessToken().first()
                        startDestination = if (accessToken != null) {
                            Log.d(TAG, "User logged in, starting at Home")
                            Screen.Home.route
                        } else {
                            Log.d(TAG, "User not logged in, starting at Login")
                            Screen.Login.route
                        }
                    }
                }
                
                // Show navigation once start destination is determined
                startDestination?.let { destination ->
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        NavGraph(
                            navController = navController,
                            startDestination = destination
                        )
                    }
                }
            }
        }
    }
    
    companion object {
        private const val TAG = "MainActivity"
    }
}
