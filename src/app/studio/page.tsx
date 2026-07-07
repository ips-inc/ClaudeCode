import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/app/studio/actions";
import { KIND_META, type ProjectKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioDashboard() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio");
  if (actor.role === "client") redirect("/deliver");

  const admin = supabaseAdmin();
  const [{ data: clients }, { data: projects }] = await Promise.all([
    admin.from("clients").select("id, name").is("archived_at", null).order("name"),
    admin
      .from("projects")
      .select("id, title, kind, published, client_id, created_at")
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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-400">Studio</p>
          <h1 className="mt-1 text-2xl font-medium">Clients & projects</h1>
        </div>
        <Link href="/studio/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
          New project
        </Link>
      </div>

      {(clients ?? []).length === 0 ? (
        <p className="mb-8 text-sm text-neutral-500">No clients yet. Create one to begin.</p>
      ) : (
        <div className="space-y-8">
          {(clients ?? []).map((c) => (
            <section key={c.id}>
              <h2 className="mb-3 border-b pb-1.5 text-sm font-medium">{c.name}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(byClient.get(c.id) ?? []).map((p) => (
                  <li key={p.id}>
                    <Link href={`/studio/p/${p.id}`} className="block rounded-lg border p-3 transition hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium">{p.title}</span>
                        <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${p.published ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {p.published ? "live" : "draft"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400">{KIND_META[p.kind as ProjectKind].replaces}</p>
                    </Link>
                  </li>
                ))}
                {(byClient.get(c.id) ?? []).length === 0 && (
                  <li className="text-xs text-neutral-400">No projects.</li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-12 max-w-sm">
        <h2 className="mb-2 text-sm font-medium">Add a client</h2>
        <form action={createClient} className="flex gap-2">
          <input
            name="name"
            placeholder="Client or brand name"
            required
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-900 hover:text-white">Add</button>
        </form>
      </section>
    </div>
  );
}
