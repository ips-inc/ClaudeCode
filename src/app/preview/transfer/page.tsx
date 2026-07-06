import { PreviewShell } from "../shell";
import { TransferShareView } from "@/components/share/TransferShareView";
import type { Asset, ShareLink } from "@/lib/types";

const mkAsset = (id: string, filename: string, size: number): Asset => ({
  id,
  project_id: "preview",
  folder_id: null,
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
  created_at: "2026-07-06T10:00:00Z",
});

const LINK: ShareLink = {
  id: "preview",
  project_id: "preview",
  slug: "preview",
  label: "Delivery",
  password_hash: null,
  expires_at: "2026-07-20T23:59:59Z",
  allow_downloads: true,
  download_size: "original",
  max_downloads: 10,
  download_count: 3,
  view_count: 12,
  allow_comments: false,
  allow_favorites: false,
  revoked_at: null,
  created_at: "2026-07-06T10:00:00Z",
};

export default function TransferPreview() {
  return (
    <PreviewShell title="Meridian — Final Masters" subtitle="Files for you">
      <TransferShareView
        slug="preview"
        description="ProRes masters plus social cutdowns. Link is live for two weeks — shout if you need it re-armed."
        assets={[
          mkAsset("t1", "meridian_brandfilm_master_ProRes422.mov", 18_640_000_000),
          mkAsset("t2", "meridian_brandfilm_1080p_H264.mp4", 1_310_000_000),
          mkAsset("t3", "cutdown_30s_9x16.mp4", 412_000_000),
          mkAsset("t4", "cutdown_15s_1x1.mp4", 208_000_000),
          mkAsset("t5", "stills_retouched.zip", 3_270_000_000),
        ]}
        link={LINK}
      />
    </PreviewShell>
  );
}
