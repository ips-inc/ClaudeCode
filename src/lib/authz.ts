import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Authorization helpers for authenticated routes.
 *
 * Everything here runs through the caller's OWN session (RLS), never the
 * service-role key — a logged-in request should only ever see what row-level
 * security allows. RLS is the enforcement layer: if a session query returns a
 * row, the caller is authorized to see it (IDOR-proof by construction). The
 * service role is reserved for public share pages (no session) and the worker.
 */

export interface Actor {
  id: string;
  email: string | null;
  role: "owner" | "collaborator" | "client";
}

/** Resolve the logged-in user + profile role, or null. */
export async function getActor(): Promise<Actor | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Self-read via RLS (profiles_select: id = auth.uid()). No service key.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, global_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { id: profile.id, email: profile.email, role: profile.global_role };
}

/**
 * Can `actor` access project `projectId`? Delegates to RLS: a session query
 * returns the project only when app.has_project_access() allows it (owner,
 * client member of a published project, or collaborator on the client).
 */
export async function canAccessProject(actor: Actor, projectId: string): Promise<boolean> {
  if (actor.role === "owner") return true;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  return !!data;
}

/** Can `actor` modify content in project `projectId`? (clients never can) */
export async function canWriteProject(actor: Actor, projectId: string): Promise<boolean> {
  if (actor.role === "client") return false;
  return canAccessProject(actor, projectId);
}

/** Look up an asset the caller may read. RLS returns it only if accessible. */
export async function getAuthorizedAsset(actor: Actor, assetId: string) {
  const supabase = await supabaseServer();
  const { data: asset } = await supabase.from("assets").select("*").eq("id", assetId).maybeSingle();
  return asset ?? null;
}

/**
 * Write an audit row. Best-effort: clients can't insert via RLS and this must
 * never break the request it's logging, so it goes through the service role and
 * swallows failures.
 */
export async function audit(entry: {
  action: string;
  projectId?: string | null;
  clientId?: string | null;
  actorId?: string | null;
  shareLinkId?: string | null;
  objectType?: string;
  objectId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin().from("audit_log").insert({
      action: entry.action,
      project_id: entry.projectId ?? null,
      client_id: entry.clientId ?? null,
      actor_id: entry.actorId ?? null,
      share_link_id: entry.shareLinkId ?? null,
      object_type: entry.objectType ?? null,
      object_id: entry.objectId ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      meta: entry.meta ?? {},
    });
  } catch {
    // audit is non-critical; never fail the underlying request
  }
}
