import { test } from "node:test";
import assert from "node:assert/strict";
import {
  timeToFrame,
  frameToTime,
  formatSmpte,
  formatClock,
} from "../src/lib/frames.ts";

test("timeToFrame rounds to nearest frame", () => {
  assert.equal(timeToFrame(1.0, 24), 24);
  assert.equal(timeToFrame(1.02, 24), 24); // 24.48 → 24
  assert.equal(timeToFrame(1.03, 24), 25); // 24.72 → 25
  assert.equal(timeToFrame(0, 24), 0);
  assert.equal(timeToFrame(-5, 24), 0); // never negative
});

test("frameToTime lands inside the frame's window (round-trips)", () => {
  for (const fps of [23.976, 24, 25, 29.97, 30, 60]) {
    for (const frame of [0, 1, 47, 100, 1500]) {
      const t = frameToTime(frame, fps);
      assert.equal(
        timeToFrame(t, fps),
        frame,
        `fps=${fps} frame=${frame} → t=${t} → ${timeToFrame(t, fps)}`
      );
    }
  }
});

test("frameToTime is strictly within [frame/fps, (frame+1)/fps)", () => {
  const fps = 30;
  const t = frameToTime(90, fps);
  assert.ok(t >= 90 / fps && t < 91 / fps);
});

test("formatSmpte produces HH:MM:SS:FF", () => {
  assert.equal(formatSmpte(0, 24), "00:00:00:00");
  assert.equal(formatSmpte(1, 24), "00:00:01:00");
  assert.equal(formatSmpte(1.5, 24), "00:00:01:12"); // half second @24 = frame 12
  assert.equal(formatSmpte(3661.0, 25), "01:01:01:00");
});

test("formatClock is m:ss", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(600), "10:00");
});

test("default fps applies when fps is 0/NaN", () => {
  assert.equal(timeToFrame(1, 0), 24);
  assert.equal(timeToFrame(1, Number.NaN), 24);
});
