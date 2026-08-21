<div align="center">
  <img src="screenshots/logo.svg" width="88" height="88" alt="Nudge AI Logo" />
  <h1>Nudge AI</h1>
  <p><b>Autonomous Meeting Intelligence & Personal Task Follow-Up System</b></p>
  <p>Captures meeting audio, extracts key decisions and personal action items with LangGraph, assigns owners, and delivers automated deadline reminders and follow-up loops.</p>
  <br/>

  <a href="https://nudge-three-coral.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-nudge--three--coral.vercel.app-00A896?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  &nbsp;
  <a href="https://github.com/Kishan8548/Nudge/releases/latest">
    <img src="https://img.shields.io/badge/Download-Android%20APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download Android APK" />
  </a>
  &nbsp;
  <a href="https://nudge-backend-8fri.onrender.com/docs">
    <img src="https://img.shields.io/badge/API%20Docs-FastAPI%20Swagger-009688?style=for-the-badge&logo=fastapi" alt="API Docs" />
  </a>
  <br/><br/>

  <img src="https://img.shields.io/badge/Android-Kotlin%20%7C%20Foreground%20Service-3DDC84?style=flat-square&logo=android" />
  <img src="https://img.shields.io/badge/AppWidget-Home%20Screen%20Quick%20Record-00A896?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/AI%20Engine-LangGraph%20%7C%20Groq%20GPT--OSS--120B-6366F1?style=flat-square" />
  <img src="https://img.shields.io/badge/STT-Groq%20Whisper%20Large%20v3-00A896?style=flat-square" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?style=flat-square&logo=react" />
  <br/><br/>
  <a href="https://nudge-three-coral.vercel.app/">
    <img src="screenshots/web_preview.png" width="900" alt="Nudge AI Web Command Center" />
  </a>
</div>

---

## Mobile Application

| Meetings Dashboard | Audio Recording | Meeting Intelligence | Action Items Tracker |
|:---:|:---:|:---:|:---:|
| <img src="screenshots/home.png" width="220" alt="Meetings Dashboard" /> | <img src="screenshots/record.png" width="220" alt="Record Meeting" /> | <img src="screenshots/detail.png" width="220" alt="Meeting Intelligence" /> | <img src="screenshots/action_items.png" width="220" alt="Action Items Tracker" /> |

---

## Overview

Meetings produce critical decisions and commitments, but after calls conclude, action items frequently become buried in transcripts and forgotten without manual follow-up.

Nudge AI addresses this through **personal task accountability** and **autonomous follow-through**:

1. **Personal Task Focus:** Action items assigned to the user are automatically flagged (`is_mine=True`), providing instant clarity on individual deliverables without having to parse full meeting transcripts.
2. **Background Recording & Home Widget:** An Android Foreground Service enables continuous meeting capture while multitasking or when the screen is locked, complemented by a 1-tap Home Screen AppWidget.
3. **Multi-Agent Extraction Engine:** LangGraph orchestrates specialized agents to parse transcripts, extract explicit decisions, assign team roster members, resolve relative deadlines, and generate executive summaries.
4. **Proactive Deadline Alerts:** Android WorkManager monitors approaching deadlines and issues local notifications 24 hours and 2 hours in advance.
5. **Escalating Reminder Sequences:** Unresolved action items trigger structured follow-up sequences (gentle to firm to urgent) via email and Slack until marked complete.
6. **Human-in-the-Loop (HITL):** Extractions with confidence < 0.7 are flagged for one-tap approval before automated reminders are scheduled.

---

## System Architecture

```mermaid
graph TD
    subgraph Clients ["Client Layer"]
        Android["Android App (Kotlin + Foreground Service)"]
        Widget["Home Screen Quick Record Widget"]
        Web["React Web Command Center"]
        Ext["Chrome Extension (MV3 Offscreen)"]
    end

    subgraph API ["Backend Layer (FastAPI on Render)"]
        UploadRouter["POST /api/upload"]
        MeetingsRouter["GET/POST/PATCH /api/meetings"]
        AIRouter["GET/PATCH /api/action-items"]
        Scheduler["APScheduler Background Worker"]
    end

    subgraph Agents ["LangGraph Multi-Agent Engine"]
        Supervisor["Supervisor Agent"]
        Extraction["Extraction Specialist"]
        Assignment["Roster Assignment & Date Resolver"]
        Summary["Executive Summary Generator"]
    end

    subgraph Storage ["Database & Search"]
        Mongo[(MongoDB Atlas)]
        RAG["Nomic Semantic Embeddings"]
    end

    Android -->|Background M4A Stream| UploadRouter
    Widget -->|1-Tap Toggle| Android
    Ext -->|Capture WebM| UploadRouter
    Web <-->|REST API| MeetingsRouter

    UploadRouter -->|Chunked Audio| Supervisor
    Supervisor <--> Extraction
    Supervisor <--> Assignment
    Supervisor --> Summary

    Agents -->|Persist Meetings & Tasks| Mongo
    Agents -->|Index Embeddings| RAG
    Scheduler -->|Escalating Reminders| Mongo
```

