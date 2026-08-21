package com.nudge.ai.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.nudge.ai.MainActivity
import com.nudge.ai.R

object NotificationHelper {

    const val CHANNEL_DEADLINES = "nudge_deadlines"
    const val CHANNEL_REMINDERS = "nudge_reminders"
    const val CHANNEL_RECORDING = "nudge_recording"

    /** Call once on app startup to register notification channels (Android 8+). */
    fun createChannels(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

        NotificationChannel(
            CHANNEL_RECORDING,
            "Meeting Recording",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Status notification while recording meetings"
            setShowBadge(false)
            manager.createNotificationChannel(this)
        }

        NotificationChannel(
            CHANNEL_DEADLINES,
            "Deadline Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerts for action items due within 24 hours"
            enableVibration(true)
            manager.createNotificationChannel(this)
        }

        NotificationChannel(
            CHANNEL_REMINDERS,
            "Task Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Periodic reminders for your pending tasks"
            manager.createNotificationChannel(this)
        }
    }

    /**
     * Fire a deadline notification for a specific action item.
     *
     * @param context    Android context
     * @param itemId     MongoDB ID of the action item (used as notification ID)
     * @param taskText   The action item description
     * @param deadline   Formatted deadline string, e.g. "Today at 5pm" or "Aug 28"
     * @param isUrgent   True if deadline is within 2 hours — uses HIGH importance
     */
    fun showDeadlineNotification(
        context: Context,
        itemId: String,
        taskText: String,
        deadline: String,
        isUrgent: Boolean = false
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            itemId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (isUrgent) "⚠️ Due very soon!" else "📋 Deadline approaching"
        val channel = if (isUrgent) CHANNEL_DEADLINES else CHANNEL_REMINDERS
        val priority = if (isUrgent) NotificationCompat.PRIORITY_HIGH
                       else NotificationCompat.PRIORITY_DEFAULT

        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_action_items)
            .setContentTitle(title)
            .setContentText(taskText)
            .setSubText("Due: $deadline")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(taskText)
                    .setSummaryText("Due: $deadline")
            )
            .setPriority(priority)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setColor(0xFF0D9488.toInt())  // teal_primary
            .build()

        // Use item ID hash as notification ID so each task gets its own notification
        NotificationManagerCompat.from(context)
            .notify(itemId.hashCode(), notification)
    }

    /**
     * Fire a summary notification when multiple tasks are pending.
     */
    fun showSummaryNotification(context: Context, count: Int) {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
            .setSmallIcon(R.drawable.ic_action_items)
            .setContentTitle("You have $count pending tasks")
            .setContentText("Tap to review your action items")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setColor(0xFF0D9488.toInt())
            .build()

        NotificationManagerCompat.from(context).notify(9999, notification)
    }
}
