package com.nudge.ai.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import com.nudge.ai.MainActivity
import com.nudge.ai.R
import com.nudge.ai.services.AudioRecordingService
import com.nudge.ai.services.AudioRecordingService.Companion.ServiceState

class RecordWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_TOGGLE_RECORDING = "com.nudge.ai.widget.ACTION_TOGGLE_RECORDING"

        fun updateAllWidgets(context: Context, isRecording: Boolean, durationText: String = "") {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, RecordWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (widgetId in allWidgetIds) {
                updateAppWidget(context, appWidgetManager, widgetId, isRecording, durationText)
            }
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            isRecording: Boolean,
            durationText: String = ""
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_record)

            if (isRecording) {
                val timeDisplay = if (durationText.isNotBlank()) durationText else "00:00"
                views.setTextViewText(R.id.widgetStatus, "🔴 Recording $timeDisplay")
                views.setTextViewText(R.id.widgetSubtitle, "Tap button to stop & process")
                views.setImageViewResource(R.id.widgetBtnRecord, R.drawable.ic_stop)
                views.setInt(R.id.widgetBtnRecord, "setBackgroundResource", R.drawable.bg_widget_btn_recording)
            } else {
                views.setTextViewText(R.id.widgetStatus, "Tap to Record")
                views.setTextViewText(R.id.widgetSubtitle, "Instant AI meeting notes")
                views.setImageViewResource(R.id.widgetBtnRecord, R.drawable.ic_record)
                views.setInt(R.id.widgetBtnRecord, "setBackgroundResource", R.drawable.bg_widget_btn_idle)
            }

            // Click on info area opens MainActivity
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetInfoContainer, openAppPendingIntent)

            // Click on button toggles recording
            val toggleIntent = Intent(context, RecordWidgetProvider::class.java).apply {
                action = ACTION_TOGGLE_RECORDING
            }
            val togglePendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                toggleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetBtnRecord, togglePendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val isRecording = AudioRecordingService.recordingState.value is ServiceState.Recording
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, isRecording)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TOGGLE_RECORDING) {
            val currentState = AudioRecordingService.recordingState.value
            if (currentState is ServiceState.Recording) {
                // Stop recording
                val serviceIntent = Intent(context, AudioRecordingService::class.java).apply {
                    action = AudioRecordingService.ACTION_STOP
                }
                context.startService(serviceIntent)
                updateAllWidgets(context, isRecording = false)
            } else {
                // Start recording
                val prefs = context.getSharedPreferences("nudge_prefs", Context.MODE_PRIVATE)
                val savedSelfName = prefs.getString("user_self_name", "") ?: ""

                val serviceIntent = Intent(context, AudioRecordingService::class.java).apply {
                    action = AudioRecordingService.ACTION_START
                    putExtra(AudioRecordingService.EXTRA_TITLE, "")
                    putExtra(AudioRecordingService.EXTRA_SELF_NAME, savedSelfName)
                }
                ContextCompat.startForegroundService(context, serviceIntent)
                updateAllWidgets(context, isRecording = true, durationText = "00:00")
            }
        }
    }
}
