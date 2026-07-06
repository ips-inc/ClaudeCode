import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio_worker.subtitles import to_srt, to_vtt

SEGS = [
    {"start_s": 0.0, "end_s": 2.5, "text": " Hello there. "},
    {"start_s": 61.25, "end_s": 3723.007, "text": "Second line"},
]


class TestSubtitles(unittest.TestCase):
    def test_srt_format(self):
        srt = to_srt(SEGS)
        self.assertIn("1\n00:00:00,000 --> 00:00:02,500\nHello there.", srt)
        self.assertIn("2\n00:01:01,250 --> 01:02:03,007\nSecond line", srt)

    def test_vtt_format(self):
        vtt = to_vtt(SEGS)
        self.assertTrue(vtt.startswith("WEBVTT\n"))
        self.assertIn("00:00:00.000 --> 00:00:02.500", vtt)
        self.assertIn("00:01:01.250 --> 01:02:03.007", vtt)

    def test_empty(self):
        self.assertEqual(to_srt([]), "")
        self.assertTrue(to_vtt([]).startswith("WEBVTT"))


if __name__ == "__main__":
    unittest.main()
