import { NextRequest, NextResponse } from "next/server";
import { resolveShare, auditShare } from "@/lib/share";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { presignGet } from "@/lib/s3";
import { isDangerousInline } from "@/lib/filetype";

export const runtime = "nodejs";

/**
 * Public file access for a share link.
 *   ?r=thumb|poster|proxy → a rendition, inline (no counter; link must be live)
 *   ?dl=1                 → forced download, consumes one download slot (cap enforced)
 *   (none)                → original, inline if safe
 *
 * The link is re-validated (revoked / expired / password) on EVERY request via
 * resolveShare, and the asset must belong to the link's project — no IDOR.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; assetId: string }> }
) {
  const { slug, assetId } = await params;
  const share = await resolveShare(slug);
  if (share.status !== "ok") {
    return NextResponse.json({ error: share.status }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: asset } = await db
    .from("assets")
    .select("id, project_id, filename, mime, storage_key")
    .eq("id", assetId)
    .eq("project_id", share.project.id) // scope to the link's project
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const renditionKind = request.nextUrl.searchParams.get("r");
  const wantsDownload = request.nextUrl.searchParams.get("dl") === "1";

  let key = asset.storage_key;
  let mime = asset.mime;

  if (renditionKind) {
    const { data: r } = await db
      .from("renditions")
      .select("storage_key, mime")
      .eq("asset_id", asset.id)
      .eq("kind", renditionKind)
      .eq("status", "done")
      .maybeSingle();
    if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
    key = r.storage_key;
    mime = r.mime;
  }

  if (wantsDownload) {
    // Atomic: enforces allow_downloads + max_downloads + live-ness.
    const { data: consumed } = await db.rpc("share_consume_download", { link: share.link.id });
    if (!consumed) {
      return NextResponse.json({ error: "download_unavailable" }, { status: 403 });
    }
    await auditShare(share.project.id, share.link.id, "download", { filename: asset.filename }, {
      ip: request.headers.get("x-forwarded-for"),
      ua: request.headers.get("user-agent"),
    });
  }

  const forceDownload = wantsDownload || isDangerousInline(mime);
  const url = await presignGet(key, {
    ttl: 900,
    download: forceDownload ? asset.filename : false,
    contentType: forceDownload ? "application/octet-stream" : mime,
  });
  if (!url) return NextResponse.json({ error: "storage" }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
