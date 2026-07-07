"""Pipeline worker loop: claim → download → process → upload → record.

Runs anywhere with ffmpeg + Python (Railway, a VPS, your own box). Multiple
instances are safe — job claiming is atomic (SKIP LOCKED).
"""
import tempfile
import time
import traceback
from pathlib import Path

from . import config, db, media, storage, subtitles


def rendition_key(asset: dict, kind: str, ext: str) -> str:
    base = asset["storage_key"].rsplit("/", 1)[0]
    return f"{base}/renditions/{kind}.{ext}"


def handle_transcode(job: dict, asset: dict) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        src = str(Path(tmp) / "source")
        storage.download(asset["storage_key"], src)
        info = media.probe(src)

        db.update_asset(
            asset["id"],
            {
                "duration_s": info.duration_s or None,
                "width": info.width,
                "height": info.height,
                "fps": info.fps,
            },
        )

        if info.has_video:
            renditions = media.make_video_renditions(src, str(Path(tmp) / "out"), info)
        elif info.has_audio:
            renditions = media.make_audio_renditions(src, str(Path(tmp) / "out"))
        else:
            raise RuntimeError("no audio or video stream found")

        for r in renditions:
            ext = "jpg" if r["mime"] == "image/jpeg" else ("m4a" if r["mime"] == "audio/mp4" else "mp4")
            key = rendition_key(asset, r["kind"], ext)
            size = storage.upload(r["path"], key, r["mime"])
            db.upsert_rendition(
                {
                    "asset_id": asset["id"],
                    "kind": r["kind"],
                    "storage_key": key,
                    "mime": r["mime"],
                    "height": r["height"],
                    "size_bytes": size,
                    "status": "done",
                }
            )


def handle_transcribe(job: dict, asset: dict) -> None:
    from . import transcribe  # lazy: pulls the model only when needed

    with tempfile.TemporaryDirectory() as tmp:
        src = str(Path(tmp) / "source")
        storage.download(asset["storage_key"], src)
        wav = media.extract_wav_for_asr(src, tmp)
        result = transcribe.transcribe(wav)
        segments = result["segments"]

        srt_path = str(Path(tmp) / "captions.srt")
        vtt_path = str(Path(tmp) / "captions.vtt")
        Path(srt_path).write_text(subtitles.to_srt(segments), encoding="utf-8")
        Path(vtt_path).write_text(subtitles.to_vtt(segments), encoding="utf-8")

        srt_key = rendition_key(asset, "captions", "srt")
        vtt_key = rendition_key(asset, "captions", "vtt")
        storage.upload(srt_path, srt_key, "application/x-subrip")
        storage.upload(vtt_path, vtt_key, "text/vtt")

        transcript_id = db.insert_transcript(
            {
                "asset_id": asset["id"],
                "language": result["language"],
                "status": "done",
                "full_text": " ".join(s["text"] for s in segments),
                "srt_key": srt_key,
                "vtt_key": vtt_key,
            }
        )
        db.replace_segments(
            transcript_id,
            [
                {
                    "transcript_id": transcript_id,
                    "start_s": s["start_s"],
                    "end_s": s["end_s"],
                    "text": s["text"],
                    "words": s["words"],
                }
                for s in segments
            ],
        )


HANDLERS = {"transcode": handle_transcode, "transcribe": handle_transcribe}


def run_one(kinds: list[str] | None = None) -> bool:
    """Claim and run a single job. Returns True if a job was processed."""
    job = db.claim_job(kinds or list(HANDLERS.keys()))
    if not job:
        return False
    print(f"[worker] job {job['id']} type={job['type']} asset={job['asset_id']}")
    try:
        asset = db.get_asset(job["asset_id"])
        if not asset:
            raise RuntimeError("asset row missing")
        HANDLERS[job["type"]](job, asset)
        db.finish_job(job["id"])
        print(f"[worker] job {job['id']} done")
    except Exception:
        err = traceback.format_exc()[-1500:]
        print(f"[worker] job {job['id']} FAILED\n{err}")
        db.finish_job(job["id"], error=err)
    return True


def main() -> None:
    config.validate()  # fail fast on missing credentials
    print(
        f"[worker] up — model={config.WHISPER_MODEL}/{config.WHISPER_COMPUTE} "
        f"bucket={config.S3_BUCKET} poll={config.POLL_SECONDS}s"
    )
    while True:
        try:
            if not run_one():
                time.sleep(config.POLL_SECONDS)
        except KeyboardInterrupt:
            break
        except Exception:
            traceback.print_exc()
            time.sleep(config.POLL_SECONDS * 2)


if __name__ == "__main__":
    main()
