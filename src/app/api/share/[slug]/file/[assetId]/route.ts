import { NextRequest, NextResponse } from "next/server";
import { resolveShare, auditShare } from "@/lib/share";
import { supabaseAnon } from "@/lib/supabase/anon";
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

  const db = supabaseAnon();
  const renditionKind = request.nextUrl.searchParams.get("r");
  const wantsDownload = request.nextUrl.searchParams.get("dl") === "1";

  // Resolve the file via the gateway: scoped to the link's project, live-checked.
  const { data: fileRows } = await db.rpc("share_file", {
    p_link_id: share.linkId,
    p_asset_id: assetId,
    p_rendition: renditionKind,
  });
  let file = (fileRows as { storage_key: string; mime: string; filename: string }[] | null)?.[0];
  // A missing playback proxy falls back to the original — the proxy is an
  // optimization, not an access boundary (same asset, same link check).
  if (!file && renditionKind === "proxy") {
    const { data: origRows } = await db.rpc("share_file", {
      p_link_id: share.linkId,
      p_asset_id: assetId,
      p_rendition: null,
    });
    file = (origRows as typeof fileRows | null)?.[0];
  }
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const key = file.storage_key;
  const mime = file.mime;

  if (wantsDownload) {
    // Atomic: enforces allow_downloads + max_downloads + live-ness.
    const { data: consumed } = await db.rpc("share_consume_download", { p_link: share.linkId });
    if (!consumed) {
      return NextResponse.json({ error: "download_unavailable" }, { status: 403 });
    }
    await auditShare(share.linkId, "download", { filename: file.filename }, {
      ip: request.headers.get("x-forwarded-for"),
      ua: request.headers.get("user-agent"),
    });
  }

  const forceDownload = wantsDownload || isDangerousInline(mime);
  const url = await presignGet(key, {
    ttl: 900,
    download: forceDownload ? file.filename : false,
    contentType: forceDownload ? "application/octet-stream" : mime,
  });
  if (!url) return NextResponse.json({ error: "storage" }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
