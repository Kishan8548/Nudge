"""Retry utility with exponential backoff and jitter.

Handles transient rate limits (429), API timeouts, and 5xx errors
when invoking Groq LLMs or Whisper transcription APIs.
"""

import functools
import logging
import random
import time
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retry_exceptions: tuple[type[Exception], ...] = (Exception,),
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator to retry a function call with exponential backoff.

    Args:
        max_retries: Maximum number of attempts before raising.
        initial_delay: Base delay in seconds.
        backoff_factor: Multiplier for consecutive retry delays.
        jitter: If True, adds randomized jitter to prevent thundering herds.
        retry_exceptions: Tuple of exception types to catch and retry.
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            delay = initial_delay
            last_exception: Exception | None = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e
                    err_msg = str(e).lower()

                    # Don't retry client errors like invalid API key format or bad requests
                    if "invalid_api_key" in err_msg or "authentication" in err_msg:
                        raise

                    if attempt == max_retries:
                        logger.error(
                            f"[{func.__name__}] Failed after {max_retries} attempts: {e}"
                        )
                        raise

                    sleep_time = delay * (1 + random.uniform(0, 0.5) if jitter else 1)
                    logger.warning(
                        f"[{func.__name__}] Attempt {attempt}/{max_retries} failed ({e}). "
                        f"Retrying in {sleep_time:.2f}s..."
                    )
                    time.sleep(sleep_time)
                    delay *= backoff_factor

            if last_exception:
                raise last_exception
            raise RuntimeError(f"Retry exhausted without result for {func.__name__}")

        return wrapper
    return decorator


def call_with_retry(
    func: Callable[..., T],
    *args: Any,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    **kwargs: Any,
) -> T:
    """Execute a callable with retry and exponential backoff."""
    decorated = retry_with_backoff(
        max_retries=max_retries,
        initial_delay=initial_delay,
    )(func)
    return decorated(*args, **kwargs)
