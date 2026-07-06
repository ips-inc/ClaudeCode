import { PreviewShell } from "../shell";
import { ReviewShareView } from "@/components/share/ReviewShareView";
import type { Comment } from "@/lib/types";

const COMMENTS: Comment[] = [
  {
    id: "c1",
    asset_id: "demo-still",
    parent_id: null,
    share_link_id: "preview",
    author_name: "Maya (Vogue)",
    is_admin: false,
    body: "Love the grade here — can we hold this frame a beat longer before the cut?",
    timecode_s: 12,
    resolved_at: null,
    created_at: "2026-07-05T14:03:00Z",
  },
  {
    id: "c2",
    asset_id: "demo-still",
    parent_id: "c1",
    share_link_id: null,
    author_name: "Isaac",
    is_admin: true,
    body: "Done — extended 14 frames in v2.",
    timecode_s: null,
    resolved_at: null,
    created_at: "2026-07-05T15:20:00Z",
  },
  {
    id: "c3",
    asset_id: "demo-still",
    parent_id: null,
    share_link_id: "preview",
    author_name: "Maya (Vogue)",
    is_admin: false,
    body: "Logo needs to be the stacked lockup per the brand deck.",
    timecode_s: 47,
    resolved_at: "2026-07-05T16:00:00Z",
    created_at: "2026-07-05T14:06:00Z",
  },
  {
    id: "c4",
    asset_id: "demo-still",
    parent_id: null,
    share_link_id: "preview",
    author_name: "Devon",
    is_admin: false,
    body: "Mix feels music-heavy under the VO around here.",
    timecode_s: 73,
    resolved_at: null,
    created_at: "2026-07-05T18:41:00Z",
  },
];

export default function ReviewPreview() {
  return (
    <PreviewShell title="Meridian — Brand Film" subtitle="For review">
      <ReviewShareView
        slug="preview"
        assets={[
          { id: "demo-still", filename: "meridian_brandfilm_v2.mp4", versions: 2 },
          { id: "demo-other", filename: "cutdown_30s_v1.mp4", versions: 1 },
        ]}
        selectedId="demo-still"
        current={{
          id: "demo-still",
          filename: "meridian_brandfilm_v2.mp4",
          mime: "image/png",
          src: "/preview/still.png",
          version: 2,
        }}
        comments={COMMENTS}
        allowComments
        allowDownloads
      />
      <p className="mt-6 text-center text-xs text-(--color-stone)">
        Preview note: a still stands in for the video player here — with a real
        upload, comments pin to the player&apos;s current timecode and appear as
        markers on the timeline.
      </p>
    </PreviewShell>
  );
}
