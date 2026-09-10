# 📐 Coding Patterns & Conventions

This document outlines the coding standards, patterns, and conventions applied across all subsystems of **Nudge AI**.

---

## 🐍 Python & FastAPI Conventions

### 1. Configuration & Security
- **Pydantic Settings**: All configuration is managed via `Settings(BaseSettings)` in [backend/config.py](file:///c:/Users/suren/Nudge/backend/config.py).
- **Secret Masking**: Sensitive environment variables (`GROQ_API_KEY`, `MONGODB_URI`, `GMAIL_APP_PASSWORD`, `NOMIC_API_KEY`) must use `pydantic.SecretStr` to prevent accidental leakage in tracebacks or log outputs.
- **Fail-Fast Validation**: Environment variables are validated on module load. Missing required variables raise validation errors immediately on application boot.

### 2. LangGraph State & Structured Outputs
- **TypedDict State**: All agent state fields are explicitly typed in [backend/agents/state.py](file:///c:/Users/suren/Nudge/backend/agents/state.py).
- **Reducers**: Conversation history uses `Annotated[list, add_messages]` to accumulate reasoning steps.
- **Pydantic Structured LLM Output**: Specialist agents use `llm.with_structured_output(PydanticModel)` to enforce exact JSON schema generation from LLM calls (see `RouteDecision` in `supervisor.py` and `ExtractionResult` in `extraction.py`).
- **Loop Prevention Guards**: Specialist nodes explicitly set boolean flags (`extraction_done = True`, `assignment_done = True`) upon completion to prevent the supervisor from re-routing in circular loops.

### 3. Error Handling & API Responses
- **HTTP Exceptions**: Always raise `fastapi.HTTPException(status_code=..., detail="...")` with explicit, user-friendly error messages.
- **Idempotency & Non-Fatal Side Effects**: Background tasks such as Slack notifications and RAG embedding updates must be wrapped in `try/except` blocks so that non-critical external service failures do not fail user-facing HTTP requests.
- **Database Serialization**: MongoDB documents must be converted via `_serialize()` helper functions to ensure `ObjectId` and `datetime` instances are converted to strings before returning JSON responses.

---

## 📱 Kotlin & Android Conventions

### 1. Architecture & MVVM Pattern
- **MVVM Architecture**: All screens follow `Fragment` $\rightarrow$ `ViewModel` $\rightarrow$ `Repository` $\rightarrow$ `Retrofit API Service`.
- **View Binding**: All fragments and activities use Android Jetpack View Binding (`FragmentHomeBinding`, etc.). `findViewById` is strictly avoided.
- **Coroutines & Threading**: Network and disk operations execute on `Dispatchers.IO` within `viewModelScope.launch { ... }`. UI mutations execute on `Dispatchers.Main`.

### 2. Hardware Alarms & Notifications
- **Exact Alarms**: Deadline reminders are scheduled using `AlarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)` to ensure delivery through Android Doze mode.
- **Intent Action Namespacing**: Custom broadcast intent actions must be fully qualified (e.g., `com.nudge.ai.notifications.ACTION_DEADLINE_ALARM`).
- **PendingIntent Immutability**: All `PendingIntent` declarations must include `PendingIntent.FLAG_IMMUTABLE` (Android 12+ requirement) combined with `FLAG_UPDATE_CURRENT`.
- **Boot Re-Arming**: Every scheduled exact alarm must have a corresponding re-arming routine inside `BootReceiver.kt` responding to `ACTION_BOOT_COMPLETED` and `ACTION_MY_PACKAGE_REPLACED`.

### 3. Foreground Services
- **Service Types**: Audio recording services declare `android:foregroundServiceType="microphone"` in `AndroidManifest.xml` (Android 14+ requirement).
- **Persistent Notifications**: Services must call `startForeground(NOTIF_ID, notification)` immediately within `onStartCommand` to prevent system termination.

---

## ⚛️ React & Frontend Conventions

### 1. Centralized API Communication
- **API Client**: All network calls go through the centralized client in [frontend/src/api/client.js](file:///c:/Users/suren/Nudge/frontend/src/api/client.js). Direct `fetch()` calls in UI components are forbidden.
- **Base URL Resolution**: The API client automatically trims trailing slashes from `VITE_API_URL` and falls back to `http://localhost:8000`.

### 2. Styling & Design Tokens
- **Vanilla CSS Tokens**: Global tokens are declared in [frontend/src/index.css](file:///c:/Users/suren/Nudge/frontend/src/index.css) (`--bg-primary`, `--bg-card`, `--accent-teal`, `--accent-emerald`, `--text-primary`, `--border-glass`).
- **Dark Glassmorphism**: Cards use translucent dark backgrounds with subtle borders (`background: var(--bg-card); border: 1px solid var(--border-glass); backdrop-filter: blur(12px);`).
- **Component Feedback**: Asynchronous mutations (completing a task, running extraction, sending a reminder) must provide immediate toast feedback using `react-hot-toast`.

---

## 🧩 Chrome Extension Conventions

### 1. Manifest V3 Lifecycle
- **Service Worker Lifecycle**: `background.js` is ephemeral and may sleep. Long-running state (such as `recordingStartTime`) is stored in `chrome.storage.local`.
- **Offscreen Document Separation**: Web Audio and `MediaRecorder` APIs must strictly run within `offscreen.html` / `offscreen.js`. The service worker only orchestrates stream IDs and message passing.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Decisions|Architectural Decisions & ADRs]]
- [[Modules/Backend|Backend Module]]
- [[Modules/Android|Android Module]]
