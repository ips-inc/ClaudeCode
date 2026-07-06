"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  logActivity,
  resolveShare,
  unlockCookieName,
  unlockCookieValue,
} from "@/lib/share";

export async function unlockShare(formData: FormData) {
  const slug = String(formData.get("slug"));
  const password = String(formData.get("password") || "");

  const db = supabaseAdmin();
  const { data: link } = await db
    .from("share_links")
    .select("id, password_hash, revoked_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || link.revoked_at) redirect(`/s/${slug}`);
  const ok =
    !!link.password_hash && (await bcrypt.compare(password, link.password_hash));
  if (!ok) redirect(`/s/${slug}?err=password`);

  const jar = await cookies();
  jar.set(unlockCookieName(slug), await unlockCookieValue(slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/`,
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/s/${slug}`);
}

export async function addClientComment(formData: FormData) {
  const slug = String(formData.get("slug"));
  const assetId = String(formData.get("assetId"));
  const body = String(formData.get("body") || "").trim();
  const authorName = String(formData.get("authorName") || "Client").trim() || "Client";
  const timecode = String(formData.get("timecode") || "");
  const parentId = String(formData.get("parentId") || "") || null;
  if (!body) return;

  const share = await resolveShare(slug);
  if (share.status !== "ok" || !share.link.allow_comments) return;

  const db = supabaseAdmin();
  const { data: asset } = await db
    .from("assets")
    .select("id, project_id, filename")
    .eq("id", assetId)
    .eq("project_id", share.project.id)
    .maybeSingle();
  if (!asset) return;

  await db.from("comments").insert({
    asset_id: assetId,
    parent_id: parentId,
    share_link_id: share.link.id,
    author_name: authorName.slice(0, 80),
    is_admin: false,
    body: body.slice(0, 4000),
    timecode_s: timecode !== "" ? Number(timecode) : null,
  });
  await logActivity(share.project.id, "comment", share.link.id, {
    filename: asset.filename,
    author: authorName,
  });
  revalidatePath(`/s/${slug}`);
}

export async function toggleFavorite(formData: FormData) {
  const slug = String(formData.get("slug"));
  const assetId = String(formData.get("assetId"));
  const clientName =
    String(formData.get("clientName") || "").trim().slice(0, 80) || null;

  const share = await resolveShare(slug);
  if (share.status !== "ok" || !share.link.allow_favorites) return;

  const db = supabaseAdmin();
  const { data: asset } = await db
    .from("assets")
    .select("id, filename")
    .eq("id", assetId)
    .eq("project_id", share.project.id)
    .maybeSingle();
  if (!asset) return;

  const { data: existing } = await db
    .from("favorites")
    .select("id")
    .eq("share_link_id", share.link.id)
    .eq("asset_id", assetId)
    .maybeSingle();

  if (existing) {
    await db.from("favorites").delete().eq("id", existing.id);
  } else {
    await db.from("favorites").insert({
      share_link_id: share.link.id,
      asset_id: assetId,
      client_name: clientName,
    });
    await logActivity(share.project.id, "favorite", share.link.id, {
      filename: asset.filename,
      author: clientName ?? "Client",
    });
  }
  revalidatePath(`/s/${slug}`);
}
