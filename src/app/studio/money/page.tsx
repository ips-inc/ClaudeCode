import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * Money — the accountant surface (owner only). Scaffolded now: the AR tiles,
 * the estimate→invoice→paid flow, and the ledger are laid out so the real
 * Zoho Books + payment wiring drops straight in. Numbers are placeholders until
 * that connection is live.
 */
export default async function MoneyHome() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/studio/money");
  if (actor.role !== "owner") redirect("/studio");

  const tiles = [
    { label: "Outstanding", value: "$0", tone: "ink" },
    { label: "Overdue", value: "$0", tone: "danger" },
    { label: "Awaiting estimate approval", value: "0", tone: "amber" },
    { label: "Paid (30 days)", value: "$0", tone: "good" },
  ] as const;

  const pipeline = [
    { step: "Estimate", blurb: "Draft & send. Client approves or declines online." },
    { step: "Invoice", blurb: "Approved estimate converts to an invoice in a click." },
    { step: "Pay", blurb: "Card & ACH online; wire & Zelle as marked-paid with instructions." },
    { step: "Sync", blurb: "Everything mirrors into Zoho Books automatically." },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-9 flex items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Money</p>
          <h1 className="display text-4xl sm:text-5xl">Studio finances</h1>
        </div>
        <span className="chip">Building next</span>
      </div>

      {/* AR tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="kicker">{t.label}</p>
            <p
              className="display mt-2 text-3xl"
              style={{ color: `var(--color-${t.tone === "ink" ? "ink" : t.tone})` }}
            >
              {t.value}
            </p>
          </div>
        ))}
      </div>

      {/* The flow */}
      <section className="mt-12">
        <h2 className="kicker mb-4">How the money side will work</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((p, i) => (
            <li key={p.step} className="card p-5">
              <span className="mono text-[11px] [color:var(--color-mute)]">0{i + 1}</span>
              <p className="mt-1 text-[15px] font-medium">{p.step}</p>
              <p className="mt-1.5 text-[13px] [color:var(--color-dim)]">{p.blurb}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <div className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-medium">Connect Zoho Books & a payment processor</p>
            <p className="mt-1 text-[13px] [color:var(--color-dim)]">
              Once connected, estimates and invoices flow out from here and reconcile in Zoho automatically.
            </p>
          </div>
          <span className="btn btn-ghost btn-sm pointer-events-none opacity-60">Coming next</span>
        </div>
      </section>
    </div>
  );
}
