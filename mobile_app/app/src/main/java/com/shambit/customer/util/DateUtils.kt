package com.shambit.customer.util

import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * Format a date string to relative time (e.g., "2 hours ago", "Just now")
 */
fun formatRelativeTime(dateString: String): String {
    return try {
        val format = SimpleDateFormat(Constants.DATE_FORMAT_API, Locale.getDefault())
        format.timeZone = TimeZone.getTimeZone("UTC")
        val date = format.parse(dateString) ?: return dateString
        
        val now = Date()
        val diff = now.time - date.time
        
        when {
            diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
            diff < TimeUnit.HOURS.toMillis(1) -> {
                val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
                "$minutes ${if (minutes == 1L) "minute" else "minutes"} ago"
            }
            diff < TimeUnit.DAYS.toMillis(1) -> {
                val hours = TimeUnit.MILLISECONDS.toHours(diff)
                "$hours ${if (hours == 1L) "hour" else "hours"} ago"
            }
            diff < TimeUnit.DAYS.toMillis(7) -> {
                val days = TimeUnit.MILLISECONDS.toDays(diff)
                "$days ${if (days == 1L) "day" else "days"} ago"
            }
            diff < TimeUnit.DAYS.toMillis(30) -> {
                val weeks = TimeUnit.MILLISECONDS.toDays(diff) / 7
                "$weeks ${if (weeks == 1L) "week" else "weeks"} ago"
            }
            diff < TimeUnit.DAYS.toMillis(365) -> {
                val months = TimeUnit.MILLISECONDS.toDays(diff) / 30
                "$months ${if (months == 1L) "month" else "months"} ago"
            }
            else -> {
                val years = TimeUnit.MILLISECONDS.toDays(diff) / 365
                "$years ${if (years == 1L) "year" else "years"} ago"
            }
        }
    } catch (e: Exception) {
        dateString
    }
}

/**
 * Format date string to display format
 */
fun formatDate(dateString: String, pattern: String = Constants.DATE_FORMAT_DISPLAY): String {
    return try {
        val inputFormat = SimpleDateFormat(Constants.DATE_FORMAT_API, Locale.getDefault())
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(dateString) ?: return dateString
        
        val outputFormat = SimpleDateFormat(pattern, Locale.getDefault())
        outputFormat.format(date)
    } catch (e: Exception) {
        dateString
    }
}

/**
 * Format date string to display date and time
 */
fun formatDateTime(dateString: String): String {
    return formatDate(dateString, Constants.DATE_TIME_FORMAT_DISPLAY)
}
