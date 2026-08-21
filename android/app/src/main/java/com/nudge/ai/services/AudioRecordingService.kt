package com.nudge.ai.services

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nudge.ai.MainActivity
import com.nudge.ai.R
import com.nudge.ai.notifications.NotificationHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File

/**
 * Foreground Service for robust background audio recording.
 * Keeps microphone active when switching apps, taking notes, or locking the screen.
 */
class AudioRecordingService : Service() {

    companion object {
        private const val TAG = "AudioRecordingService"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "com.nudge.ai.action.START_RECORDING"
        const val ACTION_STOP = "com.nudge.ai.action.STOP_RECORDING"

        const val EXTRA_TITLE = "extra_meeting_title"
        const val EXTRA_SELF_NAME = "extra_self_name"

        sealed class ServiceState {
            object Idle : ServiceState()
            data class Recording(val startTimeMs: Long, val title: String, val selfName: String) : ServiceState()
            data class Completed(val file: File, val title: String, val selfName: String, val durationMs: Long) : ServiceState()
            data class Error(val message: String) : ServiceState()
        }

        private val _recordingState = MutableStateFlow<ServiceState>(ServiceState.Idle)
        val recordingState: StateFlow<ServiceState> = _recordingState.asStateFlow()

        fun resetState() {
            _recordingState.value = ServiceState.Idle
        }
    }

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startTimeMs: Long = 0L
    private var meetingTitle: String = ""
    private var selfName: String = ""

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    private val timerHandler = Handler(Looper.getMainLooper())
    private val notificationUpdateRunnable = object : Runnable {
        override fun run() {
            if (_recordingState.value is ServiceState.Recording) {
                updateNotification()
                timerHandler.postDelayed(this, 1000)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createChannels(this)
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                meetingTitle = intent.getStringExtra(EXTRA_TITLE) ?: ""
                selfName = intent.getStringExtra(EXTRA_SELF_NAME) ?: ""
                startRecording()
            }
            ACTION_STOP -> {
                stopRecording()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startRecording() {
        requestAudioFocus()

        val file = File(cacheDir, "nudge_${System.currentTimeMillis()}.m4a")
        outputFile = file
        startTimeMs = System.currentTimeMillis()

        try {
            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder = recorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128_000)
                setAudioSamplingRate(44_100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }

            _recordingState.value = ServiceState.Recording(startTimeMs, meetingTitle, selfName)

            val notification = buildNotification(0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }

            timerHandler.post(notificationUpdateRunnable)
            com.nudge.ai.widget.RecordWidgetProvider.updateAllWidgets(this, isRecording = true, durationText = "00:00")
            Log.i(TAG, "Audio recording started in foreground service")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start MediaRecorder: ${e.message}", e)
            _recordingState.value = ServiceState.Error(e.message ?: "Failed to start microphone")
            com.nudge.ai.widget.RecordWidgetProvider.updateAllWidgets(this, isRecording = false)
            stopSelf()
        }
    }

    private fun stopRecording() {
        timerHandler.removeCallbacks(notificationUpdateRunnable)
        abandonAudioFocus()
        com.nudge.ai.widget.RecordWidgetProvider.updateAllWidgets(this, isRecording = false)

        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "MediaRecorder stop failed: ${e.message}")
        }
        mediaRecorder = null

        val file = outputFile
        val duration = System.currentTimeMillis() - startTimeMs

        if (file != null && file.exists() && file.length() > 1024) {
            _recordingState.value = ServiceState.Completed(file, meetingTitle, selfName, duration)
        } else {
            _recordingState.value = ServiceState.Error("Recording was too short or empty")
        }

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun updateNotification() {
        val elapsedSec = (System.currentTimeMillis() - startTimeMs) / 1000
        val m = elapsedSec / 60
        val s = elapsedSec % 60
        val timeStr = String.format(java.util.Locale.US, "%02d:%02d", m, s)
        val notification = buildNotification(elapsedSec)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
        com.nudge.ai.widget.RecordWidgetProvider.updateAllWidgets(this, isRecording = true, durationText = timeStr)
    }

    private fun buildNotification(elapsedSeconds: Long): Notification {
        val m = elapsedSeconds / 60
        val s = elapsedSeconds % 60
        val timeStr = String.format(java.util.Locale.US, "%02d:%02d", m, s)

        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, AudioRecordingService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val titleDisplay = if (meetingTitle.isNotBlank()) meetingTitle else "Meeting Recording"

        return NotificationCompat.Builder(this, NotificationHelper.CHANNEL_RECORDING)
            .setSmallIcon(R.drawable.ic_record)
            .setContentTitle("🔴 $titleDisplay ($timeStr)")
            .setContentText("Recording in background • Tap Stop when finished")
            .setContentIntent(openAppPendingIntent)
            .addAction(R.drawable.ic_stop, "Stop & Process", stopPendingIntent)
            .setOngoing(true)
            .setColor(0xFF0D9488.toInt())
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun requestAudioFocus() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val playbackAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(playbackAttributes)
                    .build()
                audioFocusRequest = focusRequest
                audioManager?.requestAudioFocus(focusRequest)
            } else {
                @Suppress("DEPRECATION")
                audioManager?.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                )
            }
        } catch (e: Exception) { /* ignore */ }
    }

    private fun abandonAudioFocus() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus(null)
            }
        } catch (e: Exception) { /* ignore */ }
    }

    override fun onDestroy() {
        super.onDestroy()
        timerHandler.removeCallbacks(notificationUpdateRunnable)
        if (mediaRecorder != null) {
            try {
                mediaRecorder?.release()
            } catch (e: Exception) { /* ignore */ }
            mediaRecorder = null
        }
    }
}
