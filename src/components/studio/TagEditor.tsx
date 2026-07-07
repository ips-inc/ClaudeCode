"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { TAG_COLORS, tagChipStyle } from "@/lib/tag-colors";
import { assignTag, createAndAssignTag, unassignTag } from "@/app/studio/tag-actions";
import type { Tag } from "@/lib/tags";

/**
 * Inline tag control on an asset. Shows applied tags as removable chips and a
 * "+" that opens a small panel to apply an existing tag or coin a new one with
 * a color. Optimistic-ish: mutations run through server actions + router
 * refresh via useTransition.
 */
export function TagEditor({
  assetId,
  projectId,
  tags,
  vocabulary,
}: {
  assetId: string;
  projectId: string;
  tags: Tag[];
  vocabulary: Tag[];
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[1]);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const appliedIds = new Set(tags.map((t) => t.id));
  const available = vocabulary.filter((t) => !appliedIds.has(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium"
          style={tagChipStyle(t.color)}
        >
          {t.label}
          <button
            aria-label={`Remove ${t.label}`}
            disabled={pending}
            onClick={() => start(() => unassignTag(assetId, projectId, t.id))}
            className="opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </span>
      ))}

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
          className="rounded-full border border-dashed hairline px-1.5 py-0.5 text-[10.5px] [color:var(--color-mute)] hover:[color:var(--color-ink)]"
        >
          + tag
        </button>

        {open && (
          <div className="absolute bottom-full left-0 z-20 mb-1.5 w-56 rounded-[var(--radius-sm)] border hairline bg-[color:var(--color-elevated)] p-2 shadow-xl">
            {available.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {available.map((t) => (
                  <button
                    key={t.id}
                    disabled={pending}
                    onClick={() =>
                      start(() => {
                        assignTag(assetId, projectId, t.id);
                        setOpen(false);
                      })
                    }
                    className="rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium"
                    style={tagChipStyle(t.color)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 border-t hairline pt-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="New tag"
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && label.trim()) {
                    start(() => {
                      createAndAssignTag(assetId, projectId, label, color);
                      setLabel("");
                      setOpen(false);
                    });
                  }
                }}
                className="field !h-8 flex-1 !px-2 text-[12px]"
              />
              <button
                disabled={pending || !label.trim()}
                onClick={() =>
                  start(() => {
                    createAndAssignTag(assetId, projectId, label, color);
                    setLabel("");
                    setOpen(false);
                  })
                }
                className="btn btn-accent btn-xs"
              >
                Add
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className="h-4 w-4 rounded-full border"
                  style={{
                    background: tagChipStyle(c).color,
                    outline: color === c ? `2px solid var(--color-ink)` : "none",
                    outlineOffset: "1px",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
