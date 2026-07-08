"use client";

import { useTransition } from "react";
import { moveAsset } from "@/app/studio/actions";

/**
 * Compact "move to folder" control for a drive file. Submitting the select
 * value moves the asset; root is the empty option.
 */
export function MoveAssetSelect({
  assetId,
  projectId,
  folderId,
  folders,
}: {
  assetId: string;
  projectId: string;
  folderId: string | null;
  folders: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();

  return (
    <select
      disabled={pending}
      defaultValue={folderId ?? ""}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("assetId", assetId);
        fd.set("projectId", projectId);
        fd.set("folderId", e.target.value);
        start(() => moveAsset(fd));
      }}
      className="field !h-7 w-full text-[11px] normal-case tracking-normal"
      title="Move to folder"
      aria-label="Move to folder"
    >
      <option value="">📁 Home</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>📁 {f.name}</option>
      ))}
    </select>
  );
}
