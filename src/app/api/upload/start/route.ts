import { NextRequest, NextResponse } from "next/server";
import { getActor, canWriteProject, audit } from "@/lib/authz";
import { createMultipart } from "@/lib/s3";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Multipart part size the client must use (except final part): 64 MiB. */
const PART_SIZE = 64 * 1024 * 1024;

/**
 * Begin a resumable multipart upload for any file, any size.
 * Auth: owner/collaborator with write access to the project. The asset row is
 * created immediately (scan_status=pending); it becomes servable only after
 * /api/upload/complete verifies real bytes.
 */
export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const folderId = body?.folderId ? String(body.folderId) : null;
  const filename = String(body?.filename ?? "").slice(0, 255);
  const size = Number(body?.size ?? 0);
  const declaredMime = String(body?.mime ?? "application/octet-stream").slice(0, 127);
  if (!projectId || !filename || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!(await canWriteProject(actor, projectId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = await supabaseServer();
  const { data: project } = await db
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .single();
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Destination folder must belong to this project (FK alone doesn't check).
  if (folderId) {
    const { data: folder } = await db
      .from("folders")
      .select("id")
      .eq("id", folderId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "bad_folder" }, { status: 400 });
  }

  const assetId = crypto.randomUUID();
  const safeName = filename.replace(/[^\w.\- ()]/g, "_");
  const storageKey = `clients/${project.client_id}/projects/${projectId}/${assetId}/${safeName}`;

  const { error } = await db.from("assets").insert({
    id: assetId,
    project_id: projectId,
    folder_id: folderId,
    filename: safeName,
    storage_key: storageKey,
    mime: declaredMime, // provisional — re-sniffed server-side at /complete
    size_bytes: size,
    scan_status: "pending",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uploadId = await createMultipart(storageKey, declaredMime);
  await audit({
    action: "upload_start",
    projectId,
    clientId: project.client_id,
    actorId: actor.id,
    objectType: "asset",
    objectId: assetId,
    meta: { filename: safeName, size },
  });

  return NextResponse.json({
    assetId,
    key: storageKey,
    uploadId,
    partSize: PART_SIZE,
    partCount: Math.max(1, Math.ceil(size / PART_SIZE)),
  });
}
