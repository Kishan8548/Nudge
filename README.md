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
  <a href="https://nudge-backend-8fri.onrender.com/docs">
    <img src="https://img.shields.io/badge/API%20Docs-FastAPI%20Swagger-009688?style=for-the-badge&logo=fastapi" alt="API Docs" />
  </a>
  <br/><br/>

  <img src="https://img.shields.io/badge/Android-Kotlin%20%7C%20WorkManager-3DDC84?style=flat-square&logo=android" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/AI%20Engine-LangGraph%20%7C%20Groq%20Llama%203.3-6366F1?style=flat-square" />
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

| Meetings List | Audio Recording | Action Items | Empty State |
|:---:|:---:|:---:|:---:|
| <img src="screenshots/home.png" width="220" alt="Meetings List" /> | <img src="screenshots/record.png" width="220" alt="Record Meeting" /> | <img src="screenshots/action_items.png" width="220" alt="Action Items" /> | <img src="screenshots/home_empty.png" width="220" alt="Empty State" /> |

---

## Overview

Meetings produce critical decisions and commitments, but after calls conclude, action items frequently become buried in transcripts and forgotten without manual follow-up.

Nudge AI addresses this through **personal task accountability** and **automated follow-through**:

1. **Personal Task Focus:** Action items assigned to the user are automatically flagged (`is_mine=True`), allowing instant visibility into individual deliverables without navigating full meeting transcripts.
2. **Local and Push Notifications:** Android WorkManager monitors approaching deadlines and issues proactive notifications 24 hours and 2 hours in advance.
3. **Escalating Follow-Up Loop:** Uncompleted tasks trigger structured follow-up sequences (gentle $\rightarrow$ firm $\rightarrow$ urgent) via email and Slack until marked complete.
4. **Human-in-the-Loop (HITL):** Extractions with confidence $< 0.7$ are flagged for one-tap approval before automated reminders are scheduled.

---

## System Architecture

```mermaid
graph TD
    subgraph Clients ["Client Layer"]
        Android["Android App (Kotlin + WorkManager)"]
        Web["React Web Dashboard"]
        Ext["Chrome Extension (MV3 Offscreen)"]
    end

    subgraph API ["Backend Layer (FastAPI on Render)"]
        UploadRouter["POST /api/upload"]
        MeetingsRouter["GET/POST /api/meetings"]
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

    Android -->|Record M4A| UploadRouter
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

- **Multi-Platform Audio Ingestion:** Capture audio natively via Android (`MediaRecorder`), upload files on the web dashboard (up to 200MB chunked), or record live tab audio using the Chrome Extension.
- **High-Throughput Transcription:** Leverages Groq Whisper Large v3 with automated 20MB chunking for rapid speech-to-text processing.
- **Structured Multi-Agent Extraction:** LangGraph orchestrates specialized extraction agents with Pydantic schemas to output decisions, assignees, and confidence scores.
- **Natural Language Date Normalization:** Converts relative meeting phrasing (*"by next Tuesday afternoon"*, *"by Friday morning"*) into normalized ISO timestamps.
- **Automated Escalation Workflows:** Scheduled background jobs dispatch escalating reminder notifications via email and Slack when deadlines approach.
- **Fault-Tolerant Infrastructure:** Built-in exponential backoff for Groq rate limits, SHA-256 audio file deduplication, and automated Render keepalive monitoring.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile (Android)** | Kotlin, Material3, View Binding, Retrofit2, Coroutines, AndroidX WorkManager, Notifications API |
| **Backend** | Python 3.11, FastAPI, LangGraph, LangChain, Pydantic v2, APScheduler, PyMongo |
| **AI / ML** | Groq (`llama-3.3-70b-versatile`, `whisper-large-v3-turbo`), Nomic Embeddings |
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

### 3. Android Application Setup
1. Open the `android/` directory in **Android Studio**.
2. Sync Gradle dependencies (`build.gradle.kts`).
3. Verify the backend base URL in `RetrofitClient.kt` (configured for production Render by default).
4. Deploy to an Android device or emulator running API 26 or higher.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload audio file (`.m4a`, `.mp3`, `.webm`) and trigger transcription |
| `GET` | `/api/meetings` | Retrieve paginated list of meetings with summaries and durations |
| `GET` | `/api/meetings/{id}` | Retrieve complete meeting details, transcript, and action items |
| `POST` | `/api/meetings/{id}/process` | Execute LangGraph extraction and assignment pipeline |
| `DELETE` | `/api/meetings/{id}` | Cascade delete meeting, associated action items, and embeddings |
| `GET` | `/api/action-items?mine=true` | Query action items filtered by assignee status |
| `PATCH` | `/api/action-items/{id}` | Update task status (`pending`, `in_progress`, `done`) |
| `POST` | `/api/action-items/{id}/remind` | Dispatch on-demand email reminder |
| `GET` | `/api/health` | Service health check and keepalive probe |

---

## License

This project is licensed under the MIT License.
