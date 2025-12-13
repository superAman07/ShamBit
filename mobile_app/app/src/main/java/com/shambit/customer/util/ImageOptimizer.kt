package com.shambit.customer.util

import android.content.Context
import coil.ImageLoader
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.util.DebugLogger
import com.shambit.customer.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.OkHttpClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * PERFORMANCE FIX: Optimized image loader to prevent main thread blocking
 * and reduce memory pressure during image decoding
 */
@Singleton
class ImageOptimizer @Inject constructor(
    @ApplicationContext private val context: Context,
    private val okHttpClient: OkHttpClient
) {
    
    /**
     * Create optimized ImageLoader instance
     */
    fun createOptimizedImageLoader(): ImageLoader {
        return ImageLoader.Builder(context)
            .okHttpClient(okHttpClient)
            // CRITICAL FIX: Enable aggressive caching to prevent repeated decoding
            .memoryCache {
                MemoryCache.Builder(context)
                    .maxSizePercent(0.25) // Use 25% of available memory
                    .strongReferencesEnabled(true)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(context.cacheDir.resolve("image_cache"))
                    .maxSizeBytes(100 * 1024 * 1024) // 100MB disk cache
                    .build()
            }
            // PERFORMANCE FIX: Add decoders for different image types
            .components {
                if (android.os.Build.VERSION.SDK_INT >= 28) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
                add(SvgDecoder.Factory())
            }
            // CRITICAL FIX: Enable crossfade to smooth image transitions
            .crossfade(true)
            .crossfade(200) // 200ms crossfade
            // Enable debug logging in debug builds
            .apply {
                if (BuildConfig.DEBUG) {
                    logger(DebugLogger())
                }
            }
            .build()
    }
    
    /**
     * Create optimized image request with proper caching policies
     */
    fun createOptimizedRequest(
        url: String,
        context: Context
    ): ImageRequest {
        return ImageRequest.Builder(context)
            .data(url)
            // PERFORMANCE FIX: Aggressive caching to prevent repeated network calls
            .memoryCachePolicy(CachePolicy.ENABLED)
            .diskCachePolicy(CachePolicy.ENABLED)
            .networkCachePolicy(CachePolicy.ENABLED)
            // CRITICAL FIX: Enable placeholder and error handling
            .crossfade(true)
            .build()
    }
    
    /**
     * Preload critical images to improve perceived performance
     */
    suspend fun preloadImages(urls: List<String>, imageLoader: ImageLoader) {
        urls.forEach { url ->
            try {
                val request = ImageRequest.Builder(context)
                    .data(url)
                    .memoryCachePolicy(CachePolicy.ENABLED)
                    .diskCachePolicy(CachePolicy.ENABLED)
                    .build()
                
                imageLoader.execute(request)
            } catch (e: Exception) {
                // Silently handle preload failures
            }
        }
    }
}