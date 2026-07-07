import { NextRequest, NextResponse } from "next/server";
import { getActor, getAuthorizedAsset, audit } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Comments on an asset the caller may access.
 *
 *   GET  → all comments (roots + replies), oldest first
 *   POST → add a comment, optionally pinned to a frame/timecode
 *
 * Frame accuracy: the client sends the exact frame index it computed from the
 * player's currentTime and the asset fps; we store frame + timecode + fps so a
 * comment resolves to the same frame on any playback rate or device.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const asset = await getAuthorizedAsset(actor, assetId);
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data } = await (await supabaseServer())
    .from("comments")
    .select(
      "id, parent_id, author_id, author_name, is_admin, body, timecode_s, frame, fps, resolved_at, created_at"
    )
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const asset = await getAuthorizedAsset(actor, assetId);
  if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const parentId = body?.parentId ? String(body.parentId) : null;
  const timecode = body?.timecodeS != null ? Number(body.timecodeS) : null;
  const frame = body?.frame != null ? Math.round(Number(body.frame)) : null;
  const fps = body?.fps != null ? Number(body.fps) : null;

  // A reply inherits its thread's pin; only roots carry a fresh timecode.
  const db = await supabaseServer();
  const { data: comment, error } = await db
    .from("comments")
    .insert({
      asset_id: assetId,
      parent_id: parentId,
      author_id: actor.id,
      author_name: actor.email?.split("@")[0] ?? "User",
      is_admin: actor.role === "owner",
      body: text,
      timecode_s: parentId ? null : timecode,
      frame: parentId ? null : frame,
      fps: parentId ? null : fps,
    })
    .select(
      "id, parent_id, author_id, author_name, is_admin, body, timecode_s, frame, fps, resolved_at, created_at"
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "comment",
    projectId: asset.project_id,
    actorId: actor.id,
    objectType: "comment",
    objectId: comment.id,
    meta: { frame, timecode },
  });

  return NextResponse.json({ comment });
}
