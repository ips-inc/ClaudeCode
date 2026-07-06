import Link from "next/link";
import { PreviewShell } from "./shell";

const SCREENS = [
  {
    href: "/preview/gallery",
    label: "Client gallery",
    replaces: "Pixieset",
    blurb: "Cover, masonry grid, lightbox, ♥ selects, downloads",
  },
  {
    href: "/preview/review",
    label: "Review page",
    replaces: "Frame.io",
    blurb: "Timecoded comments, replies, resolve, versions",
  },
  {
    href: "/preview/transfer",
    label: "Transfer link",
    replaces: "WeTransfer",
    blurb: "Expiry, download limits, zip-all",
  },
  {
    href: "/preview/drive",
    label: "Shared drive folder",
    replaces: "Dropbox",
    blurb: "Folders, files, per-folder zip",
  },
  {
    href: "/preview/studio",
    label: "Studio dashboard",
    replaces: "the admin side",
    blurb: "Projects by type, share links, activity feed",
  },
];

export default function PreviewIndex() {
  return (
    <PreviewShell title="Poole Studio" subtitle="Screen previews">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-center text-sm text-(--color-stone)">
          Each page below is the real interface rendered with demo content — what
          a client (or you) will see once files are flowing.
        </p>
        <ul className="divide-y divide-(--color-hairline) border hairline bg-white">
          {SCREENS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-(--color-paper)"
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-(--color-stone)">{s.blurb}</span>
                <span className="microlabel ml-auto shrink-0">
                  replaces {s.replaces}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PreviewShell>
  );
}
