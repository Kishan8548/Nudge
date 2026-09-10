# Project Context Rules for Antigravity

This repository uses an Obsidian-compatible knowledge base located in `project-context/` to document the architecture, implementation state, and coding patterns across the backend, frontend, mobile app, and Chrome extension.

---

## 🧭 Agent Onboarding & Protocol

Whenever you start work in this repository in a new session:

1. **Read `project-context/Home.md` First**:
   - Begin at `project-context/Home.md` to understand the high-level system overview, repo layout, and navigation links.

2. **Check `project-context/Current State.md` Before Planning**:
   - Inspect `project-context/Current State.md` to see active features, live deployment endpoints, and verified system states.

3. **Follow the Connected Knowledge Graph**:
   - Review `project-context/Architecture.md` for end-to-end data flow, LangGraph multi-agent topology, and hardware alarm designs.
   - Inspect specific module documentation in:
     - `project-context/Modules/Backend.md`
     - `project-context/Modules/Agents.md`
     - `project-context/Modules/Frontend.md`
     - `project-context/Modules/Android.md`
     - `project-context/Modules/Extension.md`
   - Check `project-context/Decisions.md` for architectural rationale and constraints.
   - Check `project-context/Issues & Blockers.md` for known limitations and gotchas.

4. **Use Project Context as a Map, Not a Replacement for Code**:
   - Always verify assumptions against actual source files (`backend/`, `frontend/`, `android/`, `extension/`).
   - Treat the code as the ultimate source of truth.

5. **Keep the Knowledge Base Evergreen**:
   - When adding endpoints, modifying agent state, updating schemas, or changing UI patterns, update the relevant notes in `project-context/` to maintain documentation integrity.
