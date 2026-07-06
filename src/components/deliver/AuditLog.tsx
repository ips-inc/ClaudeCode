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

  if (error) return <p className="text-sm text-neutral-400">Log unavailable.</p>;
  if (!events) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (!events.length)
    return <p className="text-sm text-neutral-400">No activity recorded yet.</p>;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {events.map((e) => {
            const filename =
              e.meta && typeof e.meta === "object" && "filename" in e.meta
                ? String((e.meta as { filename?: string }).filename ?? "")
                : "";
            return (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                  {new Date(e.at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{e.who}</span>{" "}
                  {LABEL[e.action] ?? e.action}
                  {filename && <span className="text-neutral-500"> · {filename}</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11px] text-neutral-400">
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
