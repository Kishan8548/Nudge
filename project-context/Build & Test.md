# 🛠️ Build, Test & Debugging Guide

This document contains verified commands for running, building, testing, and debugging all tiers of **Nudge AI**.

---

## 🐍 Backend (Python / FastAPI)

### Requirements
- **Python**: Version 3.11 or 3.12
- **MongoDB**: MongoDB Atlas Cluster with connection URI
- **Groq API Key**: Required for Whisper STT and GPT-OSS-120B extraction
- **Nomic API Key**: Required for RAG vector embeddings (optional for basic features)

### 1. Environment Setup & Run

```powershell
# In repository root
cd c:\Users\suren\Nudge

# Create and activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required packages
pip install -r requirements.txt

# Create .env from template
Copy-Item .env.example .env
# Edit .env with your GROQ_API_KEY and MONGODB_URI

# Start local development server with auto-reload (Port 8000)
uvicorn backend.main:app --reload --port 8000
```

### 2. Verified Health & Diagnostic Commands

```powershell
# Health check probe
curl http://localhost:8000/api/health

# Trigger immediate background reminder tick (Live Demo trigger)
curl -X POST http://localhost:8000/api/scheduler/trigger

# Seed database with realistic demo meeting data
curl -X POST http://localhost:8000/api/seed

# Test 1-Click Quick Complete endpoint (HTML confirmation)
curl http://localhost:8000/api/action-items/<ITEM_ID>/quick-complete

# Test iCalendar (.ics) download
curl http://localhost:8000/api/action-items/<ITEM_ID>/calendar.ics
```

### 3. Running Backend Automated Tests

```powershell
# Run the complete test suite (17 unit tests)
pytest backend/tests -v
```

---

## ⚛️ Web Frontend (React 18 / Vite)

### Requirements
- **Node.js**: Version 18+ or 20+
- **npm**: Version 9+

### 1. Development & Production Build

```powershell
cd c:\Users\suren\Nudge\frontend

# Install dependencies
npm install

# Start Vite local development server (Port 5173)
npm run dev

# Run production build (outputs to frontend/dist/)
npm run build

# Preview production build locally
npm run preview
```

### 2. Environment Configuration
- Default API URL in development: `http://localhost:8000`
- Configurable via `frontend/.env` using:
  ```env
  VITE_API_URL=https://nudge-backend-8fri.onrender.com
  ```

---

## 📱 Android Native Application (Kotlin)

### Requirements
- **JDK**: Adoptium JDK 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot`)
- **Android SDK**: CompileSdk 36, TargetSdk 36, MinSdk 26
- **Gradle**: 8.x (wrapper provided via `gradlew.bat`)

### 1. Command-Line Build (PowerShell)

```powershell
cd c:\Users\suren\Nudge\android

# Set Java Home for Gradle
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"

# Clean and assemble Debug APK
.\gradlew.bat assembleDebug

# Output APK path:
# android\app\build\outputs\apk\debug\app-debug.apk
```

### 2. Direct Device Installation & Logs

```powershell
# Install debug build on connected Android device via ADB
adb install -r .\app\build\outputs\apk\debug\app-debug.apk

# Filter logs for Nudge AI events (Audio Recording, Alarms, Retrofit)
adb logcat -s AudioRecordingService AlarmScheduler DeadlineAlarmReceiver RetrofitClient
```

### 3. Running Android Unit Tests

```powershell
cd c:\Users\suren\Nudge\android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
.\gradlew.bat testDebugUnitTest
```

---

## 🧩 Chrome Extension (Manifest V3)

### Requirements
- Google Chrome or Chromium-based browser (Brave, Edge).

### 1. Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory: `c:\Users\suren\Nudge\extension`.

### 2. Debugging Extension Components
- **Popup UI**: Right-click the Nudge extension icon in the toolbar $\rightarrow$ **Inspect popup**.
- **Background Service Worker**: Go to `chrome://extensions/` $\rightarrow$ Nudge AI $\rightarrow$ click **service worker (Inspect views)**.
- **Offscreen Audio Recorder**: Go to `chrome://extensions/` $\rightarrow$ Nudge AI $\rightarrow$ click **offscreen.html (Inspect views)** to view `MediaRecorder` audio buffer logs.

---

## 🔄 CI / Automated Workflows

### GitHub Actions: Render Backend Keepalive
- **Workflow file**: [.github/workflows/render-keepalive.yml](file:///c:/Users/suren/Nudge/.github/workflows/render-keepalive.yml)
- **Schedule**: Runs every 10 minutes (`*/10 * * * *`) to prevent Render free-tier instances from spinning down due to inactivity.
- **Manual Trigger**: Supports `workflow_dispatch` from the GitHub Actions UI.

---

## 🐞 Common Debugging Scenarios

| Issue | Root Cause | Solution |
|---|---|---|
| `429 Rate limit exceeded` | Sliding-window IP limiter hit ($>15$ heavy req/min) | Wait 60s for sliding window reset or adjust limits in `backend/main.py`. |
| Audio upload fails with `400 File too large` | Audio exceeds 200 MB maximum threshold | Downsample audio to 32kbps MP3 (a 2-hour call is $\sim 28$ MB). |
| `Atlas Vector Search index not found` | Index not yet created in MongoDB Atlas UI | View setup instructions at `GET /api/rag/setup-instructions` and configure index in Atlas. |
| Android alarm not firing when app killed | `SCHEDULE_EXACT_ALARM` permission restricted | Ensure `USE_EXACT_ALARM` and `SCHEDULE_EXACT_ALARM` are declared in `AndroidManifest.xml`. |
| Extension `tabCapture` error | User has not selected an active audio tab | Ensure the active tab is playing audio or in an active call (Google Meet/Zoom). |

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Current State|Current Implementation State]]
- [[Issues & Blockers|Known Issues & Constraints]]
