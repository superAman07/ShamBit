package com.shambit.customer

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for ShamBit Customer App
 */
@HiltAndroidApp
class ShamBitApp : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize any app-wide components here
    }
}
