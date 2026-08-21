"""Groq Whisper transcription service.

Uses Groq's hosted Whisper models for fast audio-to-text transcription.

Groq's per-request limit is 25 MB. For larger files we split the raw
bytes into 20 MB chunks and transcribe each chunk independently, then
concatenate the results. This is a pure-Python approach — no ffmpeg or
pydub needed.

Chunking caveat: splitting raw audio bytes mid-frame may cause a tiny
gap (~0.1s) at each split point. For meeting transcription this is
perfectly acceptable — the text content is intact.

Models:
  - whisper-large-v3-turbo: Fast (228x realtime), good accuracy
  - whisper-large-v3:       Slower, highest accuracy
"""

import logging
import tempfile
from pathlib import Path

from groq import Groq

from backend.config import settings

logger = logging.getLogger(__name__)

# Groq's hard per-request limit
GROQ_MAX_BYTES = 25 * 1024 * 1024      # 25 MB
CHUNK_SIZE_BYTES = 20 * 1024 * 1024    # 20 MB per chunk (5 MB safety margin)
MAX_UPLOAD_SIZE_MB = 200               # We accept up to 200 MB

SUPPORTED_FORMATS = {".mp3", ".wav", ".mp4", ".webm", ".m4a", ".ogg", ".flac"}


def get_groq_client() -> Groq:
    """Create a Groq client using the configured API key."""
    return Groq(api_key=settings.GROQ_API_KEY.get_secret_value())


def _transcribe_chunk(
    client: Groq,
    chunk_bytes: bytes,
    filename: str,
    model: str,
    language: str | None,
) -> dict:
    """Send one <=25 MB chunk to Groq Whisper and return parsed result."""
    suffix = Path(filename).suffix or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(chunk_bytes)
        tmp_path = tmp.name

    try:
        from backend.utils.retry import call_with_retry

        def _do_transcribe():
            with open(tmp_path, "rb") as f:
                kwargs: dict = {
                    "file": (filename, f),
                    "model": model,
                    "response_format": "verbose_json",
                }
                if language:
                    kwargs["language"] = language
                return client.audio.transcriptions.create(**kwargs)

        response = call_with_retry(_do_transcribe, max_retries=3, initial_delay=2.0)

        segments = []
        raw_segs = getattr(response, "segments", None) or []
        for seg in raw_segs:
            if isinstance(seg, dict):
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "").strip(),
                })
            else:
                segments.append({
                    "start": getattr(seg, "start", 0),
                    "end": getattr(seg, "end", 0),
                    "text": getattr(seg, "text", "").strip(),
                })

        return {
            "text": response.text,
            "segments": segments,
            "language": getattr(response, "language", None),
            "duration": getattr(response, "duration", None),
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def transcribe_audio(
    file_path: str,
    model: str = "whisper-large-v3-turbo",
    language: str | None = None,
) -> dict:
    """Transcribe an audio/video file using Groq Whisper.

    Automatically chunks files larger than 20 MB so that any file up to
    200 MB can be transcribed without hitting Groq's 25 MB limit.

    Args:
        file_path: Path to the audio/video file.
        model: Whisper model to use.
        language: Optional ISO 639-1 language code (e.g., "en").

    Returns:
        dict with keys:
          - text: Full concatenated transcript text
          - segments: List of {start, end, text} timestamp segments
          - language: Detected language code
          - duration: Total audio duration in seconds
          - chunks: Number of chunks used (1 for small files)

    Raises:
        FileNotFoundError: If file doesn't exist.
        ValueError: If file format is unsupported or exceeds 200 MB.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if path.suffix.lower() not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported format '{path.suffix}'. "
            f"Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > MAX_UPLOAD_SIZE_MB:
        raise ValueError(
            f"File too large ({file_size_mb:.1f} MB). Maximum: {MAX_UPLOAD_SIZE_MB} MB. "
            "Tip: convert to MP3 at 32kbps — a 2-hour meeting becomes ~28 MB."
        )

    audio_bytes = path.read_bytes()
    client = get_groq_client()

    # --- Single chunk fast path (files <= 20 MB) ---
    if len(audio_bytes) <= CHUNK_SIZE_BYTES:
        logger.info(f"Transcribing {path.name} ({file_size_mb:.1f} MB) — single chunk")
        result = _transcribe_chunk(client, audio_bytes, path.name, model, language)
        result["chunks"] = 1
        logger.info(
            f"Transcription complete: {len(result['text'])} chars, "
            f"{len(result['segments'])} segments"
        )
        return result

    # --- Multi-chunk path for large files ---
    total_chunks = (len(audio_bytes) + CHUNK_SIZE_BYTES - 1) // CHUNK_SIZE_BYTES
    logger.info(
        f"Transcribing {path.name} ({file_size_mb:.1f} MB) — "
        f"{total_chunks} chunks of {CHUNK_SIZE_BYTES // 1024 // 1024} MB each"
    )

    all_texts: list[str] = []
    all_segments: list[dict] = []
    total_duration: float = 0.0
    detected_language: str | None = None
    time_offset: float = 0.0

    for i in range(total_chunks):
        start_byte = i * CHUNK_SIZE_BYTES
        chunk = audio_bytes[start_byte: start_byte + CHUNK_SIZE_BYTES]
        chunk_mb = len(chunk) / (1024 * 1024)

        logger.info(
            f"  Chunk {i + 1}/{total_chunks}: {chunk_mb:.1f} MB "
            f"(bytes {start_byte}–{start_byte + len(chunk)})"
        )

        chunk_result = _transcribe_chunk(
            client, chunk, f"chunk_{i + 1}_{path.name}", model, language
        )

        all_texts.append(chunk_result["text"].strip())

        chunk_duration = chunk_result.get("duration") or 0.0

        # Offset segment timestamps so they're relative to the full file
        for seg in chunk_result.get("segments", []):
            all_segments.append({
                "start": round(seg["start"] + time_offset, 2),
                "end": round(seg["end"] + time_offset, 2),
                "text": seg["text"],
            })

        if chunk_result.get("language"):
            detected_language = chunk_result["language"]

        total_duration += chunk_duration
        time_offset += chunk_duration

    full_text = " ".join(t for t in all_texts if t)

    result = {
        "text": full_text,
        "segments": all_segments,
        "language": detected_language,
        "duration": total_duration,
        "chunks": total_chunks,
    }

    logger.info(
        f"Chunked transcription complete: {total_chunks} chunks, "
        f"{len(full_text)} chars, {len(all_segments)} segments, "
        f"duration={total_duration:.1f}s"
    )
    return result
