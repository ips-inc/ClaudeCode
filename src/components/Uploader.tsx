"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatBytes } from "@/lib/format";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

function sanitizeName(name: string) {
  return name.replace(/[^\w.\- ()]/g, "_");
}

async function probeImage(file: File) {
  try {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return { width: null, height: null };
  }
}

function probeVideo(file: File): Promise<{
  width: number | null;
  height: number | null;
  duration_s: number | null;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration_s: Number.isFinite(video.duration) ? video.duration : null,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ width: null, height: null, duration_s: null });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

export function Uploader({
  projectId,
  folderId = null,
  versionOf = null,
  nextPosition = 0,
  label = "Drag files here, or click to choose",
}: {
  projectId: string;
  folderId?: string | null;
  versionOf?: string | null;
  nextPosition?: number;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(nextPosition);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, file, progress: 0, status: "uploading" }]);

      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        update(id, { status: "error", error: "Session expired — sign in again" });
        return;
      }

      const filename = sanitizeName(file.name);
      const objectName = `${projectId}/${id}/${filename}`;
      const contentType = file.type || "application/octet-stream";

      await new Promise<void>((resolve) => {
        const upload = new tus.Upload(file, {
          endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 2000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "x-upsert": "false",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: "originals",
            objectName,
            contentType,
            cacheControl: "3600",
          },
          // Supabase requires exactly 6MB chunks.
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => {
            update(id, { status: "error", error: String(error) });
            resolve();
          },
          onProgress: (sent, total) => {
            update(id, { progress: total ? sent / total : 0 });
          },
          onSuccess: async () => {
            update(id, { status: "processing" });
            let meta: {
              width: number | null;
              height: number | null;
              duration_s?: number | null;
            } = { width: null, height: null, duration_s: null };
            if (contentType.startsWith("image/")) meta = await probeImage(file);
            else if (contentType.startsWith("video/")) meta = await probeVideo(file);

            const { error } = await supabase.from("assets").insert({
              project_id: projectId,
              folder_id: folderId,
              filename,
              storage_path: objectName,
              mime: contentType,
              size_bytes: file.size,
              width: meta.width,
              height: meta.height,
              duration_s: meta.duration_s ?? null,
              version_of: versionOf,
              position: positionRef.current++,
            });
            update(
              id,
              error
                ? { status: "error", error: error.message }
                : { status: "done", progress: 1 }
            );
            resolve();
          },
        });
        upload.findPreviousUploads().then((prev) => {
          if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
          upload.start();
        });
      });
    },
    [projectId, folderId, versionOf]
  );

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    // Upload up to 3 files concurrently.
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, files.length) }, async () => {
        while (cursor < files.length) {
          const file = files[cursor++];
          await uploadFile(file);
        }
      })
    );
    router.refresh();
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
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
        className={`flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-(--color-bronze) bg-(--color-mist)"
            : "hairline bg-white hover:border-(--color-stone)"
        }`}
      >
        <p className="microlabel">{label}</p>
        <p className="mt-2 text-xs text-(--color-stone)">
          Large files upload resumably — a dropped connection picks up where it
          left off.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 text-xs">
              <span className="w-40 truncate sm:w-64">{i.file.name}</span>
              <span className="text-(--color-stone)">
                {formatBytes(i.file.size)}
              </span>
              <div className="h-1 flex-1 bg-(--color-mist)">
                <div
                  className={`h-1 transition-all ${
                    i.status === "error"
                      ? "bg-(--color-danger)"
                      : "bg-(--color-bronze)"
                  }`}
                  style={{ width: `${Math.round(i.progress * 100)}%` }}
                />
              </div>
              <span className="w-20 text-right text-(--color-stone)">
                {i.status === "uploading" && `${Math.round(i.progress * 100)}%`}
                {i.status === "processing" && "finishing…"}
                {i.status === "done" && "done"}
                {i.status === "error" && (
                  <span className="text-(--color-danger)" title={i.error}>
                    failed
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
