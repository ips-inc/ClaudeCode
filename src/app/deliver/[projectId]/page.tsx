import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor, canAccessProject } from "@/lib/authz";
import { projectAssetsWithThumbs } from "@/lib/deliveries";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

  const admin = supabaseAdmin();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, description, kind, published, clients(name)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const assets = await projectAssetsWithThumbs(projectId);
  const isOwnerSide = actor.role !== "client";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link href="/deliver" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-600">
            ← Deliveries
          </Link>
          <h1 className="mt-2 text-2xl font-medium">{project.title}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">{project.description}</p>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            {(project.clients as { name?: string } | null)?.name}
            {isOwnerSide && !project.published && " · not yet published to client"}
          </p>
        </div>
      </div>

      <DeliveryGallery assets={assets} />

      {isOwnerSide && (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-medium text-neutral-700">
            Access log <span className="font-normal text-neutral-400">· proof of delivery</span>
          </h2>
          <AuditLog projectId={projectId} />
        </section>
      )}
    </div>
  );
}
