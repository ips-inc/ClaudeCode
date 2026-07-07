import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Central authorization helpers for API routes.
 *
 * Every media/object route verifies rights EXPLICITLY here before touching
 * storage — never by trusting that an ID or URL is unguessable (IDOR-proof).
 * The database duplicates these checks via RLS; this layer exists so that
 * service-role code paths (which bypass RLS) still enforce the same rules,
 * and so denials short-circuit before any presigning happens.
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
  // Profile lookup via service role: profiles RLS lets users read themselves,
  // but going through admin keeps this usable inside service-role routes too.
  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, global_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { id: profile.id, email: profile.email, role: profile.global_role };
}

/**
 * Can `actor` access project `projectId`?
 * Mirrors app.has_project_access(): owner always; members of the project's
 * client; client-role members only when the project is published.
 */
export async function canAccessProject(
  actor: Actor,
  projectId: string
): Promise<boolean> {
  if (actor.role === "owner") return true;
  const admin = supabaseAdmin();
  const { data: project } = await admin
    .from("projects")
    .select("id, client_id, published")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return false;
  if (actor.role === "client" && !project.published) return false;
  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", actor.id)
    .eq("client_id", project.client_id)
    .maybeSingle();
  return !!membership;
}

/** Can `actor` modify content in project `projectId`? (clients never can) */
export async function canWriteProject(
  actor: Actor,
  projectId: string
): Promise<boolean> {
  if (actor.role === "client") return false;
  return canAccessProject(actor, projectId);
}

/** Look up an asset and check read access in one step. Returns null on ANY failure. */
export async function getAuthorizedAsset(actor: Actor, assetId: string) {
  const { data: asset } = await supabaseAdmin()
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return null;
  if (!(await canAccessProject(actor, asset.project_id))) return null;
  return asset;
}

/** Write an audit row (service role — clients cannot forge these). */
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
}
