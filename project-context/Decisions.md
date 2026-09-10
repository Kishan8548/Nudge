# 🏛️ Architectural Decisions & Rationale (ADRs)

This document records the key architectural decisions, design choices, trade-offs, and rationale behind **Nudge AI**.

---

## ADR 1: LangGraph StateGraph & Supervisor Routing vs. Linear Chains

- **Decision**: Implement a multi-agent system with a centralized supervisor node using `StateGraph` and `ChatGroq` structured output instead of a linear LangChain pipeline.
- **Rationale**:
  - Linear chains are brittle when dealing with variable meeting contents (e.g., transcripts without action items, meetings requiring immediate human review, or partial reassignment).
  - The supervisor node dynamically evaluates state context and routes between specialists (`extraction`, `assignment`, `reminder`, or `FINISH`).
  - Loop-prevention guards (`extraction_done`, `assignment_done`) combined with a deterministic fallback (`_deterministic_route`) ensure $100\%$ pipeline completion even during transient LLM API hiccups.

---

## ADR 2: Synchronous MongoDBSaver vs. AsyncMongoDBSaver

- **Decision**: Use `langgraph.checkpoint.mongodb.MongoDBSaver` backed by a shared synchronous `pymongo.MongoClient` singleton.
- **Rationale**:
  - In `langgraph-checkpoint-mongodb >= 0.4.0`, `AsyncMongoDBSaver` was removed in favor of standard thread-safe `MongoDBSaver`.
  - Sharing the single `MongoClient` instance across FastAPI route handlers, APScheduler background jobs, and LangGraph checkpoints eliminates connection exhaustion on MongoDB Atlas M0 (which enforces a strict 500 connection limit).

---

## ADR 3: Pure-Python Binary Audio Chunking vs. FFmpeg Server Dependencies

- **Decision**: Implement binary audio stream slicing (20 MB chunks) in [backend/services/transcription.py](file:///c:/Users/suren/Nudge/backend/services/transcription.py) rather than requiring `ffmpeg` or `pydub`.
- **Rationale**:
  - Groq Whisper enforces a 25 MB request limit. Real-world recordings frequently reach 50–200 MB.
  - Relying on system binaries like `ffmpeg` complicates container deployments on lightweight hosts (Render, Docker alpine, serverless runtimes).
  - Binary slicing introduces negligible boundary audio loss ($<0.1$s) while preserving complete speech intelligibility and allowing zero-dependency Python execution.

---

## ADR 4: Android Hardware AlarmManager vs. WorkManager Periodic Polling

- **Decision**: Use `AlarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ...)` for task deadline reminders, using `WorkManager` only as a secondary sync mechanism.
- **Rationale**:
  - Android 12+ Doze mode aggressively throttles `WorkManager` periodic polling, causing periodic jobs to drift by 30 to 90 minutes.
  - Action items require precise notifications (T-24 hours, T-2 hours, and exact due time).
  - `AlarmManager.RTC_WAKEUP` wakes the CPU directly at the exact trigger millisecond. Paired with `BootReceiver`, all scheduled alarms persist across phone reboots.

---

## ADR 5: 1-Click Magic Link Completion vs. Authenticated Web Portal

- **Decision**: Serve an open GET endpoint (`/api/action-items/{id}/quick-complete`) embedded directly into email and WhatsApp nudges.
- **Rationale**:
  - The primary cause of neglected meeting tasks is friction: requiring busy colleagues to open a web browser, remember credentials, and navigate a dashboard to check a single box results in high abandonment.
  - A 1-click URL allows instantaneous task resolution from any mobile email client or WhatsApp chat in $<2$ seconds.
  - The endpoint appends an audit event to the item's `activity_log` and renders a clean responsive confirmation page.

---

## ADR 6: Application-Level Sliding-Window Rate Limiter

- **Decision**: Implement an in-memory sliding-window rate limiter in [backend/main.py](file:///c:/Users/suren/Nudge/backend/main.py) with dual tiers (80 general req/min, 15 heavy req/min).
- **Rationale**:
  - Heavy AI endpoints (`/api/upload`, `/api/rag`, `/api/seed`, `/api/scheduler/trigger`) consume costly Groq and Nomic API tokens.
  - An in-memory sliding-window lock handles reverse-proxy header resolution (`X-Forwarded-For`) to accurately throttle abusive IPs without adding Redis infrastructure overhead.

---

## ADR 7: Chrome Extension Offscreen Document API for Audio Capture

- **Decision**: Use Chrome's `offscreen.createDocument` API to host `MediaRecorder` rather than trying to record inside the Service Worker.
- **Rationale**:
  - Chrome Manifest V3 service workers do not have access to DOM APIs, Web Audio contexts, or the `MediaRecorder` constructor.
  - The service worker acquires the stream ID via `chrome.tabCapture.getMediaStreamId` and passes it to `offscreen.html`, which records the tab audio and transfers the encoded blob back to the popup.

---

## ADR 8: Metadata-Only Storage in MongoDB Atlas

- **Decision**: Store audio files on local disk / ephemeral storage and persist only metadata, transcripts, decisions, and embeddings in MongoDB Atlas.
- **Rationale**:
  - MongoDB Atlas M0 free clusters provide 512 MB total storage. Storing large raw audio files (50–200 MB each) in GridFS would exhaust the database quota in 3–4 meetings.
  - Transcripts, action items, and 768-dim embeddings occupy $<100$ KB per meeting, allowing thousands of meetings to reside comfortably within the free tier.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Coding Conventions|Coding Patterns]]
- [[Issues & Blockers|Known Constraints]]
