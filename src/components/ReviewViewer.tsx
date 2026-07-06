"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTimecode } from "@/lib/format";
import { isVideo, isAudio, isImage } from "@/lib/format";
import type { Comment } from "@/lib/types";

type Action = (formData: FormData) => Promise<void>;

export function ReviewViewer({
  src,
  mime,
  filename,
  comments,
  isAdmin,
  allowComments,
  hiddenFields,
  submitAction,
  resolveAction,
}: {
  src: string;
  mime: string;
  filename: string;
  comments: Comment[];
  isAdmin: boolean;
  allowComments: boolean;
  hiddenFields: Record<string, string>;
  submitAction: Action;
  resolveAction?: Action;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [pinTime, setPinTime] = useState(true);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [pending, startTransition] = useTransition();
  const timed = isVideo(mime) || isAudio(mime);

  useEffect(() => {
    if (!isAdmin) {
      setAuthor(localStorage.getItem("ps_client_name") || "");
    }
  }, [isAdmin]);

  function seek(t: number) {
    const v = videoRef.current;
    if (v) {
      v.currentTime = t;
      v.play().catch(() => {});
      v.pause();
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData(e.currentTarget);
    fd.set("body", body);
    if (!isAdmin) {
      fd.set("authorName", author || "Client");
      localStorage.setItem("ps_client_name", author);
    }
    if (replyTo) fd.set("parentId", replyTo.id);
    if (timed && pinTime && !replyTo) {
      fd.set("timecode", String(videoRef.current?.currentTime ?? 0));
    }
    startTransition(async () => {
      await submitAction(fd);
      setBody("");
      setReplyTo(null);
      router.refresh();
    });
  }

  const roots = comments
    .filter((c) => !c.parent_id)
    .sort((a, b) =>
      (a.timecode_s ?? -1) - (b.timecode_s ?? -1) ||
      a.created_at.localeCompare(b.created_at)
    );
  const replies = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="theater flex items-center justify-center">
          {isVideo(mime) ? (
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              className="max-h-[70vh] w-full"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            />
          ) : isAudio(mime) ? (
            <audio
              ref={videoRef as unknown as React.Ref<HTMLAudioElement>}
              src={src}
              controls
              className="w-full p-8"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            />
          ) : isImage(mime) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={filename} className="max-h-[70vh] object-contain" />
          ) : (
            <div className="p-16 text-center">
              <p className="text-sm">{filename}</p>
              <a href={src} className="btn-ghost btn-small mt-4 inline-block">
                Download to view
              </a>
            </div>
          )}
        </div>

        {timed && duration > 0 && (
          <div className="relative mt-2 h-4">
            <div className="absolute top-1/2 h-px w-full bg-(--color-hairline)" />
            {roots
              .filter((c) => c.timecode_s != null)
              .map((c) => (
                <button
                  key={c.id}
                  title={`${formatTimecode(c.timecode_s!)} — ${c.author_name}`}
                  onClick={() => seek(c.timecode_s!)}
                  className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full ${
                    c.resolved_at ? "bg-(--color-hairline)" : "bg-(--color-bronze)"
                  }`}
                  style={{ left: `${(c.timecode_s! / duration) * 100}%` }}
                />
              ))}
          </div>
        )}
      </div>

      <aside className="flex max-h-[75vh] flex-col border hairline bg-white">
        <div className="border-b hairline px-4 py-2.5">
          <h3 className="microlabel">
            Comments{" "}
            {roots.length > 0 && (
              <span className="text-(--color-hairline)">
                · {roots.filter((c) => !c.resolved_at).length} open
              </span>
            )}
          </h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {roots.length === 0 && (
            <p className="text-sm text-(--color-stone)">
              {allowComments
                ? "No comments yet. Play the video and leave the first note — it will be pinned to the timecode."
                : "No comments."}
            </p>
          )}
          {roots.map((c) => (
            <div key={c.id} className={c.resolved_at ? "opacity-50" : ""}>
              <div className="flex items-baseline gap-2 text-xs">
                {c.timecode_s != null && (
                  <button
                    onClick={() => seek(c.timecode_s!)}
                    className="cursor-pointer font-mono text-(--color-bronze-deep) hover:underline"
                  >
                    {formatTimecode(c.timecode_s)}
                  </button>
                )}
                <span className="font-medium">
                  {c.author_name}
                  {c.is_admin && " (Isaac)"}
                </span>
                {c.resolved_at && <span className="microlabel">resolved</span>}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
              <div className="mt-1 flex gap-3">
                {allowComments && (
                  <button
                    className="microlabel cursor-pointer hover:text-(--color-ink)"
                    onClick={() => setReplyTo(c)}
                  >
                    Reply
                  </button>
                )}
                {isAdmin && resolveAction && (
                  <form
                    action={(fd) => {
                      fd.set("id", c.id);
                      fd.set("resolved", c.resolved_at ? "false" : "true");
                      for (const [k, v] of Object.entries(hiddenFields)) fd.set(k, v);
                      startTransition(async () => {
                        await resolveAction(fd);
                        router.refresh();
                      });
                    }}
                  >
                    <button className="microlabel cursor-pointer hover:text-(--color-ink)">
                      {c.resolved_at ? "Reopen" : "Resolve"}
                    </button>
                  </form>
                )}
              </div>
              {(replies.get(c.id) ?? []).map((r) => (
                <div key={r.id} className="mt-2 ml-4 border-l hairline pl-3">
                  <p className="text-xs font-medium">
                    {r.author_name}
                    {r.is_admin && " (Isaac)"}
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {allowComments && (
          <form onSubmit={submit} className="border-t hairline px-4 py-3">
            {Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {replyTo && (
              <p className="mb-2 flex items-center gap-2 text-xs text-(--color-stone)">
                Replying to {replyTo.author_name}
                <button
                  type="button"
                  className="microlabel cursor-pointer"
                  onClick={() => setReplyTo(null)}
                >
                  ✕
                </button>
              </p>
            )}
            {!isAdmin && (
              <input
                type="text"
                placeholder="Your name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mb-2"
              />
            )}
            <textarea
              rows={2}
              placeholder={
                timed && pinTime && !replyTo
                  ? "Comment at current timecode…"
                  : "Comment…"
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              {timed && !replyTo ? (
                <label className="flex items-center gap-2 text-xs text-(--color-stone)">
                  <input
                    type="checkbox"
                    checked={pinTime}
                    onChange={(e) => setPinTime(e.target.checked)}
                  />
                  Pin to timecode
                </label>
              ) : (
                <span />
              )}
              <button className="btn btn-small" disabled={pending || !body.trim()}>
                {pending ? "Posting…" : "Post"}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
