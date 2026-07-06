"""Worker configuration — all via environment variables."""
import os


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


SUPABASE_URL = env("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL"))
SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")

S3_ENDPOINT = env("S3_ENDPOINT")
S3_REGION = os.environ.get("S3_REGION", "auto")
S3_BUCKET = env("S3_BUCKET", "studio-media")
S3_ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "5"))
FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE_BIN", "ffprobe")
