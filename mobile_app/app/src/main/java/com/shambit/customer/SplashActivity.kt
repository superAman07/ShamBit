package com.shambit.customer

import android.animation.Animator
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.shambit.customer.databinding.SplashScreenBinding

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val binding = SplashScreenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Start animations
        animateContent(binding) {
            // Navigate to MainActivity (which shows HomeScreen composable) after animations
            Handler(Looper.getMainLooper()).postDelayed({
                val intent = Intent(this, MainActivity::class.java)
                startActivity(intent)
                // Use modern transition API for Android 14+ or fallback for older versions
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    overrideActivityTransition(Activity.OVERRIDE_TRANSITION_OPEN, android.R.anim.fade_in, android.R.anim.fade_out)
                } else {
                    @Suppress("DEPRECATION")
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                }
                finish()
            }, 250) // Short delay for a seamless transition
        }
    }

    private fun animateContent(binding: SplashScreenBinding, onEnd: () -> Unit) {
        // --- Initial State (Hidden) ---
        binding.logo.apply { alpha = 0f; scaleX = 0.8f; scaleY = 0.8f }
        binding.titleSham.alpha = 0f
        binding.titleBit.alpha = 0f
        binding.tagline.apply { alpha = 0f; translationY = 40f }

        // --- Animator Definitions ---
        val backgroundAnimator = ObjectAnimator.ofInt(binding.root.background as GradientDrawable, "alpha", 0, 255).apply {
            duration = 1000
            interpolator = AccelerateDecelerateInterpolator()
        }

        val logoAnimator = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(binding.logo, "alpha", 0f, 1f),
                ObjectAnimator.ofFloat(binding.logo, "scaleX", 0.8f, 1f),
                ObjectAnimator.ofFloat(binding.logo, "scaleY", 0.8f, 1f)
            )
            interpolator = DecelerateInterpolator()
            duration = 600
        }

        val titleShamAnimator = ObjectAnimator.ofFloat(binding.titleSham, "alpha", 0f, 1f).apply {
            interpolator = AccelerateDecelerateInterpolator()
            duration = 500
        }

        val titleBitAnimator = ObjectAnimator.ofFloat(binding.titleBit, "alpha", 0f, 1f).apply {
            interpolator = AccelerateDecelerateInterpolator()
            duration = 500
        }

        val taglineAnimator = AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(binding.tagline, "alpha", 0f, 1f),
                ObjectAnimator.ofFloat(binding.tagline, "translationY", 40f, 0f)
            )
            interpolator = DecelerateInterpolator()
            duration = 700
        }

        // --- Staggered Playback ---
        AnimatorSet().apply {
            play(backgroundAnimator)
            play(logoAnimator).after(200)
            play(titleShamAnimator).with(titleBitAnimator).after(logoAnimator).after(150)
            play(taglineAnimator).after(titleShamAnimator).after(100)

            addListener(object : Animator.AnimatorListener {
                override fun onAnimationEnd(animation: Animator) = onEnd()
                override fun onAnimationStart(animation: Animator) {}
                override fun onAnimationCancel(animation: Animator) {}
                override fun onAnimationRepeat(animation: Animator) {}
            })
            start()
        }
    }
}
