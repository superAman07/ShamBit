package com.shambit.customer

import android.animation.ObjectAnimator
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.shambit.customer.databinding.ActivityHomeBinding
import java.time.LocalDate
import java.time.Month

class HomeScreen : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding
    private var didAnimateOnce = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        didAnimateOnce = savedInstanceState?.getBoolean(KEY_ANIMATED, false) == true

        setupHeaderForOccasion(crossfade = false)
        setupParallax()
        setupPullToRefresh()
        animateLogoEntryIfNeeded()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_ANIMATED, true)
    }

    // --- Pull to refresh ---
    private fun setupPullToRefresh() {
        binding.swipeRefresh.setOnRefreshListener {
            // Light pulse on header while actual refresh happens (no fake delay here)
            ObjectAnimator.ofFloat(binding.headerContainer, View.ALPHA, 0.75f, 1f).apply {
                duration = 400
                interpolator = DecelerateInterpolator()
                start()
            }
            // Hand off to your data layer; call finishRefresh() when done.
        }
    }

    /** Call this from your data callback once refresh completes */
    fun finishRefresh() {
        if (binding.swipeRefresh.isRefreshing) binding.swipeRefresh.isRefreshing = false
        // Optionally refresh the header (e.g., if an occasion/theme changed remotely)
        setupHeaderForOccasion(crossfade = true)
    }

    // --- Occasion header ---
    private fun setupHeaderForOccasion(crossfade: Boolean) {
        val drawable: Drawable? = when (LocalDate.now().month) {
            Month.OCTOBER, Month.NOVEMBER -> ContextCompat.getDrawable(this, R.drawable.header_diwali)
            Month.DECEMBER -> ContextCompat.getDrawable(this, R.drawable.header_christmas)
            Month.JANUARY -> ContextCompat.getDrawable(this, R.drawable.header_newyear)
            else -> ContextCompat.getDrawable(this, R.drawable.header_default)
        }

        if (!crossfade || binding.headerBackground.drawable == null) {
            binding.headerBackground.setImageDrawable(drawable)
            return
        }

        // Smooth crossfade looks premium
        val oldView = binding.headerBackground
        oldView.animate().alpha(0f).setDuration(180).withEndAction {
            oldView.setImageDrawable(drawable)
            oldView.animate().alpha(1f).setDuration(220).start()
        }.start()
    }

    // --- Parallax on scroll (subtle, 0.4x rate) ---
    private fun setupParallax() {
        binding.contentContainer.setOnScrollChangeListener { v, _, scrollY, _, _ ->
            binding.headerBackground.translationY = scrollY * 0.4f
            // Optional small scale to give depth
            val scale = 1f + (scrollY.coerceAtMost(200) / 200f) * 0.04f
            binding.headerBackground.scaleX = scale
            binding.headerBackground.scaleY = scale
        }
    }

    // --- Entry animation (only first time) ---
    private fun animateLogoEntryIfNeeded() {
        if (didAnimateOnce) return
        binding.logo.apply {
            scaleX = 0f; scaleY = 0f; alpha = 0f
            animate()
                .scaleX(1f).scaleY(1f).alpha(1f)
                .setDuration(450)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }
        didAnimateOnce = true
    }

    companion object {
        private const val KEY_ANIMATED = "home_animated_once"
    }
}
