package com.nudge.ai.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.nudge.ai.data.model.ActionItem
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

object AlarmScheduler {

    private const val TAG = "AlarmScheduler"
    const val ACTION_DEADLINE_ALARM = "com.nudge.ai.notifications.ACTION_DEADLINE_ALARM"

    const val EXTRA_ITEM_ID = "extra_item_id"
    const val EXTRA_TASK_TEXT = "extra_task_text"
    const val EXTRA_DEADLINE_TEXT = "extra_deadline_text"
    const val EXTRA_IS_URGENT = "extra_is_urgent"
    const val EXTRA_ALERT_TYPE = "extra_alert_type"

    private val ISO_FMT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
    private val DATE_FMT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val DISPLAY_FMT = SimpleDateFormat("MMM d 'at' h:mm a", Locale.getDefault())

    /**
     * Schedule exact system alarms for a pending action item.
     * Alarms scheduled:
     * 1. T-24 Hours warning (if still in future)
     * 2. T-2 Hours urgent warning (if still in future)
     * 3. Due time exact alert (if still in future)
     */
    fun scheduleTaskReminders(context: Context, item: ActionItem) {
        if (item.status == "done") {
            cancelTaskReminders(context, item.id)
            return
        }

        val deadlineMs = parseDeadlineMs(item.deadline) ?: return
        val now = System.currentTimeMillis()
        val formattedDate = DISPLAY_FMT.format(Date(deadlineMs))

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

        // 1. T-24 Hours
        val t24h = deadlineMs - TimeUnit.HOURS.toMillis(24)
        if (t24h > now) {
            setExactAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerAtMs = t24h,
                requestCode = item.id.hashCode() + 1,
                itemId = item.id,
                taskText = item.text,
                deadlineText = formattedDate,
                isUrgent = false,
                alertType = "T_24H"
            )
        }

        // 2. T-2 Hours
        val t2h = deadlineMs - TimeUnit.HOURS.toMillis(2)
        if (t2h > now) {
            setExactAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerAtMs = t2h,
                requestCode = item.id.hashCode() + 2,
                itemId = item.id,
                taskText = item.text,
                deadlineText = formattedDate,
                isUrgent = true,
                alertType = "T_2H"
            )
        }

        // 3. Due time exact alert
        if (deadlineMs > now) {
            setExactAlarm(
                context = context,
                alarmManager = alarmManager,
                triggerAtMs = deadlineMs,
                requestCode = item.id.hashCode() + 3,
                itemId = item.id,
                taskText = item.text,
                deadlineText = "DUE NOW — $formattedDate",
                isUrgent = true,
                alertType = "DUE_NOW"
            )
        }
    }

    private fun setExactAlarm(
        context: Context,
        alarmManager: AlarmManager,
        triggerAtMs: Long,
        requestCode: Int,
        itemId: String,
        taskText: String,
        deadlineText: String,
        isUrgent: Boolean,
        alertType: String
    ) {
        val intent = Intent(context, DeadlineAlarmReceiver::class.java).apply {
            action = ACTION_DEADLINE_ALARM
            putExtra(EXTRA_ITEM_ID, itemId)
            putExtra(EXTRA_TASK_TEXT, taskText)
            putExtra(EXTRA_DEADLINE_TEXT, deadlineText)
            putExtra(EXTRA_IS_URGENT, isUrgent)
            putExtra(EXTRA_ALERT_TYPE, alertType)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAtMs,
                        pendingIntent
                    )
                } else {
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAtMs,
                        pendingIntent
                    )
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMs,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMs,
                    pendingIntent
                )
            }
            Log.d(TAG, "Armed exact alarm for '$taskText' ($alertType) at trigger time $triggerAtMs")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule exact alarm: ${e.message}", e)
        }
    }

    /**
     * Cancel all alarms for this item.
     */
    fun cancelTaskReminders(context: Context, itemId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val offsets = listOf(1, 2, 3)
        for (offset in offsets) {
            val intent = Intent(context, DeadlineAlarmReceiver::class.java).apply {
                action = ACTION_DEADLINE_ALARM
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                itemId.hashCode() + offset,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
        }
        Log.d(TAG, "Cancelled alarms for item $itemId")
    }

    fun parseDeadlineMs(iso: String?): Long? {
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
