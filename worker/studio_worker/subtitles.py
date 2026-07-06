"""Segment → SRT/VTT formatting. Pure functions, unit-tested offline."""


def _ts(seconds: float, sep: str) -> str:
    if seconds < 0:
        seconds = 0
    ms = round(seconds * 1000)
    h, rem = divmod(ms, 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(segments: list[dict]) -> str:
    """segments: [{"start_s": float, "end_s": float, "text": str}, ...]"""
    blocks = []
    for i, seg in enumerate(segments, 1):
        blocks.append(
            f"{i}\n{_ts(seg['start_s'], ',')} --> {_ts(seg['end_s'], ',')}\n{seg['text'].strip()}\n"
        )
    return "\n".join(blocks) + ("\n" if blocks else "")


def to_vtt(segments: list[dict]) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{_ts(seg['start_s'], '.')} --> {_ts(seg['end_s'], '.')}")
        lines.append(seg["text"].strip())
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
