import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/format";
import { arSummary, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

/**
 * The Desk — the studio command center. What's live, what came in, how much
 * space it's taking, and the fastest paths back into the work. The money strip
 * is scaffolded now and wires to real AR once invoicing lands.
 */
export default async function TheDesk() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio");
  if (actor.role === "client") redirect("/deliver");

  const db = await supabaseServer();
  const ar = await arSummary();
  const [{ data: projects }, { data: recent }, { data: sizes }] = await Promise.all([
    db
      .from("projects")
      .select("id, title, kind, published, cover_asset_id, created_at, clients(name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("assets")
      .select("id, filename, mime, size_bytes, created_at, project_id, projects(title)")
      .is("version_of", null)
      .order("created_at", { ascending: false })
      .limit(8),
    db.from("assets").select("size_bytes").is("version_of", null),
  ]);

  const allProjects = projects ?? [];
  const live = allProjects.filter((p) => p.published);
  const totalBytes = (sizes ?? []).reduce((n, r) => n + (r.size_bytes ?? 0), 0);
  const firstName = actor.email?.split("@")[0]?.split(".")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Active projects", value: String(allProjects.length), href: "/studio/files" },
    { label: "Live with clients", value: String(live.length), href: "/deliver" },
    { label: "Storage used", value: formatBytes(totalBytes), href: "/studio/files" },
    {
      label: "Outstanding",
      value: money(ar.outstanding),
      href: "/studio/money",
      hint: ar.overdue > 0 ? `${money(ar.overdue)} overdue` : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Greeting */}
      <div className="mb-9">
        <p className="kicker mb-2">The Desk</p>
        <h1 className="display text-4xl capitalize sm:text-5xl">
          {greeting}, {firstName}.
        </h1>
      </div>

      {/* Quick actions */}
      <div className="mb-10 flex flex-wrap gap-2.5">
        <Link href="/studio/new" className="btn btn-accent btn-sm">+ New project</Link>
        <Link href="/studio/files" className="btn btn-ghost btn-sm">Open files</Link>
        <Link href="/deliver" className="btn btn-ghost btn-sm">Client deliveries</Link>
        <Link href="/studio/money" className="btn btn-ghost btn-sm">Money</Link>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card lift p-5">
            <p className="kicker">{s.label}</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="display text-3xl">{s.value}</span>
              {s.hint && <span className="chip !h-5 !px-1.5 text-[10px]">{s.hint}</span>}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent activity */}
        <section>
          <h2 className="kicker mb-3">Recently added</h2>
          {(recent ?? []).length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-10 text-center text-[13px] [color:var(--color-mute)]">
              Nothing uploaded yet. Start a project and drop your first files.
            </p>
          ) : (
            <ul className="card divide-y hairline overflow-hidden">
              {(recent ?? []).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/studio/p/${a.project_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--color-surface-2)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-2)] text-[10px] [color:var(--color-mute)]">
                      {(a.mime?.split("/")[1] ?? "file").slice(0, 4)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{a.filename}</p>
                      <p className="kicker mt-0.5 normal-case tracking-normal">
                        {(a.projects as { title?: string } | null)?.title ?? "—"}
                      </p>
                    </div>
                    <span className="mono shrink-0 text-[11px] [color:var(--color-mute)]">{timeAgo(a.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Live deliveries */}
        <section>
          <h2 className="kicker mb-3">Live with clients</h2>
          {live.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-10 text-center text-[13px] [color:var(--color-mute)]">
              No deliveries published yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {live.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link href={`/deliver/${p.id}`} className="card lift flex items-center gap-3 p-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-good)]" />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                      <p className="kicker mt-0.5 normal-case tracking-normal">
                        {(p.clients as { name?: string } | null)?.name ?? "—"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
