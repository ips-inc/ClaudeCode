import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { getDoc, money, isOverdue } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  addLineItem,
  deleteLineItem,
  updateDocMeta,
  sendDoc,
  recordPayment,
  markPaid,
  convertToInvoice,
  deleteDoc,
} from "@/app/studio/money/actions";

export const dynamic = "force-dynamic";

export default async function FinanceDocDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio/money");
  const { id } = await params;
  const found = await getDoc(id);
  if (!found) notFound();
  const { doc, items, payments } = found;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const clientLink = `${origin}/i/${doc.id}`;
  const balance = Number(doc.total) - Number(doc.amount_paid);
  const isEstimate = doc.kind === "estimate";
  const editable = doc.status === "draft";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/studio/money" className="kicker hover:[color:var(--color-ink)]">← Money</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-3xl">
            <span className="capitalize">{doc.kind}</span> <span className="mono text-2xl [color:var(--color-dim)]">{doc.number}</span>
          </h1>
          <p className="kicker mt-1.5">
            {doc.clients?.name} · {doc.status}{isOverdue(doc) ? " · overdue" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc.status === "draft" && (
            <form action={sendDoc}>
              <input type="hidden" name="docId" value={doc.id} />
              <button className="btn btn-accent btn-sm">Send to client</button>
            </form>
          )}
          {isEstimate && doc.status === "approved" && (
            <form action={convertToInvoice}>
              <input type="hidden" name="docId" value={doc.id} />
              <button className="btn btn-accent btn-sm">Convert to invoice</button>
            </form>
          )}
          {!isEstimate && doc.status !== "paid" && doc.status !== "draft" && (
            <form action={markPaid}>
              <input type="hidden" name="docId" value={doc.id} />
              <button className="btn btn-ghost btn-sm">Mark paid</button>
            </form>
          )}
          <form action={deleteDoc}>
            <input type="hidden" name="docId" value={doc.id} />
            <ConfirmButton message={`Delete ${doc.number}?`} className="btn btn-ghost btn-sm !text-[color:var(--color-danger)]">Delete</ConfirmButton>
          </form>
        </div>
      </div>

      {/* Client link */}
      {doc.status !== "draft" && (
        <div className="card mt-6 flex flex-wrap items-center gap-3 p-3 text-[13px]">
          <span className="kicker">Client link</span>
          <span className="mono truncate [color:var(--color-dim)]">{clientLink}</span>
          <span className="ml-auto"><CopyButton text={clientLink} /></span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Line items */}
        <section>
          <h2 className="kicker mb-3">Line items</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b hairline [color:var(--color-mute)]">
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  {editable && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={editable ? 5 : 4} className="px-3 py-4 text-center [color:var(--color-mute)]">No items yet.</td></tr>
                ) : items.map((it) => (
                  <tr key={it.id} className="border-b hairline last:border-0">
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right mono">{Number(it.qty)}</td>
                    <td className="px-3 py-2 text-right mono">{money(Number(it.unit_price), doc.currency)}</td>
                    <td className="px-3 py-2 text-right mono">{money(Number(it.amount), doc.currency)}</td>
                    {editable && (
                      <td className="px-2 py-2 text-right">
                        <form action={deleteLineItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="docId" value={doc.id} />
                          <button className="text-[12px] [color:var(--color-mute)] hover:[color:var(--color-danger)]">✕</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {editable && (
              <form action={addLineItem} className="flex flex-wrap items-center gap-2 border-t hairline p-2.5">
                <input type="hidden" name="docId" value={doc.id} />
                <input name="description" placeholder="Description" required className="field !h-9 min-w-40 flex-1 text-[13px]" />
                <input name="qty" type="number" step="0.01" defaultValue="1" className="field !h-9 !w-16 text-[13px]" />
                <input name="unitPrice" type="number" step="0.01" placeholder="0.00" className="field !h-9 !w-24 text-[13px]" />
                <button className="btn btn-ghost btn-sm">Add</button>
              </form>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="[color:var(--color-mute)]">Subtotal</span><span className="mono">{money(Number(doc.subtotal), doc.currency)}</span></div>
            <div className="flex justify-between"><span className="[color:var(--color-mute)]">Tax ({Number(doc.tax_rate)}%)</span><span className="mono">{money(Number(doc.tax), doc.currency)}</span></div>
            <div className="flex justify-between border-t hairline pt-1.5 text-[15px] font-medium"><span>Total</span><span className="mono">{money(Number(doc.total), doc.currency)}</span></div>
            {Number(doc.amount_paid) > 0 && (
              <>
                <div className="flex justify-between [color:var(--color-good)]"><span>Paid</span><span className="mono">−{money(Number(doc.amount_paid), doc.currency)}</span></div>
                <div className="flex justify-between font-medium"><span>Balance</span><span className="mono">{money(balance, doc.currency)}</span></div>
              </>
            )}
          </div>
        </section>

        {/* Sidebar: meta + payments */}
        <aside className="space-y-6">
          <div>
            <h2 className="kicker mb-2">Details</h2>
            <form action={updateDocMeta} className="card space-y-3 p-4">
              <input type="hidden" name="docId" value={doc.id} />
              <label className="block space-y-1"><span className="kicker">{isEstimate ? "Valid until" : "Due date"}</span>
                <input name="dueDate" type="date" defaultValue={doc.due_date ?? ""} className="field !h-9 text-[13px] normal-case tracking-normal" /></label>
              <label className="block space-y-1"><span className="kicker">Tax rate %</span>
                <input name="taxRate" type="number" step="0.01" defaultValue={Number(doc.tax_rate)} className="field !h-9 text-[13px] normal-case tracking-normal" /></label>
              <label className="block space-y-1"><span className="kicker">Notes</span>
                <textarea name="notes" rows={2} defaultValue={doc.notes ?? ""} className="field text-[13px]" /></label>
              <label className="block space-y-1"><span className="kicker">Terms</span>
                <textarea name="terms" rows={2} defaultValue={doc.terms ?? ""} placeholder="Payment terms, wire/Zelle instructions…" className="field text-[13px]" /></label>
              <button className="btn btn-ghost btn-sm w-full">Save details</button>
            </form>
          </div>

          {!isEstimate && (
            <div>
              <h2 className="kicker mb-2">Payments</h2>
              <div className="card p-4">
                {payments.length > 0 && (
                  <ul className="mb-3 space-y-1.5 text-[12.5px]">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between">
                        <span className="capitalize [color:var(--color-dim)]">{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                        <span className="mono">{money(Number(p.amount), doc.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {doc.status !== "paid" && doc.status !== "draft" && (
                  <form action={recordPayment} className="space-y-2 border-t hairline pt-3">
                    <input type="hidden" name="docId" value={doc.id} />
                    <div className="flex gap-2">
                      <input name="amount" type="number" step="0.01" placeholder="Amount" required className="field !h-9 text-[13px]" />
                      <select name="method" className="field !h-9 !w-auto text-[13px]">
                        <option value="card">Card</option>
                        <option value="ach">ACH</option>
                        <option value="wire">Wire</option>
                        <option value="zelle">Zelle</option>
                        <option value="check">Check</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <input name="reference" placeholder="Reference (optional)" className="field !h-9 text-[13px]" />
                    <button className="btn btn-ghost btn-sm w-full">Record payment</button>
                  </form>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] [color:var(--color-faint)]">Issued {formatDate(doc.issue_date)}</p>
        </aside>
      </div>
    </div>
  );
}
