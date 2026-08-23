package com.nudge.ai.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.i("BootReceiver", "Boot or package update detected. Rescheduling deadline reminders and workers.")

            val workManager = WorkManager.getInstance(context)

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            // 1. Immediate sync & alarm arming
            val immediateWork = OneTimeWorkRequestBuilder<DeadlineReminderWorker>()
                .setConstraints(constraints)
                .build()

            workManager.enqueueUniqueWork(
                "nudge_boot_immediate_sync",
                ExistingWorkPolicy.REPLACE,
                immediateWork
            )

            // 2. Periodic checker (every 1 hour)
            val periodicWork = PeriodicWorkRequestBuilder<DeadlineReminderWorker>(
                1, TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .setInputData(workDataOf("daily" to false))
                .build()

            workManager.enqueueUniquePeriodicWork(
                DeadlineReminderWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                periodicWork
            )
        }
    }
}
