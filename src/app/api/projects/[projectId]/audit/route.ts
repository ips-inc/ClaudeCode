import { NextRequest, NextResponse } from "next/server";
import { getActor, canWriteProject } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Access / delivery log for a project — the studio's proof-of-delivery.
 * Owner/collaborator only (clients must not see who else accessed what).
 * Joins actor emails so the log reads in plain language.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { projectId } = await params;
  if (!(await canWriteProject(actor, projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const limit = Math.min(500, Number(request.nextUrl.searchParams.get("limit") ?? 200));
  const db = await supabaseServer();
  const { data: rows } = await db
    .from("audit_log")
    .select("id, action, object_type, object_id, actor_id, share_link_id, ip, user_agent, meta, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Resolve actor emails in one lookup, through the session: the owner reads
  // all profiles under RLS; a collaborator only resolves themselves and the
  // rest fall back to "member". No service key involved.
  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))];
  const emailById = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, email")
      .in("id", actorIds as string[]);
    for (const p of profiles ?? []) emailById.set(p.id, p.email);
  }

  return NextResponse.json({
    events: (rows ?? []).map((r) => ({
      id: r.id,
      action: r.action,
      objectType: r.object_type,
      who: r.actor_id ? emailById.get(r.actor_id) ?? "member" : r.share_link_id ? "share link" : "—",
      ip: r.ip,
      meta: r.meta,
      at: r.created_at,
    })),
  });
}
