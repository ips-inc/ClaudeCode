#!/usr/bin/env python3
"""
audit-references.py — grade your reference files BEFORE uploading, for best-results cloning.

Point it at your local "AI CLONE" folder. It reports, per set:
  - counts vs the recommended targets (see REFERENCES.md)
  - image resolution (flags anything too small / very off-aspect)
  - exact-duplicate files (wasted, and they bias a LoRA toward one pose)
  - talking-video and voice-audio duration (needs `ffprobe` if you want AV duration)
  - a keep / cull summary

Runs LOCALLY on your machine (this cloud session can't see your Documents).
Pure standard library, except optional Pillow for image dimensions and optional
ffprobe (from ffmpeg) for audio/video duration — it degrades gracefully without them.

Usage:
    python3 scripts/audit-references.py "~/Documents/AI CLONE"
    python3 scripts/audit-references.py "~/Documents/AI CLONE" --min-short-side 1024
"""
import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from collections import defaultdict

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff", ".bmp"}
VID_EXT = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
AUD_EXT = {".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".aiff"}

# Which subfolder name maps to which set (case-insensitive substring match).
SETS = {
    "face":     {"dir_hints": ["a_face", "face", "photos", "likeness"], "kind": "image",
                 "target": (25, 40), "label": "A. Face / likeness photos"},
    "video":    {"dir_hints": ["b_talking", "talking", "video"], "kind": "video",
                 "target_min_sec": 120, "label": "B. Talking video"},
    "voice":    {"dir_hints": ["c_voice", "voice", "audio"], "kind": "audio",
                 "target_min_sec": 180, "label": "C. Voice audio"},
    "wardrobe": {"dir_hints": ["d_wardrobe", "wardrobe", "outfits"], "kind": "image",
                 "target": (5, 15), "label": "D. Wardrobe shots"},
}

C = {"g": "\033[92m", "y": "\033[93m", "r": "\033[91m", "b": "\033[1m", "x": "\033[0m"}
def col(s, c):
    return f"{C[c]}{s}{C['x']}" if sys.stdout.isatty() else s

def try_pillow():
    try:
        from PIL import Image  # noqa
        return Image
    except Exception:
        return None

def img_size(Image, path):
    try:
        with Image.open(path) as im:
            return im.size  # (w, h)
    except Exception:
        return None

def have_ffprobe():
    return shutil.which("ffprobe") is not None

def media_duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30)
        return float(out.stdout.strip())
    except Exception:
        return None

def file_hash(path, chunk=1 << 20):
    h = hashlib.sha1()
    try:
        with open(path, "rb") as f:
            while True:
                b = f.read(chunk)
                if not b:
                    break
                h.update(b)
        return h.hexdigest()
    except Exception:
        return None

def walk_files(root):
    for dirpath, _, names in os.walk(root):
        if os.path.basename(dirpath).lower() in ("_rejects", "rejects"):
            continue
        for n in names:
            if n.startswith("."):
                continue
            yield os.path.join(dirpath, n)

def classify_set(path, root):
    rel = os.path.relpath(path, root).lower()
    top = rel.split(os.sep)[0] if os.sep in rel else ""
    for key, spec in SETS.items():
        if any(h in top for h in spec["dir_hints"]):
            return key
    # fall back by extension if files sit loose in the root
    ext = os.path.splitext(path)[1].lower()
    if ext in VID_EXT:
        return "video"
    if ext in AUD_EXT:
        return "voice"
    if ext in IMG_EXT:
        return "face"
    return None

def fmt_dur(sec):
    if sec is None:
        return "?"
    m, s = divmod(int(sec), 60)
    return f"{m}m{s:02d}s"

