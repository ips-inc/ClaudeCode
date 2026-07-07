import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@/app/studio/actions";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { KIND_META, type ProjectKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioDashboard() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio");
  if (actor.role === "client") redirect("/deliver");

  const db = await supabaseServer();
  const [{ data: clients }, { data: projects }] = await Promise.all([
    db.from("clients").select("id, name").is("archived_at", null).order("name"),
    db
      .from("projects")
      .select("id, title, kind, published, client_id, cover_asset_id, created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const byClient = new Map<string, typeof projects>();
  for (const p of projects ?? []) {
    const arr = byClient.get(p.client_id) ?? [];
    arr.push(p);
    byClient.set(p.client_id, arr);
  }

  return (
    <>
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="kicker mb-2">Overview</p>
            <h1 className="display text-4xl">Projects</h1>
          </div>
          <Link href="/studio/new" className="btn btn-accent">
            New project
          </Link>
        </div>

        {(clients ?? []).length === 0 ? (
          <p className="text-[14px] [color:var(--color-dim)]">No clients yet. Create one below to begin.</p>
        ) : (
          <div className="space-y-12">
            {(clients ?? []).map((c) => (
              <section key={c.id}>
                <h2 className="kicker mb-4 border-b hairline pb-2">{c.name}</h2>
                {(byClient.get(c.id) ?? []).length === 0 ? (
                  <p className="text-[13px] [color:var(--color-mute)]">No projects yet.</p>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(byClient.get(c.id) ?? []).map((p) => (
                      <li key={p.id}>
                        <Link href={`/studio/p/${p.id}`} className="card lift block overflow-hidden">
                          <div className="aspect-video bg-[color:var(--color-surface-2)]">
                            {p.cover_asset_id && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/media/${p.cover_asset_id}?r=thumb`} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="flex items-center justify-between px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium">{p.title}</p>
                              <p className="kicker mt-0.5">replaces {KIND_META[p.kind as ProjectKind].replaces}</p>
                            </div>
                            <span className={`chip ${p.published ? "!text-[color:var(--color-good)]" : ""}`}>
                              {p.published ? "live" : "draft"}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        <section className="mt-14 max-w-sm">
          <h2 className="kicker mb-3">Add a client</h2>
          <form action={createClient} className="flex gap-2">
            <input name="name" placeholder="Client or brand name" required className="field" />
            <button className="btn btn-ghost btn-sm">Add</button>
          </form>
        </section>
      </main>
    </>
  );
}
