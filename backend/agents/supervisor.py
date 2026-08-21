"""Supervisor node: routes tasks to specialist agents using LLM reasoning.

Uses ChatGroq with structured output to make routing decisions based on
the current state. Falls back to deterministic routing if the LLM call
fails, ensuring the pipeline always progresses.

Graph topology:
    START → supervisor → {extraction, assignment, reminder, FINISH}
    Each specialist loops back to supervisor for the next decision.
"""

import logging
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from backend.config import settings

logger = logging.getLogger(__name__)


# ----- Structured Output Schema -----

class RouteDecision(BaseModel):
    """Supervisor's routing decision — determines the next specialist."""

    next: Literal["extraction", "assignment", "reminder", "FINISH"] = Field(
        description="The next specialist agent to invoke, or FINISH if done.",
    )
    reasoning: str = Field(
        description="Brief explanation of why this routing was chosen.",
    )


# ----- System Prompt -----

SUPERVISOR_PROMPT = """You are the supervisor agent for a meeting follow-up system. Your job is to decide which specialist agent should act next.

Available specialists:
- **extraction**: Extracts decisions and action items from a meeting transcript. Use when we have a transcript but extraction has not been performed yet (extraction_done=false).
- **assignment**: Matches action item owners to a team roster and resolves relative deadlines to actual dates. Use ONCE after extraction if action items exist (assignment_done=false).
- **reminder**: Checks action items against deadlines and sends reminder emails. Use when the current action is "check_and_remind".
- **FINISH**: All work for this invocation is complete.

Routing rules:
1. If current_action is "process_meeting":
   a. Extraction NOT yet performed (extraction_done=false) → "extraction"
   b. Extraction already performed (extraction_done=true) AND action items exist AND assignment_done=false → "assignment"
   c. Extraction already performed and no action items, or assignment already done (assignment_done=true) → "FINISH"
2. If current_action is "check_and_remind":
   a. First pass → "reminder"
   b. After reminder completes → "FINISH"

CRITICAL: Never route to the same specialist twice in a row. If extraction or assignment has already been performed, do NOT run it again — go to FINISH.
Always explain your reasoning concisely."""


# ----- Node Function -----

def supervisor_node(state: dict) -> dict:
    """LangGraph node: supervisor that routes to the right specialist.

    Reads: current_action, action_items, raw_transcript, extraction_done, assignment_done, messages
    Writes: next_step, messages
    """
    current_action = state.get("current_action", "process_meeting")
    action_items = state.get("action_items", [])
    transcript = state.get("raw_transcript", "")
    extraction_done = state.get("extraction_done", False)
    assignment_done = state.get("assignment_done", False)

    # Build context summary for the LLM
    context_lines = [
        f"Current action: {current_action}",
        f"Has transcript: {bool(transcript)} ({len(transcript)} chars)",
        f"extraction_done: {extraction_done}",
        f"Action items count: {len(action_items)}",
        f"assignment_done: {assignment_done}",
    ]

    if action_items:
        assigned = sum(1 for i in action_items if i.get("owner_email"))
        context_lines.append(f"Items with owner+email: {assigned}/{len(action_items)}")

        resolved = sum(
            1 for i in action_items if i.get("deadline") and _is_iso_date(i["deadline"])
        )
        context_lines.append(f"Items with resolved deadline: {resolved}/{len(action_items)}")

    # Include recent agent activity for context
    messages = state.get("messages", [])
    if messages:
        recent = messages[-3:]
        recent_texts = []
        for m in recent:
            if isinstance(m, dict):
                recent_texts.append(m.get("content", ""))
            else:
                recent_texts.append(getattr(m, "content", str(m)))
        context_lines.append(f"Recent activity: {' | '.join(recent_texts)}")

    context = "\n".join(context_lines)

    # --- LLM-based routing ---
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY.get_secret_value(),
        temperature=0,
    )
    structured_llm = llm.with_structured_output(RouteDecision)

    try:
        decision: RouteDecision = structured_llm.invoke([
            SystemMessage(content=SUPERVISOR_PROMPT),
            HumanMessage(content=f"Current state:\n{context}\n\nDecide the next step."),
        ])

        logger.info(
            f"Supervisor → {decision.next} (reason: {decision.reasoning})"
        )

        return {
            "next_step": decision.next,
            "messages": [
                {
                    "role": "assistant",
                    "content": (
                        f"[Supervisor] Routing to: {decision.next}. "
                        f"Reason: {decision.reasoning}"
                    ),
                }
            ],
        }

    except Exception as e:
        # Fallback to deterministic routing if LLM fails
        logger.error(f"Supervisor LLM failed: {e} — using deterministic fallback")
        fallback = _deterministic_route(
            current_action, action_items, transcript, assignment_done, extraction_done
        )

        return {
            "next_step": fallback,
            "messages": [
                {
                    "role": "assistant",
                    "content": f"[Supervisor] Fallback routing to: {fallback}",
                }
            ],
        }


def route_after_supervisor(state: dict) -> str:
    """Conditional edge function: read `next_step` from state and route.

    This is used by StateGraph.add_conditional_edges() to determine
    which node to invoke after the supervisor.
    """
    return state.get("next_step", "FINISH")


# ----- Helpers -----

def _deterministic_route(
    current_action: str,
    action_items: list,
    transcript: str,
    assignment_done: bool = False,
    extraction_done: bool = False,
) -> str:
    """Fallback deterministic routing when the LLM call fails."""
    if current_action == "check_and_remind":
        return "reminder"

    if not extraction_done and transcript:
        return "extraction"

    if extraction_done and action_items and not assignment_done:
        has_unassigned = any(not item.get("owner_email") for item in action_items)
        if has_unassigned:
            return "assignment"

    return "FINISH"


def _is_iso_date(text: str) -> bool:
    """Quick check if a string looks like YYYY-MM-DD."""
    if not text or len(text) != 10:
        return False
    parts = text.split("-")
    return (
        len(parts) == 3
        and len(parts[0]) == 4
        and len(parts[1]) == 2
        and len(parts[2]) == 2
        and all(p.isdigit() for p in parts)
    )
