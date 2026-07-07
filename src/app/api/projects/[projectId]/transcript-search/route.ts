import { NextRequest, NextResponse } from "next/server";
import { getActor, canAccessProject } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Full-text search across a project's transcripts. Results carry asset +
 * timecode so the player can jump straight to the moment a word was said.
 * Project access is verified before any query runs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { projectId } = await params;
  if (!(await canAccessProject(actor, projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!q) return NextResponse.json({ results: [] });

  const db = await supabaseServer();
  // Constrain to this project's assets first, then run FTS on segments.
  const { data: assets } = await db
    .from("assets")
    .select("id, filename")
    .eq("project_id", projectId);
  if (!assets?.length) return NextResponse.json({ results: [] });
  const nameById = new Map(assets.map((a) => [a.id, a.filename]));

  const { data: transcripts } = await db
    .from("transcripts")
    .select("id, asset_id")
    .in("asset_id", assets.map((a) => a.id));
  if (!transcripts?.length) return NextResponse.json({ results: [] });
  const assetByTranscript = new Map(transcripts.map((t) => [t.id, t.asset_id]));

  const { data: hits, error } = await db
    .from("transcript_segments")
    .select("transcript_id, start_s, end_s, text")
    .in("transcript_id", transcripts.map((t) => t.id))
    .textSearch("search_tsv", q, { type: "websearch" })
    .order("start_s")
    .limit(50);
  if (error) return NextResponse.json({ error: "search_failed" }, { status: 500 });

  return NextResponse.json({
    results: (hits ?? []).map((h) => {
      const assetId = assetByTranscript.get(h.transcript_id)!;
      return {
        assetId,
        filename: nameById.get(assetId),
        start_s: h.start_s,
        end_s: h.end_s,
        text: h.text,
      };
    }),
  });
}
