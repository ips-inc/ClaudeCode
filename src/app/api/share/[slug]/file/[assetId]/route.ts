import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logActivity, resolveShare, signedUrl } from "@/lib/share";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; assetId: string }> }
) {
  const { slug, assetId } = await params;
  const wantsDownload = request.nextUrl.searchParams.get("dl") === "1";

  const share = await resolveShare(slug);
  if (share.status !== "ok") {
    return NextResponse.json({ error: share.status }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: asset } = await db
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", share.project.id)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (wantsDownload) {
    if (!share.link.allow_downloads) {
      return NextResponse.json({ error: "downloads_disabled" }, { status: 403 });
    }
    const { data: allowed } = await db.rpc("increment_download", {
      link_id: share.link.id,
    });
    if (!allowed) {
      return NextResponse.json({ error: "download_limit_reached" }, { status: 403 });
    }
    await logActivity(share.project.id, "download", share.link.id, {
      filename: asset.filename,
    });
  }

  const url = await signedUrl(asset.storage_path, {
    download: wantsDownload ? asset.filename : undefined,
    ttl: 3600,
  });
  if (!url) return NextResponse.json({ error: "storage" }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
