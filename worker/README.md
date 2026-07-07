# Pipeline worker (transcode + transcription)

One container that turns uploads into streamable media and searchable transcripts:

- **transcode** (FFmpeg): scrubbing proxy (540p, faststart, dense keyframes),
  720p, 1080p (never upscales), poster + thumb. Audio-only files get an AAC proxy.
- **transcribe** (faster-whisper, self-hosted): word-level timestamps, searchable
  segments, SRT + VTT sidecars uploaded next to the renditions. Audio never leaves
  your infrastructure; the model is swappable via `WHISPER_MODEL`.

Jobs are claimed atomically from the `jobs` table (`app.claim_job`, SKIP LOCKED),
so run as many instances as you like.

## Deploy (Railway)

1. New service → Deploy from repo → root directory `worker/` (Dockerfile detected).
2. Set env vars:
   ```
   SUPABASE_URL=https://lnclobwmfkxtibqnxgip.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=...       # server secret
   S3_ENDPOINT=...                     # R2 or MinIO endpoint
   S3_BUCKET=studio-media
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   WHISPER_MODEL=small                 # tiny|base|small|medium
   WHISPER_COMPUTE=int8
   ```
3. (Recommended) attach a volume at `~/.cache/huggingface` so the model downloads once.

## Run locally

```
cd worker
pip install -r requirements.txt   # plus ffmpeg on PATH
python -m studio_worker.main
```

## Tests

```
cd worker && python3 -m unittest discover -s tests -v
```

- `test_media.py` — real rendition ladder on a synthetic clip (`FFMPEG_BIN=/path/to/ffmpeg`).
- `test_subtitles.py` — SRT/VTT formatting.
- `test_pipeline_e2e.py` — **full transcode job loop end to end**: uploads a source video to an
  S3-compatible server (moto at `S3_TEST_ENDPOINT`, default `:5001`), stubs only the PostgREST db
  layer, then runs the real `main.run_one()` → claim → download → ffmpeg ladder → upload every
  rendition back to storage (verified via `head_object`) → record metadata + finish job.

Verified in sandbox: **7/7 pass** with a real ffmpeg + moto (Whisper inference needs network for
the model, so it's exercised on the deployed worker).
