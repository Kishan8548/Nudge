# 🏠 Nudge AI — Project Knowledge Base

**Nudge AI** is a production-grade, autonomous meeting intelligence and personal task follow-up system. It captures audio from meetings across mobile, web, and browser extensions, runs a specialized multi-agent pipeline using **LangGraph** and **Groq** to extract key decisions and assign action items, and executes an automated, escalating follow-up loop via email (Gmail SMTP), WhatsApp, Slack webhooks, and native Android hardware alarms.

---

## 🎯 The Core Problem & Value Proposition

In typical team settings, meetings generate critical commitments, but follow-through fails because:
1. Action items get buried inside hour-long recordings or static transcript dumps.
2. Individuals lose track of what was assigned specifically to them vs. the broader team.
3. Follow-up is manual, awkward, and often neglected until deadlines have passed.

**Nudge AI solves this with:**
- **Zero-Friction Audio Capture**: Android background recording service (with lock-screen controls), 1-tap Home Screen AppWidget, Chrome tab capture extension, and web upload.
- **Personalized Action Filtering (`is_mine`)**: Automatically attributes tasks to the meeting recorder, separating personal deliverables from general team notes.
- **Agentic Multi-Step Extraction**: LangGraph supervisor dynamically routes transcripts through extraction, fuzzy team roster matching, relative date normalization, and executive summarization.
- **1-Click Magic Resolution**: Recipients can mark tasks complete directly from email or WhatsApp nudges via tokenless 1-click links (`GET /api/action-items/{id}/quick-complete`) without logging into an app.
- **Hardware-Level Alarm Reminders**: Android exact alarms (`AlarmManager.setExactAndAllowWhileIdle`) ensure critical deadline warnings fire even if the device is in deep Doze mode or the app is killed.

---

## 🗺️ Knowledge Base Navigation

Explore the knowledge base using the Obsidian graph structure below:

### 📐 Core System Documents
- [[Architecture|Architecture]]: System topology, data flow diagrams, multi-agent state graphs, and cross-tier event cycles.
- [[Current State|Current State]]: Live deployment status, production endpoints, active feature matrix, and recent test results.
- [[Build & Test|Build & Test]]: Verified build, local execution, CI workflows, and debugging commands across Python, React, Android, and Extension.
- [[Coding Conventions|Coding Conventions]]: Typing rules, Pydantic schemas, Kotlin MVVM architecture, and React styling standards.
- [[Decisions|Decisions]]: Architectural Decision Records (ADRs) explaining key design trade-offs and rationale.
- [[Issues & Blockers|Issues & Blockers]]: Known edge cases, rate limiting constraints, Android Doze mode handling, and limitations.

### 📦 Major Subsystem Modules
- [[Modules/Backend|Backend Module]]: FastAPI application, database connections, rate limiting, and core services.
- [[Modules/Agents|Agents Module]]: LangGraph supervisor, extraction specialist, assignment resolver, and reminder loops.
- [[Modules/Frontend|Frontend Module]]: React 18, Vite dashboard, design tokens, responsive layouts, and API integrations.
- [[Modules/Android|Android Module]]: Kotlin native app, Foreground Recording Service, AppWidget, and Exact Alarms.
- [[Modules/Extension|Extension Module]]: Chrome Manifest V3 tab audio capture via offscreen document recorder.

### 📋 Project Management & Evolution
- [[Tasks/Completed Tasks|Completed Tasks]]: Chronological changelog of implemented milestones and bug fixes.
- [[Tasks/Roadmap|Roadmap]]: Planned improvements, enterprise integrations, and scalability optimizations.

---

## 🧱 Repository File Layout