---

## Core Capabilities

- **Background Audio Recording Service:** Android `ForegroundService` with `FOREGROUND_SERVICE_MICROPHONE` ensures uninterrupted recording while switching apps, taking notes, or locking the device. Includes persistent notification controls with a live duration timer and Stop action.
- **Home Screen Quick Record AppWidget:** Dedicated Android widget allowing one-tap start and stop recording directly from the launcher with dynamic duration sync.
- **Meeting Title Customization:** Full inline and dialog editing support (`PATCH /api/meetings/{id}`) that synchronizes title updates across MongoDB, RAG semantic search embeddings, and client views.
- **Multi-Platform Audio Ingestion:** Capture audio natively via Android, upload audio files on the web dashboard (up to 200MB chunked), or record live tab audio using the Chrome Extension.
- **High-Throughput Transcription:** Leverages Groq Whisper Large v3 with automated chunking for low-latency speech-to-text processing.
- **Structured Multi-Agent Extraction:** LangGraph orchestrates specialized agents with Pydantic schemas to output decisions, assignees, normalized ISO deadlines, and confidence scores.
- **Natural Language Date Normalization:** Converts relative meeting phrasing (*"by next Tuesday afternoon"*, *"by Friday morning"*) into normalized ISO timestamps.
- **Automated Escalation Workflows:** Scheduled background jobs dispatch escalating reminder notifications via email and Slack when deadlines approach.
- **Fault-Tolerant Infrastructure:** Built-in exponential backoff for Groq rate limits, SHA-256 audio file deduplication, and automated Render keepalive monitoring.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile (Android)** | Kotlin, Material3, View Binding, AppWidget API, Foreground Service, Retrofit2, Coroutines, WorkManager |
| **Backend** | Python 3.11, FastAPI, LangGraph, LangChain, Pydantic v2, APScheduler, PyMongo |
| **AI / ML** | Groq (`openai/gpt-oss-120b`, `whisper-large-v3-turbo`), Nomic Embeddings |
| **Frontend** | React 18, Vite, React Router v7, Lucide Icons, React Hot Toast |
| **Database** | MongoDB Atlas M0 (Optimized document schema, metadata-only storage) |
| **Infrastructure** | Render (API), Vercel (Web Dashboard), GitHub Actions (Keepalive Monitoring) |

---

## Getting Started

### 1. Backend Setup (FastAPI)
```bash
# Clone repository
git clone https://github.com/Kishan8548/Nudge.git
cd Nudge

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Set GROQ_API_KEY and MONGODB_URI in .env

# Start development server
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 3. Android Application
- **Direct APK Install:** Download the latest [`app-release.apk`](https://github.com/Kishan8548/Nudge/releases/latest) directly to your Android phone (API 26+) and tap to install.
- **Build from Source:**
  1. Open the `android/` directory in **Android Studio**.
  2. Sync Gradle dependencies (`build.gradle.kts`).
  3. Deploy to a connected Android device or emulator running API 26 or higher.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload audio file (`.m4a`, `.mp3`, `.webm`) and trigger transcription |
| `GET` | `/api/meetings` | Retrieve paginated list of meetings with summaries and durations |
| `GET` | `/api/meetings/{id}` | Retrieve complete meeting details, transcript, and action items |
| `PATCH` | `/api/meetings/{id}` | Update meeting title across database and vector embeddings |
| `POST` | `/api/meetings/{id}/process` | Execute LangGraph extraction and assignment pipeline |
| `DELETE` | `/api/meetings/{id}` | Cascade delete meeting, associated action items, and embeddings |
| `GET` | `/api/action-items?mine=true` | Query action items filtered by assignee status |
| `PATCH` | `/api/action-items/{id}` | Update task status (`pending`, `in_progress`, `done`) |
| `POST` | `/api/action-items/{id}/remind` | Dispatch on-demand email reminder |
| `GET` | `/api/health` | Service health check and keepalive probe |

---

## License

This project is licensed under the MIT License.
