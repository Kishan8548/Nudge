"""LangGraph state schema for the meeting agent.

Defines the shared state that flows through the graph. Each node
reads from and writes to specific fields. The `messages` field uses
LangGraph's `add_messages` reducer to accumulate conversation history
for the supervisor's reasoning chain.
"""

from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages


class ActionItemData(TypedDict, total=False):
    """Schema for a single action item within the agent state."""

    id: str
    text: str
    owner: str | None
    owner_email: str | None
    deadline: str | None
    confidence: float
    status: Literal["pending", "in_progress", "done", "escalated"]
    reminder_count: int
    last_reminded_at: str | None
    is_mine: bool  # True if assigned to the person who recorded the meeting


class MeetingAgentState(TypedDict, total=False):
    """Top-level state flowing through the LangGraph meeting agent.

    Key fields:
        messages:      Chat history for supervisor reasoning (add_messages reducer).
        meeting_id:    MongoDB ObjectId string of the current meeting.
        raw_transcript: Full transcript text from Whisper.
        decisions:     Extracted key decisions from the meeting.
        action_items:  Extracted and enriched action items.
        needs_human_review: Whether any item has confidence < 0.7.
        current_action: What the graph should do ("process_meeting" | "check_and_remind").
        next_step:     Set by supervisor — which specialist to invoke next.
    """

    messages: Annotated[list, add_messages]
    meeting_id: str
    raw_transcript: str
    decisions: list[str]
    action_items: list[dict]
    needs_human_review: bool
    current_action: str
    next_step: str
    extraction_done: bool   # Set by extraction_node; prevents supervisor re-routing loop
    assignment_done: bool   # Set by assignment_node; prevents supervisor re-routing loop
    self_name: str | None  # Name of the person who recorded — used to tag is_mine
