/* Fixture-driven walkthrough of the SIGNED-IN experience — the app shell,
   The Desk, the Frame-style Files grid, and Money — rendered with the real
   components and mock data so every logged-in surface can be visually
   verified without a database. Not linked from the app. */
import Link from "next/link";
import { AppShell } from "@/components/studio/AppShell";
import { TagEditor } from "@/components/studio/TagEditor";
import { MoveAssetSelect } from "@/components/studio/MoveAssetSelect";

const TAGS = [
  { id: "t1", label: "selects", color: "blue" },
  { id: "t2", label: "retouch", color: "amber" },
  { id: "t3", label: "approved", color: "green" },
  { id: "t4", label: "RAW", color: "purple" },
];

const FOLDERS = [
  { id: "f1", name: "Camera A" },
  { id: "f2", name: "Retouched" },
];

const FILES = [
  { id: "a1", name: "IMG_2041.jpg", size: "24.8 MB", kind: "jpeg", video: false, tags: [TAGS[0], TAGS[2]] },
  { id: "a2", name: "IMG_2042.jpg", size: "25.1 MB", kind: "jpeg", video: false, tags: [TAGS[0]] },
  { id: "a3", name: "meridian-cut-03.mp4", size: "3.2 GB", kind: "mp4", video: true, tags: [TAGS[1]] },
  { id: "a4", name: "lookbook-cover.tiff", size: "310 MB", kind: "tiff", video: false, tags: [] },
];

const G = [
  "linear-gradient(135deg,#2a2a30,#0e0e12)",
  "linear-gradient(135deg,#3a3a42,#14141a)",
  "linear-gradient(160deg,#4a4038,#161210)",
  "linear-gradient(135deg,#20232a,#0c0d10)",
];

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card lift p-5">
      <p className="kicker">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="display text-3xl">{value}</span>
        {hint && <span className="chip !h-5 !px-1.5 text-[10px]">{hint}</span>}
      </p>
    </div>
  );
}

function Money({ v, tone }: { v: string; tone: string }) {
  return (
    <div className="card p-5">
      <p className="kicker">&nbsp;</p>
      <p className="display mt-2 text-3xl" style={{ color: `var(--color-${tone})` }}>{v}</p>
    </div>
  );
}

