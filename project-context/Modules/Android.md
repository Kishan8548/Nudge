# 📱 Module: Native Android Application (Kotlin)

The Android app is built with **Kotlin**, **Android Jetpack**, and **Material3**, providing background audio recording, home screen widget controls, and hardware-level deadline alarm notifications.

---

## 📂 Source Code Location
- **Root**: `android/`
- **Manifest**: [android/app/src/main/AndroidManifest.xml](file:///c:/Users/suren/Nudge/android/app/src/main/AndroidManifest.xml)
- **Build Gradle**: [android/app/build.gradle.kts](file:///c:/Users/suren/Nudge/android/app/build.gradle.kts)
- **Java/Kotlin Root**: `android/app/src/main/java/com/nudge/ai/`

---

## 🎙️ Background Audio Recording Service

- **File**: [android/app/src/main/java/com/nudge/ai/services/AudioRecordingService.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/services/AudioRecordingService.kt)
- **Service Type**: Declared with `android:foregroundServiceType="microphone"`.
- **Capabilities**:
  - Captures high-quality AAC/M4A audio via `MediaRecorder`.
  - Maintains recording uninterrupted when the user switches apps, takes notes, or turns off the screen.
  - Posts an ongoing system notification displaying live recording duration and a quick "Stop & Process" action button.
  - Broadcasts live duration updates to UI fragments and the home screen widget.

---

## 🔘 Home Screen Quick Record AppWidget

- **File**: [android/app/src/main/java/com/nudge/ai/widget/RecordWidgetProvider.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/widget/RecordWidgetProvider.kt)
- **Capabilities**:
  - Allows users to start and stop meeting recordings directly from the Android launcher without opening the full application.
  - Updates visual state dynamically (changes from idle mic icon to glowing recording timer).

---

## 🔔 Hardware-Level Deadline Alarm System

- **Alarm Scheduler**: [android/app/src/main/java/com/nudge/ai/notifications/AlarmScheduler.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/notifications/AlarmScheduler.kt)
- **Alarm Receiver**: [android/app/src/main/java/com/nudge/ai/notifications/DeadlineAlarmReceiver.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/notifications/DeadlineAlarmReceiver.kt)
- **Reboot Persistence**: [android/app/src/main/java/com/nudge/ai/notifications/BootReceiver.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/notifications/BootReceiver.kt)

### Scheduling Strategy
For every pending action item with a deadline:
1. **T-24 Hours Warning**: Friendly heads-up alert.
2. **T-2 Hours Urgent Warning**: High-priority alert with urgent sound and vibration pattern.
3. **Due Time Exact Alert**: Critical reminder firing at the exact deadline millisecond.

### Doze Mode & Reboot Resistance
- Scheduled using `AlarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)`.
- When the phone reboots or the app updates, `BootReceiver` intercepts `ACTION_BOOT_COMPLETED` and queries the local repository to re-arm all active alarms.

---

## 📡 Networking & API Service

- **Retrofit Client**: [android/app/src/main/java/com/nudge/ai/data/api/RetrofitClient.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/data/api/RetrofitClient.kt)
  - Connects to `https://nudge-backend-8fri.onrender.com` with a 120-second timeout for audio uploads.
- **API Interface**: [android/app/src/main/java/com/nudge/ai/data/api/NudgeApiService.kt](file:///c:/Users/suren/Nudge/android/app/src/main/java/com/nudge/ai/data/api/NudgeApiService.kt)
  - Fully mapped to the FastAPI backend endpoints (Meetings, Action Items, Upload, HITL Review, Seed).

---

## 🖼️ UI Screens & Fragments

1. **HomeFragment**: Displays meeting cards, summary stats, and recent tasks.
2. **RecordFragment**: Live audio waveform visualization, recording timer, and meeting title/self-name input fields.
3. **MeetingDetailFragment**: Tabbed view for Executive Summary, Key Decisions, Action Items, and Full Transcript with editable meeting titles.
4. **ActionItemsFragment**: Personal action items list (`mine=true` default) with checkbox completion, swipe actions, and status badges.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Build & Test|Build & Testing Commands]]
- [[Decisions|Architectural Decisions]]
