"""Extraction agent: extracts decisions and action items from meeting transcripts.

Uses ChatGroq with structured output (Pydantic models) to reliably
extract structured data from free-form transcript text. Each action
item receives a confidence score — items below 0.7 are flagged for
human review.
"""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from backend.config import settings

logger = logging.getLogger(__name__)


# ----- Structured Output Schemas -----

class ExtractedItem(BaseModel):
    """A single extracted action item."""

    text: str = Field(description="Clear, actionable description of the task")
    owner: str | None = Field(
        default=None,
        description="Person assigned to this task, or null if not mentioned",
    )
    deadline: str | None = Field(
        default=None,
        description="Deadline as stated in the meeting (e.g., 'by Friday', 'July 30'), or null",
    )
    confidence: float = Field(
        ge=0,
        le=1,
        description="Confidence score 0.0–1.0 for this extraction",
    )


class ExtractionResult(BaseModel):
    """Structured extraction output from a meeting transcript."""

    decisions: list[str] = Field(
        description="Key decisions made during the meeting",
    )
    action_items: list[ExtractedItem] = Field(
        description="Action items identified from the meeting",
    )


# ----- System Prompt -----

EXTRACTION_PROMPT = """You are an expert meeting analyst. Carefully analyze the meeting transcript and extract:

1. **Key Decisions**: Important decisions agreed upon during the meeting.
2. **Action Items**: Tasks that need to be completed, each with:
   - A clear, actionable description
   - The person assigned (if mentioned by name)
   - The deadline (if mentioned, preserve the original phrasing like "by Friday")
   - A confidence score (0.0 to 1.0)

Confidence scoring guidelines:
- 1.0: Explicitly stated ("John will send the report by Friday")
- 0.8: Clearly implied with high certainty
- 0.5–0.7: Somewhat ambiguous (person or deadline unclear)
- Below 0.5: Very uncertain or vague reference to a task

Be thorough but precise. Only extract genuine action items, not general discussion points or opinions."""


# ----- Node Function -----

def extraction_node(state: dict) -> dict:
    """LangGraph node: extract decisions and action items from transcript.

    Reads: raw_transcript
    Writes: decisions, action_items, needs_human_review, messages
    """
    transcript = state.get("raw_transcript", "")
    if not transcript:
        logger.warning("No transcript available for extraction")
        return {
            "decisions": [],
            "action_items": [],
            "needs_human_review": False,
            "messages": [
                {"role": "assistant", "content": "[Extraction] No transcript provided."}
            ],
        }

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY.get_secret_value(),
        temperature=0,
    )
    structured_llm = llm.with_structured_output(ExtractionResult)

    try:
        result: ExtractionResult = structured_llm.invoke([
            SystemMessage(content=EXTRACTION_PROMPT),
            HumanMessage(content=f"Meeting Transcript:\n\n{transcript}"),
        ])

        action_items: list[dict] = []
        needs_review = False

        for item in result.action_items:
            ai_dict: dict = {
                "text": item.text,
                "owner": item.owner,
                "owner_email": None,
                "deadline": item.deadline,
                "confidence": item.confidence,
                "status": "pending",
                "reminder_count": 0,
                "last_reminded_at": None,
            }
            action_items.append(ai_dict)

            if item.confidence < 0.7:
                needs_review = True

        summary = (
            f"[Extraction] Extracted {len(result.decisions)} decisions and "
            f"{len(action_items)} action items."
        )
        if needs_review:
            low_conf = [i for i in action_items if i["confidence"] < 0.7]
            summary += (
                f" {len(low_conf)} item(s) have low confidence "
                f"and need human review."
            )

        logger.info(summary)

        return {
            "decisions": result.decisions,
            "action_items": action_items,
            "needs_human_review": needs_review,
            "messages": [{"role": "assistant", "content": summary}],
        }

    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return {
            "decisions": [],
            "action_items": [],
            "needs_human_review": True,
            "messages": [
                {
                    "role": "assistant",
                    "content": f"[Extraction] Failed: {e}",
                }
            ],
        }
