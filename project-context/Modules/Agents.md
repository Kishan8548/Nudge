# 🤖 Module: Multi-Agent Engine (LangGraph)

The intelligence layer is constructed with **LangGraph** (`StateGraph`), orchestrating specialized agents via structured output models and LLM-driven routing.

---

## 📂 Source Code Location
- **Root**: `backend/agents/`
- **Graph Builder**: [backend/agents/graph.py](file:///c:/Users/suren/Nudge/backend/agents/graph.py)
- **State Schema**: [backend/agents/state.py](file:///c:/Users/suren/Nudge/backend/agents/state.py)
- **Nodes**:
  - [supervisor.py](file:///c:/Users/suren/Nudge/backend/agents/supervisor.py)
  - [extraction.py](file:///c:/Users/suren/Nudge/backend/agents/extraction.py)
  - [assignment.py](file:///c:/Users/suren/Nudge/backend/agents/assignment.py)
  - [reminder.py](file:///c:/Users/suren/Nudge/backend/agents/reminder.py)

---

## 🏗️ State Graph Construction

```python
builder = StateGraph(MeetingAgentState)

# Nodes
builder.add_node("supervisor", supervisor_node)
builder.add_node("extraction", extraction_node)
builder.add_node("assignment", assignment_node)
builder.add_node("reminder", reminder_node)

# Edges
builder.add_edge(START, "supervisor")
builder.add_conditional_edges(
    "supervisor",
    route_after_supervisor,
    {
        "extraction": "extraction",
        "assignment": "assignment",
        "reminder": "reminder",
        "FINISH": END,
    },
)

# Loop back to supervisor for evaluation
builder.add_edge("extraction", "supervisor")
builder.add_edge("assignment", "supervisor")
builder.add_edge("reminder", "supervisor")

graph = builder.compile(checkpointer=checkpointer)
```

---

## 🧠 Supervisor Agent

- **File**: [backend/agents/supervisor.py](file:///c:/Users/suren/Nudge/backend/agents/supervisor.py)
- **Model**: `ChatGroq(model="openai/gpt-oss-120b", temperature=0)`
- **Structured Schema**:
  ```python
  class RouteDecision(BaseModel):
      next: Literal["extraction", "assignment", "reminder", "FINISH"]
      reasoning: str
  ```
- **Routing Rules**:
  1. `current_action == "process_meeting"` and `extraction_done == False` $\rightarrow$ `extraction`.
  2. `extraction_done == True` and action items present and `assignment_done == False` $\rightarrow$ `assignment`.
  3. `current_action == "check_and_remind"` and not yet reminded $\rightarrow$ `reminder`.
  4. Otherwise $\rightarrow$ `FINISH` (`END`).
- **Deterministic Fallback**: If the LLM call fails, `_deterministic_route()` guarantees correct state progression without throwing runtime exceptions.

---

## 📝 Extraction Specialist

- **File**: [backend/agents/extraction.py](file:///c:/Users/suren/Nudge/backend/agents/extraction.py)
- **Structured Schema**:
  ```python
  class ExtractedItem(BaseModel):
      text: str
      owner: str | None
      deadline: str | None
      confidence: float  # 0.0 to 1.0

  class ExtractionResult(BaseModel):
      decisions: list[str]
      action_items: list[ExtractedItem]
  ```
- **Confidence Scoring**:
  - `1.0`: Explicitly stated task and owner (*"John will deploy the backend by Friday"*).
  - `0.8`: Clearly implied commitment.
  - `0.5 - 0.7`: Ambiguous owner or deadline $\rightarrow$ flags `needs_human_review = True`.
  - `< 0.5`: Highly uncertain task.
- **Personal Task Tagging (`is_mine`)**:
  - When `self_name` is provided in meeting context, tasks assigned to that name are tagged `is_mine = True`.
  - Unassigned tasks or meetings recorded without a `self_name` default to `is_mine = True` so all deliverables remain visible to the recorder.

---

## 👥 Assignment Specialist

- **File**: [backend/agents/assignment.py](file:///c:/Users/suren/Nudge/backend/agents/assignment.py)
- **Roster Matching**: Uses `difflib.SequenceMatcher` to compare spoken names against known team members:
  - Exact full name match.
  - Exact first or last name match.
  - Fuzzy similarity threshold ($\ge 0.60$).
- **Deadline Normalization**: Calls `resolve_relative_date()` to convert phrases like *"by Friday"*, *"next Monday morning"*, *"in 3 days"* into standardized ISO `YYYY-MM-DD` dates.

---

## ⏰ Reminder Specialist

- **File**: [backend/agents/reminder.py](file:///c:/Users/suren/Nudge/backend/agents/reminder.py)
- **Escalation Ladder**:
  | Reminder Count | Tone / Urgency | Action |
  |---|---|---|
  | **#1** | Friendly / Gentle | Sends green reminder email & Slack message with 1-click complete button. |
  | **#2** | Firm / Approaching | Sends amber reminder email & Slack warning. |
  | **#3+** | Critical / Escalated | Sets status to `escalated`, CCs team manager, and posts red alert to Slack. |

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Modules/Backend|Backend Module]]
- [[Decisions|Architectural Decisions]]
