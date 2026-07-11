"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteObjects } from "@/lib/s3";
import { projectSlug, shareSlug } from "@/lib/slug";
import type { ProjectKind } from "@/lib/types";

/**
 * Guard for studio mutations: owner or collaborator (never a client). RLS is
 * the real enforcement — collaborators only reach their own clients' rows.
 */
async function requireMember() {
  const actor = await getActor();
  if (!actor || actor.role === "client") throw new Error("Forbidden");
  return actor;
}

export async function createClient(formData: FormData) {
  await requireMember();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "client"}-${shareSlug().slice(0, 6)}`;
  const { error } = await (await supabaseServer()).from("clients").insert({ name, slug });
  if (error) throw new Error(error.message);
  revalidatePath("/studio");
}

export async function createProject(formData: FormData) {
  const actor = await requireMember();
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
  await requireMember();
  const id = String(formData.get("id"));
  const published = formData.get("published") === "true";
  await (await supabaseServer()).from("projects").update({ published }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function updateProject(formData: FormData) {
  await requireMember();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (title) await (await supabaseServer()).from("projects").update({ title, description }).eq("id", id);
  revalidatePath(`/studio/p/${id}`);
}

export async function setCover(formData: FormData) {
  await requireMember();
  const projectId = String(formData.get("projectId"));
  const assetId = String(formData.get("assetId"));
  await (await supabaseServer()).from("projects").update({ cover_asset_id: assetId }).eq("id", projectId);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteAsset(formData: FormData) {
  await requireMember();
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

/**
 * Bulk operation on selected assets: tag, move, or delete many at once.
 * Every mutation is scoped to the project AND the caller's RLS view, so a
 * forged id from another project is a no-op.
 */
export async function bulkAssets(formData: FormData) {
  const actor = await requireMember();
  const projectId = String(formData.get("projectId"));
  const op = String(formData.get("op") || "");
  const ids = (formData.getAll("ids") as string[]).filter(Boolean).slice(0, 200);
  if (!ids.length) return;
  const db = await supabaseServer();

  if (op === "tag") {
    const tagId = String(formData.get("tagId") || "");
    if (!tagId) return;
    await db.from("asset_tags").upsert(
      ids.map((assetId) => ({ asset_id: assetId, tag_id: tagId, created_by: actor.id })),
      { onConflict: "asset_id,tag_id", ignoreDuplicates: true }
    );
  } else if (op === "move") {
    const folderId = String(formData.get("folderId") || "") || null;
    if (folderId) {
      const { data: folder } = await db
        .from("folders")
        .select("id")
        .eq("id", folderId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!folder) throw new Error("Folder not in this project");
    }
    await db.from("assets").update({ folder_id: folderId }).in("id", ids).eq("project_id", projectId);
  } else if (op === "delete") {
    const { data: assets } = await db
      .from("assets")
      .select("id, storage_key")
      .in("id", ids)
      .eq("project_id", projectId);
    const realIds = (assets ?? []).map((a) => a.id);
    if (realIds.length) {
      const { data: rends } = await db.from("renditions").select("storage_key").in("asset_id", realIds);
      const keys = [
        ...(assets ?? []).map((a) => a.storage_key),
        ...(rends ?? []).map((r) => r.storage_key),
      ].filter(Boolean) as string[];
      if (keys.length) await deleteObjects(keys);
      await db.from("assets").delete().in("id", realIds);
    }
  }
  revalidatePath(`/studio/p/${projectId}`);
}

/** Move an asset into a folder (empty string = project root). */
export async function moveAsset(formData: FormData) {
  await requireMember();
  const assetId = String(formData.get("assetId"));
  const projectId = String(formData.get("projectId"));
  const folderId = String(formData.get("folderId") || "") || null;
  const db = await supabaseServer();
  // The destination folder must belong to the same project — the FK alone
  // would happily point an asset at another project's folder.
  if (folderId) {
    const { data: folder } = await db
      .from("folders")
      .select("id")
      .eq("id", folderId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!folder) throw new Error("Folder not in this project");
  }
  await db.from("assets").update({ folder_id: folderId }).eq("id", assetId).eq("project_id", projectId);
  revalidatePath(`/studio/p/${projectId}`);
}

export async function createShareLink(formData: FormData) {
  const actor = await requireMember();
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
  await requireMember();
  const projectId = String(formData.get("projectId"));
  const parentId = String(formData.get("parentId") || "") || null;
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  if (!name) return;
  const db = await supabaseServer();
  // A parent folder from another project would detach the subtree.
  if (parentId) {
    const { data: parent } = await db
      .from("folders")
      .select("id")
      .eq("id", parentId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!parent) throw new Error("Parent folder not in this project");
  }
  await db.from("folders").insert({ project_id: projectId, parent_id: parentId, name });
  revalidatePath(`/studio/p/${projectId}`);
}

export async function deleteFolder(formData: FormData) {
  await requireMember();
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
  await requireMember();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("projectId"));
  await (await supabaseServer()).from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/studio/p/${projectId}`);
}
