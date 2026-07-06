import { NextRequest, NextResponse } from "next/server";
import { getActor, getAuthorizedAsset } from "@/lib/authz";
import { presignGet } from "@/lib/s3";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Transcript for an asset the caller is authorized to see.
 *
 *   GET /api/assets/:id/transcript            → JSON segments (+ word timestamps)
 *   GET /api/assets/:id/transcript?format=srt → SRT sidecar download
 *   GET /api/assets/:id/transcript?format=vtt → VTT sidecar (for <track>)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const asset = await getAuthorizedAsset(actor, assetId);
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: transcript } = await admin
    .from("transcripts")
    .select("id, language, status, srt_key, vtt_key, full_text")
    .eq("asset_id", assetId)
    .maybeSingle();
  if (!transcript || transcript.status !== "done") {
    return NextResponse.json({ status: transcript?.status ?? "none" }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format");
  if (format === "srt" || format === "vtt") {
    const key = format === "srt" ? transcript.srt_key : transcript.vtt_key;
    if (!key) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const url = await presignGet(key, {
      ttl: 900,
      download: format === "srt" ? `${asset.filename}.srt` : false,
      contentType: format === "srt" ? "application/x-subrip" : "text/vtt",
    });
    return NextResponse.redirect(url, 302);
  }

  const { data: segments } = await admin
    .from("transcript_segments")
    .select("start_s, end_s, text, words")
    .eq("transcript_id", transcript.id)
    .order("start_s");

  return NextResponse.json({
    language: transcript.language,
    segments: segments ?? [],
  });
}
