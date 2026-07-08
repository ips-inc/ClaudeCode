import { redirect } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { createDoc } from "@/app/studio/money/actions";
import type { FinanceKind } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function NewFinanceDoc({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio/money");
  const kind: FinanceKind = (await searchParams).kind === "invoice" ? "invoice" : "estimate";

  const { data: clients } = await (await supabaseServer())
    .from("clients")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  if (!clients?.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-[14px] [color:var(--color-dim)]">Add a client first, then bill them.</p>
        <Link href="/studio/files" className="btn btn-ghost btn-sm mt-5">← Files</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <Link href="/studio/money" className="kicker hover:[color:var(--color-ink)]">← Money</Link>
      <h1 className="display mb-8 mt-3 text-4xl capitalize">New {kind}</h1>
      <form action={createDoc} className="space-y-6">
        <input type="hidden" name="kind" value={kind} />
        <label className="block space-y-1.5">
          <span className="kicker">Client</span>
          <select name="clientId" required className="field">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="kicker">{kind === "invoice" ? "Due date" : "Valid until"} (optional)</span>
          <input name="dueDate" type="date" className="field normal-case tracking-normal" />
        </label>
        <label className="block space-y-1.5">
          <span className="kicker">Notes (optional)</span>
          <textarea name="notes" rows={3} placeholder="Shoot details, scope, anything the client should see." className="field" />
        </label>
        <button className="btn btn-accent">Create {kind}</button>
      </form>
    </div>
  );
}
