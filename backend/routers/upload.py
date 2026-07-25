"""File upload endpoint for meeting recordings.

Accepts audio/video files, saves them locally (NOT in MongoDB — respects
the 512 MB M0 limit), transcribes with Groq Whisper, and stores the
resulting transcript in MongoDB.
"""

import logging
from datetime import datetime
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from backend.config import settings
from backend.db.models import MEETINGS
from backend.services.transcription import SUPPORTED_FORMATS, transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])

MAX_FILE_SIZE_MB = 25


@router.post("/upload")
async def upload_meeting(
    request: Request,
    file: UploadFile = File(...),
    title: str | None = None,
):
    """Upload an audio/video file for transcription.

    The file is saved to disk, transcribed via Groq Whisper, and the
    transcript is stored in MongoDB. Returns the meeting ID for
    subsequent processing.

    Args:
        file: Audio/video file (mp3, wav, mp4, webm, m4a, ogg, flac).
        title: Optional meeting title. Defaults to the filename stem.

    Returns:
        Meeting ID, transcript preview, and metadata.
    """
    # --- Validate file extension ---
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file format '{file_ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
            ),
        )

    # --- Save file locally ---
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_name

    try:
        content = await file.read()

        # Validate file size
        file_size_mb = len(content) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({file_size_mb:.1f} MB). Max: {MAX_FILE_SIZE_MB} MB",
            )

        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved upload: {safe_name} ({file_size_mb:.1f} MB)")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # --- Transcribe via Groq Whisper ---
    try:
        transcript_result = transcribe_audio(str(file_path))
    except Exception as e:
        logger.error(f"Transcription failed for {safe_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    # --- Store meeting in MongoDB ---
    db = request.app.state.db
    meeting_title = title or (Path(file.filename).stem if file.filename else "Untitled Meeting")

    meeting_doc = {
        "title": meeting_title,
        "created_at": datetime.utcnow(),
        "raw_transcript": transcript_result["text"],
        "diarized_transcript": transcript_result.get("segments", []),
        "decisions": [],
        "needs_human_review": False,
        "audio_file": str(file_path),
        "language": transcript_result.get("language"),
        "duration_seconds": transcript_result.get("duration"),
    }

    result = db[MEETINGS].insert_one(meeting_doc)
    meeting_id = str(result.inserted_id)

    logger.info(f"Created meeting {meeting_id}: {meeting_title}")

    transcript_text = transcript_result["text"]
    return {
        "meeting_id": meeting_id,
        "title": meeting_title,
        "transcript_preview": (
            transcript_text[:500] + "..." if len(transcript_text) > 500 else transcript_text
        ),
        "segments_count": len(transcript_result.get("segments", [])),
        "language": transcript_result.get("language"),
        "duration_seconds": transcript_result.get("duration"),
    }
