/* Authenticated-surface preview — mirrors the real Desk / Files / Money layouts
   with mock data (no DB), so the logged-in screens can be reviewed and
   screenshotted. Not linked from the app. ?theme=light flips the surface. */

export const dynamic = "force-dynamic";

function Rail() {
  const items = [
    ["◇", "The Desk", true],
    ["▧", "Files", false],
    ["❏", "Deliver", false],
    ["$", "Money", false],
    ["◎", "Team", false],
  ] as const;
  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r hairline bg-[color:var(--color-surface)] md:flex">
      <div className="px-5 py-5"><span className="wordmark text-sm">ISAAC POOLE</span></div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {items.map(([icon, label, active]) => (
          <span key={label} className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] ${active ? "bg-[color:var(--color-surface-2)] font-medium" : "[color:var(--color-dim)]"}`}>
            <span className={`w-4 text-center text-[13px] ${active ? "[color:var(--color-accent)]" : "[color:var(--color-mute)]"}`}>{icon}</span>
            {label}
          </span>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t hairline px-5 py-4">
        <span className="chip !h-8 gap-1.5 !px-2.5">◐ System</span>
        <p className="truncate text-[12px] [color:var(--color-dim)]">isaac@isaacpoole.co</p>
      </div>
    </aside>
  );
}

function Desk() {
  const stats = [
    ["Active projects", "7"],
    ["Live with clients", "3"],
    ["Storage used", "184.2 GB"],
    ["Outstanding", "$12,400", "$3,200 overdue"],
  ];
  const recent = [
    ["MERIDIAN_v3_master.mov", "Meridian — Brand Film", "12m ago", "mp4"],
    ["Aurelie_selects_0142.tif", "Spring Campaign", "1h ago", "tiff"],
    ["scratch_mix_v2.wav", "Meridian — Brand Film", "3h ago", "wav"],
  ];
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-9"><p className="kicker mb-2">The Desk</p><h1 className="display text-4xl capitalize sm:text-5xl">Good afternoon, Isaac.</h1></div>
      <div className="mb-10 flex flex-wrap gap-2.5">
        <span className="btn btn-accent btn-sm">+ New project</span>
        <span className="btn btn-ghost btn-sm">Open files</span>
        <span className="btn btn-ghost btn-sm">Client deliveries</span>
        <span className="btn btn-ghost btn-sm">Money</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="card lift p-5">
            <p className="kicker">{label}</p>
            <p className="mt-2 display text-3xl">{value}</p>
            {hint && <span className="mt-1.5 inline-block whitespace-nowrap text-[11px] font-medium [color:var(--color-danger)]">{hint}</span>}
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="kicker mb-3">Recently added</h2>
          <ul className="card divide-y hairline overflow-hidden">
            {recent.map(([name, proj, ago, ext]) => (
              <li key={name} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-2)] text-[10px] [color:var(--color-mute)]">{ext}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium">{name}</p><p className="kicker mt-0.5 normal-case tracking-normal">{proj}</p></div>
                <span className="mono shrink-0 text-[11px] [color:var(--color-mute)]">{ago}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="kicker mb-3">Live with clients</h2>
          <ul className="space-y-2">
            {[["Spring Campaign — Selects", "Aurelie Studio"], ["Editorial Book", "Maison M"]].map(([t, c]) => (
              <li key={t}><span className="card lift flex items-center gap-3 p-3"><span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-good)]" /><div className="min-w-0"><p className="truncate text-[13.5px] font-medium">{t}</p><p className="kicker mt-0.5 normal-case tracking-normal">{c}</p></div></span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Files() {
  const folders = ["Selects", "RAW", "Retouched"];
  const files = [
    ["Aurelie_0142.tif", "48.2 MB", false],
    ["Aurelie_0148.tif", "51.9 MB", false],
    ["hero_grade_v3.mov", "1.2 GB", true],
    ["contact_sheet.pdf", "4.1 MB", false],
  ];
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <span className="kicker">← Files</span>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="display text-3xl">Spring Campaign — Selects</h1><p className="kicker mt-1.5">Aurelie Studio · Gallery delivery</p></div>
        <div className="flex items-center gap-2"><span className="btn btn-ghost btn-sm">Preview delivery</span><span className="btn btn-accent btn-sm">Publish to client</span></div>
      </div>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1 text-[13px]"><span className="[color:var(--color-dim)]">Spring Campaign</span><span className="[color:var(--color-faint)]"> / </span><span className="font-medium">Selects</span></nav>
        <span className="flex items-center gap-1"><span className="field !h-9 !w-36 text-[13px] flex items-center [color:var(--color-faint)]">New folder</span><span className="btn btn-ghost btn-sm">Add folder</span></span>
      </section>
      <section className="mt-6"><h2 className="kicker mb-3">Upload — into Selects</h2>
        <div className="rounded-[var(--radius)] border border-dashed border-[color:var(--color-line)] p-8 text-center text-[13px] [color:var(--color-mute)]">Drop media or files of any size</div>
      </section>
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="field !h-9 w-full max-w-56 text-[13px] flex items-center [color:var(--color-faint)]">Search files…</span><span className="field !h-9 w-auto text-[13px] flex items-center">Newest first</span><span className="btn btn-ghost btn-sm">Apply</span></div>
        <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="kicker">Files · 4</h2>
          {["selects", "hero", "approved"].map((t, i) => (<span key={t} className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium" style={{ color: ["#0a84ff", "#30d158", "#ffb020"][i], borderColor: `${["#0a84ff", "#30d158", "#ffb020"][i]}55`, background: `${["#0a84ff", "#30d158", "#ffb020"][i]}1f` }}>{t}</span>))}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((f) => (
            <li key={f} className="card lift overflow-hidden">
              <span className="flex aspect-square flex-col items-center justify-center gap-2 bg-[color:var(--color-surface-2)]"><span className="text-4xl">📁</span><span className="px-3 text-[12.5px] font-medium">{f}</span></span>
              <div className="flex items-center justify-between px-2.5 py-2"><span className="kicker">Folder</span><span className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Delete</span></div>
            </li>
          ))}
          {files.map(([name, size, video]) => (
            <li key={name as string} className="card lift overflow-hidden">
              <span className="relative flex aspect-square items-center justify-center bg-[color:var(--color-surface-2)]">
                <span className="kicker px-2 text-center">{(name as string).split(".").pop()}</span>
                {video && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-[13px] text-white">▶</span></span>}
              </span>
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-medium">{name}</p>
                <p className="mono text-[10.5px] [color:var(--color-mute)]">{size}</p>
                <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium" style={{ color: "#0a84ff", borderColor: "#0a84ff55", background: "#0a84ff1f" }}>selects</span><span className="rounded-full border border-dashed hairline px-1.5 py-0.5 text-[10.5px] [color:var(--color-mute)]">+ tag</span></div>
                <div className="mt-2 flex items-center gap-1.5"><span className="btn btn-ghost btn-xs">{video ? "Review" : "Open"}</span><span className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Delete</span></div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Money() {
  const items = [["Shoot day — editorial (1 day)", "1", "$4,500", "$4,500"], ["Retouching — 12 selects", "12", "$120", "$1,440"], ["Licensing — 12 mo, NA", "1", "$3,000", "$3,000"]];
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <span className="kicker">← Money</span>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="display text-3xl">Invoice <span className="mono text-2xl [color:var(--color-dim)]">INV-0007</span></h1><p className="kicker mt-1.5">Aurelie Studio · sent</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="chip !text-[color:var(--color-good)]">✓ Zoho</span><span className="btn btn-ghost btn-sm !text-[color:var(--color-danger)]">Delete</span></div>
      </div>
      <div className="card mt-6 flex flex-wrap items-center gap-3 p-3 text-[13px]"><span className="kicker">Client link</span><span className="mono truncate [color:var(--color-dim)]">collab.isaacpoole.co/i/8f2a…</span><span className="ml-auto btn btn-ghost btn-xs">Copy</span></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="kicker mb-3">Line items</h2>
          <div className="card overflow-hidden"><table className="w-full text-[13px]"><thead><tr className="border-b hairline [color:var(--color-mute)]"><th className="px-3 py-2 text-left font-medium">Description</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead>
            <tbody>{items.map(([d, q, p, a]) => (<tr key={d} className="border-b hairline last:border-0"><td className="px-3 py-2">{d}</td><td className="px-3 py-2 text-right mono">{q}</td><td className="px-3 py-2 text-right mono">{p}</td><td className="px-3 py-2 text-right mono">{a}</td></tr>))}</tbody></table></div>
          <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-[13px]"><div className="flex justify-between"><span className="[color:var(--color-mute)]">Subtotal</span><span className="mono">$8,940.00</span></div><div className="flex justify-between"><span className="[color:var(--color-mute)]">Tax (8.875%)</span><span className="mono">$793.43</span></div><div className="flex justify-between border-t hairline pt-1.5 text-[15px] font-medium"><span>Total</span><span className="mono">$9,733.43</span></div></div>
        </section>
        <aside className="space-y-6">
          <div><h2 className="kicker mb-2">Details</h2><div className="card space-y-3 p-4"><div><span className="kicker">Due date</span><div className="field !h-9 text-[13px] mt-1 flex items-center">Aug 15, 2026</div></div><div><span className="kicker">Terms</span><div className="field text-[13px] mt-1 py-2 leading-snug">Net 30. Wire or Zelle to studio@…</div></div></div></div>
          <div><h2 className="kicker mb-2">Payments</h2><div className="card p-4"><form className="space-y-2"><div className="flex gap-2"><span className="field !h-9 text-[13px] flex items-center [color:var(--color-faint)]">Amount</span><span className="field !h-9 !w-auto text-[13px] flex items-center">Wire</span></div><span className="btn btn-ghost btn-sm w-full">Record payment</span></form></div></div>
        </aside>
      </div>
    </div>
  );
}

export default async function AppPreview({ searchParams }: { searchParams: Promise<{ theme?: string; screen?: string }> }) {
  const sp = await searchParams;
  const light = sp.theme === "light";
  const screen = sp.screen ?? "desk";
  return (
    <div data-theme={light ? "light" : "dark"} className={light ? "surface-light min-h-screen" : "min-h-screen"}>
      <div className="flex min-h-screen">
        <Rail />
        <main className="min-w-0 flex-1">
          {screen === "files" ? <Files /> : screen === "money" ? <Money /> : <Desk />}
        </main>
      </div>
    </div>
  );
}
