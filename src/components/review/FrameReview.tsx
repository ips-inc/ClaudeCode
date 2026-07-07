"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  DEFAULT_FPS,
  formatClock,
  formatSmpte,
  frameToTime,
  timeToFrame,
} from "@/lib/frames";

export interface ReviewComment {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string;
  is_admin: boolean;
  body: string;
  timecode_s: number | null;
  frame: number | null;
  fps: number | null;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Frame-accurate review player with LIVE comment sync.
 *
 * - Plays the transcoded proxy for smooth scrubbing.
 * - New comments pin to the exact current frame (round(t*fps)); clicking one
 *   seeks the player back to that frame.
 * - Supabase Realtime streams other viewers' comments in as they post — no
 *   refresh. Delivery is RLS-filtered, so only project members receive events.
 */
export function FrameReview({
  assetId,
  fps: assetFps,
  src,
  poster,
  vttUrl,
  canResolve,
  initialComments,
}: {
  assetId: string;
  fps: number | null;
  src: string;
  poster?: string | null;
  vttUrl?: string | null;
  canResolve: boolean;
  initialComments: ReviewComment[];
}) {
  const fps = assetFps && assetFps > 0 ? assetFps : DEFAULT_FPS;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [comments, setComments] = useState<ReviewComment[]>(initialComments);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draft, setDraft] = useState("");
  const [pinned, setPinned] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState(false);

  const upsert = useCallback((c: ReviewComment) => {
    setComments((prev) => {
      const i = prev.findIndex((x) => x.id === c.id);
      if (i === -1) return [...prev, c];
      const next = [...prev];
      next[i] = c;
      return next;
    });
  }, []);

  // Live sync: subscribe to this asset's comment stream.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`comments:${assetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `asset_id=eq.${assetId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setComments((prev) => prev.filter((c) => c.id !== id));
          } else {
            upsert(payload.new as ReviewComment);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, upsert]);

  const currentFrame = timeToFrame(currentTime, fps);

  function seekToFrame(frame: number) {
    const v = videoRef.current;
    if (v) v.currentTime = frameToTime(frame, fps);
  }

  function step(frames: number) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    seekToFrame(Math.max(0, currentFrame + frames));
  }

  async function post() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await fetch(`/api/assets/${assetId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: text,
        parentId: replyTo,
        timecodeS: replyTo || !pinned ? null : currentTime,
        frame: replyTo || !pinned ? null : currentFrame,
        fps: replyTo || !pinned ? null : fps,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { comment } = await res.json();
      upsert(comment); // instant echo; realtime dedupes by id
      setDraft("");
      setReplyTo(null);
    }
  }

  async function toggleResolve(c: ReviewComment) {
    const resolved = !c.resolved_at;
    upsert({ ...c, resolved_at: resolved ? new Date().toISOString() : null });
    await fetch(`/api/comments/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
  }

  const roots = useMemo(
    () =>
      comments
        .filter((c) => !c.parent_id)
        .filter((c) => showResolved || !c.resolved_at)
        .sort((a, b) => (a.timecode_s ?? 0) - (b.timecode_s ?? 0)),
    [comments, showResolved]
  );
  const repliesOf = (id: string) =>
    comments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const openCount = comments.filter((c) => !c.parent_id && !c.resolved_at).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* Player — theater */}
      <div className="min-w-0">
        <div className="theater overflow-hidden rounded-[var(--radius)] border hairline p-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={src}
            poster={poster ?? undefined}
            controls
            className="mx-auto max-h-[68vh] w-full rounded-lg"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          >
            {vttUrl && <track kind="captions" src={vttUrl} default />}
          </video>

          {/* Transport + frame readout */}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => step(-1)} className="chip !bg-white/5 hover:!bg-white/10" title="Previous frame">◄</button>
            <button onClick={() => step(1)} className="chip !bg-white/5 hover:!bg-white/10" title="Next frame">►</button>
            <span className="mono text-xs text-white/80">{formatSmpte(currentTime, fps)}</span>
            <span className="kicker ml-auto">frame {currentFrame} · {fps} fps</span>
          </div>

          {/* Comment timeline */}
          <div className="relative mt-3 h-5">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
            {roots
              .filter((c) => c.timecode_s != null && duration > 0)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => seekToFrame(c.frame ?? timeToFrame(c.timecode_s!, fps))}
                  title={`${formatSmpte(c.timecode_s!, c.fps ?? fps)} — ${c.author_name}`}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black shadow transition hover:scale-125"
                  style={{
                    left: `${Math.min(100, (c.timecode_s! / duration) * 100)}%`,
                    background: c.resolved_at ? "var(--color-line-strong)" : "var(--color-amber)",
                  }}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Comments rail */}
      <div className="card flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b hairline px-4 py-3">
          <span className="text-[13px] font-medium">
            {openCount} open comment{openCount === 1 ? "" : "s"}
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] [color:var(--color-mute)]">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Resolved
          </label>
        </div>

        <ul className="scroll-slim flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 440 }}>
          {roots.length === 0 && (
            <li className="py-10 text-center text-[13px] [color:var(--color-mute)]">
              No comments yet. Scrub to a frame and leave the first note.
            </li>
          )}
          {roots.map((c) => (
            <li key={c.id} className={`rounded-[var(--radius-sm)] border hairline bg-[color:var(--color-surface-2)] p-3 ${c.resolved_at ? "opacity-55" : ""}`}>
              <div className="flex items-center gap-2">
                {c.timecode_s != null && (
                  <button
                    onClick={() => seekToFrame(c.frame ?? timeToFrame(c.timecode_s!, fps))}
                    className="mono rounded bg-white/8 px-1.5 py-0.5 text-[11px] hover:bg-white/14"
                  >
                    {formatSmpte(c.timecode_s!, c.fps ?? fps)}
                  </button>
                )}
                <span className="text-[13px] font-medium">{c.author_name}</span>
                {c.is_admin && <span className="text-[11px] [color:var(--color-amber)]">owner</span>}
                {c.resolved_at && <span className="text-[11px] [color:var(--color-good)]">✓</span>}
              </div>
              <p className="mt-1.5 text-[13px] whitespace-pre-wrap [color:var(--color-dim)]">{c.body}</p>

              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="mt-2 border-l border-[color:var(--color-line)] pl-2.5">
                  <span className="text-[12px] font-medium">{r.author_name}</span>
                  <p className="text-[13px] whitespace-pre-wrap [color:var(--color-dim)]">{r.body}</p>
                </div>
              ))}

              <div className="mt-2 flex gap-3 text-[11px] [color:var(--color-mute)]">
                <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="hover:[color:var(--color-ink)]">
                  {replyTo === c.id ? "Cancel" : "Reply"}
                </button>
                {canResolve && (
                  <button onClick={() => toggleResolve(c)} className="hover:[color:var(--color-ink)]">
                    {c.resolved_at ? "Reopen" : "Resolve"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Composer */}
        <div className="border-t hairline p-3">
          {replyTo ? (
            <p className="mb-1.5 text-[11px] [color:var(--color-mute)]">Replying to a comment</p>
          ) : (
            <label className="mb-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] [color:var(--color-dim)]">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin to <span className="mono">{formatSmpte(currentTime, fps)}</span>
            </label>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post();
            }}
            rows={2}
            placeholder="Add a comment…  (⌘↵)"
            className="field"
          />
          <button onClick={post} disabled={busy || !draft.trim()} className="btn btn-accent btn-sm mt-2 w-full">
            {busy ? "Posting…" : replyTo ? "Reply" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { formatClock };
