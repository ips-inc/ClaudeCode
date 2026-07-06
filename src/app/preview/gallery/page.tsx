import { PreviewShell } from "../shell";
import { GalleryShareView } from "@/components/share/GalleryShareView";

const IMAGES = [
  "p01", "p02", "p03", "p04", "p05",
  "p06", "p07", "p08", "p09", "p10",
].map((n, i) => ({
  id: `demo-${n}`,
  filename: `IP_2607_${String(i + 1).padStart(3, "0")}.jpg`,
  url: `/preview/${n}.png`,
  width: 560,
  height: 700,
}));

export default function GalleryPreview() {
  return (
    <PreviewShell>
      <GalleryShareView
        slug="preview"
        title="Aurelie — Editorial Selects"
        description="Final retouched selects from the studio session. Tap the heart to mark your picks — I see them instantly on my side."
        coverUrl="/preview/cover.png"
        images={IMAGES}
        favoriteIds={["demo-p02", "demo-p05", "demo-p08"]}
        allowFavorites
        allowDownloads
      />
    </PreviewShell>
  );
}
