package com.shambit.customer.util

import java.net.URLEncoder

/**
 * Image URL Helper
 * Converts relative image URLs to absolute URLs with proper encoding
 * Also handles localhost URLs from backend
 */
object ImageUrlHelper {
    // Base URL for images (without /api/v1/)
    private const val IMAGE_BASE_URL = "http://192.168.3.103:3000"
    
    /**
     * Convert relative URL to absolute URL with proper encoding
     * Handles:
     * - Relative URLs (/uploads/image.jpg)
     * - Localhost URLs (http://localhost:3000/uploads/image.jpg)
     * - Already absolute URLs (http://192.168.x.x:3000/uploads/image.jpg)
     */
    fun getAbsoluteUrl(relativeUrl: String?): String? {
        if (relativeUrl.isNullOrBlank()) return null
        
        // Replace localhost with actual IP
        var url = relativeUrl.replace("http://localhost:3000", IMAGE_BASE_URL)
            .replace("https://localhost:3000", IMAGE_BASE_URL)
        
        return if (url.startsWith("http://") || url.startsWith("https://")) {
            // Already absolute URL, just encode if needed
            url
        } else {
            // Relative URL - encode and prepend base URL
            val parts = url.split("/")
            val encodedParts = parts.map { part ->
                if (part.isNotEmpty()) {
                    // Encode each part, but keep forward slashes
                    URLEncoder.encode(part, "UTF-8")
                        .replace("+", "%20") // Replace + with %20 for spaces
                } else {
                    part
                }
            }
            "$IMAGE_BASE_URL${encodedParts.joinToString("/")}"
        }
    }
    
    /**
     * Convert list of relative URLs to absolute URLs
     */
    fun getAbsoluteUrls(relativeUrls: List<String>?): List<String> {
        if (relativeUrls.isNullOrEmpty()) return emptyList()
        
        return relativeUrls.mapNotNull { getAbsoluteUrl(it) }
    }
}
