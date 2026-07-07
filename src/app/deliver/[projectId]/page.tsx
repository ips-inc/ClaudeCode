import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor, canAccessProject } from "@/lib/authz";
import { projectAssetsWithThumbs } from "@/lib/deliveries";
import { supabaseServer } from "@/lib/supabase/server";
import { DeliveryGallery } from "@/components/deliver/DeliveryGallery";
import { AuditLog } from "@/components/deliver/AuditLog";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/studio/login");
  const { projectId } = await params;

  // Authorization first — foreign/unpublished projects 404 with no oracle.
  if (!(await canAccessProject(actor, projectId))) notFound();

  const admin = await supabaseServer();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, description, kind, published, clients(name)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const assets = await projectAssetsWithThumbs(projectId);
  const isOwnerSide = actor.role !== "client";

  return (
    <div className="surface-light min-h-screen">
      <header className="glass sticky top-0 z-20 border-b hairline">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/deliver" className="kicker hover:[color:var(--color-ink)]">← Deliveries</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="display text-4xl sm:text-5xl">{project.title}</h1>
          {project.description && (
            <p className="mx-auto mt-3 max-w-xl text-[14px] [color:var(--color-dim)]">{project.description}</p>
          )}
          <p className="kicker mt-3">
            {(project.clients as { name?: string } | null)?.name}
            {isOwnerSide && !project.published && " · not yet published"}
          </p>
        </div>

        <DeliveryGallery assets={assets} />

        {isOwnerSide && (
          <section className="mt-14">
            <h2 className="kicker mb-3">Access log · proof of delivery</h2>
            <AuditLog projectId={projectId} />
          </section>
        )}
      </main>
    </div>
  );
}
