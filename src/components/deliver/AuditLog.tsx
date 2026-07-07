"use client";

import { useEffect, useState } from "react";

interface AuditEvent {
  id: number;
  action: string;
  objectType: string | null;
  who: string;
  ip: string | null;
  meta: Record<string, unknown> | null;
  at: string;
}

const LABEL: Record<string, string> = {
  view: "viewed",
  download: "downloaded",
  upload_start: "started upload",
  upload_complete: "uploaded",
  comment: "commented",
  comment_resolve: "resolved a comment",
  comment_reopen: "reopened a comment",
};

export function AuditLog({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEvents(d.events))
      .catch(() => setError(true));
  }, [projectId]);

  if (error) return <p className="text-[13px] [color:var(--color-mute)]">Log unavailable.</p>;
  if (!events) return <p className="text-[13px] [color:var(--color-mute)]">Loading…</p>;
  if (!events.length)
    return <p className="text-[13px] [color:var(--color-mute)]">No activity recorded yet.</p>;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-[13px]">
        <tbody>
          {events.map((e) => {
            const filename =
              e.meta && typeof e.meta === "object" && "filename" in e.meta
                ? String((e.meta as { filename?: string }).filename ?? "")
                : "";
            return (
              <tr key={e.id} className="border-b hairline last:border-0">
                <td className="mono whitespace-nowrap px-3.5 py-2.5 text-[11px] [color:var(--color-mute)]">
                  {new Date(e.at).toLocaleString()}
                </td>
                <td className="px-3.5 py-2.5">
                  <span className="font-medium">{e.who}</span>{" "}
                  <span className="[color:var(--color-dim)]">{LABEL[e.action] ?? e.action}</span>
                  {filename && <span className="[color:var(--color-mute)]"> · {filename}</span>}
                </td>
                <td className="mono px-3.5 py-2.5 text-right text-[11px] [color:var(--color-faint)]">
                  {e.ip ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
