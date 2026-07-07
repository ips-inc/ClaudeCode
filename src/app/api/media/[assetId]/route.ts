import { NextRequest, NextResponse } from "next/server";
import { getActor, getAuthorizedAsset, audit } from "@/lib/authz";
import { presignGet } from "@/lib/s3";
import { isDangerousInline } from "@/lib/filetype";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Authenticated media access — THE single door to file bytes for logged-in
 * users. Explicit authorization on every request (owner / membership /
 * published), never trusting the unguessability of IDs or URLs. On success we
 * redirect to a short-lived presigned URL on the private bucket.
 *
 *   GET /api/media/:assetId            → original, inline if safe
 *   GET /api/media/:assetId?r=proxy    → a rendition (proxy|1080p|720p|poster)
 *   GET /api/media/:assetId?dl=1       → forced attachment download (audited)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const asset = await getAuthorizedAsset(actor, assetId);
  // Same response for "doesn't exist" and "not yours": no existence oracle.
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const wantsDownload = request.nextUrl.searchParams.get("dl") === "1";
  const renditionKind = request.nextUrl.searchParams.get("r");

  let key = asset.storage_key;
  let mime = asset.mime;
  let filename = asset.filename;

  if (renditionKind) {
    const { data: rendition } = await (await supabaseServer())
      .from("renditions")
      .select("storage_key, mime, kind")
      .eq("asset_id", asset.id)
      .eq("kind", renditionKind)
      .eq("status", "done")
      .maybeSingle();
    if (!rendition) return NextResponse.json({ error: "not_found" }, { status: 404 });
    key = rendition.storage_key;
    mime = rendition.mime;
    filename = `${asset.filename}.${rendition.kind}`;
  }

  // Anything that could execute in a browser context is never served inline.
  const forceDownload = wantsDownload || isDangerousInline(mime);

  const url = await presignGet(key, {
    ttl: 900,
    download: forceDownload ? filename : false,
    contentType: forceDownload ? "application/octet-stream" : mime,
  });

  if (wantsDownload) {
    await audit({
      action: "download",
      projectId: asset.project_id,
      actorId: actor.id,
      objectType: renditionKind ? "rendition" : "asset",
      objectId: asset.id,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
      meta: { filename, rendition: renditionKind ?? "original" },
    });
  }

  return NextResponse.redirect(url, 302);
}
