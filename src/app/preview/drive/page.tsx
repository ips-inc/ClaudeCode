import { PreviewShell } from "../shell";
import { DriveShareView } from "@/components/share/DriveShareView";
import type { Asset, Folder } from "@/lib/types";

const mkFolder = (id: string, name: string, parent: string | null): Folder => ({
  id,
  project_id: "preview",
  parent_id: parent,
  name,
  created_at: "2026-06-01T10:00:00Z",
});

const mkFile = (
  id: string,
  filename: string,
  size: number,
  folder: string | null
): Asset => ({
  id,
  project_id: "preview",
  folder_id: folder,
  filename,
  storage_path: `preview/${filename}`,
  mime: "application/octet-stream",
  size_bytes: size,
  width: null,
  height: null,
  duration_s: null,
  version: 1,
  version_of: null,
  position: 0,
  created_at: "2026-06-14T10:00:00Z",
});

export default function DrivePreview() {
  return (
    <PreviewShell title="Studio Archive" subtitle="Shared folder">
      <DriveShareView
        slug="preview"
        folders={[
          mkFolder("f1", "2026 Campaigns", null),
          mkFolder("f2", "Press Kit", null),
          mkFolder("f3", "Contracts & Releases", null),
        ]}
        assets={[
          mkFile("d1", "isaac_poole_portfolio_2026.pdf", 48_200_000, null),
          mkFile("d2", "rate_card_editorial.pdf", 1_100_000, null),
          mkFile("d3", "headshot_press_300dpi.tif", 212_000_000, null),
        ]}
        currentFolderId={null}
        allowDownloads
      />
    </PreviewShell>
  );
}
