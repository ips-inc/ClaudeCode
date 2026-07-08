"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
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
  const { error } = await (await supabaseServer()).from("clients").insert({ name, slug });
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

  const { data, error } = await (await supabaseServer())
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
  await (await supabaseServer()).from("projects").update({ published }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function updateProject(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (title) await (await supabaseServer()).from("projects").update({ title, description }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function setCover(formData: FormData) {
  await requireOwner();
  const projectId = String(formData.get("projectId"));
  const assetId = String(formData.get("assetId"));
  await (await supabaseServer()).from("projects").update({ cover_asset_id: assetId }).eq("id", projectId);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteAsset(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const admin = await supabaseServer();
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
  const db = await supabaseServer();

  // Hash via pgcrypto so it matches how share_unlock verifies (bcrypt in the DB).
  let passwordHash: string | null = null;
  if (password) {
    const { data } = await db.rpc("share_hash_password", { p_password: password });
    passwordHash = (data as string) ?? null;
  }

  const { error } = await db.from("share_links").insert({
    project_id: projectId,
    slug: shareSlug(),
    label,
    password_hash: passwordHash,
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    max_downloads: maxDownloads ? Number(maxDownloads) : null,
    allow_downloads: formData.get("allowDownloads") === "on",
    created_by: actor.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function createFolder(formData: FormData) {
  await requireOwner();
  const projectId = String(formData.get("projectId"));
  const parentId = String(formData.get("parentId") || "") || null;
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  if (!name) return;
  await (await supabaseServer()).from("folders").insert({ project_id: projectId, parent_id: parentId, name });
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteFolder(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  const admin = await supabaseServer();

  // Gather this folder's whole subtree, purge storage for assets inside, delete folders.
  const { data: allFolders } = await admin.from("folders").select("id, parent_id").eq("project_id", projectId);
  const subtree = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of allFolders ?? []) {
      if (f.parent_id && subtree.has(f.parent_id) && !subtree.has(f.id)) {
        subtree.add(f.id);
        grew = true;
      }
    }
  }
  const { data: assets } = await admin.from("assets").select("id, storage_key").in("folder_id", [...subtree]);
  const assetIds = (assets ?? []).map((a) => a.id);
  if (assetIds.length) {
    const { data: rends } = await admin.from("renditions").select("storage_key").in("asset_id", assetIds);
    const keys = [
      ...(assets ?? []).map((a) => a.storage_key),
      ...(rends ?? []).map((r) => r.storage_key),
    ].filter(Boolean) as string[];
    if (keys.length) await deleteObjects(keys);
    await admin.from("assets").delete().in("id", assetIds);
  }
  await admin.from("folders").delete().in("id", [...subtree]);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function revokeShareLink(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  await (await supabaseServer()).from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}
