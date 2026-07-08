import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { arSummary, listDocs, money, isOverdue, type FinanceStatus } from "@/lib/finance";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<FinanceStatus, string> = {
  draft: "var(--color-mute)",
  sent: "var(--color-accent)",
  viewed: "var(--color-accent)",
  approved: "var(--color-good)",
  declined: "var(--color-danger)",
  paid: "var(--color-good)",
  void: "var(--color-faint)",
};

function StatusChip({ status, overdue }: { status: FinanceStatus; overdue?: boolean }) {
  const label = overdue ? "overdue" : status;
  const color = overdue ? "var(--color-danger)" : STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize"
      style={{ color, borderColor: `${color}55`, background: `${color}1f` }}
    >
      {label}
    </span>
  );
}

export default async function MoneyHome() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio/money");
  if (actor.role === "client") redirect("/deliver");

  const [ar, docs] = await Promise.all([arSummary(), listDocs()]);

  const tiles = [
    { label: "Outstanding", value: money(ar.outstanding), tone: "ink" as const },
    { label: "Overdue", value: money(ar.overdue), tone: "danger" as const },
    { label: "Awaiting approval", value: String(ar.awaitingApproval), tone: "amber" as const },
    { label: "Paid (30 days)", value: money(ar.paid30), tone: "good" as const },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Money</p>
          <h1 className="display text-4xl sm:text-5xl">Studio finances</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/studio/money/new?kind=estimate" className="btn btn-ghost btn-sm">New estimate</Link>
          <Link href="/studio/money/new?kind=invoice" className="btn btn-accent btn-sm">New invoice</Link>
        </div>
      </div>

      {/* AR tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="kicker">{t.label}</p>
            <p className="display mt-2 text-3xl" style={{ color: `var(--color-${t.tone})` }}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Documents */}
      <section className="mt-10">
        <h2 className="kicker mb-3">Estimates &amp; invoices</h2>
        {docs.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed hairline p-12 text-center">
            <p className="text-[14px] [color:var(--color-dim)]">Nothing yet.</p>
            <p className="mt-1 text-[13px] [color:var(--color-mute)]">Create an estimate or invoice to get started.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-b hairline [color:var(--color-mute)]">
                    <th className="px-4 py-2.5 text-left font-medium">Number</th>
                    <th className="px-4 py-2.5 text-left font-medium">Client</th>
                    <th className="px-4 py-2.5 text-left font-medium">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b hairline last:border-0 hover:bg-[color:var(--color-surface-2)]">
                      <td className="px-4 py-2.5">
                        <Link href={`/studio/money/${d.id}`} className="mono font-medium hover:[color:var(--color-accent)]">{d.number}</Link>
                      </td>
                      <td className="px-4 py-2.5">{d.clients?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 capitalize [color:var(--color-dim)]">{d.kind}</td>
                      <td className="px-4 py-2.5"><StatusChip status={d.status} overdue={isOverdue(d)} /></td>
                      <td className="px-4 py-2.5 text-right mono">{money(d.total, d.currency)}</td>
                      <td className="px-4 py-2.5 text-right [color:var(--color-mute)]">{d.due_date ? formatDate(d.due_date) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <p className="mt-8 text-[12px] [color:var(--color-faint)]">
        Card &amp; ACH payment and Zoho Books sync connect once credentials are added. Wire &amp; Zelle are recorded as payments with instructions on the invoice.
      </p>
    </div>
  );
}
