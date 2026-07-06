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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Player */}
      <div className="min-w-0">
        <div className="overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={src}
            poster={poster ?? undefined}
            controls
            className="aspect-video w-full"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          >
            {vttUrl && <track kind="captions" src={vttUrl} default />}
          </video>
        </div>

        {/* Transport + frame readout */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <button onClick={() => step(-1)} className="rounded border px-2 py-1 hover:bg-neutral-100" title="Previous frame">
            ◄
          </button>
          <button onClick={() => step(1)} className="rounded border px-2 py-1 hover:bg-neutral-100" title="Next frame">
            ►
          </button>
          <span className="font-mono text-xs tabular-nums text-neutral-600">
            {formatSmpte(currentTime, fps)}
          </span>
          <span className="ml-auto text-xs text-neutral-400">
            frame {currentFrame} · {fps} fps
          </span>
        </div>

        {/* Comment timeline */}
        <div className="relative mt-3 h-6">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-200" />
          {roots
            .filter((c) => c.timecode_s != null && duration > 0)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => seekToFrame(c.frame ?? timeToFrame(c.timecode_s!, fps))}
                title={`${formatSmpte(c.timecode_s!, c.fps ?? fps)} — ${c.author_name}`}
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow hover:scale-125"
                style={{ left: `${Math.min(100, (c.timecode_s! / duration) * 100)}%` }}
              />
            ))}
        </div>
      </div>

      {/* Comments rail */}
      <div className="flex min-h-0 flex-col rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">
            {openCount} open comment{openCount === 1 ? "" : "s"}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 420 }}>
          {roots.length === 0 && (
            <li className="py-8 text-center text-sm text-neutral-400">
              No comments yet. Scrub to a frame and leave the first note.
            </li>
          )}
          {roots.map((c) => (
            <li key={c.id} className={`rounded-md border p-2.5 ${c.resolved_at ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 text-xs">
                {c.timecode_s != null && (
                  <button
                    onClick={() => seekToFrame(c.frame ?? timeToFrame(c.timecode_s!, fps))}
                    className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[11px] text-white tabular-nums"
                  >
                    {formatSmpte(c.timecode_s!, c.fps ?? fps)}
                  </button>
                )}
                <span className="font-medium">{c.author_name}</span>
                {c.is_admin && <span className="text-amber-600">owner</span>}
                {c.resolved_at && <span className="text-emerald-600">✓ resolved</span>}
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap">{c.body}</p>

              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="mt-2 border-l-2 pl-2.5">
                  <span className="text-xs font-medium">{r.author_name}</span>
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}

              <div className="mt-1.5 flex gap-3 text-xs text-neutral-500">
                <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="hover:text-neutral-900">
                  {replyTo === c.id ? "Cancel reply" : "Reply"}
                </button>
                {canResolve && (
                  <button onClick={() => toggleResolve(c)} className="hover:text-neutral-900">
                    {c.resolved_at ? "Reopen" : "Resolve"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Composer */}
        <div className="border-t p-3">
          {replyTo ? (
            <p className="mb-1.5 text-xs text-neutral-500">Replying to a comment</p>
          ) : (
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-neutral-600">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin to {formatSmpte(currentTime, fps)} (frame {currentFrame})
            </label>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post();
            }}
            rows={2}
            placeholder="Add a comment…  (⌘↵ to send)"
            className="w-full resize-none rounded-md border p-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            onClick={post}
            disabled={busy || !draft.trim()}
            className="mt-1.5 w-full rounded-md bg-neutral-900 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {busy ? "Posting…" : replyTo ? "Reply" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { formatClock };