export default function StudioPreview() {
  return (
    <AppShell role="owner" email="isaac@isaacpoole.co">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="chip mb-8">Preview — mock data, interactions disabled</p>

        {/* ── The Desk ─────────────────────────────────── */}
        <section>
          <p className="kicker mb-2">The Desk</p>
          <h1 className="display text-4xl sm:text-5xl">Good evening, Isaac.</h1>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="btn btn-accent btn-sm">+ New project</span>
            <span className="btn btn-ghost btn-sm">Open files</span>
            <span className="btn btn-ghost btn-sm">Client deliveries</span>
            <span className="btn btn-ghost btn-sm">Money</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Active projects" value="6" />
            <Tile label="Live with clients" value="3" />
            <Tile label="Storage used" value="184 GB" />
            <Tile label="Outstanding" value="$4,850" hint="$1,200 overdue" />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="kicker mb-3">Recently added</h2>
              <ul className="card divide-y hairline overflow-hidden">
                {FILES.slice(0, 3).map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-2)] text-[10px] [color:var(--color-mute)]">{f.kind}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{f.name}</p>
                      <p className="kicker mt-0.5 normal-case tracking-normal">Meridian — Brand Film</p>
                    </div>
                    <span className="mono shrink-0 text-[11px] [color:var(--color-mute)]">{i + 1}h ago</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="kicker mb-3">Live with clients</h2>
              <ul className="space-y-2">
                {["Spring Campaign — Selects", "Meridian — Brand Film"].map((t) => (
                  <li key={t} className="card lift flex items-center gap-3 p-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-good)]" />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{t}</p>
                      <p className="kicker mt-0.5 normal-case tracking-normal">Aurelie Studio</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Files — Frame-style project ───────────────── */}
        <section className="mt-20 border-t hairline pt-12">
          <p className="kicker mb-2">Files</p>
          <h2 className="display text-3xl">Meridian — Brand Film</h2>
          <p className="kicker mt-1.5">Aurelie Studio · Review delivery</p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap items-center gap-1 text-[13px]">
              <span className="[color:var(--color-dim)]">Meridian — Brand Film</span>
              <span className="[color:var(--color-faint)]"> / </span>
              <span className="font-medium">Camera A</span>
            </nav>
            <div className="flex items-center gap-1">
              <input placeholder="New folder" className="field !h-9 !w-36 text-[13px]" readOnly />
              <span className="btn btn-ghost btn-sm">Add folder</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="kicker mb-3">Upload — into Camera A</h3>
            <div className="rounded-[var(--radius)] border border-dashed border-[color:var(--color-line)] p-8 text-center text-[13px] [color:var(--color-mute)]">
              Drop media or files of any size
            </div>
          </div>

          <div className="mt-8 mb-3 flex flex-wrap items-center gap-2">
            <input placeholder="Search files…" className="field !h-9 w-full max-w-56 text-[13px]" readOnly />
            <select className="field !h-9 !w-auto text-[13px]" defaultValue="newest">
              <option value="newest">Newest first</option>
            </select>
            <span className="btn btn-ghost btn-sm">Apply</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="kicker">Files · {FILES.length}</h3>
            <div className="flex flex-wrap items-center gap-1">
              {TAGS.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                  style={{
                    color: `var(--color-${t.color === "gray" ? "mute" : t.color === "blue" ? "accent" : t.color})`,
                    borderColor: "var(--color-hairline)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {FOLDERS.map((f) => (
              <li key={f.id} className="card lift overflow-hidden">
                <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-[color:var(--color-surface-2)]">
                  <span aria-hidden className="text-4xl">📁</span>
                  <span className="max-w-full truncate px-3 text-[12.5px] font-medium">{f.name}</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span className="kicker">Folder</span>
                  <span className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Delete</span>
                </div>
              </li>
            ))}
            {FILES.map((f, i) => (
              <li key={f.id} className="card lift overflow-hidden">
                <div className="relative flex aspect-square items-center justify-center" style={{ background: G[i % G.length] }}>
                  {f.video && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-[13px] text-white">▶</span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[12.5px] font-medium">{f.name}</p>
                  <p className="mono text-[10.5px] [color:var(--color-mute)]">{f.size}</p>
                  <div className="mt-2">
                    <TagEditor assetId={f.id} projectId="preview" tags={f.tags} vocabulary={TAGS} />
                  </div>
                  <div className="mt-2">
                    <MoveAssetSelect assetId={f.id} projectId="preview" folderId={null} folders={FOLDERS} />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="btn btn-ghost btn-xs">{f.video ? "Review" : "Open"}</span>
                    <span className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Delete</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Money ─────────────────────────────────────── */}
        <section className="mt-20 border-t hairline pt-12">
          <p className="kicker mb-2">Money</p>
          <h2 className="display text-3xl">Studio finances</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card p-5"><p className="kicker">Outstanding</p><p className="display mt-2 text-3xl">$4,850</p></div>
            <div className="card p-5"><p className="kicker">Overdue</p><p className="display mt-2 text-3xl" style={{ color: "var(--color-danger)" }}>$1,200</p></div>
            <div className="card p-5"><p className="kicker">Awaiting approval</p><p className="display mt-2 text-3xl" style={{ color: "var(--color-amber)" }}>2</p></div>
            <div className="card p-5"><p className="kicker">Paid (30 days)</p><p className="display mt-2 text-3xl" style={{ color: "var(--color-good)" }}>$9,400</p></div>
          </div>
          <div className="card mt-6 overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-b hairline [color:var(--color-mute)]">
                    <th className="px-4 py-2.5 text-left font-medium">Number</th>
                    <th className="px-4 py-2.5 text-left font-medium">Client</th>
                    <th className="px-4 py-2.5 text-left font-medium">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["INV-0007", "Aurelie Studio", "invoice", "overdue", "$1,200.00", "Jul 1, 2026", "danger"],
                    ["INV-0006", "Meridian", "invoice", "sent", "$3,650.00", "Jul 24, 2026", "accent"],
                    ["EST-0004", "Vera & Co", "estimate", "viewed", "$2,800.00", "—", "accent"],
                    ["INV-0005", "Meridian", "invoice", "paid", "$5,200.00", "Jun 12, 2026", "good"],
                  ].map(([n, c, k, s, t, d, tone]) => (
                    <tr key={n} className="border-b hairline last:border-0">
                      <td className="px-4 py-2.5"><span className="mono font-medium">{n}</span></td>
                      <td className="px-4 py-2.5">{c}</td>
                      <td className="px-4 py-2.5 capitalize [color:var(--color-dim)]">{k}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize"
                          style={{ color: `var(--color-${tone})`, borderColor: `color-mix(in srgb, var(--color-${tone}) 33%, transparent)`, background: `color-mix(in srgb, var(--color-${tone}) 12%, transparent)` }}
                        >
                          {s}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right mono">{t}</td>
                      <td className="px-4 py-2.5 text-right [color:var(--color-mute)]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="mt-16 text-center">
          <Link href="/preview" className="kicker hover:[color:var(--color-ink)]">← Design system preview</Link>
        </p>
      </div>
    </AppShell>
  );
}
