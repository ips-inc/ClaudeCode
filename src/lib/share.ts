import "server-only";
import { cookies } from "next/headers";
import { supabaseAnon } from "@/lib/supabase/anon";

/**
 * Public share-link resolution — anon only, no service role. Every read goes
 * through the SECURITY DEFINER share_* RPCs, which re-check the link is live on
 * each call. Password links withhold their id until unlocked; the unlocked id
 * (a 128-bit random uuid) is the capability and is stored in an httpOnly cookie.
 */

export interface ShareProject {
  id: string;
  title: string;
  description: string | null;
  kind: "gallery" | "review" | "transfer" | "drive";
}

export type ShareResolution =
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "locked"; project: ShareProject }
  | { status: "ok"; linkId: string; allowDownloads: boolean; project: ShareProject };

export function unlockCookieName(slug: string) {
  return `ps_unlock_${slug}`;
}

interface ResolveRow {
  link_id: string | null;
  project_id: string;
  title: string;
  description: string | null;
  kind: ShareProject["kind"];
  allow_downloads: boolean;
  has_password: boolean;
  expired: boolean;
}

export async function resolveShare(slug: string): Promise<ShareResolution> {
  const db = supabaseAnon();
  const { data } = await db.rpc("share_resolve", { p_slug: slug });
  const row = (data as ResolveRow[] | null)?.[0];
  if (!row) return { status: "not_found" };

  const project: ShareProject = {
    id: row.project_id,
    title: row.title,
    description: row.description,
    kind: row.kind,
  };
  if (row.expired) return { status: "expired" };

  if (row.has_password) {
    // The unlocked link id lives in an httpOnly cookie; without it, locked.
    const jar = await cookies();
    const linkId = jar.get(unlockCookieName(slug))?.value;
    if (!linkId) return { status: "locked", project };
    return { status: "ok", linkId, allowDownloads: row.allow_downloads, project };
  }

  return { status: "ok", linkId: row.link_id as string, allowDownloads: row.allow_downloads, project };
}

/** Audit a public share event (proof of delivery). Best-effort. */
export async function auditShare(
  linkId: string,
  action: string,
  meta: Record<string, unknown> = {},
  req?: { ip?: string | null; ua?: string | null }
) {
  try {
    await supabaseAnon().rpc("share_audit", {
      p_link: linkId,
      p_action: action,
      p_meta: meta,
      p_ip: req?.ip ?? null,
      p_ua: req?.ua ?? null,
    });
  } catch {
    // proof-of-delivery is non-critical; never fail the visitor's request
  }
}
