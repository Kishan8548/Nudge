# Nudge AI — Meeting Follow-Up Agent 🤖

> AI-powered meeting transcription, action item extraction, and automated follow-up system.
> Built for a 24-hour hackathon with a $0 stack.

## Tech Stack

| Layer | Technology |
|---|---|
| **LLM** | Groq Cloud (`llama-3.3-70b-versatile`) |
| **Transcription** | Groq Whisper (`whisper-large-v3-turbo`) |
| **Agent** | LangGraph (Supervisor + 3 specialists) |
| **Database** | MongoDB Atlas (M0 free tier) |
| **Backend** | FastAPI + Uvicorn |
| **Email** | Gmail SMTP (App Password) |
| **Scheduler** | APScheduler 3.x |
| **Frontend** | React + Vite |

---

## Quick Start

### 1. Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for frontend)
- Free accounts on:
  - [Groq Cloud](https://console.groq.com) — get API key
  - [MongoDB Atlas](https://cloud.mongodb.com) — create free M0 cluster
  - Gmail account with 2FA enabled (for App Password)

### 2. Clone & Setup

```bash
# Clone the repo
git clone <repo-url>
cd Nudge

# Create Python virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env with your credentials:
#   - GROQ_API_KEY      → from https://console.groq.com/keys
#   - MONGODB_URI       → from Atlas dashboard (Connect → Drivers)
#   - GMAIL_SENDER_EMAIL → your Gmail address
#   - GMAIL_APP_PASSWORD → from https://myaccount.google.com/apppasswords
```

> **MongoDB Atlas setup:**
> 1. Create a free M0 cluster
> 2. Add your IP to Network Access (or use 0.0.0.0/0 for hackathon)
> 3. Create a database user
> 4. Copy the connection string → paste in `.env`

### 4. Run the Backend

```bash
# From the project root (Nudge/)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Swagger docs:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/api/health

### 5. Run the Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

---

## API Endpoints

### Upload & Transcription
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload audio/video file → transcribe |

### Meetings
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/meetings` | List all meetings |
| `GET` | `/api/meetings/{id}` | Get meeting + action items |
| `POST` | `/api/meetings/{id}/process` | Trigger AI extraction pipeline |

### Action Items
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/action-items` | List items (filter by status/meeting) |
| `GET` | `/api/action-items/{id}` | Get single item |
| `PATCH` | `/api/action-items/{id}` | Update status/owner/deadline |
| `POST` | `/api/action-items/{id}/remind` | Manually trigger a reminder |
| `GET` | `/api/action-items/{id}/activity-log` | Agent reasoning history |
| `POST` | `/api/action-items/{id}/review` | Approve/reject flagged items |

### Utilities
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/scheduler/trigger` | Manually fire reminder check |

---

## Project Structure

```
Nudge/
├── backend/
│   ├── main.py            # FastAPI app + lifespan
│   ├── config.py          # pydantic-settings config
│   ├── agents/            # LangGraph agent nodes
│   │   ├── graph.py       # StateGraph builder
│   │   ├── supervisor.py  # LLM routing supervisor
│   │   ├── extraction.py  # Decisions + action items
│   │   ├── assignment.py  # Owner matching + dates
│   │   ├── reminder.py    # Email reminders + escalation
│   │   └── state.py       # State schema
│   ├── services/
│   │   ├── transcription.py  # Groq Whisper
│   │   ├── email_service.py  # Gmail SMTP
│   │   └── scheduler.py      # APScheduler loop
│   ├── routers/
│   │   ├── upload.py       # File upload
│   │   ├── meetings.py     # Meeting CRUD
│   │   └── action_items.py # Action item CRUD
│   ├── db/
│   │   ├── connection.py   # MongoDB singleton
│   │   └── models.py       # Indexes
│   └── utils/
│       └── date_parser.py  # "by Friday" → ISO date
├── frontend/               # React (Vite)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Demo Flow

1. **Upload** a meeting recording (or text transcript)
2. **Transcribe** — Whisper Turbo processes it in seconds
3. **Process** — AI extracts decisions + action items with confidence scores
4. **Review** — Low-confidence items flagged for human approval
5. **Remind** — Trigger a reminder email (escalating tone)
6. **Mark Done** — One-click status update on the dashboard

---

## Team (5 people × 24 hours)

| Person | Focus Area |
|---|---|
| 1 | Ingestion + Whisper transcription |
| 2 | LangGraph supervisor + extraction/assignment agents |
| 3 | Reminder agent + APScheduler + Gmail integration |
| 4 | MongoDB schema + FastAPI backend + checkpointing |
| 5 | React dashboard + demo data + activity log UI |
