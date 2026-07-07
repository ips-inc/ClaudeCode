import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Public share-link resolution on the multi-tenant schema. The anon web has no
 * table access; every public read goes through here (service role) AFTER the
 * link is validated — revocation, expiry, and password are all enforced first.
 */

export interface ShareLinkRow {
  id: string;
  project_id: string;
  slug: string;
  label: string | null;
  password_hash: string | null;
  expires_at: string | null;
  allow_downloads: boolean;
  max_downloads: number | null;
  download_count: number;
  view_count: number;
  revoked_at: string | null;
}

export interface ShareProject {
  id: string;
  title: string;
  description: string | null;
  kind: "gallery" | "review" | "transfer" | "drive";
}

export type ShareResolution =
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "locked"; link: ShareLinkRow; project: ShareProject }
  | { status: "ok"; link: ShareLinkRow; project: ShareProject };

const SECRET = () => process.env.SHARE_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(sig).toString("base64url");
}

export function unlockCookieName(slug: string) {
  return `ps_unlock_${slug}`;
}
export async function unlockCookieValue(slug: string): Promise<string> {
  return hmac(`unlock:${slug}`);
}

export async function resolveShare(slug: string): Promise<ShareResolution> {
  const db = supabaseAdmin();
  const { data: link } = await db
    .from("share_links")
    .select("*, projects(id, title, description, kind)")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || link.revoked_at) return { status: "not_found" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { status: "expired" };

  const project = link.projects as unknown as ShareProject;
  const row = { ...link, projects: undefined } as unknown as ShareLinkRow;

  if (link.password_hash) {
    const jar = await cookies();
    const cookie = jar.get(unlockCookieName(slug))?.value;
    if (cookie !== (await unlockCookieValue(slug))) {
      return { status: "locked", link: row, project };
    }
  }
  return { status: "ok", link: row, project };
}

/** Audit a public share event (proof of delivery). */
export async function auditShare(
  projectId: string,
  shareLinkId: string,
  action: string,
  meta: Record<string, unknown> = {},
  req?: { ip?: string | null; ua?: string | null }
) {
  await supabaseAdmin().from("audit_log").insert({
    project_id: projectId,
    share_link_id: shareLinkId,
    action,
    ip: req?.ip ?? null,
    user_agent: req?.ua ?? null,
    meta,
  });
}
