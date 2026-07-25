"""Summary agent: generates a concise executive summary of a meeting.

Uses ChatGroq to produce a 3-4 sentence summary of the meeting transcript,
capturing key topics discussed, major decisions, and overall meeting outcome.
"""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from backend.config import settings

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """You are an expert meeting analyst. Generate a concise executive summary of the following meeting transcript.

The summary should be 3-4 sentences and capture:
1. The main topics discussed
2. Key decisions made
3. The overall outcome or direction agreed upon

Be professional, concise, and focus on the most important takeaways. Do NOT use bullet points — write flowing prose."""


def generate_meeting_summary(transcript: str) -> str:
    """Generate a concise executive summary from a meeting transcript.

    Args:
        transcript: The raw meeting transcript text.

    Returns:
        A 3-4 sentence summary string.
    """
    if not transcript or len(transcript.strip()) < 20:
        return "No meaningful transcript content to summarize."

    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY.get_secret_value(),
            temperature=0.3,
        )

        result = llm.invoke([
            SystemMessage(content=SUMMARY_PROMPT),
            HumanMessage(content=f"TRANSCRIPT:\n{transcript[:8000]}"),
        ])

        summary = result.content.strip()
        logger.info(f"Generated meeting summary ({len(summary)} chars)")
        return summary

    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return "Summary generation failed. Please try processing the meeting again."
