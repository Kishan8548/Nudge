# AI Agent Guidelines & Project Map

Welcome to **Nudge AI**. This repository is an autonomous meeting intelligence and personal task follow-up system consisting of a Python FastAPI multi-agent backend, React Vite web dashboard, Kotlin Android native mobile app, and a Chrome Manifest V3 extension.

---

## 🧭 Onboarding Protocol for AI Agents

When starting work in this repository in a new session or chat, **always follow this workflow**:

1. **Read the Knowledge Base Entry Point First**:
   - Start at [[project-context/Home|Home.md]] for the high-level system overview, repo anatomy, and navigation index.

2. **Check the Current Implementation State**:
   - Read [[project-context/Current State|Current State.md]] before planning or making any changes. This documents live deployments, active features, and recently verified functionality.

3. **Follow the Connected Knowledge Graph**:
   - Inspect [[project-context/Architecture|Architecture.md]] for multi-agent loops, data flow, and cross-tier interactions.
   - Jump to relevant module notes in [[project-context/Modules/Backend|Backend.md]], [[project-context/Modules/Agents|Agents.md]], [[project-context/Modules/Frontend|Frontend.md]], [[project-context/Modules/Android|Android.md]], or [[project-context/Modules/Extension|Extension.md]].
   - Check [[project-context/Decisions|Decisions.md]] to understand architectural rationales and constraints before proposing alternative patterns.
   - Review [[project-context/Issues & Blockers|Issues & Blockers.md]] to avoid known gotchas, edge cases, and environment constraints.

4. **Use Project Context as a Map, Not a Replacement for Source Code**:
   - Treat the actual source code (`backend/`, `frontend/`, `android/`, `extension/`) as the **ultimate source of truth**.
   - Always verify assumptions against active code before applying edits.

5. **Verify Context Against the Current Repository**:
   - Check configuration files ([requirements.txt](file:///c:/Users/suren/Nudge/requirements.txt), [.env.example](file:///c:/Users/suren/Nudge/.env.example), [frontend/package.json](file:///c:/Users/suren/Nudge/frontend/package.json), [android/app/build.gradle.kts](file:///c:/Users/suren/Nudge/android/app/build.gradle.kts)) to confirm dependencies and API contracts.

6. **Maintain and Update the Knowledge Base**:
   - Whenever you implement significant features, alter schemas, add API endpoints, or modify system architecture, **update the corresponding notes in `project-context/`** to keep the knowledge base evergreen.

---

## 🗺️ Knowledge Base Index

| Note | Purpose |
|---|---|
| [[project-context/Home\|Home]] | Project overview, high-level architecture summary, quick links |
| [[project-context/Architecture\|Architecture]] | Complete end-to-end data flow, LangGraph state graph, alarm architecture |
| [[project-context/Build & Test\|Build & Test]] | Verified build, run, test, CI, and debugging commands |
| [[project-context/Coding Conventions\|Coding Conventions]] | Code patterns, typing rules, styles across Python, Kotlin, and React |
| [[project-context/Current State\|Current State]] | Live deployment URLs, active feature checklist, database state |
| [[project-context/Decisions\|Decisions]] | Architectural trade-offs and rationale (why LangGraph, AlarmManager, etc.) |
| [[project-context/Issues & Blockers\|Issues & Blockers]] | Known limitations, Doze mode constraints, API rate limits, edge cases |
| [[project-context/Modules/Backend\|Modules/Backend]] | FastAPI routers, services, MongoDB schemas, rate limiter, scheduler |
| [[project-context/Modules/Agents\|Modules/Agents]] | LangGraph supervisor, extraction, assignment, reminder nodes, prompts |
| [[project-context/Modules/Frontend\|Modules/Frontend]] | React 18, Vite, design tokens, UI components, API client integration |
| [[project-context/Modules/Android\|Modules/Android]] | Native Kotlin app, Foreground Audio Service, AppWidget, Exact Alarms |
| [[project-context/Modules/Extension\|Modules/Extension]] | Chrome Manifest V3 audio capture via offscreen document and upload flow |
| [[project-context/Tasks/Completed Tasks\|Tasks/Completed Tasks]] | Chronological log of implemented features and bug fixes |
| [[project-context/Tasks/Roadmap\|Tasks/Roadmap]] | Planned future work, enhancements, and scalability optimizations |
