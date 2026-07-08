import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { getDoc, money, isOverdue } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { respondToEstimate } from "@/app/i/[id]/actions";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Client-facing estimate / invoice. Any signed-in member with access to the
 * client can view it (RLS returns non-draft docs only). A client can approve or
 * decline an estimate; invoices show the balance and how to pay.
 */
export default async function ClientDoc({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  const { id } = await params;
  if (!actor) redirect(`/studio/login?next=/i/${id}`);

  // Mark viewed (client only; best-effort) before reading.
  if (actor.role === "client") {
    try {
      await (await supabaseServer()).rpc("finance_mark_viewed", { p_doc: id });
    } catch {
      // non-critical
    }
  }

  const found = await getDoc(id);
  if (!found || found.doc.status === "draft") notFound();
  const { doc, items } = found;

  const isEstimate = doc.kind === "estimate";
  const balance = Number(doc.total) - Number(doc.amount_paid);
  const canRespond =
    actor.role === "client" && isEstimate && (doc.status === "sent" || doc.status === "viewed");

  return (
    <div className="surface-light min-h-screen">
      <header className="glass sticky top-0 z-20 border-b hairline px-6 py-4 text-center">
        <span className="wordmark text-sm">ISAAC POOLE</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="kicker mb-1 capitalize">{doc.kind}</p>
            <h1 className="display text-4xl">{doc.number}</h1>
          </div>
          <div className="text-right text-[13px] [color:var(--color-dim)]">
            <p>{doc.clients?.name}</p>
            <p>Issued {formatDate(doc.issue_date)}</p>
            {doc.due_date && <p>{isEstimate ? "Valid until" : "Due"} {formatDate(doc.due_date)}{isOverdue(doc) ? " · overdue" : ""}</p>}
          </div>
        </div>

        {/* Status banner */}
        {doc.status === "approved" && <Banner tone="good">You approved this estimate.</Banner>}
        {doc.status === "declined" && <Banner tone="danger">You declined this estimate.</Banner>}
        {doc.status === "paid" && <Banner tone="good">Paid in full — thank you.</Banner>}

        {doc.notes && <p className="mb-6 text-[14px] [color:var(--color-dim)]">{doc.notes}</p>}

        {/* Line items */}
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b hairline [color:var(--color-mute)]">
                <th className="px-4 py-2.5 text-left font-medium">Description</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b hairline last:border-0">
                  <td className="px-4 py-2.5">{it.description}</td>
                  <td className="px-4 py-2.5 text-right mono">{Number(it.qty)}</td>
                  <td className="px-4 py-2.5 text-right mono">{money(Number(it.unit_price), doc.currency)}</td>
                  <td className="px-4 py-2.5 text-right mono">{money(Number(it.amount), doc.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-[13px]">
          <div className="flex justify-between"><span className="[color:var(--color-mute)]">Subtotal</span><span className="mono">{money(Number(doc.subtotal), doc.currency)}</span></div>
          {Number(doc.tax) > 0 && <div className="flex justify-between"><span className="[color:var(--color-mute)]">Tax ({Number(doc.tax_rate)}%)</span><span className="mono">{money(Number(doc.tax), doc.currency)}</span></div>}
          <div className="flex justify-between border-t hairline pt-1.5 text-[16px] font-medium"><span>{isEstimate ? "Total" : "Amount due"}</span><span className="mono">{money(isEstimate ? Number(doc.total) : balance, doc.currency)}</span></div>
        </div>

        {/* Estimate approve/decline */}
        {canRespond && (
          <div className="mt-8 flex justify-center gap-3">
            <form action={respondToEstimate}>
              <input type="hidden" name="docId" value={doc.id} />
              <input type="hidden" name="approve" value="true" />
              <button className="btn btn-accent">Approve estimate</button>
            </form>
            <form action={respondToEstimate}>
              <input type="hidden" name="docId" value={doc.id} />
              <input type="hidden" name="approve" value="false" />
              <button className="btn btn-ghost">Decline</button>
            </form>
          </div>
        )}

        {/* Invoice pay instructions */}
        {!isEstimate && doc.status !== "paid" && doc.terms && (
          <div className="mt-8 rounded-[var(--radius-lg)] border hairline p-5">
            <p className="kicker mb-2">How to pay</p>
            <p className="whitespace-pre-wrap text-[13px] [color:var(--color-dim)]">{doc.terms}</p>
          </div>
        )}
        {!isEstimate && doc.status !== "paid" && (
          <p className="mt-4 text-center text-[12px] [color:var(--color-mute)]">
            Online card &amp; ACH payment is coming soon. For now, use the instructions above.
          </p>
        )}
      </main>
    </div>
  );
}

function Banner({ tone, children }: { tone: "good" | "danger"; children: React.ReactNode }) {
  const color = tone === "good" ? "var(--color-good)" : "var(--color-danger)";
  return (
    <div className="mb-6 rounded-[var(--radius)] border px-4 py-3 text-center text-[13px] font-medium"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      {children}
    </div>
  );
}
