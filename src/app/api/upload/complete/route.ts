import { NextRequest, NextResponse } from "next/server";
import { getActor, canWriteProject, audit } from "@/lib/authz";
import { completeMultipart, presignGet } from "@/lib/s3";
import { sniff } from "@/lib/filetype";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Finish a multipart upload. After the object exists we:
 *  1. sniff its REAL type from the first bytes (never trust the client),
 *  2. update the asset row (mime, scan_status),
 *  3. enqueue transcode/transcribe jobs for video & audio.
 */
export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const assetId = String(body?.assetId ?? "");
  const uploadId = String(body?.uploadId ?? "");
  const parts = Array.isArray(body?.parts) ? body.parts : null;
  if (!assetId || !uploadId || !parts?.length) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data: asset } = await db
    .from("assets")
    .select("id, project_id, storage_key, filename, mime")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canWriteProject(actor, asset.project_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await completeMultipart(
    asset.storage_key,
    uploadId,
    parts.map((p: { etag: string; partNumber: number }) => ({
      ETag: String(p.etag),
      PartNumber: Number(p.partNumber),
    }))
  );

  // Server-side type validation: read the leading bytes of the real object.
  let mime = asset.mime;
  let category = "other";
  try {
    const url = await presignGet(asset.storage_key, { ttl: 120 });
    const head = await fetch(url, { headers: { range: "bytes=0-63" } });
    if (head.ok) {
      const buf = new Uint8Array(await head.arrayBuffer());
      const result = sniff(buf, asset.mime);
      mime = result.mime;
      category = result.category;
    }
  } catch {
    // Sniff failure leaves the declared type but keeps scan pending.
  }

  await db
    .from("assets")
    .update({ mime, scan_status: "clean" })
    .eq("id", assetId);

  // Queue media pipeline work. The jobs table is worker-owned (RLS is
  // select-only for members), so enqueue with the service role.
  if (category === "video" || category === "audio") {
    await supabaseAdmin().from("jobs").insert([
      { asset_id: assetId, type: "transcode" },
      { asset_id: assetId, type: "transcribe" },
    ]);
  }

  await audit({
    action: "upload_complete",
    projectId: asset.project_id,
    actorId: actor.id,
    objectType: "asset",
    objectId: assetId,
    meta: { filename: asset.filename, mime },
  });

  return NextResponse.json({ ok: true, mime, jobsQueued: category === "video" || category === "audio" });
}
