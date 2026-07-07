import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createProject } from "@/app/studio/actions";
import { KIND_META, type ProjectKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: ProjectKind[] = ["gallery", "review", "transfer", "drive"];

export default async function NewProject() {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio");

  const { data: clients } = await supabaseAdmin()
    .from("clients")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  if (!clients?.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-neutral-500">Create a client first, then start a project for them.</p>
        <a href="/studio" className="mt-4 inline-block text-sm underline">← Back to studio</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="mb-6 text-2xl font-medium">New project</h1>
      <form action={createProject} className="space-y-5">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-neutral-400">Client</span>
          <select name="clientId" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <span className="text-xs uppercase tracking-widest text-neutral-400">Type</span>
          <div className="mt-1 space-y-2">
            {KINDS.map((k, i) => (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm has-checked:border-neutral-900">
                <input type="radio" name="kind" value={k} defaultChecked={i === 0} />
                <span className="font-medium">{KIND_META[k].label}</span>
                <span className="ml-auto text-xs text-neutral-400">replaces {KIND_META[k].replaces}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-neutral-400">Title</span>
          <input name="title" required placeholder="Spring Campaign — Selects" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-neutral-400">Description (optional)</span>
          <textarea name="description" rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </label>

        <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Create project</button>
      </form>
    </div>
  );
}