def main():
    ap = argparse.ArgumentParser(description="Audit reference files before cloning.")
    ap.add_argument("folder", help='path to your "AI CLONE" folder')
    ap.add_argument("--min-short-side", type=int, default=1024,
                    help="flag images whose short side is below this (default 1024)")
    args = ap.parse_args()

    root = os.path.abspath(os.path.expanduser(args.folder))
    if not os.path.isdir(root):
        print(col(f"❌ Not a folder: {root}", "r"))
        sys.exit(1)

    Image = try_pillow()
    ffprobe = have_ffprobe()
    print(col(f"\nAuditing: {root}", "b"))
    if not Image:
        print(col("  (Pillow not installed — image dimensions skipped. `pip install Pillow` for full checks.)", "y"))
    if not ffprobe:
        print(col("  (ffprobe not found — AV duration skipped. Install ffmpeg for duration checks.)", "y"))
    print()

    buckets = defaultdict(list)
    hashes = defaultdict(list)
    for path in walk_files(root):
        key = classify_set(path, root)
        if key:
            buckets[key].append(path)
            h = file_hash(path)
            if h:
                hashes[h].append(path)

    # duplicate detection (exact byte-for-byte)
    dupes = {h: ps for h, ps in hashes.items() if len(ps) > 1}

    total_flags = 0
    for key, spec in SETS.items():
        files = sorted(buckets.get(key, []))
        print(col(f"● {spec['label']}", "b"), f"— {len(files)} file(s)")
        if not files:
            print(col("   ⚠ none found — create/populate this subfolder (see REFERENCES.md).", "y"))
            total_flags += 1
            print()
            continue

        if spec["kind"] == "image":
            lo, hi = spec["target"]
            if len(files) < lo:
                print(col(f"   ⚠ below target ({lo}-{hi}). Add {lo - len(files)} more.", "y")); total_flags += 1
            elif len(files) > hi:
                print(col(f"   ℹ above target ({lo}-{hi}) — fine, but cull the weakest to the best {hi}.", "y"))
            small, bad = [], []
            if Image:
                for p in files:
                    sz = img_size(Image, p)
                    if not sz:
                        bad.append(p); continue
                    w, h = sz
                    if min(w, h) < args.min_short_side:
                        small.append((p, w, h))
                    ar = max(w, h) / max(1, min(w, h))
                    if ar > 2.2:
                        print(col(f"   ⚠ very off-aspect ({w}x{h}): {os.path.basename(p)}", "y")); total_flags += 1
                if small:
                    total_flags += 1
                    print(col(f"   ⚠ {len(small)} low-res (short side < {args.min_short_side}px) — cull or replace:", "y"))
                    for p, w, h in small[:12]:
                        print(f"        {w}x{h}  {os.path.basename(p)}")
                    if len(small) > 12:
                        print(f"        …and {len(small) - 12} more")
                if bad:
                    print(col(f"   ⚠ {len(bad)} unreadable image(s).", "y")); total_flags += 1
                if not small and not bad:
                    print(col("   ✓ resolutions look good.", "g"))
        else:  # video / audio
            need = spec["target_min_sec"]
            total = 0.0
            measured = False
            for p in files:
                d = media_duration(p) if ffprobe else None
                if d:
                    measured = True; total += d
                    print(f"     {fmt_dur(d):>7}  {os.path.basename(p)}")
            if measured:
                verdict = "g" if total >= need else "y"
                print(col(f"   total {fmt_dur(total)} (target ≥ {fmt_dur(need)}) "
                          + ("✓" if total >= need else "⚠ add more"), verdict))
                if total < need:
                    total_flags += 1
            else:
                print(col("   ℹ install ffmpeg to verify duration.", "y"))
        print()

    if dupes:
        n = sum(len(ps) - 1 for ps in dupes.values())
        print(col(f"● Duplicates — {n} redundant copy(ies) across {len(dupes)} group(s):", "b"))
        for ps in list(dupes.values())[:10]:
            print("   " + col("dupe:", "y") + " " + " == ".join(os.path.basename(p) for p in ps))
        print(col("   → keep one of each; extras bias a LoRA toward one pose.", "y"))
        total_flags += 1
        print()

    if total_flags == 0:
        print(col("✅ Looks upload-ready. Nice set. Proceed to train/clone.", "g"))
    else:
        print(col(f"⚠ {total_flags} thing(s) to fix above for best results. Re-run after fixing.", "y"))
    print(col("   Spec & upload targets: REFERENCES.md\n", "b"))

if __name__ == "__main__":
    main()
