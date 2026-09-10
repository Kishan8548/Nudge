# ⚛️ Module: Web Frontend (React + Vite)

The web dashboard is built with **React 18**, **Vite**, and **React Router v7**, featuring a custom dark glassmorphic design system.

---

## 📂 Source Code Location
- **Root**: `frontend/`
- **Entry Point**: [frontend/src/main.jsx](file:///c:/Users/suren/Nudge/frontend/src/main.jsx) & [frontend/src/App.jsx](file:///c:/Users/suren/Nudge/frontend/src/App.jsx)
- **Design Tokens**: [frontend/src/index.css](file:///c:/Users/suren/Nudge/frontend/src/index.css)
- **API Client**: [frontend/src/api/client.js](file:///c:/Users/suren/Nudge/frontend/src/api/client.js)

---

## 🎨 Design System & Visual Tokens

The frontend uses Vanilla CSS custom properties defined in [frontend/src/index.css](file:///c:/Users/suren/Nudge/frontend/src/index.css):

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-card: rgba(18, 18, 24, 0.7);
  --bg-surface: #16161f;
  --accent-teal: #0d9488;
  --accent-emerald: #10b981;
  --accent-cyan: #06b6d4;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-glass: rgba(255, 255, 255, 0.08);
}
```

---

## 📄 Page Architecture

### 1. Landing Page (`Landing.jsx`)
- **Route**: `/`
- **Features**:
  - High-impact hero section with interactive CTAs.
  - Dedicated showcase banners for both the **Chrome Extension** and **Android APK v1.1.0**.
  - Interactive architecture walkthrough tab and Bento feature grid.
  - Testimonial and performance benchmark displays.

### 2. Dashboard (`Dashboard.jsx`)
- **Route**: `/dashboard`
- **Features**:
  - Quick summary cards (Total Meetings, Active Tasks, Pending Review, Overall Completion Rate).
  - Recent meetings carousel with processing status indicators.
  - Action items table with quick "Mark Complete" toggle.

### 3. Upload Center (`Upload.jsx`)
- **Route**: `/dashboard/upload`
- **Features**:
  - Drag-and-drop zone supporting `.mp3`, `.wav`, `.m4a`, `.webm`, `.mp4` up to 200 MB.
  - Optional `self_name` field for personalized `is_mine` task tagging.
  - Multi-stage upload and transcription progress animation.

### 4. Meeting Detail (`MeetingDetail.jsx`)
- **Route**: `/dashboard/meetings/:id`
- **Features**:
  - Executive summary and key decisions cards.
  - Full transcript viewer with timestamped segments.
  - Action items checklist with inline status updating.
  - Inline meeting title editor synced with MongoDB and RAG index.
  - Cross-meeting RAG recommendations panel (similar past meetings).

### 5. Action Items Tracker (`ActionItems.jsx`)
- **Route**: `/dashboard/action-items`
- **Features**:
  - Filter tabs: **My Tasks** (`mine=true` default) vs. **All Tasks**.
  - Status filters (`pending`, `in_progress`, `done`, `escalated`).
  - Human-in-the-Loop review modal for low-confidence extractions ($<0.7$).
  - One-tap manual reminder trigger with instant toast feedback.

### 6. Analytics (`Analytics.jsx`)
- **Route**: `/dashboard/analytics`
- **Features**:
  - Real-time aggregation metrics powered by MongoDB pipeline endpoints.
  - Status breakdown distribution charts.
  - Assignee leaderboard with per-owner completion rates.
  - 8-week historical meeting volume bar graphs.

---

## 🔄 Backend Keepalive Loop

To prevent Render free-tier instances from falling asleep while a user is actively viewing the web dashboard, [frontend/src/App.jsx](file:///c:/Users/suren/Nudge/frontend/src/App.jsx) executes:
1. An immediate `api.health()` probe on initial mount.
2. A recurring 5-minute interval timer calling `api.health()`.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Modules/Backend|Backend Module]]
- [[Build & Test|Build & Testing Commands]]
