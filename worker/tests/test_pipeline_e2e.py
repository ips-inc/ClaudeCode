"""End-to-end worker pipeline test: the REAL transcode job loop.

Uploads a synthetic source video to an S3-compatible server (moto), stubs only
the PostgREST layer (db) with an in-memory fake, then runs the actual
main.run_one() → handle_transcode path. Proves: claim a job → download the
source from storage → ffmpeg the full rendition ladder → upload every rendition
back to storage → record asset metadata + rendition rows.

Requires ffmpeg (FFMPEG_BIN=... for a static build) and a reachable S3 server
(S3_TEST_ENDPOINT, default http://localhost:5001). Skips cleanly otherwise.
"""
import os
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

ENDPOINT = os.environ.get("S3_TEST_ENDPOINT", "http://localhost:5001")
os.environ.update(
    SUPABASE_URL="http://stub",
    SUPABASE_SERVICE_ROLE_KEY="stub",
    S3_ENDPOINT=ENDPOINT,
    S3_REGION="us-east-1",
    S3_BUCKET="worker-e2e",
    S3_ACCESS_KEY_ID="testing",
    S3_SECRET_ACCESS_KEY="testing",
)

from studio_worker import config, storage  # noqa: E402


def have_ffmpeg() -> bool:
    try:
        subprocess.run([config.FFMPEG, "-version"], capture_output=True, timeout=10)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def have_s3() -> bool:
    try:
        import requests

        return requests.get(ENDPOINT, timeout=2).status_code < 500
    except Exception:
        return False


@unittest.skipUnless(have_ffmpeg() and have_s3(), "needs ffmpeg + S3 test server")
class TestPipelineE2E(unittest.TestCase):
    def test_transcode_job_endtoend(self):
        import tempfile

        from botocore.exceptions import ClientError
        from studio_worker import main

        # ---- storage fixture: a real source video in the bucket ----
        s3 = storage.client()
        try:
            s3.create_bucket(Bucket=config.S3_BUCKET)
        except ClientError:
            pass

        with tempfile.TemporaryDirectory() as tmp:
            src = str(Path(tmp) / "src.mp4")
            subprocess.run(
                [
                    config.FFMPEG, "-y", "-hide_banner",
                    "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=3",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-shortest", src,
                ],
                check=True, capture_output=True, timeout=300,
            )
            asset_id = "11111111-1111-1111-1111-111111111111"
            source_key = f"clients/c/projects/p/{asset_id}/src.mp4"
            storage.upload(src, source_key, "video/mp4")

        # ---- stub the PostgREST layer with an in-memory fake ----
        state = {
            "jobs": [{"id": "job-1", "type": "transcode", "asset_id": asset_id}],
            "asset": {"id": asset_id, "storage_key": source_key},
            "asset_updates": [],
            "renditions": [],
            "finished": [],
        }

        def claim_job(kinds):
            return state["jobs"].pop(0) if state["jobs"] else None

        main.db.claim_job = claim_job
        main.db.get_asset = lambda aid: state["asset"] if aid == asset_id else None
        main.db.update_asset = lambda aid, patch: state["asset_updates"].append(patch)
        main.db.upsert_rendition = lambda row: state["renditions"].append(row)
        main.db.finish_job = lambda jid, error=None: state["finished"].append((jid, error))

        # ---- run one real job ----
        processed = main.run_one(["transcode"])
        self.assertTrue(processed, "expected a job to be processed")

        # job finished cleanly
        self.assertEqual(state["finished"], [("job-1", None)])

        # asset metadata was probed and written
        self.assertEqual(len(state["asset_updates"]), 1)
        meta = state["asset_updates"][0]
        self.assertEqual(meta["width"], 1280)
        self.assertEqual(meta["height"], 720)
        self.assertAlmostEqual(float(meta["duration_s"]), 3.0, delta=0.4)

        # every expected rendition was recorded AND uploaded to storage
        kinds = {r["kind"] for r in state["renditions"]}
        self.assertEqual(kinds, {"proxy", "720p", "1080p", "poster", "thumb"})
        for r in state["renditions"]:
            self.assertEqual(r["status"], "done")
            head = s3.head_object(Bucket=config.S3_BUCKET, Key=r["storage_key"])
            self.assertGreater(head["ContentLength"], 500, r["kind"])

        # never upscales: 1080p rendition of a 720p source stays 720
        p1080 = next(r for r in state["renditions"] if r["kind"] == "1080p")
        self.assertEqual(p1080["height"], 720)


if __name__ == "__main__":
    unittest.main()
