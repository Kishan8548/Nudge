"""Application configuration using pydantic-settings.

Loads and validates all environment variables on startup.
Uses SecretStr for sensitive values to prevent accidental logging.
"""

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated application settings loaded from .env file.

    All required env vars are validated at import time — the app
    fails fast with a clear error if anything is missing.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Groq API ---
    GROQ_API_KEY: SecretStr
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # --- MongoDB ---
    MONGODB_URI: SecretStr
    MONGODB_DB_NAME: str = "meeting_agent"

    # --- Gmail SMTP (Option A: App Password) ---
    GMAIL_SENDER_EMAIL: str = ""
    GMAIL_APP_PASSWORD: SecretStr = SecretStr("")

    # --- Slack (Incoming Webhook — optional) ---
    SLACK_WEBHOOK_URL: str = ""
    SLACK_ENABLED: bool = False

    # --- Nomic AI (embeddings for RAG) ---
    NOMIC_API_KEY: SecretStr = SecretStr("")

    # --- Scheduler ---
    SCHEDULER_INTERVAL_MINUTES: int = 30

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173"

    # --- File Uploads ---
    UPLOAD_DIR: str = "data/uploads"

    # --- Public Backend URL (used in email and WhatsApp 1-click links) ---
    BASE_API_URL: str = "https://nudge-backend-8fri.onrender.com"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
