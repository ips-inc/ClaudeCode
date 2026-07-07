import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { visibleProjects } from "@/lib/deliveries";
import { Wordmark } from "@/components/brand/Wordmark";

export const dynamic = "force-dynamic";

/** Client-facing home — light "gallery" surface so the work leads. */
export default async function DeliverIndex() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/deliver");
  const projects = await visibleProjects(actor);

  return (
    <div className="surface-light min-h-screen">
      <header className="glass sticky top-0 z-20 border-b hairline">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark href={null as unknown as string} size="sm" />
          <span className="kicker">{actor.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="kicker mb-2">Deliveries</p>
        <h1 className="display mb-10 text-4xl">
          {actor.role === "client" ? "Your files" : "Client deliveries"}
        </h1>

        {projects.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-12 text-center text-[14px] [color:var(--color-mute)]">
            Nothing shared with you yet.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/deliver/${p.id}`} className="card lift block overflow-hidden">
                  <div className="flex aspect-video items-center justify-center bg-[color:var(--color-surface-2)]">
                    {p.cover_asset_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/media/${p.cover_asset_id}?r=thumb`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="kicker">{p.kind}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[15px] font-medium">{p.title}</p>
                    <p className="kicker mt-1">
                      {(p.clients as { name?: string } | null)?.name}
                      {actor.role !== "client" && !p.published && " · draft"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
