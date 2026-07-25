"""Groq Whisper transcription service.

Uses Groq's hosted Whisper models for fast audio-to-text transcription.

Models:
  - whisper-large-v3-turbo: Fast (228x realtime), good accuracy
  - whisper-large-v3:       Slower, highest accuracy
"""

import logging
from pathlib import Path

from groq import Groq

from backend.config import settings

logger = logging.getLogger(__name__)

# Groq Whisper limits
MAX_FILE_SIZE_MB = 25
SUPPORTED_FORMATS = {".mp3", ".wav", ".mp4", ".webm", ".m4a", ".ogg", ".flac"}


def get_groq_client() -> Groq:
    """Create a Groq client using the configured API key."""
    return Groq(api_key=settings.GROQ_API_KEY.get_secret_value())


def transcribe_audio(
    file_path: str,
    model: str = "whisper-large-v3-turbo",
    language: str | None = None,
) -> dict:
    """Transcribe an audio/video file using Groq Whisper.

    Args:
        file_path: Path to the audio/video file.
        model: Whisper model to use.
        language: Optional ISO 639-1 language code (e.g., "en").

    Returns:
        dict with keys:
          - text: Full transcript text
          - segments: List of {start, end, text} timestamp segments
          - language: Detected language code
          - duration: Audio duration in seconds

    Raises:
        FileNotFoundError: If file doesn't exist.
        ValueError: If file format is unsupported or exceeds size limit.
    """
    path = Path(file_path)

    # --- Validation ---
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if path.suffix.lower() not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported format '{path.suffix}'. "
            f"Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(
            f"File too large ({file_size_mb:.1f} MB). Maximum: {MAX_FILE_SIZE_MB} MB"
        )

    # --- Transcribe ---
    client = get_groq_client()
    logger.info(f"Transcribing {path.name} with {model} ({file_size_mb:.1f} MB)")

    with open(file_path, "rb") as f:
        kwargs: dict = {
            "file": (path.name, f),
            "model": model,
            "response_format": "verbose_json",
        }
        if language:
            kwargs["language"] = language

        response = client.audio.transcriptions.create(**kwargs)

    # --- Parse response ---
    result: dict = {
        "text": response.text,
        "segments": [],
        "language": getattr(response, "language", None),
        "duration": getattr(response, "duration", None),
    }

    # Extract timestamp segments (verbose_json format)
    raw_segments = getattr(response, "segments", None)
    if raw_segments:
        for seg in raw_segments:
            if isinstance(seg, dict):
                result["segments"].append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "").strip(),
                })
            else:
                # Pydantic model object
                result["segments"].append({
                    "start": getattr(seg, "start", 0),
                    "end": getattr(seg, "end", 0),
                    "text": getattr(seg, "text", "").strip(),
                })

    logger.info(
        f"Transcription complete: {len(result['text'])} chars, "
        f"{len(result['segments'])} segments, "
        f"duration={result['duration']}s"
    )
    return result
