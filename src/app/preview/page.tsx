/* Design preview — renders the real design system with mock content so the
   look can be reviewed without a database. Not linked from the app. */
import { Wordmark } from "@/components/brand/Wordmark";

const G = [
  "linear-gradient(135deg,#2a2a30,#0e0e12)",
  "linear-gradient(135deg,#3a3a42,#14141a)",
  "linear-gradient(160deg,#4a4038,#161210)",
  "linear-gradient(135deg,#20232a,#0c0d10)",
  "linear-gradient(135deg,#33333b,#101014)",
  "linear-gradient(160deg,#2c2a28,#0e0d0c)",
  "linear-gradient(135deg,#26262c,#0d0d10)",
  "linear-gradient(135deg,#3d3d45,#15151a)",
];

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="kicker mb-2">{label}</p>
      <h2 className="display mb-8 text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export default function Preview() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="glass sticky top-0 z-30 border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark href={null as unknown as string} size="sm" />
          <span className="kicker">Design Preview</span>
        </div>
      </header>

      <div className="relative overflow-hidden border-b hairline">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-30%] h-[80vh] w-[90vw] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(10,132,255,0.2), transparent)" }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <p className="kicker mb-5">New York City — Editorial &amp; Commercial</p>
          <h1 className="display text-6xl sm:text-8xl">The studio, delivered.</h1>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed [color:var(--color-dim)]">
            Private galleries, frame-accurate review, and secure delivery — quiet,
            precise, and unmistakably yours.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="btn btn-accent">Enter studio</span>
            <span className="btn btn-ghost">View portfolio</span>
          </div>
        </div>
      </div>

      {/* Type + tokens */}
      <Section label="Foundation" title="Type & tone">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="card p-7">
            <span className="display text-5xl">Aa</span>
            <p className="kicker mt-4">Display — Playfair Display</p>
            <p className="mt-1 text-[13px] [color:var(--color-dim)]">Editorial serif, echoing the wordmark. Headlines only.</p>
            <hr className="my-5 hairline" />
            <span className="text-4xl" style={{ fontWeight: 500 }}>Aa</span>
            <p className="kicker mt-4">Interface — Inter</p>
            <p className="mt-1 text-[13px] [color:var(--color-dim)]">The quiet, precise UI voice.</p>
            <hr className="my-5 hairline" />
            <span className="mono text-3xl">00:14:22:08</span>
            <p className="kicker mt-4">Mono — IBM Plex Mono</p>
            <p className="mt-1 text-[13px] [color:var(--color-dim)]">Timecodes & metadata. The pro tell.</p>
          </div>
          <div className="card p-7">
            <p className="kicker mb-4">Controls</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="btn">Primary</span>
              <span className="btn btn-accent">Accent</span>
              <span className="btn btn-ghost">Ghost</span>
              <span className="btn btn-sm btn-ghost">Small</span>
            </div>
            <div className="mt-5 space-y-2">
              <input className="field" placeholder="A field, focused feels precise" />
              <div className="flex gap-2">
                <span className="chip">gallery</span>
                <span className="chip">🔒 password</span>
                <span className="chip">expires Jul 20</span>
              </div>
            </div>
            <p className="kicker mb-3 mt-6">Palette</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["#08080a", "bg"],
                ["#0f0f12", "surface"],
                ["#f5f5f7", "ink"],
                ["#a1a1a6", "dim"],
                ["#0a84ff", "accent"],
                ["#ffb020", "amber"],
              ].map(([c, n]) => (
                <div key={n} className="text-center">
                  <div className="h-10 w-14 rounded-lg border hairline" style={{ background: c }} />
                  <span className="kicker mt-1 block text-[9px]">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Studio dashboard */}
      <Section label="Owner" title="Studio">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b hairline px-6 py-4">
            <div className="flex items-baseline gap-3">
              <Wordmark href={null as unknown as string} size="sm" />
              <span className="kicker">Studio</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="kicker">Projects</span>
              <span className="btn btn-sm btn-ghost">New</span>
            </div>
          </div>
          <div className="p-6">
            <p className="kicker mb-3">Aurelie Studio</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Spring Campaign — Selects", "Pixieset", true],
                ["Meridian — Brand Film", "Frame.io", true],
                ["Final Masters", "WeTransfer", false],
              ].map(([t, r, live]) => (
                <div key={t as string} className="card lift p-4">
                  <div className="mb-3 aspect-video rounded-lg" style={{ background: G[0] }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium">{t}</span>
                    <span className={`chip ${live ? "!text-[color:var(--color-good)]" : ""}`}>{live ? "live" : "draft"}</span>
                  </div>
                  <p className="kicker mt-1">replaces {r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Review theater */}
      <Section label="Collaborate" title="Review">
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="bg-black p-5">
              <div className="relative flex aspect-video items-center justify-center rounded-xl" style={{ background: G[3] }}>
                <span className="rounded-full bg-white/10 px-4 py-2 text-white/80 backdrop-blur">▶</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-white/70">
                <span className="chip !bg-white/5">◄</span>
                <span className="chip !bg-white/5">►</span>
                <span className="mono text-xs">00:00:12:04</span>
                <span className="kicker ml-auto">frame 292 · 24 fps</span>
              </div>
              <div className="relative mt-3 h-6">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
                {[18, 44, 70].map((l) => (
                  <span key={l} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black" style={{ left: `${l}%`, background: "var(--color-amber)" }} />
                ))}
              </div>
            </div>
            <div className="flex flex-col border-l hairline">
              <div className="border-b hairline px-4 py-3">
                <span className="text-sm font-medium">2 open comments</span>
              </div>
              <div className="space-y-3 p-4">
                {[
                  ["00:00:12", "Maya — Vogue", "Hold this frame a beat longer before the cut?", false],
                  ["00:00:47", "Devon", "Mix feels music-heavy under the VO here.", false],
                  ["00:01:03", "Isaac", "Fixed in v2.", true],
                ].map(([tc, who, body, done]) => (
                  <div key={who as string} className={`card p-3 ${done ? "opacity-55" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="mono rounded bg-white/8 px-1.5 py-0.5 text-[11px]">{tc}</span>
                      <span className="text-[13px] font-medium">{who}</span>
                      {done && <span className="text-[11px] [color:var(--color-good)]">✓</span>}
                    </div>
                    <p className="mt-1.5 text-[13px] [color:var(--color-dim)]">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto border-t hairline p-4">
                <textarea className="field" rows={2} placeholder="Comment at 00:00:12…" />
                <button className="btn btn-accent btn-sm mt-2 w-full">Comment</button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Client gallery — light */}
      <Section label="Deliver" title="Gallery">
        <div className="surface-light overflow-hidden rounded-[18px] border hairline">
          <div className="border-b hairline px-6 py-4 text-center">
            <Wordmark href={null as unknown as string} size="sm" />
          </div>
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-8 aspect-[16/7] max-w-3xl rounded-xl" style={{ background: "linear-gradient(135deg,#d8d4ce,#a8a29a)" }} />
            <h3 className="display text-4xl">Aurelie — Editorial Selects</h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] [color:var(--color-dim)]">Final retouched selects. Tap the heart to mark your picks.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="btn btn-accent btn-sm">Download all</span>
              <span className="btn btn-ghost btn-sm">Selects · 3</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-6 pb-8 sm:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-xl" style={{ background: `linear-gradient(135deg,hsl(${30 + i * 6} 8% ${72 - i * 3}%),hsl(${20 + i * 5} 6% ${40 - i}%))` }} />
            ))}
          </div>
        </div>
      </Section>

      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="kicker">© Isaac Poole</span>
          <span className="kicker">collab.isaacpoole.co</span>
        </div>
      </footer>
    </main>
  );
}
