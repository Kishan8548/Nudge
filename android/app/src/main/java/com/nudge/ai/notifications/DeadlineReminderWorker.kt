package com.nudge.ai.notifications

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.nudge.ai.data.api.RetrofitClient
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker that runs every 6 hours in the background.
 *
 * Logic:
 * 1. Fetch all MY pending action items from the backend
 * 2. For each item with a deadline:
 *    - Overdue / ≤ 2 hours  → urgent notification (HIGH priority)
 *    - ≤ 24 hours           → deadline approaching notification
 *    - > 24 hours           → silent, skip
 * 3. If no deadlines but items exist → gentle daily summary nudge
 */
class DeadlineReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        const val WORK_NAME = "nudge_deadline_reminder"
        private val ISO_FMT     = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        private val DATE_FMT    = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val DISPLAY_FMT = SimpleDateFormat("MMM d 'at' h:mm a", Locale.getDefault())
    }

    override suspend fun doWork(): Result {
        return try {
            val api = RetrofitClient.api

            // Warm up Render free tier
            try { api.health() } catch (e: Exception) { /* ignore cold-start ping errors */ }

            // Fetch MY pending items only
            val response = api.listActionItems(status = "pending", mine = true, limit = 50)
            if (!response.isSuccessful) return Result.success()

            val items = response.body()?.actionItems ?: return Result.success()
            val now = System.currentTimeMillis()

            var urgentCount = 0
            var approachingCount = 0

            for (item in items.toList()) {
                // Parse deadline — skip items with no deadline or unparseable date
                val deadlineMs = parseDeadlineMs(item.deadline) ?: continue

                val msUntilDue: Long = deadlineMs - now
                val formattedDeadline = DISPLAY_FMT.format(Date(deadlineMs))
                val isUrgent = msUntilDue <= TimeUnit.HOURS.toMillis(2L)

                when {
                    msUntilDue <= 0L -> {
                        // Overdue
                        NotificationHelper.showDeadlineNotification(
                            context        = applicationContext,
                            itemId         = item.id,
                            taskText       = item.text,
                            deadline       = "OVERDUE — was $formattedDeadline",
                            isUrgent       = true
                        )
                        urgentCount++
                    }
                    msUntilDue <= TimeUnit.HOURS.toMillis(2L) -> {
                        // Due within 2 hours
                        NotificationHelper.showDeadlineNotification(
                            context        = applicationContext,
                            itemId         = item.id,
                            taskText       = item.text,
                            deadline       = formattedDeadline,
                            isUrgent       = true
                        )
                        urgentCount++
                    }
                    msUntilDue <= TimeUnit.HOURS.toMillis(24L) -> {
                        // Due within 24 hours
                        NotificationHelper.showDeadlineNotification(
                            context        = applicationContext,
                            itemId         = item.id,
                            taskText       = item.text,
                            deadline       = formattedDeadline,
                            isUrgent       = false
                        )
                        approachingCount++
                    }
                    else -> { /* > 24 hours away — stay quiet */ }
                }
            }

            // Daily summary nudge: no deadline alerts but tasks exist
            val isDailyRun = inputData.getBoolean("daily", false)
            if (isDailyRun && urgentCount == 0 && approachingCount == 0 && items.isNotEmpty()) {
                NotificationHelper.showSummaryNotification(applicationContext, items.size)
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    /**
     * Parse an ISO date string from the backend into epoch milliseconds.
     * Tries full datetime first, falls back to date-only.
     * Returns null if the string is null or cannot be parsed.
     */
    private fun parseDeadlineMs(iso: String?): Long? {
        if (iso == null) return null
        return try {
            ISO_FMT.parse(iso.take(19))?.time
        } catch (e: Exception) {
            try {
                DATE_FMT.parse(iso.take(10))?.time
            } catch (e2: Exception) {
                null
            }
        }
    }
}
