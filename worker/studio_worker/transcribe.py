"""Self-hosted transcription via faster-whisper (open weights, runs on OUR
infra — audio never leaves the server, no per-minute fees). The model is an
env knob (WHISPER_MODEL / WHISPER_COMPUTE) so it can be swapped or replaced by
a fine-tune without touching the rest of the system."""
from typing import Any

from . import config

_model = None


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(
            config.WHISPER_MODEL, device="auto", compute_type=config.WHISPER_COMPUTE
        )
    return _model


def transcribe(wav_path: str) -> dict[str, Any]:
    """Returns {language, segments: [{start_s, end_s, text, words}]}."""
    segments_iter, info = get_model().transcribe(
        wav_path, word_timestamps=True, vad_filter=True
    )
    segments = []
    for seg in segments_iter:
        segments.append(
            {
                "start_s": round(seg.start, 3),
                "end_s": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": [
                    {"w": w.word, "s": round(w.start, 3), "e": round(w.end, 3)}
                    for w in (seg.words or [])
                ],
            }
        )
    return {"language": info.language, "segments": segments}
