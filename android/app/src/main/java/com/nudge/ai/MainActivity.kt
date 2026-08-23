package com.nudge.ai

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import androidx.work.*
import com.nudge.ai.data.repository.MeetingRepository
import com.nudge.ai.databinding.ActivityMainBinding
import com.nudge.ai.notifications.DeadlineReminderWorker
import com.nudge.ai.notifications.NotificationHelper
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    private val repository = MeetingRepository()

    // Android 13+ notification permission request
    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) scheduleDeadlineReminders()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Setup Navigation
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController

        // Wire bottom nav ↔ nav graph
        binding.bottomNav.setupWithNavController(navController)

        // Hide bottom nav on detail screen, show on top tabs
        navController.addOnDestinationChangedListener { _, destination, _ ->
            if (destination.id == R.id.meetingDetailFragment) {
                binding.bottomNav.visibility = android.view.View.GONE
                binding.bottomNavDivider.visibility = android.view.View.GONE
            } else {
                binding.bottomNav.visibility = android.view.View.VISIBLE
                binding.bottomNavDivider.visibility = android.view.View.VISIBLE
            }
        }

        // Avoid reload on reselecting the same active tab
        binding.bottomNav.setOnItemReselectedListener { /* no-op */ }

        // Create notification channels (must run before any notification fires)
        NotificationHelper.createChannels(this)

        // Ping backend on launch to wake Render from cold start
        lifecycleScope.launch {
            repository.pingBackend()
        }

        // Request notification permission (Android 13+) then schedule workers
        requestNotificationPermissionIfNeeded()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

            if (granted) {
                scheduleDeadlineReminders()
            } else {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            // Android < 13 — permission not needed
            scheduleDeadlineReminders()
        }
    }

    /**
     * Schedule WorkManager jobs:
     *
     * 1. Immediate sync & exact alarm arming
     * 2. Periodic deadline checker — every 1 hour
     * 3. Daily summary — every 24 hours
     */
    private fun scheduleDeadlineReminders() {
        val workManager = WorkManager.getInstance(applicationContext)

        val deadlineConstraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        // 1. Immediate sync & exact alarm arming on launch
        val immediateWork = OneTimeWorkRequestBuilder<DeadlineReminderWorker>()
            .setConstraints(deadlineConstraints)
            .build()

        workManager.enqueueUniqueWork(
            "nudge_immediate_alarm_sync",
            ExistingWorkPolicy.REPLACE,
            immediateWork
        )

        // 2. Deadline checker — every 1 hour, needs network
        val deadlineWork = PeriodicWorkRequestBuilder<DeadlineReminderWorker>(
            1, TimeUnit.HOURS
        )
            .setConstraints(deadlineConstraints)
            .setInputData(workDataOf("daily" to false))
            .setBackoffCriteria(BackoffPolicy.LINEAR, 15, TimeUnit.MINUTES)
            .addTag("deadline_check")
            .build()

        workManager.enqueueUniquePeriodicWork(
            DeadlineReminderWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            deadlineWork
        )

        // 3. Daily summary — every 24 hours
        val dailyWork = PeriodicWorkRequestBuilder<DeadlineReminderWorker>(
            24, TimeUnit.HOURS,
            30, TimeUnit.MINUTES
        )
            .setConstraints(deadlineConstraints)
            .setInputData(workDataOf("daily" to true))
            .addTag("daily_summary")
            .build()

        workManager.enqueueUniquePeriodicWork(
            "${DeadlineReminderWorker.WORK_NAME}_daily",
            ExistingPeriodicWorkPolicy.UPDATE,
            dailyWork
        )
    }

    override fun onSupportNavigateUp(): Boolean {
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}