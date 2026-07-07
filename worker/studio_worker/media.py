"""FFmpeg probe + transcode. Pure file-in/file-out — no DB or S3 here."""
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from . import config


@dataclass
class MediaInfo:
    duration_s: float
    width: int | None
    height: int | None
    fps: float | None
    has_video: bool
    has_audio: bool


def probe(path: str) -> MediaInfo:
    """Probe via ffprobe when present, else parse `ffmpeg -i` (static builds)."""
    try:
        out = subprocess.run(
            [
                config.FFPROBE, "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", path,
            ],
            capture_output=True, text=True, timeout=120,
        )
        if out.returncode == 0:
            data = json.loads(out.stdout)
            v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
            a = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
            fps = None
            if v and v.get("r_frame_rate") and "/" in v["r_frame_rate"]:
                num, den = v["r_frame_rate"].split("/")
                fps = round(float(num) / float(den), 3) if float(den) else None
            return MediaInfo(
                duration_s=float(data["format"].get("duration") or 0),
                width=int(v["width"]) if v else None,
                height=int(v["height"]) if v else None,
                fps=fps,
                has_video=v is not None,
                has_audio=a is not None,
            )
    except (FileNotFoundError, subprocess.TimeoutExpired, KeyError, json.JSONDecodeError):
        pass

    # Fallback: parse ffmpeg -i stderr.
    out = subprocess.run(
        [config.FFMPEG, "-hide_banner", "-i", path],
        capture_output=True, text=True, timeout=120,
    )
    err = out.stderr
    dur = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", err)
    duration = (
        int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
        if dur else 0.0
    )
    vid = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", err)
    fps_m = re.search(r"(\d+(?:\.\d+)?)\s*fps", err)
    return MediaInfo(
        duration_s=duration,
        width=int(vid.group(1)) if vid else None,
        height=int(vid.group(2)) if vid else None,
        fps=float(fps_m.group(1)) if fps_m else None,
        has_video=vid is not None,
        has_audio="Audio:" in err,
    )


def _run(args: list[str]) -> None:
    result = subprocess.run(
        [config.FFMPEG, "-hide_banner", "-y", *args],
        capture_output=True, text=True, timeout=6 * 3600,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-800:]}")


# The rendition ladder. Height-capped: we never upscale.
VIDEO_LADDER = [
    ("proxy", 540, 28, "96k"),    # small + fast-seeking — smooth scrubbing
    ("720p", 720, 23, "128k"),
    ("1080p", 1080, 21, "160k"),
]


def make_video_renditions(src: str, out_dir: str, info: MediaInfo) -> list[dict]:
    """Produce mp4 renditions + poster + thumb. Returns rendition descriptors."""
    out: list[dict] = []
    outp = Path(out_dir)
    outp.mkdir(parents=True, exist_ok=True)
    src_h = info.height or 100000

    for kind, height, crf, abr in VIDEO_LADDER:
        target_h = min(height, src_h)
        path = str(outp / f"{kind}.mp4")
        args = [
            "-i", src,
            "-vf", f"scale=-2:{target_h}",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",   # metadata up front → instant scrub start
            "-g", "48",                  # dense keyframes → snappy seeking
        ]
        if info.has_audio:
            args += ["-c:a", "aac", "-b:a", abr]
        else:
            args += ["-an"]
        args += [path]
        _run(args)
        out.append({"kind": kind, "path": path, "mime": "video/mp4", "height": target_h})

    poster_t = max(0.0, min(info.duration_s * 0.25, info.duration_s - 0.1))
    poster = str(outp / "poster.jpg")
    _run(["-ss", f"{poster_t:.2f}", "-i", src, "-frames:v", "1", "-q:v", "3", poster])
    out.append({"kind": "poster", "path": poster, "mime": "image/jpeg", "height": info.height})

    thumb = str(outp / "thumb.jpg")
    _run(["-ss", f"{poster_t:.2f}", "-i", src, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "5", thumb])
    out.append({"kind": "thumb", "path": thumb, "mime": "image/jpeg", "height": None})
    return out


def make_audio_renditions(src: str, out_dir: str) -> list[dict]:
    outp = Path(out_dir)
    outp.mkdir(parents=True, exist_ok=True)
    path = str(outp / "proxy.m4a")
    _run(["-i", src, "-vn", "-c:a", "aac", "-b:a", "128k", path])
    return [{"kind": "proxy", "path": path, "mime": "audio/mp4", "height": None}]


def extract_wav_for_asr(src: str, out_dir: str) -> str:
    """16 kHz mono WAV — what Whisper wants."""
    outp = Path(out_dir)
    outp.mkdir(parents=True, exist_ok=True)
    wav = str(outp / "asr.wav")
    _run(["-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav])
    return wav
