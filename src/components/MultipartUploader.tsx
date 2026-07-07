"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Resumable multipart uploader → R2 via our authorized API.
 *
 *   start  → asset row + uploadId + presigned-per-part plan
 *   part   → PUT each 64MiB chunk straight to storage (presigned, no proxy)
 *   complete → server re-sniffs the real type, queues transcode/transcribe
 *
 * Any file, any size: chunks are streamed, so multi-GB camera files never load
 * fully into memory and a failed part is retried without restarting.
 */
interface Item {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

const MAX_PART_RETRIES = 4;

async function putPart(url: string, blob: Blob): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { method: "PUT", body: blob });
      if (!res.ok) throw new Error(`part ${res.status}`);
      const etag = res.headers.get("etag");
      if (!etag) throw new Error("no etag");
      return etag;
    } catch (e) {
      if (attempt >= MAX_PART_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
}

export function MultipartUploader({
  projectId,
  folderId = null,
  label = "Drop files, or click to choose",
}: {
  projectId: string;
  folderId?: string | null;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  const patch = (id: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const uploadOne = useCallback(
    async (file: File) => {
      const uiId = crypto.randomUUID();
      setItems((prev) => [
        ...prev,
        { id: uiId, name: file.name, size: file.size, progress: 0, status: "uploading" },
      ]);
      try {
        const startRes = await fetch("/api/upload/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId,
            folderId,
            filename: file.name,
            size: file.size,
            mime: file.type || "application/octet-stream",
          }),
        });
        if (!startRes.ok) throw new Error(`start ${startRes.status}`);
        const { assetId, uploadId, partSize, partCount } = await startRes.json();

        const parts: { etag: string; partNumber: number }[] = [];
        for (let n = 0; n < partCount; n++) {
          const partRes = await fetch("/api/upload/part", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assetId, uploadId, partNumber: n + 1 }),
          });
          if (!partRes.ok) throw new Error(`sign part ${partRes.status}`);
          const { url } = await partRes.json();
          const blob = file.slice(n * partSize, Math.min((n + 1) * partSize, file.size));
          const etag = await putPart(url, blob);
          parts.push({ etag, partNumber: n + 1 });
          patch(uiId, { progress: (n + 1) / partCount });
        }

        patch(uiId, { status: "processing" });
        const done = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId, uploadId, parts }),
        });
        if (!done.ok) throw new Error(`complete ${done.status}`);
        patch(uiId, { status: "done", progress: 1 });
      } catch (e) {
        patch(uiId, { status: "error", error: String(e) });
      }
    },
    [projectId, folderId]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      // Two concurrent uploads keeps throughput up without thrashing.
      const queue = [...files];
      const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
        let f: File | undefined;
        while ((f = queue.shift())) await uploadOne(f);
      });
      await Promise.all(workers);
      router.refresh();
    },
    [uploadOne, router]
  );

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-[var(--radius)] border border-dashed p-8 text-center text-[13px] transition ${
          dragging
            ? "border-[color:var(--color-accent)] bg-[color:var(--color-surface-2)]"
            : "border-[color:var(--color-line)] [color:var(--color-mute)] hover:border-[color:var(--color-line-strong)]"
        }`}
      >
        {label}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="text-xs">
              <div className="flex justify-between">
                <span className="truncate">{i.name}</span>
                <span className="mono ml-2 shrink-0 text-[11px] [color:var(--color-mute)]">
                  {i.status === "uploading" && `${Math.round(i.progress * 100)}%`}
                  {i.status === "processing" && "finishing…"}
                  {i.status === "done" && <span className="[color:var(--color-good)]">done</span>}
                  {i.status === "error" && <span className="[color:var(--color-danger)]" title={i.error}>failed</span>}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
                <div
                  className="h-full transition-[width]"
                  style={{
                    width: `${Math.round(i.progress * 100)}%`,
                    background: i.status === "error" ? "var(--color-danger)" : "var(--color-accent)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
