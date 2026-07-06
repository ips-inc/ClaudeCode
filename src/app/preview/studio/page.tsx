/**
 * Static mock of the /studio dashboard with demo content (the real dashboard
 * requires the admin login + live database).
 */
export default function StudioPreview() {
  const sections: [string, string, { title: string; meta: string }[]][] = [
    [
      "Galleries",
      "replaces Pixieset",
      [
        { title: "Aurelie — Editorial Selects", meta: "Updated Jul 5, 2026" },
        { title: "Serrano Family — Fall Session", meta: "Updated Jun 28, 2026" },
      ],
    ],
    [
      "Reviews",
      "replaces Frame.io",
      [{ title: "Meridian — Brand Film", meta: "Updated Jul 6, 2026" }],
    ],
    [
      "Transfers",
      "replaces WeTransfer",
      [
        { title: "Meridian — Final Masters", meta: "Updated Jul 6, 2026" },
        { title: "Tearsheets for Agency", meta: "Updated Jun 30, 2026" },
      ],
    ],
    [
      "Drives",
      "replaces Dropbox",
      [{ title: "Studio Archive", meta: "Updated Jun 14, 2026" }],
    ],
  ];

  const activity = [
    ["favorite", "Aurelie — Editorial Selects · IP_2607_005.jpg", "Jul 6, 2026"],
    ["comment", "Meridian — Brand Film · meridian_brandfilm_v2.mp4", "Jul 6, 2026"],
    ["download", "Meridian — Final Masters · 5 files (zip)", "Jul 6, 2026"],
    ["view", "Aurelie — Editorial Selects", "Jul 5, 2026"],
    ["download", "Tearsheets for Agency · tearsheet_03.pdf", "Jul 5, 2026"],
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-(--color-ink) py-1.5 text-center">
        <p className="text-[10px] tracking-[0.2em] text-(--color-paper) uppercase">
          Design preview — demo content, not the live studio
        </p>
      </div>
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-baseline gap-3">
            <span className="display text-xl tracking-wide">ISAAC POOLE</span>
            <span className="microlabel">Studio</span>
          </span>
          <nav className="flex items-center gap-6">
            <span className="microlabel">Projects</span>
            <span className="microlabel">New</span>
            <span className="microlabel">Sign out</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-14 px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="microlabel mb-2">Overview</p>
            <h1 className="display text-4xl">Projects</h1>
          </div>
          <span className="btn">New project</span>
        </div>

        {sections.map(([label, replaces, items]) => (
          <section key={label}>
            <div className="mb-4 flex items-baseline justify-between border-b hairline pb-2">
              <h2 className="microlabel">
                {label}{" "}
                <span className="normal-case tracking-normal text-(--color-hairline)">
                  · {replaces}
                </span>
              </h2>
              <span className="microlabel">+ New</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li
                  key={p.title}
                  className="border hairline bg-white px-4 py-3 transition-colors hover:border-(--color-ink)"
                >
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="mt-1 text-xs text-(--color-stone)">{p.meta}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="microlabel mb-4 border-b hairline pb-2">
            Recent activity
          </h2>
          <ul className="space-y-2 text-sm">
            {activity.map(([event, what, when], i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="microlabel w-20 shrink-0">{event}</span>
                <span className="truncate">{what}</span>
                <span className="ml-auto shrink-0 text-xs text-(--color-stone)">
                  {when}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
