import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Project, ShareLink } from "@/lib/types";

const SECRET = () =>
  process.env.SHARE_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export type ShareResolution =
  | { status: "not_found" }
  | { status: "expired"; link: ShareLink; project: Project }
  | { status: "locked"; link: ShareLink; project: Project }
  | { status: "ok"; link: ShareLink; project: Project };

/** Resolve a public share slug: existence, revocation, expiry, password cookie. */
export async function resolveShare(slug: string): Promise<ShareResolution> {
  const db = supabaseAdmin();
  const { data: link } = await db
    .from("share_links")
    .select("*, projects(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || link.revoked_at) return { status: "not_found" };

  const project = link.projects as unknown as Project;
  const shareLink = { ...link, projects: undefined } as unknown as ShareLink;

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { status: "expired", link: shareLink, project };
  }

  if (link.password_hash) {
    const jar = await cookies();
    const cookie = jar.get(unlockCookieName(slug))?.value;
    const expected = await unlockCookieValue(slug);
    if (cookie !== expected) return { status: "locked", link: shareLink, project };
  }

  return { status: "ok", link: shareLink, project };
}

/** Short-lived signed URL for a storage object (optionally as attachment). */
export async function signedUrl(
  storagePath: string,
  opts: { download?: string | boolean; ttl?: number } = {}
): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db.storage
    .from("originals")
    .createSignedUrl(storagePath, opts.ttl ?? 3600, {
      download: opts.download,
    });
  return data?.signedUrl ?? null;
}

export async function logActivity(
  projectId: string,
  event: string,
  shareLinkId?: string | null,
  meta: Record<string, unknown> = {}
) {
  const db = supabaseAdmin();
  await db.from("activity").insert({
    project_id: projectId,
    share_link_id: shareLinkId ?? null,
    event,
    meta,
  });
}
