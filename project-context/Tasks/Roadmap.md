# 🚀 Project Roadmap & Future Enhancements

This document outlines planned improvements, enterprise capabilities, and architectural enhancements for **Nudge AI**.

---

## 🔮 Planned Enhancements

### 1. External Calendar & Project Management Integrations
- [ ] **Google Calendar / Outlook Sync**: Automatically push resolved action items with ISO deadlines as calendar events or Google Tasks.
- [ ] **Linear & Jira Export**: 1-click conversion of extracted action items into structured Jira / Linear issues with assigned assignees.

### 2. Multi-Speaker Diarization & Voiceprints
- [ ] **Voice Enrollment**: Allow team members to record a 10-second voice sample to automatically label speaker names during chunked Groq Whisper transcription.
- [ ] **Per-Speaker Transcript Highlighting**: Display visual speaker avatars alongside diarized transcript segments in both web and mobile interfaces.

### 3. Persistent Cloud Object Storage
- [ ] **Cloudflare R2 / AWS S3 Storage**: Store uploaded audio files in S3-compatible cloud storage rather than ephemeral container disk, allowing full playback on meeting detail screens.
- [ ] **Streaming Playback**: Waveform visualizer synchronized with transcript timestamps during audio playback.

### 4. Real-Time Streaming & WebSockets
- [ ] **Live Audio Streaming**: Stream audio in 5-second chunks via WebSockets during ongoing meetings for real-time transcription and live note extraction.
- [ ] **Live Extraction Previews**: Display decisions as they happen in a floating meeting HUD.

### 5. Multi-Tenant Workspace & OAuth2 Security
- [ ] **Organization Workspaces**: Team-level isolation with role-based access control (Admin, Member, Viewer).
- [ ] **SSO / Google OAuth**: Authenticated team accounts with shared roster databases and centralized billing.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Current State|Current State]]
- [[Tasks/Completed Tasks|Completed Tasks]]
