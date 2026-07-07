"""Worker configuration — all via environment variables.

Values are read lazily: importing media/subtitles (pure ffmpeg/text) must not
require Supabase/S3 credentials. `validate()` (called from main) fails fast at
process start if the vars the running worker actually needs are missing.
"""
import os


def _get(name: str, *fallbacks: str) -> str:
    for key in (name, *fallbacks):
        v = os.environ.get(key)
        if v:
            return v
    return ""


SUPABASE_URL = _get("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = _get("SUPABASE_SERVICE_ROLE_KEY")

S3_ENDPOINT = _get("S3_ENDPOINT")
S3_REGION = os.environ.get("S3_REGION", "auto")
S3_BUCKET = _get("S3_BUCKET") or "studio-media"
S3_ACCESS_KEY_ID = _get("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = _get("S3_SECRET_ACCESS_KEY")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "5"))
FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE_BIN", "ffprobe")

_REQUIRED = {
    "SUPABASE_URL": SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": SERVICE_ROLE_KEY,
    "S3_ENDPOINT": S3_ENDPOINT,
    "S3_ACCESS_KEY_ID": S3_ACCESS_KEY_ID,
    "S3_SECRET_ACCESS_KEY": S3_SECRET_ACCESS_KEY,
}


def validate() -> None:
    """Raise if any credential the worker needs to run is missing."""
    missing = [k for k, v in _REQUIRED.items() if not v]
    if missing:
        raise RuntimeError(f"Missing required env var(s): {', '.join(missing)}")
