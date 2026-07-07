"""Real-ffmpeg integration test: generate a synthetic clip, run the actual
rendition ladder, verify every output. Requires an ffmpeg binary (any static
build works: FFMPEG_BIN=/path/to/ffmpeg python3 -m unittest ...)."""
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio_worker import config, media


def have_ffmpeg() -> bool:
    try:
        subprocess.run([config.FFMPEG, "-version"], capture_output=True, timeout=10)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


@unittest.skipUnless(have_ffmpeg(), "no ffmpeg binary available")
class TestTranscode(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.src = str(Path(cls.tmp.name) / "test.mp4")
        # 4s 1280x720 30fps test pattern + 440Hz tone
        subprocess.run(
            [
                config.FFMPEG, "-y", "-hide_banner",
                "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=4",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=4",
                "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-shortest", cls.src,
            ],
            check=True, capture_output=True, timeout=300,
        )

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_probe(self):
        info = media.probe(self.src)
        self.assertTrue(info.has_video)
        self.assertTrue(info.has_audio)
        self.assertEqual(info.width, 1280)
        self.assertEqual(info.height, 720)
        self.assertAlmostEqual(info.duration_s, 4.0, delta=0.3)
        self.assertAlmostEqual(info.fps or 0, 30.0, delta=0.2)

    def test_rendition_ladder(self):
        info = media.probe(self.src)
        out = media.make_video_renditions(self.src, str(Path(self.tmp.name) / "out"), info)
        kinds = {r["kind"] for r in out}
        self.assertEqual(kinds, {"proxy", "720p", "1080p", "poster", "thumb"})

        for r in out:
            self.assertTrue(Path(r["path"]).exists(), r["kind"])
            self.assertGreater(Path(r["path"]).stat().st_size, 1000, r["kind"])

        # never upscale: 1080p from a 720p source stays 720 high
        by_kind = {r["kind"]: r for r in out}
        self.assertEqual(by_kind["1080p"]["height"], 720)
        self.assertEqual(by_kind["proxy"]["height"], 540)

        proxy_info = media.probe(by_kind["proxy"]["path"])
        self.assertEqual(proxy_info.height, 540)
        self.assertTrue(proxy_info.has_audio)
        self.assertAlmostEqual(proxy_info.duration_s, 4.0, delta=0.5)

        # faststart: moov atom must precede mdat for instant scrubbing
        head = Path(by_kind["proxy"]["path"]).read_bytes()[:65536]
        self.assertIn(b"moov", head)

    def test_asr_wav_extraction(self):
        wav = media.extract_wav_for_asr(self.src, str(Path(self.tmp.name) / "asr"))
        info = media.probe(wav)
        self.assertTrue(info.has_audio)
        self.assertAlmostEqual(info.duration_s, 4.0, delta=0.3)


if __name__ == "__main__":
    unittest.main()