```
Nudge/
├── AGENTS.md                         # Top-level instructions for AI agents
├── requirements.txt                  # Python dependencies (FastAPI, LangGraph, Groq, PyMongo)
├── .env.example                      # Reference environment variables
├── .github/workflows/
│   └── render-keepalive.yml          # GitHub Action pinging Render health endpoint every 10m
│
├── backend/                          # FastAPI Backend & Agent Service
│   ├── main.py                       # App lifecycle, CORS, rate limiter, router mounting
│   ├── config.py                     # Pydantic Settings and validated env variables
│   ├── agents/                       # LangGraph Multi-Agent Engine
│   │   ├── graph.py                  # StateGraph compiler with MongoDBSaver checkpointer
│   │   ├── state.py                  # MeetingAgentState TypedDict definition
│   │   ├── supervisor.py             # LLM reasoning router with deterministic fallback
│   │   ├── extraction.py             # Groq structured extraction of decisions & action items
│   │   ├── assignment.py             # Fuzzy roster matcher (difflib) & date resolver
│   │   └── reminder.py               # Escalating reminder dispatcher
│   ├── db/
│   │   ├── connection.py             # PyMongo client singleton management
│   │   └── models.py                 # Collection names and index creation
│   ├── routers/
│   │   ├── upload.py                 # Audio upload, SHA-256 deduplication, Groq Whisper STT
│   │   ├── meetings.py               # Meeting CRUD, agent process trigger, cascading delete
│   │   ├── action_items.py           # Task CRUD, manual remind, HITL review, 1-click complete
│   │   ├── rag.py                    # Vector similarity search over past meetings
│   │   ├── analytics.py              # MongoDB aggregation analytics for dashboard
│   │   └── seed.py                   # Demo meeting data generator
│   ├── services/
│   │   ├── transcription.py          # 20MB chunked Groq Whisper transcription
│   │   ├── email_service.py          # Responsive HTML emails via Gmail SMTP
│   │   ├── whatsapp_service.py       # WhatsApp nudge URL generator
│   │   ├── slack_service.py          # Slack Block Kit webhook notifications
│   │   ├── rag_service.py            # Nomic AI embeddings (768-dim) + Atlas Vector Search
│   │   ├── scheduler.py              # APScheduler 30-minute background reminder loop
│   │   └── summary.py                # Executive meeting summary generator
│   └── utils/
│       ├── date_parser.py            # Natural language date resolver (dateutil + regex)
│       └── retry.py                  # Exponential backoff utility for LLM/API calls
│
├── frontend/                         # React 18 + Vite Web Command Center
│   ├── package.json                  # Dependencies (React Router v7, Lucide, Hot-Toast)
│   ├── vite.config.js                # Vite build config
│   └── src/
│       ├── main.jsx / App.jsx        # Router provider and 5-minute backend keepalive
│       ├── index.css                 # Dark glassmorphic design system and CSS tokens
│       ├── api/client.js             # Centralized fetch client
│       ├── layouts/RootLayout.jsx    # Sidebar navigation and main content wrapper
│       ├── pages/                    # Landing, Dashboard, Upload, MeetingDetail, ActionItems, Analytics
│       └── components/               # StatusBadge, ActivityLog, EmptyState, LoadingSpinner
│
├── android/                          # Native Android Mobile App (Kotlin)
│   ├── build.gradle.kts              # Root gradle script
│   └── app/
│       ├── build.gradle.kts          # App dependencies (SDK 36, ViewBinding, Retrofit, Coroutines)
│       └── src/main/
│           ├── AndroidManifest.xml   # Permissions (Mic, Foreground Service, Exact Alarm, Boot)
│           ├── java/com/nudge/ai/
│           │   ├── MainActivity.kt   # Navigation host and permission requester
│           │   ├── data/             # Retrofit API service, Gson models, repository
│           │   ├── services/         # AudioRecordingService (Foreground Service with mic type)
│           │   ├── widget/           # RecordWidgetProvider (Home Screen Quick Record AppWidget)
│           │   ├── notifications/    # AlarmScheduler, DeadlineAlarmReceiver, BootReceiver, Worker
│           │   └── ui/               # MVVM UI for Home, Record, MeetingDetail, ActionItems
│           └── res/                  # Material3 layouts, drawables, fonts (Plus Jakarta Sans)
│
└── extension/                        # Chrome Manifest V3 Extension
    ├── manifest.json                 # MV3 permissions (tabCapture, offscreen, storage)
    ├── background.js                 # Service worker managing capture lifecycle
    ├── offscreen.html / offscreen.js # MediaRecorder runtime capturing tab audio stream
    └── popup.html / popup.js         # Extension popup UI, timer, and direct backend uploader
```
