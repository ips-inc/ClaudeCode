import { NextRequest, NextResponse } from "next/server";
import { getActor, canAccessProject, canWriteProject, audit } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function loadComment(commentId: string) {
  const db = await supabaseServer();
  const { data: comment } = await db
    .from("comments")
    .select("id, asset_id, author_id, resolved_at")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return null;
  const { data: asset } = await db
    .from("assets")
    .select("project_id")
    .eq("id", comment.asset_id)
    .maybeSingle();
  if (!asset) return null;
  return { comment, projectId: asset.project_id };
}

/** PATCH → toggle resolve (owner/collaborator only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const found = await loadComment(commentId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canWriteProject(actor, found.projectId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const resolved = Boolean(body?.resolved);
  const { error } = await (await supabaseServer())
    .from("comments")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: resolved ? "comment_resolve" : "comment_reopen",
    projectId: found.projectId,
    actorId: actor.id,
    objectType: "comment",
    objectId: commentId,
  });
  return NextResponse.json({ ok: true });
}

/** DELETE → author removes their own; owner removes any. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const found = await loadComment(commentId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAuthor = found.comment.author_id === actor.id;
  const canModerate = actor.role === "owner" && (await canAccessProject(actor, found.projectId));
  if (!isAuthor && !canModerate) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await (await supabaseServer()).from("comments").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
