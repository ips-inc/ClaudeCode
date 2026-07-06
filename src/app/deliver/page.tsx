import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { visibleProjects } from "@/lib/deliveries";

export const dynamic = "force-dynamic";

/** Client-facing home: the deliveries this account is allowed to see. */
export default async function DeliverIndex() {
  const actor = await getActor();
  if (!actor) redirect("/studio/login?next=/deliver");

  const projects = await visibleProjects(actor);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Deliveries</p>
        <h1 className="mt-1 text-2xl font-medium">
          {actor.role === "client" ? "Your files" : "Client deliveries"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as {actor.email} · {actor.role}
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-neutral-400">
          Nothing shared with you yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/deliver/${p.id}`}
                className="block overflow-hidden rounded-lg border transition hover:shadow-md"
              >
                <div className="flex aspect-video items-center justify-center bg-neutral-100">
                  {p.cover_asset_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/media/${p.cover_asset_id}?r=thumb`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-neutral-400">
                      {p.kind}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {(p.clients as { name?: string } | null)?.name}
                    {actor.role !== "client" && !p.published && " · draft"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
