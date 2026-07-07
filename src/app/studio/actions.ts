"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getActor } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteObjects } from "@/lib/s3";
import { projectSlug, shareSlug } from "@/lib/slug";
import type { ProjectKind } from "@/lib/types";

/** Owner-only guard for studio mutations. */
async function requireOwner() {
  const actor = await getActor();
  if (!actor || actor.role === "client") throw new Error("Forbidden");
  return actor;
}

export async function createClient(formData: FormData) {
  await requireOwner();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "client"}-${shareSlug().slice(0, 6)}`;
  const { error } = await supabaseAdmin().from("clients").insert({ name, slug });
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

export async function createProject(formData: FormData) {
  const actor = await requireOwner();
  const clientId = String(formData.get("clientId") || "");
  const kind = String(formData.get("kind")) as ProjectKind;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!clientId || !title) throw new Error("Client and title required");

  const { data, error } = await supabaseAdmin()
    .from("projects")
    .insert({
      client_id: clientId,
      owner_id: actor.id,
      kind,
      title,
      description,
      slug: projectSlug(title),
      published: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/studio/p/${data.id}`);
}

export async function setPublished(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const published = formData.get("published") === "true";
  await supabaseAdmin().from("projects").update({ published }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function updateProject(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (title) await supabaseAdmin().from("projects").update({ title, description }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function setCover(formData: FormData) {
  await requireOwner();
  const projectId = String(formData.get("projectId"));
  const assetId = String(formData.get("assetId"));
  await supabaseAdmin().from("projects").update({ cover_asset_id: assetId }).eq("id", projectId);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteAsset(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const admin = supabaseAdmin();
  // Collect the original + every rendition key, then purge from object storage.
  const { data: asset } = await admin.from("assets").select("storage_key").eq("id", id).maybeSingle();
  const { data: rends } = await admin.from("renditions").select("storage_key").eq("asset_id", id);
  const keys = [asset?.storage_key, ...(rends ?? []).map((r) => r.storage_key)].filter(Boolean) as string[];
  if (keys.length) await deleteObjects(keys);
  await admin.from("assets").delete().eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function createShareLink(formData: FormData) {
  const actor = await requireOwner();
  const projectId = String(formData.get("projectId"));
  const label = String(formData.get("label") || "").trim() || null;
  const password = String(formData.get("password") || "");
  const expiresAt = String(formData.get("expiresAt") || "");
  const maxDownloads = String(formData.get("maxDownloads") || "");

  const { error } = await supabaseAdmin().from("share_links").insert({
    project_id: projectId,
    slug: shareSlug(),
    label,
    password_hash: password ? await bcrypt.hash(password, 10) : null,
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    max_downloads: maxDownloads ? Number(maxDownloads) : null,
    allow_downloads: formData.get("allowDownloads") === "on",
    created_by: actor.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function revokeShareLink(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  await supabaseAdmin().from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}
