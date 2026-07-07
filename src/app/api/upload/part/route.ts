import { NextRequest, NextResponse } from "next/server";
import { getActor, canWriteProject } from "@/lib/authz";
import { presignUploadPart } from "@/lib/s3";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Presign one part of an in-flight multipart upload. The key is validated
 * against the asset row and the actor's write access — a caller cannot mint
 * part URLs for someone else's object key.
 */
export async function POST(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const assetId = String(body?.assetId ?? "");
  const uploadId = String(body?.uploadId ?? "");
  const partNumber = Number(body?.partNumber ?? 0);
  if (!assetId || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: asset } = await (await supabaseServer())
    .from("assets")
    .select("id, project_id, storage_key")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canWriteProject(actor, asset.project_id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = await presignUploadPart(asset.storage_key, uploadId, partNumber, 6 * 3600);
  return NextResponse.json({ url });
}
