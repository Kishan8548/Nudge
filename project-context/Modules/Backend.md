# 🐍 Module: Backend & Core Services

The backend is built with **FastAPI** and **Python 3.11/3.12**, providing REST endpoints, background scheduling, audio ingestion, rate limiting, and multi-channel notification dispatchers.

---

## 📂 Source Code Location
- **Root**: `backend/`
- **Configuration**: [backend/config.py](file:///c:/Users/suren/Nudge/backend/config.py)
- **Application Entry**: [backend/main.py](file:///c:/Users/suren/Nudge/backend/main.py)

---

## 🛡️ Gateway & Middleware

### 1. Sliding-Window Rate Limiter
Implemented in [backend/main.py](file:///c:/Users/suren/Nudge/backend/main.py):
- **General Limit**: 80 requests/min per IP for reads (`/api/meetings`, `/api/action-items`, `/api/health`).
- **Heavy Limit**: 15 requests/min per IP for AI/upload endpoints (`/api/upload`, `/api/rag`, `/api/seed`, `/api/scheduler/trigger`, `/process`, `/remind`).
- **Proxy-Aware**: Extracts true client IP from `X-Forwarded-For` header. Returns `429 Too Many Requests` with `Retry-After: 60` on overflow.

### 2. Lifespan & Shared Connection Management
- [backend/db/connection.py](file:///c:/Users/suren/Nudge/backend/db/connection.py) manages a thread-safe `MongoClient` singleton with a 5-second server selection timeout.
- [backend/db/models.py](file:///c:/Users/suren/Nudge/backend/db/models.py) idempotently creates indexes on startup:
  - `meetings`: `created_at` (DESCENDING)
  - `action_items`: `meeting_id`, `(status, deadline)`, `(owner_email, status)`, and full-text index on `text`
  - `meeting_embeddings`: `meeting_id` (Unique)

---

## 📡 API Endpoints Matrix

### Ingestion & Meetings
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Ingests `.mp3`, `.wav`, `.m4a`, `.webm`, `.mp4` files, checks SHA-256 hash, runs 20MB chunked Whisper STT. |
| `GET` | `/api/meetings` | Paginated meeting list (transcripts excluded from list for payload optimization). |
| `GET` | `/api/meetings/{id}` | Complete meeting details including full transcript and associated action items. |
| `PATCH` | `/api/meetings/{id}` | Updates meeting title across MongoDB and RAG vector indices. |
| `POST` | `/api/meetings/{id}/process` | Executes LangGraph multi-agent pipeline (extraction + roster assignment + summary). |
| `DELETE` | `/api/meetings/{id}` | Cascade deletes meeting, audio file on disk, all associated action items, and embeddings. |
| `GET` | `/api/meetings/{id}/calendar.ics` | Exports all action items for a meeting as an iCalendar (`.ics`) bundle. |

### Action Items & Follow-Up
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/action-items` | Filter action items by `status`, `meeting_id`, and `mine` (`is_mine=true` default). |
| `GET` | `/api/action-items/{id}` | Single action item details. |
| `PATCH` | `/api/action-items/{id}` | Update status (`pending`, `in_progress`, `done`), assignee, or deadline. |
| `POST` | `/api/action-items/{id}/remind` | Manually invoke LangGraph reminder agent for live demo follow-up. |
| `GET` | `/api/action-items/{id}/activity-log` | Audit trail of agent reasoning, extraction timestamps, and reminder history. |
| `POST` | `/api/action-items/{id}/review` | Approve/reject low-confidence extractions ($<0.7$ confidence). |
| `GET` | `/api/action-items/{id}/quick-complete` | **1-Click Magic Link**: Instantly marks task done and serves responsive confirmation HTML. |
| `GET` | `/api/action-items/{id}/calendar.ics` | Exports a single action item as an iCalendar (`.ics`) event with reminder alarm. |

### RAG, Analytics & Scheduler
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rag/search` | Semantic vector search over all meetings via Nomic AI embeddings (768-dim). |
| `GET` | `/api/rag/similar/{id}` | Find past meetings semantically similar to a specific meeting. |
| `GET` | `/api/rag/similar-items` | Find recurring or similar past tasks. |
| `GET` | `/api/rag/setup-instructions` | Step-by-step Atlas Vector Search index creation guide. |
| `GET` | `/api/analytics` | MongoDB aggregation metrics (completion rates, leaderboards, weekly meeting volume). |
| `POST` | `/api/seed` | Generates realistic mock meetings and action items for demonstration. |
| `POST` | `/api/scheduler/trigger` | Manually triggers the 30-minute reminder check loop. |

---

## ⚙️ Core Services Breakdown

1. **`transcription.py`** ([backend/services/transcription.py](file:///c:/Users/suren/Nudge/backend/services/transcription.py)):
   - Handles Groq Whisper (`whisper-large-v3-turbo`) with pure-Python 20MB chunking supporting uploads up to 200 MB.
2. **`email_service.py`** ([backend/services/email_service.py](file:///c:/Users/suren/Nudge/backend/services/email_service.py)):
   - Generates responsive HTML email templates with 1-click completion and WhatsApp nudge buttons via Gmail SMTP.
3. **`whatsapp_service.py`** ([backend/services/whatsapp_service.py](file:///c:/Users/suren/Nudge/backend/services/whatsapp_service.py)):
   - Generates pre-filled `https://wa.me/?text=...` deep-links containing the action item description and quick-complete URL.
4. **`slack_service.py`** ([backend/services/slack_service.py](file:///c:/Users/suren/Nudge/backend/services/slack_service.py)):
   - Posts Block Kit cards to incoming webhooks with color-coded urgency and interactive action buttons.
5. **`scheduler.py`** ([backend/services/scheduler.py](file:///c:/Users/suren/Nudge/backend/services/scheduler.py)):
   - Runs `APScheduler.BackgroundScheduler` (every 30 mins) with `max_instances=1` to poll active items approaching deadlines.
6. **`rag_service.py`** ([backend/services/rag_service.py](file:///c:/Users/suren/Nudge/backend/services/rag_service.py)):
   - Cloud embedding generation via `nomic-embed-text-v1.5` and `$vectorSearch` queries against Atlas.
7. **`calendar_service.py`** ([backend/services/calendar_service.py](file:///c:/Users/suren/Nudge/backend/services/calendar_service.py)):
   - Generates RFC 5545 iCalendar (`.ics`) files with built-in reminder alarms and 1-click completion links for Google Calendar, Apple Calendar, and Outlook.
8. **`date_parser.py`** ([backend/utils/date_parser.py](file:///c:/Users/suren/Nudge/backend/utils/date_parser.py)):
   - Resolves natural language date phrases (*"by Friday"*, *"next Tuesday 5pm"*) to ISO timestamps.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Modules/Agents|Agents Module]]
- [[Decisions|Architectural Decisions]]
