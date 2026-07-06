import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { KIND_META, type Project, type ProjectKind } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const KINDS: ProjectKind[] = ["gallery", "review", "transfer", "drive"];

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const [{ data: projects }, { data: activity }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("activity")
      .select("*, projects(title), share_links(label, slug)")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const byKind = new Map<ProjectKind, Project[]>();
  for (const kind of KINDS) byKind.set(kind, []);
  for (const p of (projects ?? []) as Project[]) byKind.get(p.kind)?.push(p);

  return (
    <div className="space-y-14">
      <div className="flex items-end justify-between">
        <div>
          <p className="microlabel mb-2">Overview</p>
          <h1 className="display text-4xl">Projects</h1>
        </div>
        <Link href="/studio/new" className="btn">
          New project
        </Link>
      </div>

      {KINDS.map((kind) => {
        const list = byKind.get(kind)!;
        return (
          <section key={kind}>
            <div className="mb-4 flex items-baseline justify-between border-b hairline pb-2">
              <h2 className="microlabel">
                {KIND_META[kind].label}s{" "}
                <span className="normal-case tracking-normal text-(--color-hairline)">
                  · replaces {KIND_META[kind].replaces}
                </span>
              </h2>
              <Link href={`/studio/new?kind=${kind}`} className="microlabel hover:text-(--color-ink)">
                + New
              </Link>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-(--color-stone)">
                {KIND_META[kind].blurb}. None yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/studio/p/${p.id}`}
                      className="block border hairline bg-white px-4 py-3 transition-colors hover:border-(--color-ink)"
                    >
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="mt-1 text-xs text-(--color-stone)">
                        Updated {formatDate(p.updated_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section>
        <h2 className="microlabel mb-4 border-b hairline pb-2">Recent activity</h2>
        {!activity?.length ? (
          <p className="text-sm text-(--color-stone)">
            Views, downloads, comments and favorites from your share links will
            appear here.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-baseline gap-3">
                <span className="microlabel w-20 shrink-0">{a.event}</span>
                <span className="truncate">
                  {(a.projects as { title?: string } | null)?.title ?? "—"}
                  {a.meta && typeof a.meta === "object" && "filename" in a.meta
                    ? ` · ${(a.meta as { filename?: string }).filename}`
                    : ""}
                </span>
                <span className="ml-auto shrink-0 text-xs text-(--color-stone)">
                  {formatDate(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
