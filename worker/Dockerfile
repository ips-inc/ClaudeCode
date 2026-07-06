# Studio Media Cloud pipeline worker: FFmpeg transcode + faster-whisper transcription.
# CPU-only by design (no per-minute fees; swap base image for CUDA later if needed).
FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY studio_worker ./studio_worker

# Model size is an env knob: tiny/base/small/medium. `small` is a good
# CPU-quality tradeoff; models cache in the mounted volume between runs.
ENV WHISPER_MODEL=small \
    WHISPER_COMPUTE=int8 \
    POLL_SECONDS=5

CMD ["python", "-m", "studio_worker.main"]
