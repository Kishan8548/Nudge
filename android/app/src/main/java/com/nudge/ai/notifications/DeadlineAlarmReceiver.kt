package com.nudge.ai.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class DeadlineAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == AlarmScheduler.ACTION_DEADLINE_ALARM) {
            val itemId = intent.getStringExtra(AlarmScheduler.EXTRA_ITEM_ID) ?: return
            val taskText = intent.getStringExtra(AlarmScheduler.EXTRA_TASK_TEXT) ?: "Pending task"
            val deadlineText = intent.getStringExtra(AlarmScheduler.EXTRA_DEADLINE_TEXT) ?: "Upcoming"
            val isUrgent = intent.getBooleanExtra(AlarmScheduler.EXTRA_IS_URGENT, false)

            Log.i("DeadlineAlarmReceiver", "Alarm fired for item $itemId: $taskText (isUrgent=$isUrgent)")

            // Show notification immediately
            NotificationHelper.showDeadlineNotification(
                context = context,
                itemId = itemId,
                taskText = taskText,
                deadline = deadlineText,
                isUrgent = isUrgent
            )
        }
    }
}
