/**
 * Frame-accurate time math shared by the player and comment pins.
 *
 * A comment stores the exact frame index so it maps to the same picture on any
 * device: frame = round(t * fps). Seeking back nudges into the middle of the
 * frame's duration so the browser lands on that frame, not its predecessor.
 */
export const DEFAULT_FPS = 24;

export function timeToFrame(timeS: number, fps: number): number {
  return Math.max(0, Math.round(timeS * (fps || DEFAULT_FPS)));
}

export function frameToTime(frame: number, fps: number): number {
  const f = fps || DEFAULT_FPS;
  // +quarter of a frame: far enough past the frame boundary that the decoder
  // resolves to `frame` (not `frame - 1`), but not so far it rounds up to the
  // next frame — so timeToFrame(frameToTime(n)) === n.
  return (frame + 0.25) / f;
}

/** SMPTE-style HH:MM:SS:FF for a timecode + fps. */
export function formatSmpte(timeS: number, fps: number): string {
  const f = Math.max(1, Math.round(fps || DEFAULT_FPS));
  const total = Math.max(0, Math.floor(timeS * f));
  const frames = total % f;
  const secs = Math.floor(total / f);
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = secs % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}:${p(frames)}`;
}

/** Compact m:ss for dense UI. */
export function formatClock(timeS: number): string {
  const s = Math.max(0, Math.floor(timeS));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
