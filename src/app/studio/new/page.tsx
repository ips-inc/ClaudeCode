import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { createProject } from "@/app/studio/actions";
import { KIND_META, type ProjectKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: ProjectKind[] = ["gallery", "review", "transfer", "drive"];

export default async function NewProject() {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio");

  const { data: clients } = await (await supabaseServer())
    .from("clients")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  if (!clients?.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-[14px] [color:var(--color-dim)]">Create a client first, then start a project for them.</p>
        <a href="/studio/files" className="btn btn-ghost btn-sm mt-5">← Back to files</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
        <p className="kicker mb-2">Create</p>
        <h1 className="display mb-8 text-4xl">New project</h1>
        <form action={createProject} className="space-y-6">
          <label className="block space-y-1.5">
            <span className="kicker">Client</span>
            <select name="clientId" required className="field">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="kicker mb-2">Type</legend>
            {KINDS.map((k, i) => (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border hairline bg-[color:var(--color-surface)] p-3 text-[14px] transition has-checked:border-[color:var(--color-accent)]">
                <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="accent-[color:var(--color-accent)]" />
                <span className="font-medium">{KIND_META[k].label}</span>
                <span className="kicker ml-auto normal-case">replaces {KIND_META[k].replaces}</span>
              </label>
            ))}
          </fieldset>

          <label className="block space-y-1.5">
            <span className="kicker">Title</span>
            <input name="title" required placeholder="Spring Campaign — Selects" className="field" />
          </label>
          <label className="block space-y-1.5">
            <span className="kicker">Description (optional)</span>
            <textarea name="description" rows={3} className="field" />
          </label>

          <button className="btn btn-accent">Create project</button>
        </form>
    </div>
  );
}
